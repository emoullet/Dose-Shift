import { deleteDB } from 'idb';

import {
  closeDatabase,
  doseShiftDatabaseName
} from '../../src/persistence/database';

export async function resetDoseShiftDatabase(): Promise<void> {
  await closeDatabase();
  await deleteDB(doseShiftDatabaseName);
}
