import { z } from 'zod';

import { auditMetadataFields } from '../common/audit';
import { entityIdSchema } from '../common/identity';

const analysisAnnotationBaseFields = {
  id: entityIdSchema,
  studyId: entityIdSchema,
  targetId: entityIdSchema,
  reason: z.string().trim().min(1),
  active: z.boolean(),
  ...auditMetadataFields
} as const;

export const analysisAnnotationSchema = z.discriminatedUnion('targetType', [
  z.object({
    ...analysisAnnotationBaseFields,
    targetType: z.literal('cognitive_measurement'),
    flag: z.enum(['atypical', 'exclude_from_primary_analysis'])
  }).strict(),
  z.object({
    ...analysisAnnotationBaseFields,
    targetType: z.literal('protocol_phase'),
    flag: z.literal('transition_day')
  }).strict()
]).readonly();

export type AnalysisAnnotation = z.infer<typeof analysisAnnotationSchema>;
