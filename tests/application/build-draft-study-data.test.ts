import { describe, expect, it } from 'vitest';

import {
  buildDraftStudyData,
  canonicalProtocolVersion
} from '../../src/application/studies/build-draft-study-data';
import { entityIdSchema } from '../../src/domain/common/identity';
import { instantSchema, localDateSchema, timeZoneSchema } from '../../src/domain/common/time';

describe('buildDraftStudyData', () => {
  it('builds the canonical seven-day draft with controlled schedules and empty observations', () => {
    const draft = buildDraftStudyData({
      a1StartDate: localDateSchema.parse('2026-09-01'),
      timeZone: timeZoneSchema.parse('Europe/Paris'),
      phaseDurationDays: 7
    }, deterministicDependencies());

    expect(draft.study).toMatchObject({
      protocolVersion: canonicalProtocolVersion,
      startDate: '2026-09-01',
      timeZone: 'Europe/Paris',
      status: 'draft'
    });
    expect(draft.protocolPhases.map(({ kind, startDate, endDate, isTransitionStart }) => ({
      kind,
      startDate,
      endDate,
      isTransitionStart
    }))).toEqual([
      { kind: 'A1', startDate: '2026-09-01', endDate: '2026-09-07', isTransitionStart: false },
      { kind: 'B', startDate: '2026-09-08', endDate: '2026-09-14', isTransitionStart: true },
      { kind: 'A2', startDate: '2026-09-15', endDate: '2026-09-21', isTransitionStart: true }
    ]);
    expect(draft.protocolPhases.map(({ medicationSchedule }) => medicationSchedule)).toEqual([
      expectedSchedule('08:30', '09:00'),
      expectedSchedule('21:00', '22:00'),
      expectedSchedule('08:30', '09:00')
    ]);
    expect(Object.entries(draft)
      .filter(([key]) => key !== 'study' && key !== 'protocolPhases')
      .every(([, collection]) => Array.isArray(collection) && collection.length === 0)).toBe(true);
  });

  it.each([
    { duration: 1, expectedEnd: '2026-01-03' },
    { duration: 7, expectedEnd: '2026-01-21' },
    { duration: 90, expectedEnd: '2026-09-27' }
  ])('accepts the $duration-day bound/default', ({ duration, expectedEnd }) => {
    const draft = buildDraftStudyData({
      a1StartDate: localDateSchema.parse('2026-01-01'),
      timeZone: timeZoneSchema.parse('UTC'),
      phaseDurationDays: duration
    });
    expect(draft.protocolPhases[2]!.endDate).toBe(expectedEnd);
  });

  it.each([0, 1.5, 91])('rejects invalid duration %s', (phaseDurationDays) => {
    expect(() => buildDraftStudyData({
      a1StartDate: localDateSchema.parse('2026-01-01'),
      timeZone: timeZoneSchema.parse('UTC'),
      phaseDurationDays
    })).toThrow();
  });

  it.each([
    {
      name: 'month and leap-year boundary',
      start: '2028-02-27',
      duration: 3,
      expected: [['2028-02-27', '2028-02-29'], ['2028-03-01', '2028-03-03'], ['2028-03-04', '2028-03-06']]
    },
    {
      name: 'year boundary',
      start: '2026-12-30',
      duration: 7,
      expected: [['2026-12-30', '2027-01-05'], ['2027-01-06', '2027-01-12'], ['2027-01-13', '2027-01-19']]
    },
    {
      name: 'Europe/Paris spring DST boundary',
      start: '2026-03-27',
      duration: 7,
      expected: [['2026-03-27', '2026-04-02'], ['2026-04-03', '2026-04-09'], ['2026-04-10', '2026-04-16']]
    },
    {
      name: 'Europe/Paris autumn DST boundary',
      start: '2026-10-23',
      duration: 7,
      expected: [['2026-10-23', '2026-10-29'], ['2026-10-30', '2026-11-05'], ['2026-11-06', '2026-11-12']]
    }
  ])('uses civil-date arithmetic across $name', ({ start, duration, expected }) => {
    const draft = buildDraftStudyData({
      a1StartDate: localDateSchema.parse(start),
      timeZone: timeZoneSchema.parse('Europe/Paris'),
      phaseDurationDays: duration
    });
    expect(draft.protocolPhases.map(({ startDate, endDate }) => [startDate, endDate])).toEqual(expected);
  });
});

function deterministicDependencies() {
  let id = 0;
  return {
    createId: () => entityIdSchema.parse(`00000000-0000-4000-8000-${String(++id).padStart(12, '0')}`),
    now: () => instantSchema.parse('2026-08-28T10:00:00+02:00')
  };
}

function expectedSchedule(fesoterodineStart: string, fesoterodineEnd: string) {
  return [
    expect.objectContaining({
      medication: 'fesoterodine',
      doseMg: 8,
      formulation: 'extended_release',
      timeWindow: { startsAt: fesoterodineStart, endsAt: fesoterodineEnd }
    }),
    expect.objectContaining({
      medication: 'solifenacin',
      doseMg: 10,
      formulation: 'standard',
      timeWindow: { startsAt: '08:30', endsAt: '09:00' }
    })
  ];
}
