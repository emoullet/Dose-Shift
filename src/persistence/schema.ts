import type { DBSchema } from 'idb';

import type { Study } from '../domain/study/study';

export interface DoseShiftDatabase extends DBSchema {
  studies: {
    key: string;
    value: Study;
    indexes: { 'by-created-at': string };
  };
}
