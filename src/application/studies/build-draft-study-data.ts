import { z } from 'zod';

import { addCalendarDays } from '../../domain/common/calendar';
import { createEntityId, type EntityId } from '../../domain/common/identity';
import {
  localDateSchema,
  nowAsInstant,
  timeZoneSchema,
  type Instant,
  type LocalDate,
  type TimeZone
} from '../../domain/common/time';
import { studyDataSchema, type StudyData } from '../../domain/study/study-data';

export const canonicalProtocolVersion = '1.1';
export const defaultPhaseDurationDays = 7;
export const minimumPhaseDurationDays = 1;
export const maximumPhaseDurationDays = 90;

const draftStudyInputSchema = z.object({
  a1StartDate: localDateSchema,
  timeZone: timeZoneSchema,
  phaseDurationDays: z.number().int().min(minimumPhaseDurationDays).max(maximumPhaseDurationDays)
}).strict();

export interface DraftStudyInput {
  readonly a1StartDate: LocalDate;
  readonly timeZone: TimeZone;
  readonly phaseDurationDays: number;
}

export interface DraftStudyBuilderDependencies {
  readonly createId: () => EntityId;
  readonly now: () => Instant;
}

const defaultDependencies: DraftStudyBuilderDependencies = {
  createId: createEntityId,
  now: nowAsInstant
};

export function buildDraftStudyData(
  input: DraftStudyInput,
  dependencies: DraftStudyBuilderDependencies = defaultDependencies
): StudyData {
  const validatedInput = draftStudyInputSchema.parse(input);
  const studyId = dependencies.createId();
  const timestamp = dependencies.now();
  const phaseStarts = [
    validatedInput.a1StartDate,
    addCalendarDays(validatedInput.a1StartDate, validatedInput.phaseDurationDays),
    addCalendarDays(validatedInput.a1StartDate, validatedInput.phaseDurationDays * 2)
  ] as const;
  const phaseKinds = ['A1', 'B', 'A2'] as const;

  const protocolPhases = phaseKinds.map((kind, index) => ({
    id: dependencies.createId(),
    studyId,
    kind,
    sequenceOrder: index + 1,
    startDate: phaseStarts[index]!,
    endDate: addCalendarDays(phaseStarts[index]!, validatedInput.phaseDurationDays - 1),
    isTransitionStart: index > 0,
    medicationSchedule: [
      {
        id: dependencies.createId(),
        medication: 'fesoterodine' as const,
        doseMg: 8,
        formulation: 'extended_release' as const,
        timeWindow: kind === 'B'
          ? { startsAt: '21:00' as const, endsAt: '22:00' as const }
          : { startsAt: '08:30' as const, endsAt: '09:00' as const }
      },
      {
        id: dependencies.createId(),
        medication: 'solifenacin' as const,
        doseMg: 10,
        formulation: 'standard' as const,
        timeWindow: { startsAt: '08:30' as const, endsAt: '09:00' as const }
      }
    ]
  }));

  return studyDataSchema.parse({
    study: {
      id: studyId,
      protocolVersion: canonicalProtocolVersion,
      startDate: validatedInput.a1StartDate,
      timeZone: validatedInput.timeZone,
      status: 'draft',
      createdAt: timestamp,
      updatedAt: timestamp
    },
    cognitiveTestConfigurations: [],
    protocolPhases,
    medicationIntakes: [],
    cognitiveMeasurements: [],
    pvtSessions: [],
    associativeMemorySessions: [],
    catheterizationEvents: [],
    nightObservations: [],
    dailyContexts: [],
    caffeineIntakes: [],
    alcoholIntakes: [],
    additionalMedicationIntakes: [],
    analysisAnnotations: [],
    auditEntries: []
  });
}
