import { openDB, type IDBPDatabase } from 'idb';

import { currentDatabaseVersion, migrateDatabase } from './migrations';
import type { DoseShiftDatabase } from './schema';

export const doseShiftDatabaseName = 'dose-shift';

let databasePromise: Promise<IDBPDatabase<DoseShiftDatabase>> | undefined;

export function getDatabase(): Promise<IDBPDatabase<DoseShiftDatabase>> {
  databasePromise ??= openDB<DoseShiftDatabase>(doseShiftDatabaseName, currentDatabaseVersion, {
    upgrade: migrateDatabase
  });

  return databasePromise;
}

export async function closeDatabase(): Promise<void> {
  const activeDatabasePromise = databasePromise;
  databasePromise = undefined;

  if (activeDatabasePromise !== undefined) {
    const database = await activeDatabasePromise;
    database.close();
  }
}
