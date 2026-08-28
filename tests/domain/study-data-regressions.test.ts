import { describe, expect, it } from 'vitest';

import { analysisAnnotationSchema } from '../../src/domain/analysis/analysis-annotation';
import { createEntityId } from '../../src/domain/common/identity';
import { studyDataSchema } from '../../src/domain/study/study-data';
import { createCompleteStudyData } from '../fixtures/study-data';

describe('study-data aggregate regressions', () => {
  it('matches every medication outcome to its referenced plan and phase', () => {
    const data = createCompleteStudyData();
    const intake = data.medicationIntakes[0]!;

    for (const changedIntake of [
      { ...intake, medication: 'solifenacin' },
      { ...intake, plannedDoseMg: 10 },
      { ...intake, plannedTimeWindow: { startsAt: '21:00', endsAt: '22:00' } }
    ]) {
      expectAggregateIssue({
        ...data,
        medicationIntakes: [changedIntake, ...data.medicationIntakes.slice(1)]
      }, 'Medication identity, dose, and time window must match the referenced plan');
    }

    expectAggregateIssue({
      ...data,
      medicationIntakes: [
        { ...intake, plannedDate: '2026-09-08' },
        ...data.medicationIntakes.slice(1)
      ]
    }, 'Medication intake date must fall within the referenced phase');

    expectAggregateIssue({
      ...data,
      medicationIntakes: [
        ...data.medicationIntakes,
        { ...intake, id: createEntityId() }
      ]
    }, 'Only one outcome is allowed per planned medication and local date');
  });

  it('requires the complete contiguous phase plan and frozen configuration for active studies', () => {
    const data = createCompleteStudyData();

    expectAggregateIssue({ ...data, protocolPhases: [] },
      'An active study requires a complete A1, B, A2 phase plan');
    expectAggregateIssue({ ...data, cognitiveTestConfigurations: [] },
      'An active study requires exactly one frozen cognitive-test configuration');
    expectAggregateIssue({
      ...data,
      cognitiveTestConfigurations: [{
        ...data.cognitiveTestConfigurations[0]!,
        frozenAt: '2026-09-01T00:00:00+02:00'
      }]
    }, 'The cognitive-test configuration must be frozen before A1');

    const changedPhases = data.protocolPhases.map((phase) => phase.kind === 'B'
      ? { ...phase, startDate: '2026-09-09', endDate: '2026-09-15' }
      : phase);
    expectAggregateIssue({ ...data, protocolPhases: changedPhases },
      'Protocol phases must be contiguous and non-overlapping');

    expectAggregateIssue({
      ...data,
      protocolPhases: data.protocolPhases.map((phase) => phase.kind === 'A1'
        ? { ...phase, endDate: '2026-09-06' }
        : phase)
    }, 'Each protocol phase must span seven calendar days');
    expectAggregateIssue({
      ...data,
      study: { ...data.study, startDate: '2026-09-02' }
    }, 'A1 must start on the study start date');
  });

  it('keeps cognitive stages aligned to dates and prevents duplicate daily slots', () => {
    const data = createCompleteStudyData();
    const completedMeasurement = data.cognitiveMeasurements[0]!;

    expectAggregateIssue({
      ...data,
      cognitiveMeasurements: [
        { ...completedMeasurement, localDate: '2026-09-08' },
        ...data.cognitiveMeasurements.slice(1)
      ]
    }, 'Measurement stage must match its local date in the phase plan');

    expectAggregateIssue({
      ...data,
      cognitiveMeasurements: [
        ...data.cognitiveMeasurements,
        {
          id: createEntityId(),
          studyId: data.study.id,
          studyStage: 'A1',
          localDate: '2026-09-01',
          slot: 'morning',
          plannedLocalTime: '10:30',
          status: 'missed',
          missedReason: 'forgotten',
          createdAt: data.study.createdAt,
          updatedAt: data.study.updatedAt
        }
      ]
    }, 'A cognitive slot may occur only once per local date');
  });

  it('requires changed PVT administration to be marked and actively annotated', () => {
    const data = createCompleteStudyData();
    const session = data.pvtSessions[0]!;

    for (const changedSession of [
      { ...session, source: 'external' },
      { ...session, implementationVersion: '2.0' },
      { ...session, device: 'Different phone' },
      { ...session, responseMethod: 'Hardware button' }
    ]) {
      expectAggregateIssue({ ...data, pvtSessions: [changedSession] },
        'A PVT administration change must be marked explicitly');
    }

    const changedSession = { ...session, device: 'Different phone', conditionChanged: true };
    expectAggregateIssue({ ...data, pvtSessions: [changedSession] },
      'Changed PVT administration conditions require an active atypical session annotation');

    expectAggregateIssue({
      ...data,
      cognitiveTestConfigurations: [{
        ...data.cognitiveTestConfigurations[0]!,
        pvtLapseThresholdMs: 400
      }]
    }, 'PVT session must use the frozen lapse threshold');

    const atypicalAnnotation = {
      id: createEntityId(),
      studyId: data.study.id,
      targetType: 'cognitive_measurement',
      targetId: session.cognitiveMeasurementId,
      flag: 'atypical',
      reason: 'PVT device changed for this session',
      active: true,
      createdAt: data.study.createdAt,
      updatedAt: data.study.updatedAt
    };
    expect(studyDataSchema.safeParse({
      ...data,
      pvtSessions: [changedSession],
      analysisAnnotations: [...data.analysisAnnotations, atypicalAnnotation]
    }).success).toBe(true);
  });

  it('keeps day-level analysis state exclusively in DailyContext', () => {
    const data = createCompleteStudyData();
    expect(data.dailyContexts[0]!.analysis.flag).toBe('atypical');

    expect(analysisAnnotationSchema.safeParse({
      id: createEntityId(),
      studyId: data.study.id,
      targetType: 'day',
      targetId: data.dailyContexts[0]!.id,
      flag: 'exclude_from_primary_analysis',
      reason: 'Contradictory duplicate day state',
      active: true,
      createdAt: data.study.createdAt,
      updatedAt: data.study.updatedAt
    }).success).toBe(false);
  });
});

function expectAggregateIssue(value: unknown, expectedMessage: string): void {
  const result = studyDataSchema.safeParse(value);
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.issues.map(({ message }) => message)).toContain(expectedMessage);
  }
}
