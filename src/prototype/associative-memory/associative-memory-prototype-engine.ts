import {
  associativeMemoryStimulusCatalogVersion,
  associativeMemoryStimulusIds,
  type AssociativeMemoryStimulusId
} from './associative-memory-stimulus-catalog';

export const associativeMemoryPrototypeVersion = 'object-value-0.1.0';
export const associativeMemoryItemCount = 10;
export const associativeMemoryEncodingDurationMs = 3_000;
export const associativeMemoryEncodingBlankMs = 500;
export const associativeMemoryTechnicalDelayMs = 30_000;
export const associativeMemoryRecognitionTimeoutMs = 30_000;

export const associativeMemoryDifficulties = ['easy', 'standard', 'hard'] as const;
export type AssociativeMemoryDifficulty = typeof associativeMemoryDifficulties[number];

export const associativeMemoryDifficultyDigits: Readonly<Record<AssociativeMemoryDifficulty, number>> = {
  easy: 2,
  standard: 3,
  hard: 4
};

export type AssociativeMemoryInterruptionReason =
  | 'visibility_lost'
  | 'focus_lost'
  | 'orientation_changed'
  | 'user_abandoned';

export type AssociativeMemoryTrialOutcome = 'correct' | 'incorrect' | 'timeout';
export type AnswerSide = 'left' | 'right';

export interface MonotonicClock {
  readonly now: () => number;
}

export interface RandomSource {
  readonly next: () => number;
}

export interface AssociativeMemoryPrototypeTrial {
  readonly trialId: string;
  readonly objectStimulusId: AssociativeMemoryStimulusId;
  readonly encodingOrder: number;
  readonly recognitionOrder: number;
  readonly encodedValue: string;
  readonly distractorValue: string;
  readonly correctAnswerSide: AnswerSide;
  readonly displayedAnswerOrder: readonly [string, string];
  readonly encodingActivatedOffsetMs?: number;
  readonly recognitionPromptActivatedOffsetMs?: number;
  readonly selectedValue?: string;
  readonly responseOffsetMs?: number;
  readonly responseTimeMs?: number;
  readonly outcome?: AssociativeMemoryTrialOutcome;
}

export interface AssociativeMemoryPrototypeRun {
  readonly prototypeVersion: string;
  readonly stimulusCatalogVersion: string;
  readonly difficulty: AssociativeMemoryDifficulty;
  readonly valueDigits: number;
  readonly itemCount: number;
  readonly encodingDurationMs: number;
  readonly encodingBlankMs: number;
  readonly technicalDelayMs: number;
  readonly recognitionTimeoutMs: number;
  readonly status: 'running' | 'completed' | 'technical_invalid';
  readonly stage: 'encoding' | 'technical_delay' | 'recognition';
  readonly startedOffsetMs: 0;
  readonly technicalDelayStartedOffsetMs?: number;
  readonly recognitionStartedOffsetMs?: number;
  readonly completedOffsetMs?: number;
  readonly interruptedOffsetMs?: number;
  readonly interruptionReason?: AssociativeMemoryInterruptionReason;
  readonly trials: readonly AssociativeMemoryPrototypeTrial[];
}

export interface AssociativeMemoryPrototypeSummary {
  readonly status: 'completed' | 'technical_invalid';
  readonly itemCount: number;
  readonly answeredCount: number;
  readonly timeoutCount: number;
  readonly correctResponseCount?: number;
  readonly accuracyProportion?: number;
  readonly medianObservedResponseTimeMs?: number;
  readonly interruptionReason?: AssociativeMemoryInterruptionReason;
}

interface MutableTrial {
  trialId: string;
  objectStimulusId: AssociativeMemoryStimulusId;
  encodingOrder: number;
  recognitionOrder: number;
  encodedValue: string;
  distractorValue: string;
  correctAnswerSide: AnswerSide;
  displayedAnswerOrder: [string, string];
  encodingActivatedOffsetMs?: number;
  recognitionPromptActivatedOffsetMs?: number;
  selectedValue?: string;
  responseOffsetMs?: number;
  responseTimeMs?: number;
  outcome?: AssociativeMemoryTrialOutcome;
}

export class AssociativeMemoryPrototypeEngine {
  private originMs: number | undefined;
  private readonly trials: MutableTrial[];
  private status: AssociativeMemoryPrototypeRun['status'] = 'running';
  private stage: AssociativeMemoryPrototypeRun['stage'] = 'encoding';
  private technicalDelayStartedOffsetMs?: number;
  private recognitionStartedOffsetMs?: number;
  private completedOffsetMs?: number;
  private interruptedOffsetMs?: number;
  private interruptionReason?: AssociativeMemoryInterruptionReason;
  private activeRecognitionOrder: number | undefined;

  public constructor(
    private readonly clock: MonotonicClock,
    random: RandomSource,
    public readonly difficulty: AssociativeMemoryDifficulty = 'standard'
  ) {
    this.trials = generateTrials(random, difficulty);
  }

  public getRun(): AssociativeMemoryPrototypeRun {
    return {
      prototypeVersion: associativeMemoryPrototypeVersion,
      stimulusCatalogVersion: associativeMemoryStimulusCatalogVersion,
      difficulty: this.difficulty,
      valueDigits: associativeMemoryDifficultyDigits[this.difficulty],
      itemCount: associativeMemoryItemCount,
      encodingDurationMs: associativeMemoryEncodingDurationMs,
      encodingBlankMs: associativeMemoryEncodingBlankMs,
      technicalDelayMs: associativeMemoryTechnicalDelayMs,
      recognitionTimeoutMs: associativeMemoryRecognitionTimeoutMs,
      status: this.status,
      stage: this.stage,
      startedOffsetMs: 0,
      ...(this.technicalDelayStartedOffsetMs === undefined
        ? {}
        : { technicalDelayStartedOffsetMs: this.technicalDelayStartedOffsetMs }),
      ...(this.recognitionStartedOffsetMs === undefined
        ? {}
        : { recognitionStartedOffsetMs: this.recognitionStartedOffsetMs }),
      ...(this.completedOffsetMs === undefined ? {} : { completedOffsetMs: this.completedOffsetMs }),
      ...(this.interruptedOffsetMs === undefined
        ? {}
        : { interruptedOffsetMs: this.interruptedOffsetMs }),
      ...(this.interruptionReason === undefined ? {} : { interruptionReason: this.interruptionReason }),
      trials: this.trials.map((trial) => ({ ...trial, displayedAnswerOrder: [...trial.displayedAnswerOrder] }))
    };
  }

  public activateEncodingTrial(encodingOrder: number): AssociativeMemoryPrototypeTrial {
    this.requireRunningStage('encoding');
    if (encodingOrder === 1 && this.originMs === undefined) {
      this.originMs = this.clock.now();
    }
    const activatedCount = this.trials.filter(
      ({ encodingActivatedOffsetMs }) => encodingActivatedOffsetMs !== undefined
    ).length;
    if (encodingOrder !== activatedCount + 1) {
      throw new Error('Encoding trials must be activated in presentation order');
    }
    const trial = this.trialForOrder('encodingOrder', encodingOrder);
    if (trial.encodingActivatedOffsetMs !== undefined) {
      throw new Error('Encoding trial has already been activated');
    }
    const activationOffset = this.currentOffset();
    if (encodingOrder > 1) {
      const previous = this.trialForOrder('encodingOrder', encodingOrder - 1);
      if (activationOffset - previous.encodingActivatedOffsetMs! <
        associativeMemoryEncodingDurationMs + associativeMemoryEncodingBlankMs) {
        throw new Error('Encoding exposure and neutral interval must finish before the next pair');
      }
    }
    trial.encodingActivatedOffsetMs = activationOffset;
    return { ...trial, displayedAnswerOrder: [...trial.displayedAnswerOrder] };
  }

  public beginTechnicalDelay(): void {
    this.requireRunningStage('encoding');
    if (this.trials.some(({ encodingActivatedOffsetMs }) => encodingActivatedOffsetMs === undefined)) {
      throw new Error('Every encoding trial must be activated before the technical delay');
    }
    const lastEncodingOffset = this.trialForOrder(
      'encodingOrder',
      associativeMemoryItemCount
    ).encodingActivatedOffsetMs!;
    if (this.currentOffset() - lastEncodingOffset <
      associativeMemoryEncodingDurationMs + associativeMemoryEncodingBlankMs) {
      throw new Error('The final encoding exposure and neutral interval must finish first');
    }
    this.stage = 'technical_delay';
    this.technicalDelayStartedOffsetMs = this.currentOffset();
  }

  public beginRecognition(): void {
    this.requireRunningStage('technical_delay');
    if (this.currentOffset() - this.technicalDelayStartedOffsetMs! <
      associativeMemoryTechnicalDelayMs) {
      throw new Error('The technical delay must finish before recognition');
    }
    this.stage = 'recognition';
    this.recognitionStartedOffsetMs = this.currentOffset();
  }

  public activateRecognitionTrial(recognitionOrder: number): AssociativeMemoryPrototypeTrial {
    this.requireRunningStage('recognition');
    if (this.activeRecognitionOrder !== undefined) {
      throw new Error('The active recognition trial must be resolved first');
    }
    const resolvedCount = this.trials.filter(({ outcome }) => outcome !== undefined).length;
    if (recognitionOrder !== resolvedCount + 1) {
      throw new Error('Recognition trials must be activated in presentation order');
    }
    const trial = this.trialForOrder('recognitionOrder', recognitionOrder);
    if (trial.recognitionPromptActivatedOffsetMs !== undefined) {
      throw new Error('Recognition trial has already been activated');
    }
    trial.recognitionPromptActivatedOffsetMs = this.currentOffset();
    this.activeRecognitionOrder = recognitionOrder;
    return { ...trial, displayedAnswerOrder: [...trial.displayedAnswerOrder] };
  }

  public respond(selectedValue: string): AssociativeMemoryTrialOutcome {
    const trial = this.activeRecognitionTrial();
    const promptOffset = trial.recognitionPromptActivatedOffsetMs!;
    const responseOffset = this.currentOffset();
    if (responseOffset - promptOffset >= associativeMemoryRecognitionTimeoutMs) {
      this.recordTimeout(trial);
      return 'timeout';
    }
    if (!trial.displayedAnswerOrder.includes(selectedValue)) {
      throw new Error('Selected value must be one of the displayed answers');
    }

    trial.selectedValue = selectedValue;
    trial.responseOffsetMs = responseOffset;
    trial.responseTimeMs = responseOffset - promptOffset;
    trial.outcome = selectedValue === trial.encodedValue ? 'correct' : 'incorrect';
    const outcome = trial.outcome;
    this.finishActiveTrial();
    return outcome;
  }

  public resolveTimeoutIfDue(): boolean {
    const trial = this.activeRecognitionTrial();
    const promptOffset = trial.recognitionPromptActivatedOffsetMs!;
    if (this.currentOffset() - promptOffset < associativeMemoryRecognitionTimeoutMs) {
      return false;
    }
    this.recordTimeout(trial);
    return true;
  }

  public interrupt(reason: AssociativeMemoryInterruptionReason): void {
    if (this.status !== 'running') {
      return;
    }
    this.status = 'technical_invalid';
    this.interruptionReason = reason;
    this.interruptedOffsetMs = this.currentOffset();
    this.activeRecognitionOrder = undefined;
  }

  public summarize(): AssociativeMemoryPrototypeSummary {
    if (this.status === 'running') {
      throw new Error('A running prototype cannot be summarized');
    }
    const observedResponseTimes = this.trials.flatMap(({ responseTimeMs }) =>
      responseTimeMs === undefined ? [] : [responseTimeMs]);
    const answeredCount = observedResponseTimes.length;
    const timeoutCount = this.trials.filter(({ outcome }) => outcome === 'timeout').length;

    if (this.status === 'technical_invalid') {
      return {
        status: 'technical_invalid',
        itemCount: associativeMemoryItemCount,
        answeredCount,
        timeoutCount,
        ...(this.interruptionReason === undefined ? {} : { interruptionReason: this.interruptionReason })
      };
    }

    const correctResponseCount = this.trials.filter(({ outcome }) => outcome === 'correct').length;
    return {
      status: 'completed',
      itemCount: associativeMemoryItemCount,
      answeredCount,
      timeoutCount,
      correctResponseCount,
      accuracyProportion: correctResponseCount / associativeMemoryItemCount,
      ...(observedResponseTimes.length === 0
        ? {}
        : { medianObservedResponseTimeMs: median(observedResponseTimes) })
    };
  }

  private recordTimeout(trial: MutableTrial): void {
    trial.outcome = 'timeout';
    this.finishActiveTrial();
  }

  private finishActiveTrial(): void {
    this.activeRecognitionOrder = undefined;
    if (this.trials.every(({ outcome }) => outcome !== undefined)) {
      this.status = 'completed';
      this.completedOffsetMs = this.currentOffset();
    }
  }

  private activeRecognitionTrial(): MutableTrial {
    this.requireRunningStage('recognition');
    if (this.activeRecognitionOrder === undefined) {
      throw new Error('No recognition trial is active');
    }
    return this.trialForOrder('recognitionOrder', this.activeRecognitionOrder);
  }

  private trialForOrder(
    key: 'encodingOrder' | 'recognitionOrder',
    order: number
  ): MutableTrial {
    const trial = this.trials.find((candidate) => candidate[key] === order);
    if (trial === undefined) {
      throw new Error(`No trial exists for ${key} ${order}`);
    }
    return trial;
  }

  private requireRunningStage(expected: AssociativeMemoryPrototypeRun['stage']): void {
    if (this.status !== 'running' || this.stage !== expected) {
      throw new Error(`Prototype must be running in ${expected}`);
    }
  }

  private currentOffset(): number {
    if (this.originMs === undefined) {
      throw new Error('Prototype timing has not started');
    }
    const offset = this.clock.now() - this.originMs;
    if (!Number.isFinite(offset) || offset < 0) {
      throw new Error('Monotonic clock must not precede the prototype start');
    }
    return offset;
  }
}

function generateTrials(
  random: RandomSource,
  difficulty: AssociativeMemoryDifficulty
): MutableTrial[] {
  const objects = sampleWithoutReplacement(
    associativeMemoryStimulusIds,
    associativeMemoryItemCount,
    random
  );
  const values = generateValues(associativeMemoryDifficultyDigits[difficulty], random);
  const distractorIndexes = sattoloCycle(associativeMemoryItemCount, random);
  const recognitionIndexes = shuffledIndexes(associativeMemoryItemCount, random);
  const sides = shuffle([
    ...Array.from({ length: associativeMemoryItemCount / 2 }, () => 'left' as const),
    ...Array.from({ length: associativeMemoryItemCount / 2 }, () => 'right' as const)
  ], random);

  return objects.map((objectStimulusId, index) => {
    const encodedValue = values[index]!;
    const distractorValue = values[distractorIndexes[index]!]!;
    const correctAnswerSide = sides[index]!;
    return {
      trialId: `trial-${index + 1}`,
      objectStimulusId,
      encodingOrder: index + 1,
      recognitionOrder: recognitionIndexes.indexOf(index) + 1,
      encodedValue,
      distractorValue,
      correctAnswerSide,
      displayedAnswerOrder: correctAnswerSide === 'left'
        ? [encodedValue, distractorValue]
        : [distractorValue, encodedValue]
    };
  });
}

function generateValues(digits: number, random: RandomSource): string[] {
  const minimum = 10 ** (digits - 1);
  const maximum = 10 ** digits - 1;
  const candidates = Array.from({ length: maximum - minimum + 1 }, (_, index) => minimum + index);
  return sampleWithoutReplacement(candidates, associativeMemoryItemCount, random).map(String);
}

function shuffledIndexes(length: number, random: RandomSource): number[] {
  return shuffle(Array.from({ length }, (_, index) => index), random);
}

function sattoloCycle(length: number, random: RandomSource): number[] {
  const indexes = Array.from({ length }, (_, index) => index);
  for (let index = length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index, random);
    [indexes[index], indexes[swapIndex]] = [indexes[swapIndex]!, indexes[index]!];
  }
  return indexes;
}

function sampleWithoutReplacement<T>(
  source: readonly T[],
  count: number,
  random: RandomSource
): T[] {
  if (count > source.length) {
    throw new Error('Cannot sample more values than the source contains');
  }
  const available = [...source];
  const sampled: T[] = [];
  for (let index = 0; index < count; index += 1) {
    const selectedIndex = randomIndex(available.length, random);
    sampled.push(available.splice(selectedIndex, 1)[0]!);
  }
  return sampled;
}

function shuffle<T>(source: readonly T[], random: RandomSource): T[] {
  const shuffled = [...source];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1, random);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex]!, shuffled[index]!];
  }
  return shuffled;
}

function randomIndex(length: number, random: RandomSource): number {
  const draw = random.next();
  if (!Number.isFinite(draw) || draw < 0 || draw >= 1) {
    throw new Error('Random source must return a value in [0, 1)');
  }
  return Math.floor(draw * length);
}

function median(values: readonly number[]): number {
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 0
    ? (ordered[middle - 1]! + ordered[middle]!) / 2
    : ordered[middle]!;
}
