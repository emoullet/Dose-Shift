import { z } from 'zod';

import { auditMetadataFields } from '../common/audit';
import { entityIdSchema } from '../common/identity';
import { instantSchema, localDateSchema } from '../common/time';
import { medicationIdentifierSchema, plannedTimeWindowSchema } from './protocol-phase';

const medicationIntakeBaseFields = {
  id: entityIdSchema,
  studyId: entityIdSchema,
  plannedMedicationId: entityIdSchema,
  plannedDate: localDateSchema,
  plannedTimeWindow: plannedTimeWindowSchema,
  medication: medicationIdentifierSchema,
  plannedDoseMg: z.number().positive(),
  note: z.string().trim().min(1).optional(),
  ...auditMetadataFields
} as const;

const takenMedicationIntakeSchema = z.object({
  ...medicationIntakeBaseFields,
  status: z.literal('taken'),
  takenAt: instantSchema,
  actualDoseMg: z.number().positive().optional()
}).strict();

const missedMedicationIntakeSchema = z.object({
  ...medicationIntakeBaseFields,
  status: z.literal('missed')
}).strict();

const partialMedicationIntakeSchema = z.object({
  ...medicationIntakeBaseFields,
  status: z.literal('partial'),
  takenAt: instantSchema.optional(),
  actualDoseMg: z.number().positive()
}).strict();

const uncertainMedicationIntakeSchema = z.object({
  ...medicationIntakeBaseFields,
  status: z.literal('uncertain'),
  takenAt: instantSchema.optional(),
  actualDoseMg: z.number().positive().optional()
}).strict();

export const medicationIntakeSchema = z.discriminatedUnion('status', [
  takenMedicationIntakeSchema,
  missedMedicationIntakeSchema,
  partialMedicationIntakeSchema,
  uncertainMedicationIntakeSchema
])
  .superRefine((intake, context) => {
    if (intake.status === 'partial' && intake.actualDoseMg >= intake.plannedDoseMg) {
      context.addIssue({
        code: 'custom',
        path: ['actualDoseMg'],
        message: 'A partial dose must be lower than the planned dose'
      });
    }
  })
  .readonly();

export type MedicationIntake = z.infer<typeof medicationIntakeSchema>;
