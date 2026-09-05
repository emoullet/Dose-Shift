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
    engine.activateStimulus();
    clock.value = 1_099;
    expect(engine.respond().attempts[0]).toMatchObject({
      outcome: 'false_start',
      responseOffsetMs: 1_099
    });

    clock.value = 2_099;
    engine.activateStimulus();
    clock.value = 2_199;
    expect(engine.respond().attempts[1]).toMatchObject({
      outcome: 'valid_response',
      reactionTimeMs: 100
    });

    clock.value = 3_199;
    engine.activateStimulus();
    clock.value = 3_554;
    const snapshot = engine.respond();
    expect(snapshot.attempts[2]).toMatchObject({
      outcome: 'valid_response',
      reactionTimeMs: 355
    });
    expect(snapshot.summary.lapseCount).toBe(1);
  });

  it('includes timeouts in candidate lapses and analytical reaction-time summaries', () => {
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
      lapseCount: 3,
      meanReciprocalReactionTimePerSecond: (5 + 2.5 + 1.25 + 1 / 30) / 4,
      medianReactionTimeMs: 600
    });
  });

  it('records a timeout after thirty seconds without a response', () => {
    const clock = new TestClock();
    const engine = new PvtPrototypeEngine(clock, { next: () => 0 });
    engine.start();
    clock.value = 1_000;
    engine.activateStimulus();

    clock.value = 30_999;
    expect(engine.advance().attempts).toHaveLength(0);
    clock.value = 31_000;
    const snapshot = engine.advance();

    expect(snapshot.attempts[0]).toMatchObject({
      outcome: 'timeout',
      stimulusActivatedOffsetMs: 1_000,
      endedOffsetMs: 31_000,
      analyticalReactionTimeMs: 30_000
    });
    expect(snapshot.attempts[0]).not.toHaveProperty('responseOffsetMs');
    expect(snapshot.attempts[0]).not.toHaveProperty('reactionTimeMs');
    expect(snapshot.summary.timeoutCount).toBe(1);
    expect(snapshot.summary.lapseCount).toBe(1);
    expect(snapshot.summary.medianReactionTimeMs).toBe(30_000);
    expect(snapshot.summary.meanReciprocalReactionTimePerSecond).toBeCloseTo(1 / 30);
  });

  it.each([
    ['at the exact threshold', 31_000],
    ['after the threshold', 31_500]
  ] as const)('gives a due timeout priority over a pointer response %s', (_label, responseAtMs) => {
    const clock = new TestClock();
    const engine = new PvtPrototypeEngine(clock, { next: () => 0 });
    engine.start();
    clock.value = 1_000;
    engine.activateStimulus();

    clock.value = responseAtMs;
    const snapshot = engine.respond();

    expect(snapshot.attempts[0]).toMatchObject({
      outcome: 'timeout',
      endedOffsetMs: responseAtMs,
      analyticalReactionTimeMs: 30_000
    });
    expect(snapshot.attempts[0]).not.toHaveProperty('responseOffsetMs');
    expect(snapshot.attempts[0]).not.toHaveProperty('reactionTimeMs');
    expect(snapshot.summary.lapseCount).toBe(1);
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

  it('does not create an attempt for an unactivated future stimulus at 180 seconds', () => {
    const clock = new TestClock();
    const engine = new PvtPrototypeEngine(clock, { next: () => 0 });
    engine.start();
    clock.value = pvtPrototypeDurationMs;

    const completed = engine.advance();

    expect(completed.phase).toBe('completed');
    expect(completed.elapsedMs).toBe(pvtPrototypeDurationMs);
    expect(completed.attempts).toHaveLength(0);
    clock.value += 500;
    expect(engine.respond()).toEqual(engine.getSnapshot());
  });

  it('gives a timeout due at the 180-second boundary priority over session completion', () => {
    const clock = new TestClock();
    const engine = new PvtPrototypeEngine(clock, { next: () => 0 });
    engine.start();
    clock.value = 150_000;
    engine.activateStimulus();

    clock.value = pvtPrototypeDurationMs;
    const completed = engine.advance();

    expect(completed.phase).toBe('completed');
    expect(completed.attempts[0]).toMatchObject({
      outcome: 'timeout',
      endedOffsetMs: pvtPrototypeDurationMs,
      analyticalReactionTimeMs: 30_000
    });
    expect(completed.attempts[0]).not.toHaveProperty('responseOffsetMs');
    expect(completed.summary.timeoutCount).toBe(1);
    expect(completed.summary.lapseCount).toBe(1);
  });

  it('retains an activated stimulus censored by the 180-second boundary', () => {
    const clock = new TestClock();
    const engine = new PvtPrototypeEngine(clock, { next: () => 0 });
    engine.start();
    clock.value = 150_001;
    engine.activateStimulus();

    clock.value = pvtPrototypeDurationMs;
    const completed = engine.advance();

    expect(completed.phase).toBe('completed');
    expect(completed.attempts[0]).toMatchObject({
      outcome: 'technical_invalid',
      technicalInvalidReason: 'session_ended',
      endedOffsetMs: pvtPrototypeDurationMs
    });
    expect(completed.summary.timeoutCount).toBe(0);
    expect(completed.summary.lapseCount).toBe(0);
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
    ...(outcome === 'valid_response' && reactionTimeMs !== undefined && {
      analyticalReactionTimeMs: reactionTimeMs
    }),
    ...(reactionTimeMs !== undefined && { reactionTimeMs })
  };
}
