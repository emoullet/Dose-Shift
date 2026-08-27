import { deleteDB, openDB, type IDBPDatabase } from 'idb';
import { afterEach, describe, expect, it } from 'vitest';

import { studySchema } from '../../src/domain/study/study';
import { currentDatabaseVersion, migrateDatabase } from '../../src/persistence/migrations';
import type { DoseShiftDatabase } from '../../src/persistence/schema';

describe('database migration to version 1', () => {
  const createdDatabases: Array<{
    name: string;
    database?: IDBPDatabase<DoseShiftDatabase>;
  }> = [];

  afterEach(async () => {
    const databases = createdDatabases.splice(0);
    databases.forEach(({ database }) => database?.close());
    await Promise.all(databases.map(({ name }) => deleteDB(name)));
  });

  it('creates the studies store with the by-created-at index from an empty database', async () => {
    const databaseName = `dose-shift-migration-v1-${crypto.randomUUID()}`;
    const createdDatabase: {
      name: string;
      database?: IDBPDatabase<DoseShiftDatabase>;
    } = { name: databaseName };
    createdDatabases.push(createdDatabase);

    const database = await openDB<DoseShiftDatabase>(databaseName, 1, {
      upgrade: migrateDatabase
    });
    createdDatabase.database = database;

    expect(Array.from(database.objectStoreNames)).toEqual(['studies']);

    const transaction = database.transaction('studies', 'readonly');
    expect(Array.from(transaction.store.indexNames)).toEqual(['by-created-at']);
    await transaction.done;
  });

  it('upgrades a version-1 study and creates the version-2 stores without data loss', async () => {
    const databaseName = `dose-shift-migration-v2-${crypto.randomUUID()}`;
    const createdDatabase: {
      name: string;
      database?: IDBPDatabase<DoseShiftDatabase>;
    } = { name: databaseName };
    createdDatabases.push(createdDatabase);

    const version1Database = await openDB<DoseShiftDatabase>(databaseName, 1, {
      upgrade: migrateDatabase
    });
    const legacyStudy = {
      id: crypto.randomUUID(),
      protocolVersion: '1.0',
      timeZone: 'Europe/Paris',
      createdAt: '2026-08-31T23:30:00-04:00',
      updatedAt: '2026-08-31T23:30:00-04:00'
    };
    await version1Database.put('studies', legacyStudy as never);
    version1Database.close();

    const database = await openDB<DoseShiftDatabase>(databaseName, currentDatabaseVersion, {
      upgrade: migrateDatabase
    });
    createdDatabase.database = database;

    expect(Array.from(database.objectStoreNames)).toEqual([
      'additionalMedicationIntakes',
      'alcoholIntakes',
      'analysisAnnotations',
      'associativeMemorySessions',
      'auditEntries',
      'caffeineIntakes',
      'catheterizationEvents',
      'cognitiveMeasurements',
      'cognitiveTestConfigurations',
      'dailyContexts',
      'medicationIntakes',
      'nightObservations',
      'protocolPhases',
      'pvtSessions',
      'studies'
    ]);

    const migratedStudy = studySchema.parse(await database.get('studies', legacyStudy.id as never));
    expect(migratedStudy).toMatchObject({
      id: legacyStudy.id,
      startDate: '2026-09-01',
      status: 'draft'
    });

    const phaseTransaction = database.transaction('protocolPhases', 'readonly');
    expect(Array.from(phaseTransaction.store.indexNames)).toEqual([
      'by-study-id',
      'by-study-sequence'
    ]);
    await phaseTransaction.done;
  });
});
