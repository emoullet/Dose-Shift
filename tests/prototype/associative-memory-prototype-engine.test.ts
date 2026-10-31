import { describe, expect, it } from 'vitest';

import {
  AssociativeMemoryPrototypeEngine,
  associativeMemoryDifficulties,
  associativeMemoryDifficultyDigits,
  associativeMemoryEncodingBlankMs,
  associativeMemoryEncodingDurationMs,
  associativeMemoryItemCount,
  associativeMemoryRecognitionTimeoutMs,
  associativeMemoryTechnicalDelayMs
} from '../../src/prototype/associative-memory/associative-memory-prototype-engine';
import {
  associativeMemoryStimulusCatalogVersion,
  associativeMemoryStimulusIds
} from '../../src/prototype/associative-memory/associative-memory-stimulus-catalog';

describe('associative-memory prototype engine', () => {
  it('builds ten unique object-value associations for every candidate difficulty', () => {
    for (const difficulty of associativeMemoryDifficulties) {
      const engine = new AssociativeMemoryPrototypeEngine(
        { now: () => 0 },
        cyclingRandom(),
        difficulty
      );
      const run = engine.getRun();

      expect(run.itemCount).toBe(10);
      expect(run.valueDigits).toBe(associativeMemoryDifficultyDigits[difficulty]);
      expect(run.encodingDurationMs).toBe(associativeMemoryEncodingDurationMs);
      expect(run.encodingBlankMs).toBe(associativeMemoryEncodingBlankMs);
      expect(run.technicalDelayMs).toBe(associativeMemoryTechnicalDelayMs);
      expect(run.recognitionTimeoutMs).toBe(associativeMemoryRecognitionTimeoutMs);
      expect(run.stimulusCatalogVersion).toBe(associativeMemoryStimulusCatalogVersion);
      expect(new Set(run.trials.map(({ objectStimulusId }) => objectStimulusId)).size).toBe(10);
      expect(new Set(run.trials.map(({ encodedValue }) => encodedValue)).size).toBe(10);
      expect(run.trials.every(({ encodedValue }) =>
        encodedValue.length === associativeMemoryDifficultyDigits[difficulty])).toBe(true);
    }
  });

  it('keeps a local catalog of forty stable object identifiers', () => {
    expect(associativeMemoryStimulusIds).toHaveLength(40);
    expect(new Set(associativeMemoryStimulusIds).size).toBe(40);
  });

  it('starts monotonic run timing at the first encoding activation, not during preparation', () => {
    const clock = { value: 2_000 };
    const engine = createEngine(clock);

    clock.value = 9_500;
    engine.activateEncodingTrial(1);

    expect(engine.getRun().trials.find(({ encodingOrder }) => encodingOrder === 1))
      .toHaveProperty('encodingActivatedOffsetMs', 0);
  });

  it('uses each encoded value once as a different object’s distractor', () => {
    const run = createEngine().getRun();
    const encodedValues = [...run.trials.map(({ encodedValue }) => encodedValue)].sort();
    const distractorValues = [...run.trials.map(({ distractorValue }) => distractorValue)].sort();

    expect(distractorValues).toEqual(encodedValues);
    expect(run.trials.every(({ encodedValue, distractorValue }) =>
      encodedValue !== distractorValue)).toBe(true);
  });

  it('independently permutes recognition order and balances the correct answer sides', () => {
    const run = createEngine().getRun();

    expect([...run.trials.map(({ recognitionOrder }) => recognitionOrder)].sort((a, b) => a - b))
      .toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(run.trials.filter(({ correctAnswerSide }) => correctAnswerSide === 'left')).toHaveLength(5);
    expect(run.trials.filter(({ correctAnswerSide }) => correctAnswerSide === 'right')).toHaveLength(5);
    for (const trial of run.trials) {
      expect(trial.displayedAnswerOrder).toHaveLength(2);
      expect(trial.displayedAnswerOrder[trial.correctAnswerSide === 'left' ? 0 : 1])
        .toBe(trial.encodedValue);
    }
  });

  it('enforces encoding, delay, and recognition order', () => {
    const clock = { value: 0 };
    const engine = createEngine(clock);

    expect(() => engine.beginTechnicalDelay()).toThrow(/Every encoding trial/);
    engine.activateEncodingTrial(1);
    expect(() => engine.activateEncodingTrial(2)).toThrow(/neutral interval/);
    clock.value += associativeMemoryEncodingDurationMs + associativeMemoryEncodingBlankMs;
    for (let order = 2; order <= associativeMemoryItemCount; order += 1) {
      engine.activateEncodingTrial(order);
      clock.value += associativeMemoryEncodingDurationMs + associativeMemoryEncodingBlankMs;
    }
    engine.beginTechnicalDelay();
    expect(engine.getRun().stage).toBe('technical_delay');
    expect(() => engine.activateRecognitionTrial(1)).toThrow(/recognition/);
    expect(() => engine.beginRecognition()).toThrow(/technical delay/);
    clock.value += associativeMemoryTechnicalDelayMs;
    engine.beginRecognition();
    expect(engine.getRun().stage).toBe('recognition');
  });

  it('records definitive correct and incorrect responses from the software prompt proxy', () => {
    const clock = { value: 1_000 };
    const engine = createEngine(clock);
    prepareRecognition(engine, clock);
    const first = engine.activateRecognitionTrial(1);
    clock.value += 840;
    expect(engine.respond(first.encodedValue)).toBe('correct');
    const second = engine.activateRecognitionTrial(2);
    clock.value += 1_060;
    expect(engine.respond(second.distractorValue)).toBe('incorrect');

    const trials = engine.getRun().trials;
    expect(trials.find(({ recognitionOrder }) => recognitionOrder === 1)).toMatchObject({
      selectedValue: first.encodedValue,
      responseTimeMs: 840,
      outcome: 'correct'
    });
    expect(trials.find(({ recognitionOrder }) => recognitionOrder === 2)).toMatchObject({
      selectedValue: second.distractorValue,
      responseTimeMs: 1_060,
      outcome: 'incorrect'
    });
  });

  it('records a timeout as incorrect without inventing a selection or reaction time', () => {
    const clock = { value: 0 };
    const engine = createEngine(clock);
    prepareRecognition(engine, clock);
    engine.activateRecognitionTrial(1);

    clock.value += associativeMemoryRecognitionTimeoutMs - 1;
    expect(engine.resolveTimeoutIfDue()).toBe(false);
    clock.value += 1;
    expect(engine.resolveTimeoutIfDue()).toBe(true);

    const timedOut = engine.getRun().trials.find(({ recognitionOrder }) => recognitionOrder === 1)!;
    expect(timedOut.outcome).toBe('timeout');
    expect(timedOut).not.toHaveProperty('selectedValue');
    expect(timedOut).not.toHaveProperty('responseOffsetMs');
    expect(timedOut).not.toHaveProperty('responseTimeMs');
  });

  it('gives timeout precedence when a response arrives at the deadline', () => {
    const clock = { value: 0 };
    const engine = createEngine(clock);
    prepareRecognition(engine, clock);
    const trial = engine.activateRecognitionTrial(1);
    clock.value += associativeMemoryRecognitionTimeoutMs;

    expect(engine.respond(trial.encodedValue)).toBe('timeout');
  });

  it('derives completed accuracy and median only from observed response times', () => {
    const clock = { value: 0 };
    const engine = createEngine(clock);
    prepareRecognition(engine, clock);

    for (let order = 1; order <= associativeMemoryItemCount; order += 1) {
      const trial = engine.activateRecognitionTrial(order);
      if (order === associativeMemoryItemCount) {
        clock.value += associativeMemoryRecognitionTimeoutMs;
        expect(engine.resolveTimeoutIfDue()).toBe(true);
      } else {
        clock.value += order * 100;
        engine.respond(order <= 7 ? trial.encodedValue : trial.distractorValue);
      }
    }

    expect(engine.summarize()).toEqual({
      status: 'completed',
      itemCount: 10,
      answeredCount: 9,
      timeoutCount: 1,
      correctResponseCount: 7,
      accuracyProportion: 0.7,
      medianObservedResponseTimeMs: 500
    });
  });

  it('retains partial raw events but withholds a score after an interruption', () => {
    const clock = { value: 0 };
    const engine = createEngine(clock);
    prepareRecognition(engine, clock);
    const trial = engine.activateRecognitionTrial(1);
    clock.value = 420;
    engine.respond(trial.encodedValue);
    clock.value = 500;
    engine.interrupt('visibility_lost');

    expect(engine.summarize()).toEqual({
      status: 'technical_invalid',
      itemCount: 10,
      answeredCount: 1,
      timeoutCount: 0,
      interruptionReason: 'visibility_lost'
    });
    expect(engine.summarize()).not.toHaveProperty('accuracyProportion');
    expect(engine.summarize()).not.toHaveProperty('correctResponseCount');
  });
});

function createEngine(clock = { value: 0 }): AssociativeMemoryPrototypeEngine {
  return new AssociativeMemoryPrototypeEngine(
    { now: () => clock.value },
    cyclingRandom()
  );
}

function activateAllEncodingTrials(
  engine: AssociativeMemoryPrototypeEngine,
  clock: { value: number }
): void {
  for (let order = 1; order <= associativeMemoryItemCount; order += 1) {
    engine.activateEncodingTrial(order);
    clock.value += associativeMemoryEncodingDurationMs + associativeMemoryEncodingBlankMs;
  }
}

function prepareRecognition(
  engine: AssociativeMemoryPrototypeEngine,
  clock: { value: number }
): void {
  activateAllEncodingTrials(engine, clock);
  engine.beginTechnicalDelay();
  clock.value += associativeMemoryTechnicalDelayMs;
  engine.beginRecognition();
}

function cyclingRandom(): { next: () => number } {
  const values = [0.13, 0.71, 0.31, 0.89, 0.47, 0.05, 0.63, 0.25, 0.81, 0.39];
  let index = 0;
  return {
    next: () => values[index++ % values.length]!
  };
}
