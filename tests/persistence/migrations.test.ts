import { deleteDB, openDB, type IDBPDatabase } from 'idb';
import { afterEach, describe, expect, it } from 'vitest';

import { migrateDatabase } from '../../src/persistence/migrations';
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
});
