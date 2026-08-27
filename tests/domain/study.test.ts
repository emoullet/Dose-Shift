import { describe, expect, it } from 'vitest';

import { createEntityId } from '../../src/domain/common/identity';
import { nowAsInstant } from '../../src/domain/common/time';
import { studySchema } from '../../src/domain/study/study';

describe('studySchema', () => {
  it('accepts a minimal locale-independent study record', () => {
    const timestamp = nowAsInstant();
    const result = studySchema.safeParse({
      id: createEntityId(),
      protocolVersion: '1.0',
      timeZone: 'Europe/Paris',
      createdAt: timestamp,
      updatedAt: timestamp
    });

    expect(result.success).toBe(true);
  });

  it('rejects ambiguous timestamps and invalid time zones', () => {
    const result = studySchema.safeParse({
      id: createEntityId(),
      protocolVersion: '1.0',
      timeZone: 'Not/A-Time-Zone',
      createdAt: '2026-08-27 10:00',
      updatedAt: '2026-08-27 10:00'
    });

    expect(result.success).toBe(false);
  });
});
