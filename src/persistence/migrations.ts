import type { IDBPDatabase, IDBPTransaction, StoreNames } from 'idb';

import type { DoseShiftDatabase } from './schema';

export const currentDatabaseVersion = 2;

export function migrateDatabase(
  database: IDBPDatabase<DoseShiftDatabase>,
  oldVersion: number,
  newVersion: number | null,
  transaction: VersionChangeTransaction
): void {
  if (oldVersion < 1 && newVersion !== null && newVersion >= 1) {
    migrateToVersion1(database);
  }

  if (oldVersion < 2 && newVersion !== null && newVersion >= 2) {
    migrateToVersion2(database, transaction);
  }
}

export function migrateToVersion1(database: IDBPDatabase<DoseShiftDatabase>): void {
  const studies = database.createObjectStore('studies', { keyPath: 'id' });
  studies.createIndex('by-created-at', 'createdAt');
}

export function migrateToVersion2(
  database: IDBPDatabase<DoseShiftDatabase>,
  transaction: VersionChangeTransaction
): void {
  const cognitiveTestConfigurations = database.createObjectStore(
    'cognitiveTestConfigurations', { keyPath: 'id' });
  cognitiveTestConfigurations.createIndex('by-study-id', 'studyId');

  const protocolPhases = database.createObjectStore('protocolPhases', { keyPath: 'id' });
  protocolPhases.createIndex('by-study-id', 'studyId');
  protocolPhases.createIndex('by-study-sequence', ['studyId', 'sequenceOrder']);

  const medicationIntakes = database.createObjectStore('medicationIntakes', { keyPath: 'id' });
  medicationIntakes.createIndex('by-study-id', 'studyId');

  const cognitiveMeasurements = database.createObjectStore('cognitiveMeasurements', { keyPath: 'id' });
  cognitiveMeasurements.createIndex('by-study-id', 'studyId');

  const pvtSessions = database.createObjectStore('pvtSessions', { keyPath: 'id' });
  pvtSessions.createIndex('by-study-id', 'studyId');

  const associativeMemorySessions = database.createObjectStore(
    'associativeMemorySessions', { keyPath: 'id' });
  associativeMemorySessions.createIndex('by-study-id', 'studyId');

  const catheterizationEvents = database.createObjectStore('catheterizationEvents', { keyPath: 'id' });
  catheterizationEvents.createIndex('by-study-id', 'studyId');

  const nightObservations = database.createObjectStore('nightObservations', { keyPath: 'id' });
  nightObservations.createIndex('by-study-id', 'studyId');

  const dailyContexts = database.createObjectStore('dailyContexts', { keyPath: 'id' });
  dailyContexts.createIndex('by-study-id', 'studyId');

  const caffeineIntakes = database.createObjectStore('caffeineIntakes', { keyPath: 'id' });
  caffeineIntakes.createIndex('by-study-id', 'studyId');

  const alcoholIntakes = database.createObjectStore('alcoholIntakes', { keyPath: 'id' });
  alcoholIntakes.createIndex('by-study-id', 'studyId');

  const additionalMedicationIntakes = database.createObjectStore(
    'additionalMedicationIntakes', { keyPath: 'id' });
  additionalMedicationIntakes.createIndex('by-study-id', 'studyId');

  const analysisAnnotations = database.createObjectStore('analysisAnnotations', { keyPath: 'id' });
  analysisAnnotations.createIndex('by-study-id', 'studyId');

  const auditEntries = database.createObjectStore('auditEntries', { keyPath: 'id' });
  auditEntries.createIndex('by-study-id', 'studyId');

  migrateLegacyStudyRecords(transaction);
}

function migrateLegacyStudyRecords(
  transaction: VersionChangeTransaction
): void {
  const studies = transaction.objectStore('studies');
  void studies.openCursor().then(function updateLegacyStudy(cursor): Promise<void> | void {
    if (cursor === null) {
      return;
    }

    const legacyStudy = cursor.value as unknown as Record<string, unknown>;
    if (legacyStudy.startDate === undefined || legacyStudy.status === undefined) {
      const migratedStudy = {
        ...legacyStudy,
        startDate: localDateForInstant(legacyStudy.createdAt, legacyStudy.timeZone),
        status: 'draft'
      };
      return cursor.update(migratedStudy as never)
        .then(() => cursor.continue())
        .then(updateLegacyStudy);
    }

    return cursor.continue().then(updateLegacyStudy);
  });
}

type VersionChangeTransaction = IDBPTransaction<
  DoseShiftDatabase,
  ArrayLike<StoreNames<DoseShiftDatabase>>,
  'versionchange'
>;

function localDateForInstant(instant: unknown, timeZone: unknown): string {
  if (typeof instant !== 'string' || typeof timeZone !== 'string') {
    throw new Error('Cannot migrate a study with invalid time metadata');
  }

  const parts = new Intl.DateTimeFormat('en', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date(instant));
  const value = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';

  return `${value('year')}-${value('month')}-${value('day')}`;
}
