import { z } from 'zod';

import { auditMetadataFields } from '../common/audit';
import { entityIdSchema } from '../common/identity';
import { instantSchema } from '../common/time';

export const pvtTrialSchema = z.object({
  id: entityIdSchema,
  presentationOrder: z.number().int().positive(),
  stimulusPresentedAt: instantSchema.optional(),
  reactionTimeMs: z.number().int().positive()
}).strict().readonly();

const pvtSessionBaseFields = {
  id: entityIdSchema,
  studyId: entityIdSchema,
  cognitiveMeasurementId: entityIdSchema,
  startedAt: instantSchema,
  completedAt: instantSchema,
  medianReactionTimeMs: z.number().positive(),
  lapseCount: z.number().int().nonnegative(),
  lapseThresholdMs: z.number().int().positive(),
  device: z.string().trim().min(1),
  responseMethod: z.string().trim().min(1),
  positionConditionsNote: z.string().trim().min(1).optional(),
  conditionChanged: z.boolean(),
  ...auditMetadataFields
} as const;

const externalPvtSessionSchema = z.object({
  ...pvtSessionBaseFields,
  source: z.literal('external'),
  implementationVersion: z.string().trim().min(1).optional(),
  rawTrials: z.array(pvtTrialSchema).min(1).optional()
}).strict();

const integratedPvtSessionSchema = z.object({
  ...pvtSessionBaseFields,
  source: z.literal('integrated'),
  implementationVersion: z.string().trim().min(1),
  rawTrials: z.array(pvtTrialSchema).min(1)
}).strict();

export const pvtSessionSchema = z.discriminatedUnion('source', [
  externalPvtSessionSchema,
  integratedPvtSessionSchema
])
  .superRefine((session, context) => {
    if (Date.parse(session.completedAt) < Date.parse(session.startedAt)) {
      context.addIssue({
        code: 'custom',
        path: ['completedAt'],
        message: 'completedAt must not precede startedAt'
      });
    }

    if (session.rawTrials !== undefined) {
      const orders = session.rawTrials.map(({ presentationOrder }) => presentationOrder);
      if (new Set(orders).size !== orders.length) {
        context.addIssue({
          code: 'custom',
          path: ['rawTrials'],
          message: 'PVT presentation orders must be unique'
        });
      }

      const calculatedMedian = median(
        session.rawTrials.map(({ reactionTimeMs }) => reactionTimeMs)
      );
      if (Math.abs(session.medianReactionTimeMs - calculatedMedian) > 1e-12) {
        context.addIssue({
          code: 'custom',
          path: ['medianReactionTimeMs'],
          message: 'medianReactionTimeMs must be calculated from the raw trials'
        });
      }

      const calculatedLapseCount = session.rawTrials.filter(({ reactionTimeMs }) =>
        reactionTimeMs >= session.lapseThresholdMs).length;
      if (session.lapseCount !== calculatedLapseCount) {
        context.addIssue({
          code: 'custom',
          path: ['lapseCount'],
          message: 'lapseCount must be calculated from the raw trials and threshold'
        });
      }
    }
  })
  .readonly();

export type PvtTrial = z.infer<typeof pvtTrialSchema>;
export type PvtSession = z.infer<typeof pvtSessionSchema>;

function median(values: readonly number[]): number {
  const sortedValues = [...values].sort((left, right) => left - right);
  const middleIndex = Math.floor(sortedValues.length / 2);
  if (sortedValues.length % 2 === 1) {
    return sortedValues[middleIndex]!;
  }

  return (sortedValues[middleIndex - 1]! + sortedValues[middleIndex]!) / 2;
}
