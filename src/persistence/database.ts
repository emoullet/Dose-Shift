import { openDB, type IDBPDatabase } from 'idb';

import { currentDatabaseVersion, migrateDatabase } from './migrations';
import type { DoseShiftDatabase } from './schema';

const databaseName = 'dose-shift';

let databasePromise: Promise<IDBPDatabase<DoseShiftDatabase>> | undefined;

export function getDatabase(): Promise<IDBPDatabase<DoseShiftDatabase>> {
  databasePromise ??= openDB<DoseShiftDatabase>(databaseName, currentDatabaseVersion, {
    upgrade: migrateDatabase
  });

  return databasePromise;
}
