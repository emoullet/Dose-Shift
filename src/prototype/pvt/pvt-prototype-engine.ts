export const pvtPrototypeVersion = 'pvt-b-inspired-0.1.0';
export const pvtPrototypeDurationMs = 180_000;
export const pvtPrototypeMinimumIsiMs = 1_000;
export const pvtPrototypeMaximumIsiMs = 4_000;
export const pvtPrototypeFalseStartThresholdMs = 100;
export const pvtPrototypeTimeoutMs = 30_000;
export const pvtPrototypeCandidateLapseThresholdMs = 355;

export type PvtPrototypeAttemptOutcome =
  | 'valid_response'
  | 'false_start'
  | 'timeout'
  | 'technical_invalid';

export type PvtPrototypeInterruptionReason =
  | 'visibility_lost'
  | 'focus_lost'
  | 'orientation_changed'
  | 'session_ended';

export interface PvtPrototypeAttempt {
  readonly presentationOrder: number;
  readonly plannedInterStimulusIntervalMs: number;
  readonly plannedStimulusOffsetMs: number;
  readonly stimulusPresentedOffsetMs?: number;
  readonly responseOffsetMs?: number;
  readonly endedOffsetMs: number;
  readonly outcome: PvtPrototypeAttemptOutcome;
  readonly reactionTimeMs?: number;
  readonly technicalInvalidReason?: PvtPrototypeInterruptionReason;
}

export interface PvtPrototypeSummary {
  readonly validResponseCount: number;
  readonly falseStartCount: number;
  readonly timeoutCount: number;
  readonly lapseCount: number;
  readonly meanReciprocalReactionTimePerSecond?: number;
  readonly medianReactionTimeMs?: number;
}

export type PvtPrototypePhase =
  | 'idle'
  | 'waiting'
  | 'stimulus'
  | 'completed'
  | 'interrupted';

export interface PvtPrototypeSnapshot {
  readonly version: string;
  readonly phase: PvtPrototypePhase;
  readonly elapsedMs: number;
  readonly attempts: readonly PvtPrototypeAttempt[];
  readonly summary: PvtPrototypeSummary;
  readonly interruptionReason?: PvtPrototypeInterruptionReason;
  readonly nextTransitionAtMs?: number;
}

export interface PvtPrototypeClock {
  readonly now: () => number;
}

export interface PvtPrototypeRandomSource {
  readonly next: () => number;
}

interface PendingAttempt {
  readonly presentationOrder: number;
  readonly plannedInterStimulusIntervalMs: number;
  readonly plannedStimulusOffsetMs: number;
  readonly stimulusPresentedOffsetMs?: number;
}

export class PvtPrototypeEngine {
  private phase: PvtPrototypePhase = 'idle';
  private startedAtMs: number | undefined;
  private pendingAttempt: PendingAttempt | undefined;
  private readonly attempts: PvtPrototypeAttempt[] = [];
  private interruptionReason: PvtPrototypeInterruptionReason | undefined;

  public constructor(
    private readonly clock: PvtPrototypeClock,
    private readonly random: PvtPrototypeRandomSource
  ) {}

  public start(): PvtPrototypeSnapshot {
    if (this.phase !== 'idle') {
      throw new Error('The PVT timing prototype can only be started once');
    }
    this.startedAtMs = this.clock.now();
    this.scheduleNextAttempt(0);
    return this.getSnapshot();
  }

  public presentStimulus(): PvtPrototypeSnapshot {
    if (this.phase !== 'waiting' || this.pendingAttempt === undefined) {
      return this.getSnapshot();
    }
    const elapsedMs = this.getElapsedMs();
    if (elapsedMs >= pvtPrototypeDurationMs) {
      return this.completeAtDuration(elapsedMs);
    }
    if (elapsedMs < this.pendingAttempt.plannedStimulusOffsetMs) {
      return this.getSnapshot();
    }
    this.pendingAttempt = {
      ...this.pendingAttempt,
      stimulusPresentedOffsetMs: elapsedMs
    };
    this.phase = 'stimulus';
    return this.getSnapshot();
  }

  public respond(): PvtPrototypeSnapshot {
    if (this.phase !== 'waiting' && this.phase !== 'stimulus') {
      return this.getSnapshot();
    }
    const elapsedMs = this.getElapsedMs();
    if (elapsedMs >= pvtPrototypeDurationMs) {
      return this.completeAtDuration(elapsedMs);
    }
    if (this.pendingAttempt === undefined) {
      throw new Error('An active PVT prototype phase requires a pending attempt');
    }

    const stimulusOffsetMs = this.pendingAttempt.stimulusPresentedOffsetMs;
    const reactionTimeMs = stimulusOffsetMs === undefined
      ? undefined
      : elapsedMs - stimulusOffsetMs;
    const outcome: PvtPrototypeAttemptOutcome = reactionTimeMs === undefined ||
      reactionTimeMs < pvtPrototypeFalseStartThresholdMs
      ? 'false_start'
      : 'valid_response';

    this.finishPendingAttempt({
      responseOffsetMs: elapsedMs,
      endedOffsetMs: elapsedMs,
      outcome,
      ...(outcome === 'valid_response' && reactionTimeMs !== undefined && { reactionTimeMs })
    });
    this.scheduleNextAttempt(elapsedMs);
    return this.getSnapshot();
  }

  public advance(): PvtPrototypeSnapshot {
    if (this.phase !== 'waiting' && this.phase !== 'stimulus') {
      return this.getSnapshot();
    }
    const elapsedMs = this.getElapsedMs();
    if (elapsedMs >= pvtPrototypeDurationMs) {
      return this.completeAtDuration(elapsedMs);
    }
    if (this.phase === 'waiting') {
      return this.presentStimulus();
    }

    const stimulusOffsetMs = this.pendingAttempt?.stimulusPresentedOffsetMs;
    if (stimulusOffsetMs !== undefined &&
      elapsedMs - stimulusOffsetMs >= pvtPrototypeTimeoutMs) {
      this.finishPendingAttempt({ endedOffsetMs: elapsedMs, outcome: 'timeout' });
      this.scheduleNextAttempt(elapsedMs);
    }
    return this.getSnapshot();
  }

  public interrupt(reason: Exclude<PvtPrototypeInterruptionReason, 'session_ended'>): PvtPrototypeSnapshot {
    if (this.phase !== 'waiting' && this.phase !== 'stimulus') {
      return this.getSnapshot();
    }
    const elapsedMs = this.getElapsedMs();
    this.finishPendingAttempt({
      endedOffsetMs: elapsedMs,
      outcome: 'technical_invalid',
      technicalInvalidReason: reason
    });
    this.phase = 'interrupted';
    this.interruptionReason = reason;
    return this.getSnapshot();
  }

  public getSnapshot(): PvtPrototypeSnapshot {
    const elapsedMs = this.startedAtMs === undefined
      ? 0
      : Math.min(this.getElapsedMs(), pvtPrototypeDurationMs);
    const nextTransitionAtMs = this.getNextTransitionAtMs();
    return {
      version: pvtPrototypeVersion,
      phase: this.phase,
      elapsedMs,
      attempts: [...this.attempts],
      summary: summarizePvtPrototypeAttempts(this.attempts),
      ...(this.interruptionReason !== undefined && { interruptionReason: this.interruptionReason }),
      ...(nextTransitionAtMs !== undefined && { nextTransitionAtMs })
    };
  }

  private scheduleNextAttempt(previousEndedOffsetMs: number): void {
    const plannedInterStimulusIntervalMs = randomIntegerInclusive(
      this.random.next(),
      pvtPrototypeMinimumIsiMs,
      pvtPrototypeMaximumIsiMs
    );
    this.pendingAttempt = {
      presentationOrder: this.attempts.length + 1,
      plannedInterStimulusIntervalMs,
      plannedStimulusOffsetMs: previousEndedOffsetMs + plannedInterStimulusIntervalMs
    };
    this.phase = 'waiting';
  }

  private finishPendingAttempt(
    result: Pick<PvtPrototypeAttempt, 'endedOffsetMs' | 'outcome'> &
      Partial<Pick<PvtPrototypeAttempt,
        'responseOffsetMs' | 'reactionTimeMs' | 'technicalInvalidReason'>>
  ): void {
    if (this.pendingAttempt === undefined) {
      throw new Error('No PVT prototype attempt is pending');
    }
    this.attempts.push({ ...this.pendingAttempt, ...result });
    this.pendingAttempt = undefined;
  }

  private completeAtDuration(elapsedMs: number): PvtPrototypeSnapshot {
    if (this.pendingAttempt !== undefined) {
      this.finishPendingAttempt({
        endedOffsetMs: Math.min(elapsedMs, pvtPrototypeDurationMs),
        outcome: 'technical_invalid',
        technicalInvalidReason: 'session_ended'
      });
    }
    this.phase = 'completed';
    return this.getSnapshot();
  }

  private getElapsedMs(): number {
    return this.startedAtMs === undefined
      ? 0
      : Math.max(0, this.clock.now() - this.startedAtMs);
  }

  private getNextTransitionAtMs(): number | undefined {
    if (this.phase === 'waiting') {
      return Math.min(
        this.pendingAttempt?.plannedStimulusOffsetMs ?? pvtPrototypeDurationMs,
        pvtPrototypeDurationMs
      );
    }
    if (this.phase === 'stimulus') {
      const stimulusOffsetMs = this.pendingAttempt?.stimulusPresentedOffsetMs;
      return Math.min(
        stimulusOffsetMs === undefined
          ? pvtPrototypeDurationMs
          : stimulusOffsetMs + pvtPrototypeTimeoutMs,
        pvtPrototypeDurationMs
      );
    }
    return undefined;
  }
}

export function summarizePvtPrototypeAttempts(
  attempts: readonly PvtPrototypeAttempt[]
): PvtPrototypeSummary {
  const validReactionTimes = attempts.flatMap((attempt) =>
    attempt.outcome === 'valid_response' && attempt.reactionTimeMs !== undefined
      ? [attempt.reactionTimeMs]
      : []);
  const meanReciprocalReactionTimePerSecond = validReactionTimes.length === 0
    ? undefined
    : validReactionTimes.reduce((total, reactionTimeMs) =>
      total + 1_000 / reactionTimeMs, 0) / validReactionTimes.length;
  const medianReactionTimeMs = median(validReactionTimes);
  return {
    validResponseCount: validReactionTimes.length,
    falseStartCount: attempts.filter(({ outcome }) => outcome === 'false_start').length,
    timeoutCount: attempts.filter(({ outcome }) => outcome === 'timeout').length,
    lapseCount: validReactionTimes.filter((reactionTimeMs) =>
      reactionTimeMs >= pvtPrototypeCandidateLapseThresholdMs).length,
    ...(meanReciprocalReactionTimePerSecond !== undefined && {
      meanReciprocalReactionTimePerSecond
    }),
    ...(medianReactionTimeMs !== undefined && { medianReactionTimeMs })
  };
}

function randomIntegerInclusive(randomValue: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(randomValue) || randomValue < 0 || randomValue >= 1) {
    throw new Error('The PVT prototype random source must return a value from 0 inclusive to 1 exclusive');
  }
  return minimum + Math.floor(randomValue * (maximum - minimum + 1));
}

function median(values: readonly number[]): number | undefined {
  if (values.length === 0) {
    return undefined;
  }
  const ordered = [...values].sort((left, right) => left - right);
  const middleIndex = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 1
    ? ordered[middleIndex]
    : (ordered[middleIndex - 1]! + ordered[middleIndex]!) / 2;
}
