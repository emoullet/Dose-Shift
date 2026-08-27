import { describe, expect, it } from 'vitest';

import { createEntityId } from '../../src/domain/common/identity';
import { nowAsInstant, timeZoneSchema } from '../../src/domain/common/time';
import type { Study } from '../../src/domain/study/study';
import { IndexedDbStudyRepository } from '../../src/persistence/indexed-db-study-repository';
import { resetDoseShiftDatabase } from './database-test-utils';

describe('IndexedDbStudyRepository', () => {
  beforeEach(resetDoseShiftDatabase);
  afterEach(resetDoseShiftDatabase);

  it('persists and retrieves a runtime-validated study', async () => {
    const timestamp = nowAsInstant();
    const study: Study = {
      id: createEntityId(),
      protocolVersion: '1.0',
      timeZone: timeZoneSchema.parse('Europe/Paris'),
      createdAt: timestamp,
      updatedAt: timestamp
    };
    const repository = new IndexedDbStudyRepository();

    await expect(repository.list()).resolves.toEqual([]);
    await repository.save(study);

    await expect(repository.getById(study.id)).resolves.toEqual(study);
    await expect(repository.list()).resolves.toContainEqual(study);
  });

  it('rejects an invalid value before writing it', async () => {
    const repository = new IndexedDbStudyRepository();
    const invalidStudy = { id: 'not-an-id' } as unknown as Study;

    await expect(repository.save(invalidStudy)).rejects.toThrow();
  });
});
