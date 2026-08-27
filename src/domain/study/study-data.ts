import { z } from 'zod';

import { analysisAnnotationSchema } from '../analysis/analysis-annotation';
import { auditEntrySchema } from '../audit/audit-entry';
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

export const studyDataSchema = z.object({
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
})
  .strict()
  .superRefine((data, context) => {
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
      for (const [index, entity] of entities.entries()) {
        if (entity.studyId !== data.study.id) {
          context.addIssue({
            code: 'custom',
            path: [collectionName, index, 'studyId'],
            message: 'Entity studyId must match the enclosing study'
          });
        }
      }

      const ids = entities.map(({ id }) => id);
      if (new Set(ids).size !== ids.length) {
        context.addIssue({
          code: 'custom',
          path: [collectionName],
          message: 'Entity identifiers must be unique within a collection'
        });
      }
    }

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
          context.addIssue({
            code: 'custom',
            path: [collectionName, index, 'cognitiveMeasurementId'],
            message: 'Objective-test sessions must reference a completed cognitive measurement'
          });
        }
      });
    }

    for (const measurementId of completedMeasurementIds) {
      const pvtCount = data.pvtSessions.filter((session) =>
        session.cognitiveMeasurementId === measurementId).length;
      const memoryCount = data.associativeMemorySessions.filter((session) =>
        session.cognitiveMeasurementId === measurementId).length;
      if (pvtCount !== 1 || memoryCount !== 1) {
        context.addIssue({
          code: 'custom',
          path: ['cognitiveMeasurements'],
          message: 'Each completed cognitive measurement requires one PVT and one memory session'
        });
      }
    }

    const configurationsById = new Map(
      data.cognitiveTestConfigurations.map((configuration) => [configuration.id, configuration])
    );
    data.associativeMemorySessions.forEach((session, index) => {
      const configuration = configurationsById.get(session.cognitiveTestConfigurationId);
      if (configuration === undefined) {
        context.addIssue({
          code: 'custom',
          path: ['associativeMemorySessions', index, 'cognitiveTestConfigurationId'],
          message: 'Memory sessions must reference a frozen cognitive-test configuration'
        });
        return;
      }

      if (session.itemCount !== configuration.memoryItemCount ||
        session.generatorVersion !== configuration.stimulusGenerationRulesVersion) {
        context.addIssue({
          code: 'custom',
          path: ['associativeMemorySessions', index],
          message: 'Memory session must use its frozen item count and generator version'
        });
      }

      const pvtSession = data.pvtSessions.find((candidate) =>
        candidate.cognitiveMeasurementId === session.cognitiveMeasurementId);
      if (pvtSession !== undefined && pvtSession.lapseThresholdMs !== configuration.pvtLapseThresholdMs) {
        context.addIssue({
          code: 'custom',
          path: ['pvtSessions'],
          message: 'PVT session must use the frozen lapse threshold'
        });
      }
    });

    const plannedMedicationIds = new Set(
      data.protocolPhases.flatMap(({ medicationSchedule }) => medicationSchedule.map(({ id }) => id))
    );
    data.medicationIntakes.forEach((intake, index) => {
      if (!plannedMedicationIds.has(intake.plannedMedicationId)) {
        context.addIssue({
          code: 'custom',
          path: ['medicationIntakes', index, 'plannedMedicationId'],
          message: 'Medication intake must reference the frozen phase schedule'
        });
      }
    });

    const annotationTargetIds = {
      day: new Set(data.dailyContexts.map(({ id }) => id)),
      cognitive_measurement: new Set(data.cognitiveMeasurements.map(({ id }) => id)),
      protocol_phase: new Set(data.protocolPhases.map(({ id }) => id))
    } as const;
    data.analysisAnnotations.forEach((annotation, index) => {
      if (!annotationTargetIds[annotation.targetType].has(annotation.targetId)) {
        context.addIssue({
          code: 'custom',
          path: ['analysisAnnotations', index, 'targetId'],
          message: 'Analysis annotation target must exist in the enclosing study'
        });
      }
    });

    if (data.protocolPhases.length > 0) {
      const orderedPhases = [...data.protocolPhases].sort((left, right) =>
        left.sequenceOrder - right.sequenceOrder);
      const expectedKinds = ['A1', 'B', 'A2'] as const;

      if (orderedPhases.length !== expectedKinds.length ||
        orderedPhases.some((phase, index) =>
          phase.kind !== expectedKinds[index] || phase.sequenceOrder !== index + 1)) {
        context.addIssue({
          code: 'custom',
          path: ['protocolPhases'],
          message: 'The analyzed protocol phases must be ordered A1, B, A2'
        });
      }
    }
  })
  .readonly();

export type StudyData = z.infer<typeof studyDataSchema>;
