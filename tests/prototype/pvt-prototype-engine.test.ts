import { describe, expect, it } from 'vitest';

import {
  PvtPrototypeEngine,
  pvtPrototypeDurationMs,
  summarizePvtPrototypeAttempts,
  type PvtPrototypeAttempt
} from '../../src/prototype/pvt/pvt-prototype-engine';

class TestClock {
  public value = 0;

  public readonly now = (): number => this.value;
}

describe('PVT timing prototype engine', () => {
  it('generates deterministic inclusive 1–4 second intervals', () => {
    const clock = new TestClock();
    const randomValues = [0, 0.999_999, 0.5];
    const engine = new PvtPrototypeEngine(clock, {
      next: () => randomValues.shift() ?? 0
    });

    expect(engine.start().nextTransitionAtMs).toBe(1_000);
    clock.value = 200;
    expect(engine.respond().attempts[0]).toMatchObject({
      plannedInterStimulusIntervalMs: 1_000,
      outcome: 'false_start'
    });
    expect(engine.getSnapshot().nextTransitionAtMs).toBe(4_200);
    clock.value = 500;
    engine.respond();
    expect(engine.getSnapshot().nextTransitionAtMs).toBe(3_000);
  });

  it('classifies the exact false-start and candidate-lapse boundaries', () => {
    const clock = new TestClock();
    const engine = new PvtPrototypeEngine(clock, { next: () => 0 });
    engine.start();

    clock.value = 1_000;
    engine.presentStimulus();
    clock.value = 1_099;
    expect(engine.respond().attempts[0]).toMatchObject({
      outcome: 'false_start',
      responseOffsetMs: 1_099
    });

    clock.value = 2_099;
    engine.presentStimulus();
    clock.value = 2_199;
    expect(engine.respond().attempts[1]).toMatchObject({
      outcome: 'valid_response',
      reactionTimeMs: 100
    });

    clock.value = 3_199;
    engine.presentStimulus();
    clock.value = 3_554;
    const snapshot = engine.respond();
    expect(snapshot.attempts[2]).toMatchObject({
      outcome: 'valid_response',
      reactionTimeMs: 355
    });
    expect(snapshot.summary.lapseCount).toBe(1);
  });

  it('derives median and mean reciprocal reaction time only from valid responses', () => {
    const attempts: PvtPrototypeAttempt[] = [
      attempt(1, 'valid_response', 200),
      attempt(2, 'valid_response', 400),
      attempt(3, 'valid_response', 800),
      attempt(4, 'false_start'),
      attempt(5, 'timeout'),
      attempt(6, 'technical_invalid')
    ];

    expect(summarizePvtPrototypeAttempts(attempts)).toEqual({
      validResponseCount: 3,
      falseStartCount: 1,
      timeoutCount: 1,
      lapseCount: 2,
      meanReciprocalReactionTimePerSecond: (5 + 2.5 + 1.25) / 3,
      medianReactionTimeMs: 400
    });
  });

  it('records a timeout after thirty seconds without a response', () => {
    const clock = new TestClock();
    const engine = new PvtPrototypeEngine(clock, { next: () => 0 });
    engine.start();
    clock.value = 1_000;
    engine.presentStimulus();

    clock.value = 30_999;
    expect(engine.advance().attempts).toHaveLength(0);
    clock.value = 31_000;
    const snapshot = engine.advance();

    expect(snapshot.attempts[0]).toMatchObject({
      outcome: 'timeout',
      stimulusPresentedOffsetMs: 1_000,
      endedOffsetMs: 31_000
    });
    expect(snapshot.summary.timeoutCount).toBe(1);
  });

  it.each([
    'visibility_lost',
    'focus_lost',
    'orientation_changed'
  ] as const)('interrupts and preserves a technical-invalid attempt for %s', (reason) => {
    const clock = new TestClock();
    const engine = new PvtPrototypeEngine(clock, { next: () => 0.25 });
    engine.start();
    clock.value = 450;

    const snapshot = engine.interrupt(reason);

    expect(snapshot.phase).toBe('interrupted');
    expect(snapshot.interruptionReason).toBe(reason);
    expect(snapshot.attempts[0]).toMatchObject({
      presentationOrder: 1,
      plannedInterStimulusIntervalMs: 1_750,
      endedOffsetMs: 450,
      outcome: 'technical_invalid',
      technicalInvalidReason: reason
    });
  });

  it('stops at 180 seconds and does not accept later responses', () => {
    const clock = new TestClock();
    const engine = new PvtPrototypeEngine(clock, { next: () => 0 });
    engine.start();
    clock.value = pvtPrototypeDurationMs;

    const completed = engine.advance();

    expect(completed.phase).toBe('completed');
    expect(completed.elapsedMs).toBe(pvtPrototypeDurationMs);
    expect(completed.attempts[0]).toMatchObject({
      outcome: 'technical_invalid',
      technicalInvalidReason: 'session_ended',
      endedOffsetMs: pvtPrototypeDurationMs
    });
    clock.value += 500;
    expect(engine.respond()).toEqual(engine.getSnapshot());
  });
});

function attempt(
  presentationOrder: number,
  outcome: PvtPrototypeAttempt['outcome'],
  reactionTimeMs?: number
): PvtPrototypeAttempt {
  return {
    presentationOrder,
    plannedInterStimulusIntervalMs: 1_000,
    plannedStimulusOffsetMs: presentationOrder * 1_000,
    endedOffsetMs: presentationOrder * 1_000 + (reactionTimeMs ?? 0),
    outcome,
    ...(reactionTimeMs !== undefined && { reactionTimeMs })
  };
}
