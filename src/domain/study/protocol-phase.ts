import { z } from 'zod';

import { entityIdSchema } from '../common/identity';
import { localDateSchema, localTimeSchema } from '../common/time';

export const protocolPhaseKindSchema = z.enum(['A1', 'B', 'A2']);
export const medicationIdentifierSchema = z.enum(['fesoterodine', 'solifenacin']);

export const plannedTimeWindowSchema = z.object({
  startsAt: localTimeSchema,
  endsAt: localTimeSchema
})
  .strict()
  .superRefine((window, context) => {
    if (window.endsAt < window.startsAt) {
      context.addIssue({
        code: 'custom',
        path: ['endsAt'],
        message: 'The planned time window must not end before it starts'
      });
    }
  })
  .readonly();

export const plannedMedicationSchema = z.object({
  id: entityIdSchema,
  medication: medicationIdentifierSchema,
  doseMg: z.number().positive(),
  formulation: z.enum(['extended_release', 'standard']),
  timeWindow: plannedTimeWindowSchema
}).strict().readonly();

export const protocolPhaseSchema = z.object({
  id: entityIdSchema,
  studyId: entityIdSchema,
  kind: protocolPhaseKindSchema,
  sequenceOrder: z.number().int().positive(),
  startDate: localDateSchema,
  endDate: localDateSchema,
  isTransitionStart: z.boolean(),
  medicationSchedule: z.array(plannedMedicationSchema).min(2)
})
  .strict()
  .superRefine((phase, context) => {
    if (phase.endDate < phase.startDate) {
      context.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: 'A protocol phase must not end before it starts'
      });
    }

    const medicationIds = phase.medicationSchedule.map(({ medication }) => medication);
    if (new Set(medicationIds).size !== medicationIds.length) {
      context.addIssue({
        code: 'custom',
        path: ['medicationSchedule'],
        message: 'A phase must contain at most one schedule entry per medication'
      });
    }

    const expectedFesoterodineWindow = phase.kind === 'B'
      ? { startsAt: '21:00', endsAt: '22:00' }
      : { startsAt: '08:30', endsAt: '09:00' };
    validatePlannedMedication(
      phase.medicationSchedule.find(({ medication }) => medication === 'fesoterodine'),
      {
        doseMg: 8,
        formulation: 'extended_release',
        timeWindow: expectedFesoterodineWindow
      },
      'fesoterodine',
      context
    );
    validatePlannedMedication(
      phase.medicationSchedule.find(({ medication }) => medication === 'solifenacin'),
      {
        doseMg: 10,
        formulation: 'standard',
        timeWindow: { startsAt: '08:30', endsAt: '09:00' }
      },
      'solifenacin',
      context
    );
  })
  .readonly();

export type ProtocolPhaseKind = z.infer<typeof protocolPhaseKindSchema>;
export type MedicationIdentifier = z.infer<typeof medicationIdentifierSchema>;
export type PlannedTimeWindow = z.infer<typeof plannedTimeWindowSchema>;
export type PlannedMedication = z.infer<typeof plannedMedicationSchema>;
export type ProtocolPhase = z.infer<typeof protocolPhaseSchema>;

interface ExpectedPlannedMedication {
  readonly doseMg: number;
  readonly formulation: 'extended_release' | 'standard';
  readonly timeWindow: { readonly startsAt: string; readonly endsAt: string };
}

function validatePlannedMedication(
  medication: z.infer<typeof plannedMedicationSchema> | undefined,
  expected: ExpectedPlannedMedication,
  identifier: z.infer<typeof medicationIdentifierSchema>,
  context: z.RefinementCtx
): void {
  if (medication === undefined || medication.doseMg !== expected.doseMg ||
    medication.formulation !== expected.formulation ||
    medication.timeWindow.startsAt !== expected.timeWindow.startsAt ||
    medication.timeWindow.endsAt !== expected.timeWindow.endsAt) {
    context.addIssue({
      code: 'custom',
      path: ['medicationSchedule'],
      message: `The ${identifier} schedule must match the controlled protocol`
    });
  }
}
