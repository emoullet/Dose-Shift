import { describe, expect, it } from 'vitest';

import { buildDraftStudyData } from '../../src/application/studies/build-draft-study-data';
import { localDateSchema, timeZoneSchema } from '../../src/domain/common/time';
import {
  createStudyExport,
  parseStudyExport,
  parseStudyExportJson,
  serializeStudyExport
} from '../../src/serialization/study-export';
import { createCompleteStudyData } from '../fixtures/study-data';

describe('parseStudyExport', () => {
  it('fails safely for an unsupported export version', () => {
    expect(() => parseStudyExport({
      format: 'dose-shift',
      version: 99,
      exportedAt: new Date().toISOString(),
      applicationVersion: '0.1.0',
      studyData: []
    })).toThrow();
  });

  it('round-trips the complete versioned envelope without losing raw or missing data', () => {
    const data = createCompleteStudyData();
    const studyExport = createStudyExport(
      [data],
      '2026-09-22T10:00:00+02:00',
      '0.1.0'
    );

    const parsed = parseStudyExportJson(serializeStudyExport(studyExport));

    expect(parsed).toEqual(studyExport);
    expect(parsed.studyData[0]!.cognitiveMeasurements).toContainEqual(
      expect.objectContaining({ status: 'missed', missedReason: 'technical_issue' })
    );
    expect(parsed.studyData[0]!.pvtSessions[0]!.rawTrials).toHaveLength(3);
    expect(parsed.studyData[0]!.associativeMemorySessions[0]!.trials).toHaveLength(2);
    expect(parsed.studyData[0]!.auditEntries).toEqual(data.auditEntries);
  });

  it('round-trips protocol 1.1 variable-duration drafts without changing export version 2', () => {
    const draft = buildDraftStudyData({
      a1StartDate: localDateSchema.parse('2028-02-29'),
      timeZone: timeZoneSchema.parse('Europe/Paris'),
      phaseDurationDays: 90
    });

    const parsed = parseStudyExportJson(serializeStudyExport(createStudyExport(
      [draft],
      '2028-02-01T10:00:00+01:00',
      '0.1.0'
    )));

    expect(parsed.version).toBe(2);
    expect(parsed.studyData[0]).toEqual(draft);
    expect(parsed.studyData[0]!.study.protocolVersion).toBe('1.1');
    expect(parsed.studyData[0]!.protocolPhases[2]!.endDate).toBe('2028-11-24');
  });
});
