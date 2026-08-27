import { createEntityId } from '../../src/domain/common/identity';
import { studyDataSchema, type StudyData } from '../../src/domain/study/study-data';

const createdAt = '2026-08-30T10:00:00+02:00';
const updatedAt = '2026-09-01T12:00:00+02:00';

export function createCompleteStudyData(): StudyData {
  const studyId = createEntityId();
  const configurationId = createEntityId();
  const dailyContextId = createEntityId();
  const completedMeasurementId = createEntityId();
  const missedMeasurementId = createEntityId();
  const fesoterodineScheduleId = createEntityId();
  const solifenacinScheduleId = createEntityId();
  const takenIntakeId = createEntityId();

  const phase = (
    kind: 'A1' | 'B' | 'A2',
    sequenceOrder: number,
    startDate: string,
    endDate: string,
    fesoterodineWindow: { startsAt: string; endsAt: string }
  ) => ({
    id: createEntityId(),
    studyId,
    kind,
    sequenceOrder,
    startDate,
    endDate,
    isTransitionStart: kind !== 'A1',
    medicationSchedule: [
      {
        id: kind === 'A1' ? fesoterodineScheduleId : createEntityId(),
        medication: 'fesoterodine',
        doseMg: 8,
        formulation: 'extended_release',
        timeWindow: fesoterodineWindow
      },
      {
        id: kind === 'A1' ? solifenacinScheduleId : createEntityId(),
        medication: 'solifenacin',
        doseMg: 10,
        formulation: 'standard',
        timeWindow: { startsAt: '08:30', endsAt: '09:00' }
      }
    ]
  });

  return studyDataSchema.parse({
    study: {
      id: studyId,
      protocolVersion: '1.0',
      startDate: '2026-09-01',
      timeZone: 'Europe/Paris',
      status: 'active',
      createdAt,
      updatedAt
    },
    cognitiveTestConfigurations: [{
      id: configurationId,
      studyId,
      memoryItemCount: 2,
      memoryDifficultyLevel: 'familiarized-level-1',
      distractorType: 'adjacent-value',
      stimulusGenerationRulesVersion: '1.0',
      pvtLapseThresholdMs: 500,
      pvtAdministration: {
        source: 'integrated',
        implementationVersion: '1.0',
        durationSeconds: 180,
        device: 'Reference phone',
        responseMethod: 'Touch screen'
      },
      frozenAt: '2026-08-31T18:00:00+02:00',
      createdAt,
      updatedAt
    }],
    protocolPhases: [
      phase('A1', 1, '2026-09-01', '2026-09-07', { startsAt: '08:30', endsAt: '09:00' }),
      phase('B', 2, '2026-09-08', '2026-09-14', { startsAt: '21:00', endsAt: '22:00' }),
      phase('A2', 3, '2026-09-15', '2026-09-21', { startsAt: '08:30', endsAt: '09:00' })
    ],
    medicationIntakes: [
      {
        id: takenIntakeId,
        studyId,
        plannedMedicationId: fesoterodineScheduleId,
        plannedDate: '2026-09-01',
        plannedTimeWindow: { startsAt: '08:30', endsAt: '09:00' },
        medication: 'fesoterodine',
        plannedDoseMg: 8,
        status: 'taken',
        takenAt: '2026-09-01T08:42:00+02:00',
        actualDoseMg: 8,
        createdAt,
        updatedAt
      },
      {
        id: createEntityId(),
        studyId,
        plannedMedicationId: solifenacinScheduleId,
        plannedDate: '2026-09-01',
        plannedTimeWindow: { startsAt: '08:30', endsAt: '09:00' },
        medication: 'solifenacin',
        plannedDoseMg: 10,
        status: 'missed',
        note: 'Explicitly recorded omission',
        createdAt,
        updatedAt
      },
      {
        id: createEntityId(),
        studyId,
        plannedMedicationId: fesoterodineScheduleId,
        plannedDate: '2026-09-02',
        plannedTimeWindow: { startsAt: '08:30', endsAt: '09:00' },
        medication: 'fesoterodine',
        plannedDoseMg: 8,
        status: 'partial',
        takenAt: '2026-09-02T08:45:00+02:00',
        actualDoseMg: 4,
        createdAt,
        updatedAt
      },
      {
        id: createEntityId(),
        studyId,
        plannedMedicationId: solifenacinScheduleId,
        plannedDate: '2026-09-02',
        plannedTimeWindow: { startsAt: '08:30', endsAt: '09:00' },
        medication: 'solifenacin',
        plannedDoseMg: 10,
        status: 'uncertain',
        note: 'Timing could not be confirmed',
        createdAt,
        updatedAt
      }
    ],
    cognitiveMeasurements: [
      {
        id: completedMeasurementId,
        studyId,
        studyStage: 'A1',
        localDate: '2026-09-01',
        slot: 'morning',
        plannedLocalTime: '10:30',
        status: 'completed',
        startedAt: '2026-09-01T10:31:00+02:00',
        completedAt: '2026-09-01T10:36:00+02:00',
        selfRatings: {
          sleepinessScore: 3,
          mentalFogScore: 2,
          concentrationDifficultyScore: 2,
          mentalFatigueScore: 3,
          memoryDifficulty: { status: 'difficult_to_assess' }
        },
        createdAt,
        updatedAt
      },
      {
        id: missedMeasurementId,
        studyId,
        studyStage: 'A1',
        localDate: '2026-09-01',
        slot: 'afternoon',
        plannedLocalTime: '14:30',
        status: 'missed',
        missedReason: 'technical_issue',
        missedReasonNote: 'Device battery was depleted',
        createdAt,
        updatedAt
      }
    ],
    pvtSessions: [{
      id: createEntityId(),
      studyId,
      cognitiveMeasurementId: completedMeasurementId,
      source: 'integrated',
      startedAt: '2026-09-01T10:32:00+02:00',
      completedAt: '2026-09-01T10:35:00+02:00',
      medianReactionTimeMs: 320,
      lapseCount: 1,
      lapseThresholdMs: 500,
      implementationVersion: '1.0',
      device: 'Reference phone',
      responseMethod: 'Touch screen',
      conditionChanged: false,
      rawTrials: [
        { id: createEntityId(), presentationOrder: 1, reactionTimeMs: 310 },
        { id: createEntityId(), presentationOrder: 2, reactionTimeMs: 320 },
        { id: createEntityId(), presentationOrder: 3, reactionTimeMs: 520 }
      ],
      createdAt,
      updatedAt
    }],
    associativeMemorySessions: [{
      id: createEntityId(),
      studyId,
      cognitiveMeasurementId: completedMeasurementId,
      cognitiveTestConfigurationId: configurationId,
      encodingStartedAt: '2026-09-01T10:31:00+02:00',
      encodingCompletedAt: '2026-09-01T10:32:00+02:00',
      recognitionStartedAt: '2026-09-01T10:35:00+02:00',
      recognitionCompletedAt: '2026-09-01T10:36:00+02:00',
      itemCount: 2,
      correctResponseCount: 1,
      accuracyProportion: 0.5,
      generatorVersion: '1.0',
      trials: [
        {
          id: createEntityId(),
          presentationOrder: 1,
          objectStimulusId: 'apple',
          encodedValue: '17',
          distractorValue: '42',
          displayedAnswerOrder: ['17', '42'],
          selectedValue: '17',
          isCorrect: true,
          responseTimeMs: 920
        },
        {
          id: createEntityId(),
          presentationOrder: 2,
          objectStimulusId: 'chair',
          encodedValue: '24',
          distractorValue: '31',
          displayedAnswerOrder: ['31', '24'],
          selectedValue: '31',
          isCorrect: false,
          responseTimeMs: 1310
        }
      ],
      createdAt,
      updatedAt
    }],
    catheterizationEvents: [{
      id: createEntityId(),
      studyId,
      occurredAt: '2026-09-01T12:05:00+02:00',
      catheterizedVolumeMl: 420,
      leakageSincePreviousCatheterization: false,
      unusualUrgency: false,
      atypicalBladderSensation: false,
      createdAt,
      updatedAt
    }],
    nightObservations: [{
      id: createEntityId(),
      studyId,
      nightDate: '2026-09-01',
      leakageOccurred: false,
      bladderRelatedAwakening: true,
      awakeningCount: 1,
      createdAt,
      updatedAt
    }],
    dailyContexts: [{
      id: dailyContextId,
      studyId,
      localDate: '2026-09-01',
      bedtime: '2026-08-31T23:00:00+02:00',
      wakeTime: '2026-09-01T07:00:00+02:00',
      sleepQualityScore: 7,
      unusualPain: { present: false },
      unusualPhysicalActivity: { present: true, note: 'Long walk' },
      unusualLargeOrShiftedMeal: { present: false },
      urinaryOrInfectionSymptoms: { present: false },
      concomitantTreatmentChange: { present: false },
      analysis: { flag: 'atypical', reason: 'Unusual physical activity' },
      createdAt,
      updatedAt
    }],
    caffeineIntakes: [{
      id: createEntityId(),
      studyId,
      occurredAt: '2026-09-01T08:10:00+02:00',
      type: 'coffee',
      amountText: 'One cup',
      createdAt,
      updatedAt
    }],
    alcoholIntakes: [{
      id: createEntityId(),
      studyId,
      occurredAt: '2026-08-31T20:00:00+02:00',
      type: 'wine',
      amountText: 'One glass',
      createdAt,
      updatedAt
    }],
    additionalMedicationIntakes: [{
      id: createEntityId(),
      studyId,
      occurredAt: '2026-09-01T09:00:00+02:00',
      medicationName: 'Example concomitant medication',
      doseText: 'One tablet',
      potentiallySedating: false,
      potentiallyAnticholinergic: false,
      createdAt,
      updatedAt
    }],
    analysisAnnotations: [{
      id: createEntityId(),
      studyId,
      targetType: 'day',
      targetId: dailyContextId,
      flag: 'exclude_from_primary_analysis',
      reason: 'Sensitivity-analysis example',
      active: false,
      createdAt,
      updatedAt
    }],
    auditEntries: [{
      id: createEntityId(),
      studyId,
      entityType: 'medication_intake',
      entityId: takenIntakeId,
      changedAt: updatedAt,
      changedFields: ['status'],
      previousValues: { status: 'uncertain' },
      newValues: { status: 'taken' },
      correctionReason: 'Confirmed from contemporaneous note'
    }]
  });
}
