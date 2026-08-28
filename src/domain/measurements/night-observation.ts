import { z } from 'zod';

import { auditMetadataFields } from '../common/audit';
import { entityIdSchema } from '../common/identity';
import { localDateSchema } from '../common/time';

export const nightObservationSchema = z.object({
  id: entityIdSchema,
  studyId: entityIdSchema,
  nightDate: localDateSchema,
  leakageOccurred: z.boolean(),
  bladderRelatedAwakening: z.boolean(),
  awakeningCount: z.number().int().positive().optional(),
  note: z.string().trim().min(1).optional(),
  ...auditMetadataFields
})
  .strict()
  .superRefine((observation, context) => {
    if (!observation.bladderRelatedAwakening && observation.awakeningCount !== undefined) {
      context.addIssue({
        code: 'custom',
        path: ['awakeningCount'],
        message: 'An awakening count requires a bladder-related awakening'
      });
    }
  })
  .readonly();

export type NightObservation = z.infer<typeof nightObservationSchema>;
