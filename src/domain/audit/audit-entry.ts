import { z } from 'zod';

import { entityIdSchema } from '../common/identity';
import { jsonObjectSchema } from '../common/json';
import { instantSchema } from '../common/time';

export const auditedEntityTypeSchema = z.enum([
  'study',
  'cognitive_test_configuration',
  'protocol_phase',
  'medication_intake',
  'cognitive_measurement',
  'pvt_session',
  'associative_memory_session',
  'catheterization_event',
  'night_observation',
  'daily_context',
  'caffeine_intake',
  'alcohol_intake',
  'additional_medication_intake',
  'analysis_annotation'
]);

export const auditEntrySchema = z.object({
  id: entityIdSchema,
  studyId: entityIdSchema,
  entityType: auditedEntityTypeSchema,
  entityId: entityIdSchema,
  changedAt: instantSchema,
  changedFields: z.array(z.string().trim().min(1)).min(1),
  previousValues: jsonObjectSchema,
  newValues: jsonObjectSchema,
  correctionReason: z.string().trim().min(1).optional()
})
  .strict()
  .superRefine((entry, context) => {
    if (new Set(entry.changedFields).size !== entry.changedFields.length) {
      context.addIssue({
        code: 'custom',
        path: ['changedFields'],
        message: 'changedFields must not contain duplicates'
      });
    }

    for (const field of entry.changedFields) {
      if (!(field in entry.previousValues) || !(field in entry.newValues)) {
        context.addIssue({
          code: 'custom',
          path: ['changedFields'],
          message: `Changed field ${field} must have previous and new values`
        });
      }
    }
  })
  .readonly();

export type AuditedEntityType = z.infer<typeof auditedEntityTypeSchema>;
export type AuditEntry = z.infer<typeof auditEntrySchema>;
