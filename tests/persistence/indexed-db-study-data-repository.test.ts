import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createEntityId, entityIdSchema } from '../../src/domain/common/identity';
import { buildDraftStudyData } from '../../src/application/studies/build-draft-study-data';
import { instantSchema, localDateSchema, timeZoneSchema } from '../../src/domain/common/time';
import { studyDataSchema } from '../../src/domain/study/study-data';
import { IndexedDbStudyDataRepository } from '../../src/persistence/indexed-db-study-data-repository';
import { IndexedDbStudyRepository } from '../../src/persistence/indexed-db-study-repository';
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

  it('creates and reloads one complete draft atomically without replacing completed studies', async () => {
    const completed = createCompleteStudyData();
    const repository = new IndexedDbStudyDataRepository();
    await repository.save({ ...completed, study: { ...completed.study, status: 'completed' } });
    const draft = createDraft('2026-10-01', 7);

    await expect(repository.createDraftIfNoContinuingStudy(draft))
      .resolves.toEqual({ created: true });
    const reloaded = await repository.getByStudyId(draft.study.id);
    expect(reloaded).toEqual(expect.objectContaining({ study: draft.study }));
    expect(reloaded!.protocolPhases).toEqual(expect.arrayContaining(draft.protocolPhases));
    expect(reloaded!.protocolPhases).toHaveLength(3);
    expect(reloaded!.protocolPhases.flatMap(({ medicationSchedule }) => medicationSchedule)).toHaveLength(6);
    expect(reloaded!.cognitiveTestConfigurations).toEqual([]);
    expect(reloaded!.medicationIntakes).toEqual([]);
    expect(reloaded!.cognitiveMeasurements).toEqual([]);
    await expect(repository.getByStudyId(completed.study.id)).resolves.toBeDefined();
  });

  it('allows exactly one draft under concurrent creation attempts', async () => {
    const repository = new IndexedDbStudyDataRepository();
    const drafts = [createDraft('2026-10-01', 1), createDraft('2026-11-01', 90)];

    const results = await Promise.all(drafts.map((draft) =>
      repository.createDraftIfNoContinuingStudy(draft)));

    expect(results.filter(({ created }) => created)).toHaveLength(1);
    expect(results.filter(({ created }) => !created)).toHaveLength(1);
    const studies = await new IndexedDbStudyRepository().list();
    expect(studies.filter(({ status }) => status === 'draft' || status === 'active')).toHaveLength(1);
  });

  it('makes no writes when an active study already exists', async () => {
    const active = createCompleteStudyData();
    const repository = new IndexedDbStudyDataRepository();
    await repository.save(active);
    const draft = createDraft('2026-10-01', 7);

    const result = await repository.createDraftIfNoContinuingStudy(draft);

    expect(result).toEqual({ created: false, existingStudyIds: [active.study.id] });
    await expect(repository.getByStudyId(draft.study.id)).resolves.toBeUndefined();
    await expect(repository.getByStudyId(active.study.id)).resolves.toBeDefined();
  });

  it('rolls back the complete draft when a child key collides with preserved data', async () => {
    const completed = createCompleteStudyData();
    const repository = new IndexedDbStudyDataRepository();
    await repository.save({ ...completed, study: { ...completed.study, status: 'completed' } });
    let generatedId = 0;
    const draft = buildDraftStudyData({
      a1StartDate: localDateSchema.parse('2026-10-01'),
      timeZone: timeZoneSchema.parse('Europe/Paris'),
      phaseDurationDays: 7
    }, {
      createId: () => generatedId++ === 1
        ? completed.protocolPhases[0]!.id
        : entityIdSchema.parse(`10000000-0000-4000-8000-${String(generatedId).padStart(12, '0')}`),
      now: () => instantSchema.parse('2026-09-01T10:00:00+02:00')
    });

    await expect(repository.createDraftIfNoContinuingStudy(draft)).rejects.toThrow();
    await expect(repository.getByStudyId(draft.study.id)).resolves.toBeUndefined();
    await expect(repository.getByStudyId(completed.study.id)).resolves.toBeDefined();
  });
});

function createDraft(startDate: string, duration: number) {
  return buildDraftStudyData({
    a1StartDate: localDateSchema.parse(startDate),
    timeZone: timeZoneSchema.parse('Europe/Paris'),
    phaseDurationDays: duration
  });
}
