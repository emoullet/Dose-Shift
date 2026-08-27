import { describe, expect, it } from 'vitest';

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
});
