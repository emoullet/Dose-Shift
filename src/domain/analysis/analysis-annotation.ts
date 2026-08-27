import { z } from 'zod';

import { auditMetadataFields } from '../common/audit';
import { entityIdSchema } from '../common/identity';

export const analysisAnnotationSchema = z.object({
  id: entityIdSchema,
  studyId: entityIdSchema,
  targetType: z.enum(['day', 'cognitive_measurement', 'protocol_phase']),
  targetId: entityIdSchema,
  flag: z.enum(['atypical', 'exclude_from_primary_analysis', 'transition_day']),
  reason: z.string().trim().min(1),
  active: z.boolean(),
  ...auditMetadataFields
}).strict().readonly();

export type AnalysisAnnotation = z.infer<typeof analysisAnnotationSchema>;
