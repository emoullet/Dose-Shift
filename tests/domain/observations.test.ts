import { describe, expect, it } from 'vitest';

import { createEntityId } from '../../src/domain/common/identity';
import { cognitiveMeasurementSchema } from '../../src/domain/measurements/cognitive-measurement';
import { dailyContextSchema } from '../../src/domain/measurements/daily-context';
import { medicationIntakeSchema } from '../../src/domain/study/medication-intake';
import { studyDataSchema } from '../../src/domain/study/study-data';
import { createCompleteStudyData } from '../fixtures/study-data';

const auditMetadata = {
  createdAt: '2026-09-01T08:00:00+02:00',
  updatedAt: '2026-09-01T08:00:00+02:00'
};

const medicationBase = {
  id: createEntityId(),
  studyId: createEntityId(),
  plannedMedicationId: createEntityId(),
  plannedDate: '2026-09-01',
  plannedTimeWindow: { startsAt: '08:30', endsAt: '09:00' },
  medication: 'fesoterodine',
  plannedDoseMg: 8,
  ...auditMetadata
};

describe('documented observation schemas', () => {
  it('accepts every explicit medication status with its permitted conditional fields', () => {
    expect(medicationIntakeSchema.safeParse({
      ...medicationBase,
      status: 'taken',
      takenAt: '2026-09-01T08:42:00+02:00'
    }).success).toBe(true);
    expect(medicationIntakeSchema.safeParse({ ...medicationBase, status: 'missed' }).success).toBe(true);
    expect(medicationIntakeSchema.safeParse({
      ...medicationBase,
      status: 'partial',
      actualDoseMg: 4
    }).success).toBe(true);
    expect(medicationIntakeSchema.safeParse({ ...medicationBase, status: 'uncertain' }).success).toBe(true);
  });

  it('rejects medication status and timing combinations that contradict the protocol record', () => {
    expect(medicationIntakeSchema.safeParse({ ...medicationBase, status: 'taken' }).success).toBe(false);
    expect(medicationIntakeSchema.safeParse({
      ...medicationBase,
      status: 'missed',
      takenAt: '2026-09-01T08:42:00+02:00'
    }).success).toBe(false);
    expect(medicationIntakeSchema.safeParse({
      ...medicationBase,
      status: 'partial',
      actualDoseMg: 8
    }).success).toBe(false);
  });

  it('represents a missed cognitive measurement without placeholder scores or timestamps', () => {
    const missedMeasurement = {
      id: createEntityId(),
      studyId: createEntityId(),
      studyStage: 'A1',
      localDate: '2026-09-01',
      slot: 'afternoon',
      plannedLocalTime: '14:30',
      status: 'missed',
      missedReason: 'too_tired',
      ...auditMetadata
    };

    expect(cognitiveMeasurementSchema.safeParse(missedMeasurement).success).toBe(true);
    expect(cognitiveMeasurementSchema.safeParse({
      ...missedMeasurement,
      selfRatings: {
        sleepinessScore: 0,
        mentalFogScore: 0,
        concentrationDifficultyScore: 0,
        mentalFatigueScore: 0,
        memoryDifficulty: { status: 'rated', score: 0 }
      }
    }).success).toBe(false);
  });

  it('requires an explicit reason for atypical or excluded daily context', () => {
    const data = createCompleteStudyData();
    const context = data.dailyContexts[0]!;

    expect(dailyContextSchema.safeParse({
      ...context,
      analysis: { flag: 'exclude_from_primary_analysis' }
    }).success).toBe(false);
    expect(dailyContextSchema.safeParse({
      ...context,
      analysis: { flag: 'normal', reason: 'Not valid for a normal day' }
    }).success).toBe(false);
  });

  it('validates a complete study dataset against one enclosing study', () => {
    const data = createCompleteStudyData();
    expect(studyDataSchema.safeParse(data).success).toBe(true);

    expect(studyDataSchema.safeParse({
      ...data,
      caffeineIntakes: [{ ...data.caffeineIntakes[0]!, studyId: createEntityId() }]
    }).success).toBe(false);

    const missedMeasurement = data.cognitiveMeasurements.find(({ status }) => status === 'missed')!;
    expect(studyDataSchema.safeParse({
      ...data,
      pvtSessions: [{
        ...data.pvtSessions[0]!,
        cognitiveMeasurementId: missedMeasurement.id
      }]
    }).success).toBe(false);
  });
});
