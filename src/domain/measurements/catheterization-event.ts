import { z } from 'zod';

import { auditMetadataFields } from '../common/audit';
import { entityIdSchema } from '../common/identity';
import { instantSchema } from '../common/time';

export const catheterizationEventSchema = z.object({
  id: entityIdSchema,
  studyId: entityIdSchema,
  occurredAt: instantSchema,
  catheterizedVolumeMl: z.number().nonnegative(),
  leakageSincePreviousCatheterization: z.boolean(),
  unusualUrgency: z.boolean(),
  atypicalBladderSensation: z.boolean(),
  note: z.string().trim().min(1).optional(),
  ...auditMetadataFields
}).strict().readonly();

export type CatheterizationEvent = z.infer<typeof catheterizationEventSchema>;
