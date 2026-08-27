import { z } from 'zod';

import { auditMetadataFields } from '../common/audit';
import { entityIdSchema } from '../common/identity';
import { instantSchema } from '../common/time';

export const associativeMemoryTrialSchema = z.object({
  id: entityIdSchema,
  presentationOrder: z.number().int().positive(),
  objectStimulusId: z.string().trim().min(1),
  encodedValue: z.string().trim().min(1),
  distractorValue: z.string().trim().min(1),
  displayedAnswerOrder: z.tuple([
    z.string().trim().min(1),
    z.string().trim().min(1)
  ]).readonly(),
  selectedValue: z.string().trim().min(1),
  isCorrect: z.boolean(),
  responseTimeMs: z.number().int().positive()
})
  .strict()
  .superRefine((trial, context) => {
    const expectedAnswers = new Set([trial.encodedValue, trial.distractorValue]);
    const displayedAnswers = new Set(trial.displayedAnswerOrder);

    if (expectedAnswers.size !== 2 || displayedAnswers.size !== 2 ||
      [...expectedAnswers].some((value) => !displayedAnswers.has(value))) {
      context.addIssue({
        code: 'custom',
        path: ['displayedAnswerOrder'],
        message: 'Displayed answers must contain the encoded and distractor values exactly once'
      });
    }

    if (!displayedAnswers.has(trial.selectedValue)) {
      context.addIssue({
        code: 'custom',
        path: ['selectedValue'],
        message: 'The selected value must be one of the displayed answers'
      });
    }

    if (trial.isCorrect !== (trial.selectedValue === trial.encodedValue)) {
      context.addIssue({
        code: 'custom',
        path: ['isCorrect'],
        message: 'isCorrect must agree with the selected and encoded values'
      });
    }
  })
  .readonly();

export const associativeMemorySessionSchema = z.object({
  id: entityIdSchema,
  studyId: entityIdSchema,
  cognitiveMeasurementId: entityIdSchema,
  cognitiveTestConfigurationId: entityIdSchema,
  encodingStartedAt: instantSchema,
  encodingCompletedAt: instantSchema,
  recognitionStartedAt: instantSchema,
  recognitionCompletedAt: instantSchema,
  itemCount: z.number().int().positive(),
  correctResponseCount: z.number().int().nonnegative(),
  accuracyProportion: z.number().min(0).max(1),
  generatorVersion: z.string().trim().min(1),
  trials: z.array(associativeMemoryTrialSchema).min(1),
  ...auditMetadataFields
})
  .strict()
  .superRefine((session, context) => {
    const times = [
      session.encodingStartedAt,
      session.encodingCompletedAt,
      session.recognitionStartedAt,
      session.recognitionCompletedAt
    ].map(Date.parse);

    if (times.some((time, index) => index > 0 && time < times[index - 1]!)) {
      context.addIssue({
        code: 'custom',
        path: ['recognitionCompletedAt'],
        message: 'Memory-session timestamps must follow protocol order'
      });
    }

    if (session.trials.length !== session.itemCount) {
      context.addIssue({
        code: 'custom',
        path: ['itemCount'],
        message: 'itemCount must equal the number of stored trials'
      });
    }

    const correctTrialCount = session.trials.filter(({ isCorrect }) => isCorrect).length;
    if (correctTrialCount !== session.correctResponseCount) {
      context.addIssue({
        code: 'custom',
        path: ['correctResponseCount'],
        message: 'correctResponseCount must equal the number of correct trials'
      });
    }

    if (Math.abs(session.accuracyProportion - correctTrialCount / session.itemCount) > 1e-12) {
      context.addIssue({
        code: 'custom',
        path: ['accuracyProportion'],
        message: 'accuracyProportion must be derivable from the stored trials'
      });
    }

    const orders = session.trials.map(({ presentationOrder }) => presentationOrder);
    if (new Set(orders).size !== orders.length) {
      context.addIssue({
        code: 'custom',
        path: ['trials'],
        message: 'Memory-trial presentation orders must be unique'
      });
    }
  })
  .readonly();

export type AssociativeMemoryTrial = z.infer<typeof associativeMemoryTrialSchema>;
export type AssociativeMemorySession = z.infer<typeof associativeMemorySessionSchema>;
