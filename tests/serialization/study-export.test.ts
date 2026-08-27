import { describe, expect, it } from 'vitest';

import { parseStudyExport } from '../../src/serialization/study-export';

describe('parseStudyExport', () => {
  it('fails safely for an unsupported export version', () => {
    expect(() => parseStudyExport({
      format: 'dose-shift',
      version: 2,
      exportedAt: new Date().toISOString(),
      studies: []
    })).toThrow();
  });
});
