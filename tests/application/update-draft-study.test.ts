import { describe, expect, it, vi } from 'vitest';

import { buildDraftStudyData } from '../../src/application/studies/build-draft-study-data';
import {
  DraftStudyNotEditableError,
  DraftStudyNotFoundError,
  DraftStudyProtocolError,
  UpdateDraftStudy,
  updateDraftStudyData
} from '../../src/application/studies/update-draft-study';
import { entityIdSchema } from '../../src/domain/common/identity';
import { instantSchema, localDateSchema, timeZoneSchema } from '../../src/domain/common/time';
import { studyDataSchema } from '../../src/domain/study/study-data';

describe('updateDraftStudyData', () => {
  it('replans a protocol 1.1 draft while preserving every persisted identity and collection', () => {
    const existing = buildDraftStudyData({
      a1StartDate: localDateSchema.parse('2026-09-01'),
      timeZone: timeZoneSchema.parse('Europe/Paris'),
      phaseDurationDays: 7
    }, deterministicBuilderDependencies());
    const auditEntry = {
      id: entityIdSchema.parse('00000000-0000-4000-8000-000000000100'),
      studyId: existing.study.id,
      entityType: 'study' as const,
      entityId: existing.study.id,
      changedAt: instantSchema.parse('2026-08-28T10:30:00+02:00'),
      changedFields: ['startDate'],
      previousValues: { startDate: '2026-08-31' },
      newValues: { startDate: '2026-09-01' }
    };
    const withHistory = studyDataSchema.parse({ ...existing, auditEntries: [auditEntry] });

    const updated = updateDraftStudyData(withHistory, {
      a1StartDate: localDateSchema.parse('2026-10-10'),
      timeZone: timeZoneSchema.parse('America/Toronto'),
      phaseDurationDays: 20
    }, { now: () => instantSchema.parse('2026-08-29T12:00:00+02:00') });

    expect(updated.study).toEqual({
      ...existing.study,
      startDate: '2026-10-10',
      timeZone: 'America/Toronto',
      updatedAt: '2026-08-29T12:00:00+02:00'
    });
    expect(updated.protocolPhases.map(({ id }) => id))
      .toEqual(existing.protocolPhases.map(({ id }) => id));
    expect(updated.protocolPhases.flatMap(({ medicationSchedule }) =>
      medicationSchedule.map(({ id }) => id)))
      .toEqual(existing.protocolPhases.flatMap(({ medicationSchedule }) =>
        medicationSchedule.map(({ id }) => id)));
    expect(updated.protocolPhases.map(({ startDate, endDate }) => [startDate, endDate])).toEqual([
      ['2026-10-10', '2026-10-29'],
      ['2026-10-30', '2026-11-18'],
      ['2026-11-19', '2026-12-08']
    ]);
    expect(updated.protocolPhases.map(({ medicationSchedule }) => medicationSchedule))
      .toEqual(existing.protocolPhases.map(({ medicationSchedule }) => medicationSchedule));
    expect(updated.auditEntries).toEqual([auditEntry]);
  });

  it('refetches the current aggregate before saving the update', async () => {
    const existing = createDraft();
    const save = vi.fn(async () => undefined);
    const repository = {
      getByStudyId: vi.fn(async () => existing),
      save
    };

    const updated = await new UpdateDraftStudy(repository).execute(existing.study.id, {
      a1StartDate: localDateSchema.parse('2026-11-01'),
      timeZone: timeZoneSchema.parse('UTC'),
      phaseDurationDays: 1
    });

    expect(repository.getByStudyId).toHaveBeenCalledWith(existing.study.id);
    expect(save).toHaveBeenCalledWith(updated);
    expect(updated.study.id).toBe(existing.study.id);
  });

  it('rejects a missing, non-draft, or non-1.1 study without saving', async () => {
    const existing = createDraft();
    const input = {
      a1StartDate: localDateSchema.parse('2026-11-01'),
      timeZone: timeZoneSchema.parse('UTC'),
      phaseDurationDays: 7
    };
    const save = vi.fn(async () => undefined);

    await expect(new UpdateDraftStudy({
      getByStudyId: async () => undefined,
      save
    }).execute(existing.study.id, input)).rejects.toBeInstanceOf(DraftStudyNotFoundError);

    const completed = studyDataSchema.parse({
      ...existing,
      study: { ...existing.study, status: 'completed' }
    });
    await expect(new UpdateDraftStudy({
      getByStudyId: async () => completed,
      save
    }).execute(existing.study.id, input)).rejects.toBeInstanceOf(DraftStudyNotEditableError);

    const legacy = studyDataSchema.parse({
      ...existing,
      study: { ...existing.study, protocolVersion: '1.0' }
    });
    await expect(new UpdateDraftStudy({
      getByStudyId: async () => legacy,
      save
    }).execute(existing.study.id, input)).rejects.toBeInstanceOf(DraftStudyProtocolError);
    expect(save).not.toHaveBeenCalled();
  });
});

function createDraft() {
  return buildDraftStudyData({
    a1StartDate: localDateSchema.parse('2026-09-01'),
    timeZone: timeZoneSchema.parse('Europe/Paris'),
    phaseDurationDays: 7
  }, deterministicBuilderDependencies());
}

function deterministicBuilderDependencies() {
  let id = 0;
  return {
    createId: () => entityIdSchema.parse(`00000000-0000-4000-8000-${String(++id).padStart(12, '0')}`),
    now: () => instantSchema.parse('2026-08-28T10:00:00+02:00')
  };
}
