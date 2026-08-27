import { describe, expect, it } from 'vitest';

import { associativeMemorySessionSchema } from '../../src/domain/measurements/associative-memory-session';
import { pvtSessionSchema } from '../../src/domain/measurements/pvt-session';
import { createCompleteStudyData } from '../fixtures/study-data';

describe('objective cognitive trial schemas', () => {
  it('requires raw trials for an integrated PVT', () => {
    const session = createCompleteStudyData().pvtSessions[0]!;
    const withoutRawTrials = Object.fromEntries(
      Object.entries(session).filter(([key]) => key !== 'rawTrials')
    );

    expect(pvtSessionSchema.safeParse(withoutRawTrials).success).toBe(false);
  });

  it('recalculates PVT median reaction time and lapse count from raw trials', () => {
    const session = createCompleteStudyData().pvtSessions[0]!;

    expect(pvtSessionSchema.safeParse({
      ...session,
      medianReactionTimeMs: 321
    }).success).toBe(false);
    expect(pvtSessionSchema.safeParse({
      ...session,
      lapseCount: 0
    }).success).toBe(false);
    expect(pvtSessionSchema.safeParse({
      ...session,
      rawTrials: session.rawTrials!.map((trial, index) => index === 2
        ? { ...trial, reactionTimeMs: 500 }
        : trial),
      medianReactionTimeMs: 320,
      lapseCount: 1
    }).success).toBe(true);
  });

  it('validates associative-memory summaries against preserved trial data', () => {
    const session = createCompleteStudyData().associativeMemorySessions[0]!;

    expect(associativeMemorySessionSchema.safeParse({
      ...session,
      correctResponseCount: 2
    }).success).toBe(false);
    expect(associativeMemorySessionSchema.safeParse({
      ...session,
      trials: [{
        ...session.trials[0]!,
        selectedValue: '42',
        isCorrect: true
      }, session.trials[1]!]
    }).success).toBe(false);
  });
});
