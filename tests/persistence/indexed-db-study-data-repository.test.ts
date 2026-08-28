import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createEntityId } from '../../src/domain/common/identity';
import { instantSchema } from '../../src/domain/common/time';
import { studyDataSchema } from '../../src/domain/study/study-data';
import { IndexedDbStudyDataRepository } from '../../src/persistence/indexed-db-study-data-repository';
import {
  createStudyExport,
  parseStudyExportJson,
  serializeStudyExport
} from '../../src/serialization/study-export';
import { createCompleteStudyData } from '../fixtures/study-data';
import { resetDoseShiftDatabase } from './database-test-utils';

describe('IndexedDbStudyDataRepository', () => {
  beforeEach(resetDoseShiftDatabase);
  afterEach(resetDoseShiftDatabase);

  it('atomically preserves a complete validated dataset including raw trials and audits', async () => {
    const data = createCompleteStudyData();
    const repository = new IndexedDbStudyDataRepository();

    await repository.save(data);
    const persisted = await repository.getByStudyId(data.study.id);

    expect(persisted!.study).toEqual(data.study);
    expect(persisted!.protocolPhases).toEqual(expect.arrayContaining(data.protocolPhases));
    expect(persisted!.medicationIntakes).toEqual(expect.arrayContaining(data.medicationIntakes));
    expect(persisted!.cognitiveMeasurements).toEqual(expect.arrayContaining(data.cognitiveMeasurements));
    expect(persisted!.pvtSessions[0]!.rawTrials).toEqual(data.pvtSessions[0]!.rawTrials);
    expect(persisted!.associativeMemorySessions[0]!.trials).toEqual(
      data.associativeMemorySessions[0]!.trials
    );
    expect(persisted!.auditEntries).toEqual(data.auditEntries);
  });

  it('preserves observations and audits omitted from a later upsert', async () => {
    const data = createCompleteStudyData();
    const repository = new IndexedDbStudyDataRepository();
    await repository.save(data);

    const replacement = {
      ...data,
      caffeineIntakes: [],
      auditEntries: []
    };
    await repository.save(replacement);

    const persisted = await repository.getByStudyId(data.study.id);
    expect(persisted!.caffeineIntakes).toEqual(data.caffeineIntakes);
    expect(persisted!.auditEntries).toEqual(data.auditEntries);
  });

  it('restores an exact backup without retaining stale local records', async () => {
    const backup = createCompleteStudyData();
    const unrelatedStudy = createCompleteStudyData();
    const staleCaffeineIntake = {
      ...backup.caffeineIntakes[0]!,
      id: createEntityId(),
      occurredAt: instantSchema.parse('2026-09-01T09:10:00+02:00')
    };
    const repository = new IndexedDbStudyDataRepository();

    await repository.save(studyDataSchema.parse({
      ...backup,
      caffeineIntakes: [...backup.caffeineIntakes, staleCaffeineIntake]
    }));
    await repository.save(unrelatedStudy);
    expect((await repository.getByStudyId(backup.study.id))!.caffeineIntakes).toHaveLength(2);

    const serializedBackup = serializeStudyExport(createStudyExport(
      [backup],
      '2026-09-22T10:00:00+02:00',
      '0.1.0'
    ));
    await repository.restoreBackup(parseStudyExportJson(serializedBackup).studyData);
    const restored = await repository.getByStudyId(backup.study.id);
    expect(restored!.caffeineIntakes).toEqual(backup.caffeineIntakes);
    expect(restored!.auditEntries).toEqual(backup.auditEntries);
    expect(restored!.pvtSessions[0]!.rawTrials).toEqual(backup.pvtSessions[0]!.rawTrials);
    await expect(repository.getByStudyId(unrelatedStudy.study.id)).resolves.toBeUndefined();
  });

  it('rejects cross-study data before opening a write transaction', async () => {
    const data = createCompleteStudyData();
    const repository = new IndexedDbStudyDataRepository();
    const invalid = {
      ...data,
      catheterizationEvents: [{
        ...data.catheterizationEvents[0]!,
        studyId: data.caffeineIntakes[0]!.id
      }]
    };

    await expect(repository.save(invalid as never)).rejects.toThrow();
    await expect(repository.getByStudyId(data.study.id)).resolves.toBeUndefined();
  });
});
