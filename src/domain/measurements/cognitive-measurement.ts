import { z } from 'zod';

import { auditMetadataFields } from '../common/audit';
import { entityIdSchema } from '../common/identity';
import { instantSchema, localDateSchema, localTimeSchema } from '../common/time';

export const cognitiveSlotSchema = z.enum(['morning', 'afternoon', 'evening']);
export const studyStageSchema = z.enum(['familiarization', 'A1', 'B', 'A2']);
export const symptomScoreSchema = z.number().int().min(0).max(10);

export const memoryDifficultySchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('rated'), score: symptomScoreSchema }).strict(),
  z.object({ status: z.literal('difficult_to_assess') }).strict()
]).readonly();

export const cognitiveSelfRatingsSchema = z.object({
  sleepinessScore: symptomScoreSchema,
  mentalFogScore: symptomScoreSchema,
  concentrationDifficultyScore: symptomScoreSchema,
  mentalFatigueScore: symptomScoreSchema,
  memoryDifficulty: memoryDifficultySchema
}).strict().readonly();

const cognitiveMeasurementBaseFields = {
  id: entityIdSchema,
  studyId: entityIdSchema,
  studyStage: studyStageSchema,
  localDate: localDateSchema,
  slot: cognitiveSlotSchema,
  plannedLocalTime: localTimeSchema,
  sessionConditionsNote: z.string().trim().min(1).optional(),
  ...auditMetadataFields
} as const;

const completedCognitiveMeasurementSchema = z.object({
  ...cognitiveMeasurementBaseFields,
  status: z.literal('completed'),
  startedAt: instantSchema,
  completedAt: instantSchema,
  selfRatings: cognitiveSelfRatingsSchema
})
  .strict()
  .superRefine((measurement, context) => {
    if (Date.parse(measurement.completedAt) < Date.parse(measurement.startedAt)) {
      context.addIssue({
        code: 'custom',
        path: ['completedAt'],
        message: 'completedAt must not precede startedAt'
      });
    }
  });

const missedCognitiveMeasurementSchema = z.object({
  ...cognitiveMeasurementBaseFields,
  status: z.literal('missed'),
  missedReason: z.enum(['forgotten', 'not_available', 'too_tired', 'technical_issue', 'other']).optional(),
  missedReasonNote: z.string().trim().min(1).optional()
})
  .strict()
  .superRefine((measurement, context) => {
    if (measurement.missedReasonNote !== undefined && measurement.missedReason === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['missedReasonNote'],
        message: 'A missed-reason note requires a missed reason'
      });
    }

    if (measurement.missedReason === 'other' && measurement.missedReasonNote === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['missedReasonNote'],
        message: 'The other missed reason requires a note'
      });
    }
  });

export const cognitiveMeasurementSchema = z.discriminatedUnion('status', [
  completedCognitiveMeasurementSchema,
  missedCognitiveMeasurementSchema
]).readonly();

export type CognitiveSlot = z.infer<typeof cognitiveSlotSchema>;
export type StudyStage = z.infer<typeof studyStageSchema>;
export type CognitiveSelfRatings = z.infer<typeof cognitiveSelfRatingsSchema>;
export type CognitiveMeasurement = z.infer<typeof cognitiveMeasurementSchema>;
