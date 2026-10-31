import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent
} from 'react';
import { flushSync } from 'react-dom';
import { useTranslation } from 'react-i18next';

import {
  AssociativeMemoryPrototypeEngine,
  associativeMemoryDifficulties,
  associativeMemoryDifficultyDigits,
  associativeMemoryEncodingBlankMs,
  associativeMemoryEncodingDurationMs,
  associativeMemoryItemCount,
  associativeMemoryPrototypeVersion,
  associativeMemoryRecognitionTimeoutMs,
  associativeMemoryTechnicalDelayMs,
  type AssociativeMemoryDifficulty,
  type AssociativeMemoryInterruptionReason,
  type AssociativeMemoryPrototypeSummary,
  type AssociativeMemoryPrototypeTrial
} from '../../prototype/associative-memory/associative-memory-prototype-engine';
import {
  associativeMemoryStimulusPath,
  type AssociativeMemoryStimulusId
} from '../../prototype/associative-memory/associative-memory-stimulus-catalog';

type PrototypeView =
  | 'preparation'
  | 'preloading'
  | 'countdown'
  | 'encoding'
  | 'encoding_blank'
  | 'technical_delay'
  | 'recognition'
  | 'summary';

type PreparationIssue =
  | 'orientation_required'
  | 'orientation_changed_during_countdown'
  | 'visibility_lost_during_countdown'
  | 'focus_lost_during_countdown'
  | 'stimulus_preload_failed';

interface OrientationIdentity {
  readonly key: string;
  readonly landscape: boolean;
}

export interface AssociativeMemoryPrototypeScreenProps {
  readonly countdownSeconds?: number;
  readonly createEngine?: (difficulty: AssociativeMemoryDifficulty) => AssociativeMemoryPrototypeEngine;
  readonly decodeStimulus?: (path: string) => Promise<void>;
}

const defaultCreateEngine = (difficulty: AssociativeMemoryDifficulty) =>
  new AssociativeMemoryPrototypeEngine(
    { now: () => performance.now() },
    { next: () => Math.random() },
    difficulty
  );

const defaultDecodeStimulus = async (path: string): Promise<void> => {
  const image = new Image();
  image.src = path;
  await image.decode();
};

export function AssociativeMemoryPrototypeScreen({
  countdownSeconds = 3,
  createEngine = defaultCreateEngine,
  decodeStimulus = defaultDecodeStimulus
}: AssociativeMemoryPrototypeScreenProps) {
  const { i18n, t } = useTranslation();
  const [view, setView] = useState<PrototypeView>('preparation');
  const [difficulty, setDifficulty] = useState<AssociativeMemoryDifficulty>('standard');
  const [countdown, setCountdown] = useState(countdownSeconds);
  const [encodingOrder, setEncodingOrder] = useState(1);
  const [delayRemainingSeconds, setDelayRemainingSeconds] = useState(
    associativeMemoryTechnicalDelayMs / 1_000
  );
  const [activeTrial, setActiveTrial] = useState<AssociativeMemoryPrototypeTrial>();
  const [summary, setSummary] = useState<AssociativeMemoryPrototypeSummary>();
  const [phaseAnnouncement, setPhaseAnnouncement] = useState('');
  const [retainedTrialCount, setRetainedTrialCount] = useState(0);
  const [preparationIssue, setPreparationIssue] = useState<PreparationIssue>();
  const [landscape, setLandscape] = useState(() => getOrientationIdentity().landscape);
  const engineRef = useRef<AssociativeMemoryPrototypeEngine | undefined>(undefined);
  const initialOrientationRef = useRef<OrientationIdentity | undefined>(undefined);
  const delayEndsAtRef = useRef<number | undefined>(undefined);
  const preloadAttemptRef = useRef(0);
  const responseLockedRef = useRef(false);
  const activeRecognitionOrderRef = useRef<number | undefined>(undefined);
  const phaseHeadingRef = useRef<HTMLHeadingElement>(null);
  const recognitionPanelRef = useRef<HTMLDivElement>(null);
  const locale = i18n.resolvedLanguage === 'fr' ? 'fr-FR' : 'en-GB';
  const desktopPreview = typeof window.matchMedia !== 'function' ||
    !window.matchMedia('(pointer: coarse)').matches;
  const immersiveView = view !== 'preparation' && view !== 'preloading' && view !== 'summary';

  const finishWithSummary = useCallback((engine: AssociativeMemoryPrototypeEngine) => {
    const run = engine.getRun();
    setRetainedTrialCount(run.trials.filter((trial) =>
      trial.encodingActivatedOffsetMs !== undefined ||
      trial.recognitionPromptActivatedOffsetMs !== undefined).length);
    setSummary(engine.summarize());
    setActiveTrial(undefined);
    responseLockedRef.current = true;
    activeRecognitionOrderRef.current = undefined;
    setView('summary');
  }, []);

  const interrupt = useCallback((reason: AssociativeMemoryInterruptionReason) => {
    const engine = engineRef.current;
    if (engine === undefined) {
      return;
    }
    engine.interrupt(reason);
    finishWithSummary(engine);
  }, [finishWithSummary]);

  const beginEncoding = useCallback(() => {
    const engine = engineRef.current;
    if (engine === undefined) {
      return;
    }
    engine.activateEncodingTrial(1);
    flushSync(() => {
      setEncodingOrder(1);
      setSummary(undefined);
      setRetainedTrialCount(0);
      setPreparationIssue(undefined);
      setView('encoding');
    });
  }, []);

  const returnToPreparation = useCallback((issue: PreparationIssue) => {
    preloadAttemptRef.current += 1;
    engineRef.current = undefined;
    initialOrientationRef.current = undefined;
    setActiveTrial(undefined);
    activeRecognitionOrderRef.current = undefined;
    setSummary(undefined);
    setLandscape(getOrientationIdentity().landscape);
    setPreparationIssue(issue);
    setView('preparation');
  }, []);

  useEffect(() => {
    if (!immersiveView) {
      return undefined;
    }
    document.body.classList.add('memory-prototype-immersive');
    return () => document.body.classList.remove('memory-prototype-immersive');
  }, [immersiveView]);

  useEffect(() => {
    if (view !== 'preparation' && view !== 'preloading') {
      return undefined;
    }
    const updateOrientation = () => setLandscape(getOrientationIdentity().landscape);
    window.addEventListener('resize', updateOrientation);
    screen.orientation?.addEventListener('change', updateOrientation);
    return () => {
      window.removeEventListener('resize', updateOrientation);
      screen.orientation?.removeEventListener('change', updateOrientation);
    };
  }, [view]);

  useEffect(() => {
    if (view === 'recognition' && desktopPreview) {
      recognitionPanelRef.current?.focus({ preventScroll: true });
      return;
    }
    if (view === 'preloading' || view === 'countdown' || view === 'encoding' ||
      view === 'technical_delay' || view === 'summary') {
      phaseHeadingRef.current?.focus({ preventScroll: true });
    }
  }, [desktopPreview, view]);

  useEffect(() => {
    const key = phaseAnnouncementKey(view);
    if (key !== undefined) {
      setPhaseAnnouncement(t(key));
    }
  }, [t, view]);

  useLayoutEffect(() => {
    if (view === 'recognition' && activeTrial !== undefined) {
      responseLockedRef.current = false;
    }
  }, [activeTrial, view]);

  useEffect(() => {
    if (view !== 'countdown') {
      return undefined;
    }
    let cancelled = false;
    const cancelCountdown = (issue: PreparationIssue) => {
      if (!cancelled) {
        cancelled = true;
        returnToPreparation(issue);
      }
    };
    const orientationStillValid = () => {
      const current = getOrientationIdentity();
      setLandscape(current.landscape);
      return current.key === initialOrientationRef.current?.key &&
        (desktopPreview || current.landscape);
    };
    const handleOrientation = () => {
      if (!orientationStillValid()) {
        cancelCountdown('orientation_changed_during_countdown');
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        cancelCountdown('visibility_lost_during_countdown');
      }
    };
    const handleBlur = () => cancelCountdown('focus_lost_during_countdown');

    window.addEventListener('resize', handleOrientation);
    screen.orientation?.addEventListener('change', handleOrientation);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);

    const removeListeners = () => {
      window.removeEventListener('resize', handleOrientation);
      screen.orientation?.removeEventListener('change', handleOrientation);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
    };

    if (!orientationStillValid()) {
      cancelCountdown('orientation_changed_during_countdown');
      return removeListeners;
    }
    if (document.visibilityState === 'hidden') {
      cancelCountdown('visibility_lost_during_countdown');
      return removeListeners;
    }
    if (!document.hasFocus()) {
      cancelCountdown('focus_lost_during_countdown');
      return removeListeners;
    }
    if (countdown <= 0) {
      const timer = window.setTimeout(beginEncoding, 0);
      return () => {
        window.clearTimeout(timer);
        removeListeners();
      };
    }

    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1_000);
    return () => {
      window.clearTimeout(timer);
      removeListeners();
    };
  }, [beginEncoding, countdown, desktopPreview, returnToPreparation, view]);

  useEffect(() => {
    if (view !== 'encoding') {
      return undefined;
    }
    const timer = window.setTimeout(() => setView('encoding_blank'), associativeMemoryEncodingDurationMs);
    return () => window.clearTimeout(timer);
  }, [encodingOrder, view]);

  useEffect(() => {
    if (view !== 'encoding_blank') {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      const engine = engineRef.current;
      if (engine === undefined) {
        return;
      }
      if (encodingOrder < associativeMemoryItemCount) {
        const nextOrder = encodingOrder + 1;
        engine.activateEncodingTrial(nextOrder);
        flushSync(() => {
          setEncodingOrder(nextOrder);
          setView('encoding');
        });
        return;
      }
      engine.beginTechnicalDelay();
      delayEndsAtRef.current = performance.now() + associativeMemoryTechnicalDelayMs;
      flushSync(() => {
        setDelayRemainingSeconds(associativeMemoryTechnicalDelayMs / 1_000);
        setView('technical_delay');
      });
    }, associativeMemoryEncodingBlankMs);
    return () => window.clearTimeout(timer);
  }, [encodingOrder, view]);

  useEffect(() => {
    if (view !== 'technical_delay') {
      return undefined;
    }
    const engine = engineRef.current;
    const delayEndsAt = delayEndsAtRef.current;
    if (engine === undefined || delayEndsAt === undefined) {
      return undefined;
    }
    const updateRemaining = () => setDelayRemainingSeconds(
      Math.max(0, Math.ceil((delayEndsAt - performance.now()) / 1_000))
    );
    const interval = window.setInterval(updateRemaining, 250);
    const timer = window.setTimeout(() => {
      engine.beginRecognition();
      const firstTrial = engine.activateRecognitionTrial(1);
      activeRecognitionOrderRef.current = firstTrial.recognitionOrder;
      flushSync(() => {
        setActiveTrial(firstTrial);
        setView('recognition');
      });
    }, Math.max(0, delayEndsAt - performance.now()));
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timer);
    };
  }, [view]);

  const advanceRecognition = useCallback((completedOrder: number) => {
    const engine = engineRef.current;
    if (engine === undefined) {
      return;
    }
    if (engine.getRun().status === 'completed') {
      finishWithSummary(engine);
      return;
    }
    const nextTrial = engine.activateRecognitionTrial(completedOrder + 1);
    activeRecognitionOrderRef.current = nextTrial.recognitionOrder;
    flushSync(() => setActiveTrial(nextTrial));
  }, [finishWithSummary]);

  useEffect(() => {
    if (view !== 'recognition' || activeTrial === undefined) {
      return undefined;
    }
    const engine = engineRef.current;
    if (engine === undefined) {
      return undefined;
    }
    let timer: number | undefined;
    const resolveTimeout = () => {
      if (engine.resolveTimeoutIfDue()) {
        advanceRecognition(activeTrial.recognitionOrder);
      } else {
        timer = window.setTimeout(resolveTimeout, 25);
      }
    };
    timer = window.setTimeout(resolveTimeout, associativeMemoryRecognitionTimeoutMs);
    return () => {
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
    };
  }, [activeTrial, advanceRecognition, view]);

  useEffect(() => {
    const activeRun = view === 'encoding' || view === 'encoding_blank' ||
      view === 'technical_delay' || view === 'recognition';
    if (!activeRun) {
      return undefined;
    }
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        interrupt('visibility_lost');
      }
    };
    const handleBlur = () => interrupt('focus_lost');
    const handleOrientation = () => {
      if (getOrientationIdentity().key !== initialOrientationRef.current?.key) {
        interrupt('orientation_changed');
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('resize', handleOrientation);
    screen.orientation?.addEventListener('change', handleOrientation);
    handleVisibility();
    if (document.visibilityState !== 'hidden' && !document.hasFocus()) {
      interrupt('focus_lost');
    }
    handleOrientation();
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('resize', handleOrientation);
      screen.orientation?.removeEventListener('change', handleOrientation);
    };
  }, [interrupt, view]);

  async function startCountdown(): Promise<void> {
    const currentOrientation = getOrientationIdentity();
    setLandscape(currentOrientation.landscape);
    if (!desktopPreview && !currentOrientation.landscape) {
      setPreparationIssue('orientation_required');
      return;
    }
    const attempt = preloadAttemptRef.current + 1;
    preloadAttemptRef.current = attempt;
    const engine = createEngine(difficulty);
    const selectedPaths = engine.getRun().trials.map(({ objectStimulusId }) =>
      associativeMemoryStimulusPath(objectStimulusId));
    initialOrientationRef.current = currentOrientation;
    engineRef.current = engine;
    setPreparationIssue(undefined);
    setView('preloading');

    try {
      await Promise.all(selectedPaths.map(decodeStimulus));
    } catch {
      if (preloadAttemptRef.current === attempt) {
        returnToPreparation('stimulus_preload_failed');
      }
      return;
    }
    if (preloadAttemptRef.current !== attempt) {
      return;
    }
    const settledOrientation = getOrientationIdentity();
    if (settledOrientation.key !== currentOrientation.key || (!desktopPreview && !settledOrientation.landscape)) {
      returnToPreparation('orientation_changed_during_countdown');
      return;
    }
    if (document.visibilityState === 'hidden') {
      returnToPreparation('visibility_lost_during_countdown');
      return;
    }
    if (!document.hasFocus()) {
      returnToPreparation('focus_lost_during_countdown');
      return;
    }
    setCountdown(countdownSeconds);
    setView('countdown');
  }

  function respond(selectedValue: string, recognitionOrder: number): void {
    const engine = engineRef.current;
    if (engine === undefined || activeRecognitionOrderRef.current !== recognitionOrder ||
      responseLockedRef.current) {
      return;
    }
    responseLockedRef.current = true;
    engine.respond(selectedValue);
    advanceRecognition(recognitionOrder);
  }

  function handlePointerDown(
    event: ReactPointerEvent<HTMLButtonElement>,
    selectedValue: string
  ): void {
    if ((event.button !== undefined && event.button !== 0) || event.isPrimary === false) {
      return;
    }
    event.preventDefault();
    respond(selectedValue, activeTrial?.recognitionOrder ?? -1);
  }

  function handleChoiceKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    selectedValue: string
  ): void {
    if (!event.repeat && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      respond(selectedValue, activeTrial?.recognitionOrder ?? -1);
    }
  }

  function handlePanelKeyDown(event: ReactKeyboardEvent<HTMLDivElement>): void {
    if (activeTrial === undefined) {
      return;
    }
    if (!event.repeat && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      event.preventDefault();
      respond(
        activeTrial.displayedAnswerOrder[event.key === 'ArrowLeft' ? 0 : 1],
        activeTrial.recognitionOrder
      );
    }
  }

  const currentEncodingTrial = engineRef.current?.getRun().trials.find(
    (trial) => trial.encodingOrder === encodingOrder
  );

  return (
    <section className={`screen-stack memory-prototype${immersiveView ? ' is-immersive' : ''}`}>
      <p className="visually-hidden" aria-live="polite" aria-atomic="true">
        {phaseAnnouncement}
      </p>
      {view === 'preparation' && (
        <>
          <div className="hero-card">
            <p className="eyebrow">{t('associativeMemoryPrototype.eyebrow')}</p>
            <h1>{t('associativeMemoryPrototype.heading')}</h1>
            <p>{t('associativeMemoryPrototype.introduction')}</p>
          </div>
          <aside className="prototype-warning" role="note">
            <strong>{t('associativeMemoryPrototype.warningTitle')}</strong>
            <p>{t('associativeMemoryPrototype.warningDescription')}</p>
          </aside>
          <section className="info-card" aria-labelledby="memory-preparation-heading">
            <h2 id="memory-preparation-heading">{t('associativeMemoryPrototype.preparationTitle')}</h2>
            {preparationIssue !== undefined && (
              <p className="error-message" role="alert">
                {t(`associativeMemoryPrototype.preparationIssue.${preparationIssue}`)}
              </p>
            )}
            {!desktopPreview && !landscape && (
              <p className="duration-notice">{t('associativeMemoryPrototype.landscapeRequired')}</p>
            )}
            {desktopPreview && (
              <p className="duration-notice">{t('associativeMemoryPrototype.desktopWarning')}</p>
            )}
            <ul className="prototype-instructions">
              <li>{t('associativeMemoryPrototype.instructionDevice')}</li>
              <li>{t('associativeMemoryPrototype.instructionLandscape')}</li>
              <li>{t('associativeMemoryPrototype.instructionFocus')}</li>
              <li>{t('associativeMemoryPrototype.instructionRemember')}</li>
            </ul>
            <fieldset className="memory-difficulty">
              <legend>{t('associativeMemoryPrototype.difficultyLegend')}</legend>
              <div className="memory-difficulty-options">
                {associativeMemoryDifficulties.map((option) => (
                  <label key={option}>
                    <input
                      type="radio"
                      name="memory-difficulty"
                      value={option}
                      checked={difficulty === option}
                      onChange={() => setDifficulty(option)}
                    />
                    <span>{t(`associativeMemoryPrototype.difficulty.${option}`, {
                      digits: associativeMemoryDifficultyDigits[option]
                    })}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <dl className="prototype-parameters">
              <SummaryItem label={t('associativeMemoryPrototype.itemCountLabel')} value={associativeMemoryItemCount} />
              <SummaryItem
                label={t('associativeMemoryPrototype.encodingLabel')}
                value={t('associativeMemoryPrototype.encodingValue', {
                  seconds: associativeMemoryEncodingDurationMs / 1_000,
                  blankMilliseconds: associativeMemoryEncodingBlankMs
                })}
              />
              <SummaryItem
                label={t('associativeMemoryPrototype.delayLabel')}
                value={t('associativeMemoryPrototype.secondsValue', {
                  seconds: associativeMemoryTechnicalDelayMs / 1_000
                })}
              />
              <SummaryItem
                label={t('associativeMemoryPrototype.timeoutLabel')}
                value={t('associativeMemoryPrototype.secondsValue', {
                  seconds: associativeMemoryRecognitionTimeoutMs / 1_000
                })}
              />
            </dl>
            <button className="primary-button" type="button" onClick={startCountdown}>
              {t('associativeMemoryPrototype.startAction')}
            </button>
          </section>
        </>
      )}

      {view === 'preloading' && (
        <section className="info-card" aria-labelledby="memory-preloading-heading" aria-busy="true">
          <h1 id="memory-preloading-heading" ref={phaseHeadingRef} tabIndex={-1}>
            {t('associativeMemoryPrototype.preloadingTitle')}
          </h1>
          <p>{t('associativeMemoryPrototype.preloadingDescription')}</p>
        </section>
      )}

      {view === 'countdown' && (
        <section className="memory-stage memory-countdown" aria-labelledby="memory-countdown-heading">
          <h1 id="memory-countdown-heading" ref={phaseHeadingRef} tabIndex={-1}>
            {t('associativeMemoryPrototype.countdownTitle')}
          </h1>
          <p>{t('associativeMemoryPrototype.countdownLabel')}</p>
          <strong aria-live="off">{countdown}</strong>
        </section>
      )}

      {view === 'encoding' && currentEncodingTrial !== undefined && (
        <MemoryStage
          heading={t('associativeMemoryPrototype.encodingTitle')}
          progress={t('associativeMemoryPrototype.encodingProgress', {
            current: encodingOrder,
            total: associativeMemoryItemCount
          })}
          trial={currentEncodingTrial}
          showValue
          objectLabel={objectLabel(t, currentEncodingTrial.objectStimulusId)}
        />
      )}

      {view === 'encoding_blank' && (
        <section className="memory-stage memory-neutral" aria-live="off" aria-label={t('associativeMemoryPrototype.neutralScreen')} />
      )}

      {view === 'technical_delay' && (
        <section className="memory-stage memory-delay" aria-labelledby="memory-delay-heading">
          <h1 id="memory-delay-heading" ref={phaseHeadingRef} tabIndex={-1}>
            {t('associativeMemoryPrototype.delayTitle')}
          </h1>
          <p>{t('associativeMemoryPrototype.delayDescription')}</p>
          <strong aria-live="off">{delayRemainingSeconds}</strong>
          <p>{t('associativeMemoryPrototype.secondsRemaining')}</p>
          <StopButton onStop={() => interrupt('user_abandoned')} />
        </section>
      )}

      {view === 'recognition' && activeTrial !== undefined && (
        <section className="memory-stage memory-recognition" aria-labelledby="memory-recognition-heading">
          <h1 id="memory-recognition-heading">{t('associativeMemoryPrototype.recognitionTitle')}</h1>
          <p className="memory-progress">{t('associativeMemoryPrototype.recognitionProgress', {
            current: activeTrial.recognitionOrder,
            total: associativeMemoryItemCount
          })}</p>
          <div
            className="memory-recognition-panel"
            ref={recognitionPanelRef}
            tabIndex={desktopPreview ? 0 : -1}
            onKeyDown={desktopPreview ? handlePanelKeyDown : undefined}
          >
            <img
              className="memory-object"
              src={associativeMemoryStimulusPath(activeTrial.objectStimulusId)}
              alt={objectLabel(t, activeTrial.objectStimulusId)}
            />
            <fieldset className="memory-answer-group">
              <legend>{t('associativeMemoryPrototype.answerLegend')}</legend>
              <div className="memory-answer-options">
                {activeTrial.displayedAnswerOrder.map((value) => (
                  <button
                    className="memory-answer-button"
                    type="button"
                    key={value}
                    onPointerDown={(event) => handlePointerDown(event, value)}
                    onKeyDown={(event) => handleChoiceKeyDown(event, value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
          <p className="memory-help">{desktopPreview
            ? t('associativeMemoryPrototype.desktopResponseHelp')
            : t('associativeMemoryPrototype.touchResponseHelp')}</p>
          <StopButton onStop={() => interrupt('user_abandoned')} />
        </section>
      )}

      {view === 'summary' && summary !== undefined && (
        <section className="info-card" aria-labelledby="memory-summary-heading">
          <h1 id="memory-summary-heading" ref={phaseHeadingRef} tabIndex={-1}>
            {t('associativeMemoryPrototype.summaryTitle')}
          </h1>
          {summary.status === 'technical_invalid' ? (
            <div className="error-message" role="alert">
              <strong>{t('associativeMemoryPrototype.invalidTitle')}</strong>
              <p>{t(`associativeMemoryPrototype.interruption.${summary.interruptionReason}`)}</p>
              <p>{t('associativeMemoryPrototype.invalidNoScore')}</p>
            </div>
          ) : (
            <>
              <p className="prototype-warning">{t('associativeMemoryPrototype.summaryCaution')}</p>
              <dl className="prototype-summary">
                <SummaryItem
                  label={t('associativeMemoryPrototype.correctResponses')}
                  value={`${summary.correctResponseCount}/${summary.itemCount}`}
                />
                <SummaryItem
                  label={t('associativeMemoryPrototype.accuracy')}
                  value={formatPercentage(summary.accuracyProportion!, locale)}
                />
                <SummaryItem label={t('associativeMemoryPrototype.timeouts')} value={summary.timeoutCount} />
                <SummaryItem
                  label={t('associativeMemoryPrototype.medianObservedRt')}
                  value={formatOptionalNumber(summary.medianObservedResponseTimeMs, locale)}
                />
              </dl>
            </>
          )}
          <p className="field-help">{t('associativeMemoryPrototype.memoryOnly', {
            count: retainedTrialCount,
            version: associativeMemoryPrototypeVersion
          })}</p>
          <button className="secondary-button" type="button" onClick={startCountdown}>
            {t('associativeMemoryPrototype.restartAction')}
          </button>
        </section>
      )}

      {!immersiveView && (
        <p className="prototype-version">{t('associativeMemoryPrototype.version', {
          version: associativeMemoryPrototypeVersion
        })}</p>
      )}

      {(view === 'encoding' || view === 'encoding_blank') && (
        <div className="memory-stop-overlay">
          <StopButton onStop={() => interrupt('user_abandoned')} />
        </div>
      )}
    </section>
  );
}

function MemoryStage({
  heading,
  progress,
  trial,
  objectLabel: accessibleObjectLabel,
  showValue
}: {
  readonly heading: string;
  readonly progress: string;
  readonly trial: AssociativeMemoryPrototypeTrial;
  readonly objectLabel: string;
  readonly showValue: boolean;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <section className="memory-stage memory-encoding" aria-labelledby="memory-encoding-heading">
      <h1 id="memory-encoding-heading" ref={headingRef} tabIndex={-1}>{heading}</h1>
      <p className="memory-progress">{progress}</p>
      <div className="memory-pair">
        <img
          className="memory-object"
          src={associativeMemoryStimulusPath(trial.objectStimulusId)}
          alt={accessibleObjectLabel}
        />
        {showValue && <strong className="memory-value">{trial.encodedValue}</strong>}
      </div>
    </section>
  );
}

function StopButton({ onStop }: { readonly onStop: () => void }) {
  const { t } = useTranslation();
  return (
    <button className="memory-stop-button" type="button" onClick={onStop}>
      {t('associativeMemoryPrototype.stopAction')}
    </button>
  );
}

function SummaryItem({ label, value }: { readonly label: string; readonly value: string | number }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function objectLabel(
  t: (key: string) => string,
  id: AssociativeMemoryStimulusId
): string {
  return t(`associativeMemoryPrototype.object.${id}`);
}

function phaseAnnouncementKey(view: PrototypeView): string | undefined {
  switch (view) {
    case 'preloading':
      return 'associativeMemoryPrototype.preloadingTitle';
    case 'countdown':
      return 'associativeMemoryPrototype.countdownTitle';
    case 'encoding':
      return 'associativeMemoryPrototype.encodingTitle';
    case 'technical_delay':
      return 'associativeMemoryPrototype.delayTitle';
    case 'recognition':
      return 'associativeMemoryPrototype.recognitionTitle';
    case 'summary':
      return 'associativeMemoryPrototype.summaryTitle';
    default:
      return undefined;
  }
}

function formatPercentage(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(value);
}

function formatOptionalNumber(value: number | undefined, locale: string): string {
  return value === undefined
    ? '—'
    : new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
}

function getOrientationIdentity(): OrientationIdentity {
  const browserOrientation = screen.orientation;
  const type = typeof browserOrientation?.type === 'string' ? browserOrientation.type : undefined;
  const angle = typeof browserOrientation?.angle === 'number' ? browserOrientation.angle : undefined;
  const legacyAngle = typeof (window as Window & { readonly orientation?: number }).orientation === 'number'
    ? (window as Window & { readonly orientation: number }).orientation
    : undefined;
  const landscape = type?.startsWith('landscape') ?? window.innerWidth >= window.innerHeight;

  if (type !== undefined) {
    return { key: `screen:${type}:${angle ?? 'unknown'}`, landscape };
  }
  if (legacyAngle !== undefined) {
    return { key: `legacy-angle:${legacyAngle}`, landscape };
  }
  return { key: `dimensions:${landscape ? 'landscape' : 'portrait'}`, landscape };
}
