import { z } from 'zod';

import { analysisAnnotationSchema } from '../analysis/analysis-annotation';
import { auditEntrySchema } from '../audit/audit-entry';
import { calendarDaysBetween } from '../common/calendar';
import { localDateForInstant } from '../common/time';
import {
  additionalMedicationIntakeSchema,
  alcoholIntakeSchema,
  caffeineIntakeSchema
} from '../confounders/confounder-events';
import { associativeMemorySessionSchema } from '../measurements/associative-memory-session';
import { catheterizationEventSchema } from '../measurements/catheterization-event';
import { cognitiveMeasurementSchema } from '../measurements/cognitive-measurement';
import { dailyContextSchema } from '../measurements/daily-context';
import { nightObservationSchema } from '../measurements/night-observation';
import { pvtSessionSchema } from '../measurements/pvt-session';
import { cognitiveTestConfigurationSchema } from './cognitive-test-configuration';
import { medicationIntakeSchema } from './medication-intake';
import { protocolPhaseSchema } from './protocol-phase';
import { studySchema } from './study';

const studyDataObjectSchema = z.object({
  study: studySchema,
  cognitiveTestConfigurations: z.array(cognitiveTestConfigurationSchema),
  protocolPhases: z.array(protocolPhaseSchema),
  medicationIntakes: z.array(medicationIntakeSchema),
  cognitiveMeasurements: z.array(cognitiveMeasurementSchema),
  pvtSessions: z.array(pvtSessionSchema),
  associativeMemorySessions: z.array(associativeMemorySessionSchema),
  catheterizationEvents: z.array(catheterizationEventSchema),
  nightObservations: z.array(nightObservationSchema),
  dailyContexts: z.array(dailyContextSchema),
  caffeineIntakes: z.array(caffeineIntakeSchema),
  alcoholIntakes: z.array(alcoholIntakeSchema),
  additionalMedicationIntakes: z.array(additionalMedicationIntakeSchema),
  analysisAnnotations: z.array(analysisAnnotationSchema),
  auditEntries: z.array(auditEntrySchema)
}).strict();

type StudyDataValue = z.infer<typeof studyDataObjectSchema>;

export const studyDataSchema = studyDataObjectSchema
  .superRefine((data, context) => {
    validateStudyScopedCollections(data, context);
    const orderedPhases = validatePhasePlan(data, context);
    validateCognitiveConfiguration(data, orderedPhases, context);
    validateMeasurements(data, orderedPhases, context);
    validateObjectiveSessions(data, context);
    validateMedicationIntakes(data, context);
    validateAnnotations(data, context);
  })
  .readonly();

export type StudyData = z.infer<typeof studyDataSchema>;

type OrderedPhases = readonly [
  StudyDataValue['protocolPhases'][number],
  StudyDataValue['protocolPhases'][number],
  StudyDataValue['protocolPhases'][number]
];

function validateStudyScopedCollections(data: StudyDataValue, context: z.RefinementCtx): void {
  const studyScopedCollections = [
    ['cognitiveTestConfigurations', data.cognitiveTestConfigurations],
    ['protocolPhases', data.protocolPhases],
    ['medicationIntakes', data.medicationIntakes],
    ['cognitiveMeasurements', data.cognitiveMeasurements],
    ['pvtSessions', data.pvtSessions],
    ['associativeMemorySessions', data.associativeMemorySessions],
    ['catheterizationEvents', data.catheterizationEvents],
    ['nightObservations', data.nightObservations],
    ['dailyContexts', data.dailyContexts],
    ['caffeineIntakes', data.caffeineIntakes],
    ['alcoholIntakes', data.alcoholIntakes],
    ['additionalMedicationIntakes', data.additionalMedicationIntakes],
    ['analysisAnnotations', data.analysisAnnotations],
    ['auditEntries', data.auditEntries]
  ] as const;

  for (const [collectionName, entities] of studyScopedCollections) {
    entities.forEach((entity, index) => {
      if (entity.studyId !== data.study.id) {
        addIssue(context, [collectionName, index, 'studyId'],
          'Entity studyId must match the enclosing study');
      }
    });

    const ids = entities.map(({ id }) => id);
    if (new Set(ids).size !== ids.length) {
      addIssue(context, [collectionName], 'Entity identifiers must be unique within a collection');
    }
  }
}

function validatePhasePlan(
  data: StudyDataValue,
  context: z.RefinementCtx
): OrderedPhases | undefined {
  if (data.study.status === 'active' && data.protocolPhases.length !== 3) {
    addIssue(context, ['protocolPhases'], 'An active study requires a complete A1, B, A2 phase plan');
  }

  if (data.protocolPhases.length === 0) {
    return undefined;
  }

  const ordered = [...data.protocolPhases].sort((left, right) =>
    left.sequenceOrder - right.sequenceOrder);
  const expectedKinds = ['A1', 'B', 'A2'] as const;
  const hasCompleteSequence = ordered.length === expectedKinds.length &&
    ordered.every((phase, index) =>
      phase.kind === expectedKinds[index] && phase.sequenceOrder === index + 1);
  if (!hasCompleteSequence) {
    addIssue(context, ['protocolPhases'], 'The analyzed protocol phases must be ordered A1, B, A2');
    return undefined;
  }

  const phases: OrderedPhases = [ordered[0]!, ordered[1]!, ordered[2]!];
  if (phases[0].startDate !== data.study.startDate) {
    addIssue(context, ['protocolPhases', 0, 'startDate'], 'A1 must start on the study start date');
  }

  const phaseDurations = phases.map((phase) =>
    calendarDaysBetween(phase.startDate, phase.endDate) + 1);
  phases.forEach((phase, index) => {
    const duration = phaseDurations[index]!;
    if (!Number.isInteger(duration) || duration < 1 || duration > 90) {
      addIssue(context, ['protocolPhases', index],
        'Each protocol phase must span between 1 and 90 calendar days');
    }
    if (phase.isTransitionStart !== (index > 0)) {
      addIssue(context, ['protocolPhases', index, 'isTransitionStart'],
        'Only B and A2 begin on transition days');
    }
    if (index > 0 &&
      calendarDaysBetween(phases[index - 1]!.endDate, phase.startDate) !== 1) {
      addIssue(context, ['protocolPhases', index, 'startDate'],
        'Protocol phases must be contiguous and non-overlapping');
    }
  });

  if (new Set(phaseDurations).size !== 1) {
    addIssue(context, ['protocolPhases'], 'A1, B, and A2 must have equal durations');
  }

  return phases;
}

function validateCognitiveConfiguration(
  data: StudyDataValue,
  phases: OrderedPhases | undefined,
  context: z.RefinementCtx
): void {
  if (data.study.status !== 'active') {
    return;
  }

  if (data.cognitiveTestConfigurations.length !== 1) {
    addIssue(context, ['cognitiveTestConfigurations'],
      'An active study requires exactly one frozen cognitive-test configuration');
    return;
  }

  if (phases !== undefined) {
    const configuration = data.cognitiveTestConfigurations[0]!;
    const frozenLocalDate = localDateForInstant(configuration.frozenAt, data.study.timeZone);
    if (frozenLocalDate >= phases[0].startDate) {
      addIssue(context, ['cognitiveTestConfigurations', 0, 'frozenAt'],
        'The cognitive-test configuration must be frozen before A1');
    }
  }
}

function validateMeasurements(
  data: StudyDataValue,
  phases: OrderedPhases | undefined,
  context: z.RefinementCtx
): void {
  const measurementSlots = new Set<string>();
  data.cognitiveMeasurements.forEach((measurement, index) => {
    const slotKey = `${measurement.localDate}|${measurement.slot}`;
    if (measurementSlots.has(slotKey)) {
      addIssue(context, ['cognitiveMeasurements', index],
        'A cognitive slot may occur only once per local date');
    }
    measurementSlots.add(slotKey);

    if (measurement.studyStage === 'familiarization') {
      if (phases !== undefined && measurement.localDate >= phases[0].startDate) {
        addIssue(context, ['cognitiveMeasurements', index, 'studyStage'],
          'Familiarization measurements must precede A1');
      }
      return;
    }

    const phase = phases?.find(({ kind }) => kind === measurement.studyStage);
    if (phase === undefined || measurement.localDate < phase.startDate ||
      measurement.localDate > phase.endDate) {
      addIssue(context, ['cognitiveMeasurements', index, 'studyStage'],
        'Measurement stage must match its local date in the phase plan');
    }
  });
}

function validateObjectiveSessions(data: StudyDataValue, context: z.RefinementCtx): void {
  const completedMeasurementIds = new Set(
    data.cognitiveMeasurements
      .filter((measurement) => measurement.status === 'completed')
      .map(({ id }) => id)
  );
  for (const [collectionName, sessions] of [
    ['pvtSessions', data.pvtSessions],
    ['associativeMemorySessions', data.associativeMemorySessions]
  ] as const) {
    sessions.forEach((session, index) => {
      if (!completedMeasurementIds.has(session.cognitiveMeasurementId)) {
        addIssue(context, [collectionName, index, 'cognitiveMeasurementId'],
          'Objective-test sessions must reference a completed cognitive measurement');
      }
    });
  }

  for (const measurementId of completedMeasurementIds) {
    const pvtCount = data.pvtSessions.filter((session) =>
      session.cognitiveMeasurementId === measurementId).length;
    const memoryCount = data.associativeMemorySessions.filter((session) =>
      session.cognitiveMeasurementId === measurementId).length;
    if (pvtCount !== 1 || memoryCount !== 1) {
      addIssue(context, ['cognitiveMeasurements'],
        'Each completed cognitive measurement requires one PVT and one memory session');
    }
  }

  const configurationsById = new Map(
    data.cognitiveTestConfigurations.map((configuration) => [configuration.id, configuration])
  );
  data.associativeMemorySessions.forEach((session, index) => {
    const configuration = configurationsById.get(session.cognitiveTestConfigurationId);
    if (configuration === undefined) {
      addIssue(context, ['associativeMemorySessions', index, 'cognitiveTestConfigurationId'],
        'Memory sessions must reference a frozen cognitive-test configuration');
      return;
    }

    if (session.itemCount !== configuration.memoryItemCount ||
      session.generatorVersion !== configuration.stimulusGenerationRulesVersion) {
      addIssue(context, ['associativeMemorySessions', index],
        'Memory session must use its frozen item count and generator version');
    }

    const pvtIndex = data.pvtSessions.findIndex((candidate) =>
      candidate.cognitiveMeasurementId === session.cognitiveMeasurementId);
    const pvtSession = data.pvtSessions[pvtIndex];
    if (pvtSession === undefined) {
      return;
    }
    if (pvtSession.lapseThresholdMs !== configuration.pvtLapseThresholdMs) {
      addIssue(context, ['pvtSessions', pvtIndex, 'lapseThresholdMs'],
        'PVT session must use the frozen lapse threshold');
    }

    const frozenAdministration = configuration.pvtAdministration;
    const administrationDiffers = pvtSession.source !== frozenAdministration.source ||
      pvtSession.implementationVersion !== frozenAdministration.implementationVersion ||
      pvtSession.device !== frozenAdministration.device ||
      pvtSession.responseMethod !== frozenAdministration.responseMethod;
    if (administrationDiffers && !pvtSession.conditionChanged) {
      addIssue(context, ['pvtSessions', pvtIndex, 'conditionChanged'],
        'A PVT administration change must be marked explicitly');
    }

    const hasAtypicalAnnotation = data.analysisAnnotations.some((annotation) =>
      annotation.active && annotation.targetType === 'cognitive_measurement' &&
      annotation.targetId === pvtSession.cognitiveMeasurementId && annotation.flag === 'atypical');
    if ((administrationDiffers || pvtSession.conditionChanged) && !hasAtypicalAnnotation) {
      addIssue(context, ['pvtSessions', pvtIndex],
        'Changed PVT administration conditions require an active atypical session annotation');
    }
  });
}

function validateMedicationIntakes(data: StudyDataValue, context: z.RefinementCtx): void {
  const plannedMedications = data.protocolPhases.flatMap((phase) =>
    phase.medicationSchedule.map((medication) => ({ phase, medication })));
  const plannedIds = plannedMedications.map(({ medication }) => medication.id);
  if (new Set(plannedIds).size !== plannedIds.length) {
    addIssue(context, ['protocolPhases'],
      'Planned medication identifiers must be unique across the phase plan');
  }

  const observedOutcomes = new Set<string>();
  data.medicationIntakes.forEach((intake, index) => {
    const planned = plannedMedications.find(({ medication }) =>
      medication.id === intake.plannedMedicationId);
    if (planned === undefined) {
      addIssue(context, ['medicationIntakes', index, 'plannedMedicationId'],
        'Medication intake must reference the frozen phase schedule');
      return;
    }

    if (intake.medication !== planned.medication.medication ||
      intake.plannedDoseMg !== planned.medication.doseMg ||
      intake.plannedTimeWindow.startsAt !== planned.medication.timeWindow.startsAt ||
      intake.plannedTimeWindow.endsAt !== planned.medication.timeWindow.endsAt) {
      addIssue(context, ['medicationIntakes', index],
        'Medication identity, dose, and time window must match the referenced plan');
    }
    if (intake.plannedDate < planned.phase.startDate || intake.plannedDate > planned.phase.endDate) {
      addIssue(context, ['medicationIntakes', index, 'plannedDate'],
        'Medication intake date must fall within the referenced phase');
    }

    const outcomeKey = `${intake.plannedMedicationId}|${intake.plannedDate}`;
    if (observedOutcomes.has(outcomeKey)) {
      addIssue(context, ['medicationIntakes', index],
        'Only one outcome is allowed per planned medication and local date');
    }
    observedOutcomes.add(outcomeKey);
  });
}

function validateAnnotations(data: StudyDataValue, context: z.RefinementCtx): void {
  const annotationTargetIds = {
    cognitive_measurement: new Set(data.cognitiveMeasurements.map(({ id }) => id)),
    protocol_phase: new Set(data.protocolPhases.map(({ id }) => id))
  } as const;
  data.analysisAnnotations.forEach((annotation, index) => {
    if (!annotationTargetIds[annotation.targetType].has(annotation.targetId)) {
      addIssue(context, ['analysisAnnotations', index, 'targetId'],
        'Analysis annotation target must exist in the enclosing study');
    }
  });
}

function addIssue(context: z.RefinementCtx, path: PropertyKey[], message: string): void {
  context.addIssue({ code: 'custom', path, message });
}
