import type { IDBPDatabase } from 'idb';

import type { DoseShiftDatabase } from './schema';

export const currentDatabaseVersion = 1;

export function migrateDatabase(
  database: IDBPDatabase<DoseShiftDatabase>,
  oldVersion: number,
  newVersion: number | null
): void {
  if (oldVersion < 1 && newVersion !== null && newVersion >= 1) {
    migrateToVersion1(database);
  }
}

export function migrateToVersion1(database: IDBPDatabase<DoseShiftDatabase>): void {
  const studies = database.createObjectStore('studies', { keyPath: 'id' });
  studies.createIndex('by-created-at', 'createdAt');
}
