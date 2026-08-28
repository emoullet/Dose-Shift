import { z } from 'zod';

import { auditMetadataFields } from '../common/audit';
import { entityIdSchema } from '../common/identity';
import { instantSchema, localDateSchema, timeZoneSchema } from '../common/time';

export const studySchema = z.object({
  id: entityIdSchema,
  protocolVersion: z.string().trim().min(1),
  startDate: localDateSchema,
  timeZone: timeZoneSchema,
  status: z.enum(['draft', 'active', 'completed', 'stopped']),
  stoppedAt: instantSchema.optional(),
  stopReason: z.string().trim().min(1).optional(),
  ...auditMetadataFields
})
  .strict()
  .superRefine((study, context) => {
    if (study.status === 'stopped' && study.stoppedAt === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['stoppedAt'],
        message: 'A stopped study requires stoppedAt'
      });
    }

    if (study.status !== 'stopped' && (study.stoppedAt !== undefined || study.stopReason !== undefined)) {
      context.addIssue({
        code: 'custom',
        path: ['status'],
        message: 'Stop metadata is only valid for a stopped study'
      });
    }
  })
  .readonly();

export type Study = z.infer<typeof studySchema>;
