import type { IDBPTransaction } from 'idb';

import type { StudyDataRepository } from '../application/studies/study-data-repository';
import type { EntityId } from '../domain/common/identity';
import { analysisAnnotationSchema } from '../domain/analysis/analysis-annotation';
import { auditEntrySchema } from '../domain/audit/audit-entry';
import {
  additionalMedicationIntakeSchema,
  alcoholIntakeSchema,
  caffeineIntakeSchema
} from '../domain/confounders/confounder-events';
import { associativeMemorySessionSchema } from '../domain/measurements/associative-memory-session';
import { catheterizationEventSchema } from '../domain/measurements/catheterization-event';
import { cognitiveMeasurementSchema } from '../domain/measurements/cognitive-measurement';
import { dailyContextSchema } from '../domain/measurements/daily-context';
import { nightObservationSchema } from '../domain/measurements/night-observation';
import { pvtSessionSchema } from '../domain/measurements/pvt-session';
import { cognitiveTestConfigurationSchema } from '../domain/study/cognitive-test-configuration';
import { medicationIntakeSchema } from '../domain/study/medication-intake';
import { protocolPhaseSchema } from '../domain/study/protocol-phase';
import { type StudyData, studyDataSchema } from '../domain/study/study-data';
import { studySchema } from '../domain/study/study';
import { getDatabase } from './database';
import type { DoseShiftDatabase } from './schema';

const studyDataStoreNames = [
  'studies',
  'cognitiveTestConfigurations',
  'protocolPhases',
  'medicationIntakes',
  'cognitiveMeasurements',
  'pvtSessions',
  'associativeMemorySessions',
  'catheterizationEvents',
  'nightObservations',
  'dailyContexts',
  'caffeineIntakes',
  'alcoholIntakes',
  'additionalMedicationIntakes',
  'analysisAnnotations',
  'auditEntries'
] as const;

export class IndexedDbStudyDataRepository implements StudyDataRepository {
  public async getByStudyId(studyId: EntityId): Promise<StudyData | undefined> {
    const database = await getDatabase();
    const storedStudy: unknown = await database.get('studies', studyId);
    if (storedStudy === undefined) {
      return undefined;
    }

    const [
      cognitiveTestConfigurations,
      protocolPhases,
      medicationIntakes,
      cognitiveMeasurements,
      pvtSessions,
      associativeMemorySessions,
      catheterizationEvents,
      nightObservations,
      dailyContexts,
      caffeineIntakes,
      alcoholIntakes,
      additionalMedicationIntakes,
      analysisAnnotations,
      auditEntries
    ] = await Promise.all([
      database.getAllFromIndex('cognitiveTestConfigurations', 'by-study-id', studyId),
      database.getAllFromIndex('protocolPhases', 'by-study-id', studyId),
      database.getAllFromIndex('medicationIntakes', 'by-study-id', studyId),
      database.getAllFromIndex('cognitiveMeasurements', 'by-study-id', studyId),
      database.getAllFromIndex('pvtSessions', 'by-study-id', studyId),
      database.getAllFromIndex('associativeMemorySessions', 'by-study-id', studyId),
      database.getAllFromIndex('catheterizationEvents', 'by-study-id', studyId),
      database.getAllFromIndex('nightObservations', 'by-study-id', studyId),
      database.getAllFromIndex('dailyContexts', 'by-study-id', studyId),
      database.getAllFromIndex('caffeineIntakes', 'by-study-id', studyId),
      database.getAllFromIndex('alcoholIntakes', 'by-study-id', studyId),
      database.getAllFromIndex('additionalMedicationIntakes', 'by-study-id', studyId),
      database.getAllFromIndex('analysisAnnotations', 'by-study-id', studyId),
      database.getAllFromIndex('auditEntries', 'by-study-id', studyId)
    ] as const);

    return studyDataSchema.parse({
      study: studySchema.parse(storedStudy),
      cognitiveTestConfigurations: cognitiveTestConfigurations.map((value) =>
        cognitiveTestConfigurationSchema.parse(value)),
      protocolPhases: protocolPhases.map((value) => protocolPhaseSchema.parse(value)),
      medicationIntakes: medicationIntakes.map((value) => medicationIntakeSchema.parse(value)),
      cognitiveMeasurements: cognitiveMeasurements.map((value) => cognitiveMeasurementSchema.parse(value)),
      pvtSessions: pvtSessions.map((value) => pvtSessionSchema.parse(value)),
      associativeMemorySessions: associativeMemorySessions.map((value) =>
        associativeMemorySessionSchema.parse(value)),
      catheterizationEvents: catheterizationEvents.map((value) => catheterizationEventSchema.parse(value)),
      nightObservations: nightObservations.map((value) => nightObservationSchema.parse(value)),
      dailyContexts: dailyContexts.map((value) => dailyContextSchema.parse(value)),
      caffeineIntakes: caffeineIntakes.map((value) => caffeineIntakeSchema.parse(value)),
      alcoholIntakes: alcoholIntakes.map((value) => alcoholIntakeSchema.parse(value)),
      additionalMedicationIntakes: additionalMedicationIntakes.map((value) =>
        additionalMedicationIntakeSchema.parse(value)),
      analysisAnnotations: analysisAnnotations.map((value) => analysisAnnotationSchema.parse(value)),
      auditEntries: auditEntries.map((value) => auditEntrySchema.parse(value))
    });
  }

  public async save(studyData: StudyData): Promise<void> {
    const data = studyDataSchema.parse(studyData);
    const database = await getDatabase();
    const transaction = database.transaction(studyDataStoreNames, 'readwrite');
    putStudyData(transaction, data);
    await transaction.done;
  }

  public async restoreBackup(studyData: readonly StudyData[]): Promise<void> {
    const data = studyData.map((value) => studyDataSchema.parse(value));
    assertUniqueBackupKeys(data);
    const database = await getDatabase();
    const transaction = database.transaction(studyDataStoreNames, 'readwrite');

    await Promise.all([
      transaction.objectStore('studies').clear(),
      transaction.objectStore('cognitiveTestConfigurations').clear(),
      transaction.objectStore('protocolPhases').clear(),
      transaction.objectStore('medicationIntakes').clear(),
      transaction.objectStore('cognitiveMeasurements').clear(),
      transaction.objectStore('pvtSessions').clear(),
      transaction.objectStore('associativeMemorySessions').clear(),
      transaction.objectStore('catheterizationEvents').clear(),
      transaction.objectStore('nightObservations').clear(),
      transaction.objectStore('dailyContexts').clear(),
      transaction.objectStore('caffeineIntakes').clear(),
      transaction.objectStore('alcoholIntakes').clear(),
      transaction.objectStore('additionalMedicationIntakes').clear(),
      transaction.objectStore('analysisAnnotations').clear(),
      transaction.objectStore('auditEntries').clear()
    ]);

    data.forEach((value) => putStudyData(transaction, value));
    await transaction.done;
  }
}

type StudyDataTransaction = IDBPTransaction<
  DoseShiftDatabase,
  typeof studyDataStoreNames,
  'readwrite'
>;

function putStudyData(transaction: StudyDataTransaction, data: StudyData): void {
  const configurationStore = transaction.objectStore('cognitiveTestConfigurations');
  const phaseStore = transaction.objectStore('protocolPhases');
  const medicationStore = transaction.objectStore('medicationIntakes');
  const cognitiveStore = transaction.objectStore('cognitiveMeasurements');
  const pvtStore = transaction.objectStore('pvtSessions');
  const memoryStore = transaction.objectStore('associativeMemorySessions');
  const catheterizationStore = transaction.objectStore('catheterizationEvents');
  const nightStore = transaction.objectStore('nightObservations');
  const dailyContextStore = transaction.objectStore('dailyContexts');
  const caffeineStore = transaction.objectStore('caffeineIntakes');
  const alcoholStore = transaction.objectStore('alcoholIntakes');
  const additionalMedicationStore = transaction.objectStore('additionalMedicationIntakes');
  const annotationStore = transaction.objectStore('analysisAnnotations');
  const auditStore = transaction.objectStore('auditEntries');

  transaction.objectStore('studies').put(data.study);
  data.cognitiveTestConfigurations.forEach((value) => configurationStore.put(value));
  data.protocolPhases.forEach((value) => phaseStore.put(value));
  data.medicationIntakes.forEach((value) => medicationStore.put(value));
  data.cognitiveMeasurements.forEach((value) => cognitiveStore.put(value));
  data.pvtSessions.forEach((value) => pvtStore.put(value));
  data.associativeMemorySessions.forEach((value) => memoryStore.put(value));
  data.catheterizationEvents.forEach((value) => catheterizationStore.put(value));
  data.nightObservations.forEach((value) => nightStore.put(value));
  data.dailyContexts.forEach((value) => dailyContextStore.put(value));
  data.caffeineIntakes.forEach((value) => caffeineStore.put(value));
  data.alcoholIntakes.forEach((value) => alcoholStore.put(value));
  data.additionalMedicationIntakes.forEach((value) => additionalMedicationStore.put(value));
  data.analysisAnnotations.forEach((value) => annotationStore.put(value));
  data.auditEntries.forEach((value) => auditStore.put(value));
}

function assertUniqueBackupKeys(data: readonly StudyData[]): void {
  const keyCollections = [
    data.map(({ study }) => study.id),
    data.flatMap(({ cognitiveTestConfigurations }) => cognitiveTestConfigurations.map(({ id }) => id)),
    data.flatMap(({ protocolPhases }) => protocolPhases.map(({ id }) => id)),
    data.flatMap(({ medicationIntakes }) => medicationIntakes.map(({ id }) => id)),
    data.flatMap(({ cognitiveMeasurements }) => cognitiveMeasurements.map(({ id }) => id)),
    data.flatMap(({ pvtSessions }) => pvtSessions.map(({ id }) => id)),
    data.flatMap(({ associativeMemorySessions }) => associativeMemorySessions.map(({ id }) => id)),
    data.flatMap(({ catheterizationEvents }) => catheterizationEvents.map(({ id }) => id)),
    data.flatMap(({ nightObservations }) => nightObservations.map(({ id }) => id)),
    data.flatMap(({ dailyContexts }) => dailyContexts.map(({ id }) => id)),
    data.flatMap(({ caffeineIntakes }) => caffeineIntakes.map(({ id }) => id)),
    data.flatMap(({ alcoholIntakes }) => alcoholIntakes.map(({ id }) => id)),
    data.flatMap(({ additionalMedicationIntakes }) => additionalMedicationIntakes.map(({ id }) => id)),
    data.flatMap(({ analysisAnnotations }) => analysisAnnotations.map(({ id }) => id)),
    data.flatMap(({ auditEntries }) => auditEntries.map(({ id }) => id))
  ];
  if (keyCollections.some((keys) => new Set(keys).size !== keys.length)) {
    throw new Error('A complete backup must not contain duplicate persistence keys');
  }
}
