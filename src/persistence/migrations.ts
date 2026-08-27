import type { IDBPDatabase } from 'idb';

import type { DoseShiftDatabase } from './schema';

export const currentDatabaseVersion = 1;

export function migrateDatabase(
  database: IDBPDatabase<DoseShiftDatabase>,
  oldVersion: number
): void {
  if (oldVersion < 1) {
    const studies = database.createObjectStore('studies', { keyPath: 'id' });
    studies.createIndex('by-created-at', 'createdAt');
  }
}
