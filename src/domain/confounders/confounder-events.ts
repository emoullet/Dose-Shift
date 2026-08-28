import { z } from 'zod';

import { auditMetadataFields } from '../common/audit';
import { entityIdSchema } from '../common/identity';
import { instantSchema } from '../common/time';

const confounderEventBaseFields = {
  id: entityIdSchema,
  studyId: entityIdSchema,
  occurredAt: instantSchema,
  note: z.string().trim().min(1).optional(),
  ...auditMetadataFields
} as const;

export const caffeineIntakeSchema = z.object({
  ...confounderEventBaseFields,
  type: z.enum(['coffee', 'tea', 'other']),
  amountText: z.string().trim().min(1).optional()
}).strict().readonly();

export const alcoholIntakeSchema = z.object({
  ...confounderEventBaseFields,
  type: z.string().trim().min(1).optional(),
  amountText: z.string().trim().min(1).optional()
}).strict().readonly();

export const additionalMedicationIntakeSchema = z.object({
  ...confounderEventBaseFields,
  medicationName: z.string().trim().min(1),
  doseText: z.string().trim().min(1).optional(),
  potentiallySedating: z.boolean().optional(),
  potentiallyAnticholinergic: z.boolean().optional()
}).strict().readonly();

export type CaffeineIntake = z.infer<typeof caffeineIntakeSchema>;
export type AlcoholIntake = z.infer<typeof alcoholIntakeSchema>;
export type AdditionalMedicationIntake = z.infer<typeof additionalMedicationIntakeSchema>;
