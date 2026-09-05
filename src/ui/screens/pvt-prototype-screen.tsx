import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent
} from 'react';
import { flushSync } from 'react-dom';
import { useTranslation } from 'react-i18next';

import {
  PvtPrototypeEngine,
  pvtPrototypeCandidateLapseThresholdMs,
  pvtPrototypeDurationMs,
  pvtPrototypeFalseStartThresholdMs,
  pvtPrototypeMaximumIsiMs,
  pvtPrototypeMinimumIsiMs,
  pvtPrototypeTimeoutMs,
  pvtPrototypeVersion,
  type PvtPrototypeInterruptionReason,
  type PvtPrototypeSnapshot
} from '../../prototype/pvt/pvt-prototype-engine';

type PrototypeView = 'preparation' | 'countdown' | 'running' | 'summary';
type PreparationIssue = 'orientation_changed_during_countdown';

interface OrientationIdentity {
  readonly key: string;
  readonly landscape: boolean;
}

export interface PvtPrototypeScreenProps {
  readonly countdownSeconds?: number;
  readonly createEngine?: () => PvtPrototypeEngine;
}

const defaultCreateEngine = (): PvtPrototypeEngine => new PvtPrototypeEngine(
  { now: () => performance.now() },
  { next: () => Math.random() }
);

export function PvtPrototypeScreen({
  countdownSeconds = 3,
  createEngine = defaultCreateEngine
}: PvtPrototypeScreenProps) {
  const { i18n, t } = useTranslation();
  const [view, setView] = useState<PrototypeView>('preparation');
  const [countdown, setCountdown] = useState(countdownSeconds);
  const [snapshot, setSnapshot] = useState<PvtPrototypeSnapshot>();
  const [landscape, setLandscape] = useState(isLandscape);
  const [preparationIssue, setPreparationIssue] = useState<PreparationIssue>();
  const engineRef = useRef<PvtPrototypeEngine | undefined>(undefined);
  const initialOrientationRef = useRef<OrientationIdentity | undefined>(undefined);
  const locale = i18n.resolvedLanguage === 'fr' ? 'fr-FR' : 'en-GB';
  const desktopPreview = typeof window.matchMedia !== 'function' ||
    !window.matchMedia('(pointer: coarse)').matches;

  const applySnapshot = useCallback((nextSnapshot: PvtPrototypeSnapshot) => {
    setSnapshot(nextSnapshot);
    if (nextSnapshot.phase === 'completed' || nextSnapshot.phase === 'interrupted') {
      setView('summary');
    }
  }, []);

  const interrupt = useCallback((reason: Exclude<PvtPrototypeInterruptionReason, 'session_ended'>) => {
    const engine = engineRef.current;
    if (engine !== undefined) {
      applySnapshot(engine.interrupt(reason));
    }
  }, [applySnapshot]);

  useEffect(() => {
    if (view !== 'preparation') {
      return undefined;
    }
    const updateOrientation = () => setLandscape(isLandscape());
    window.addEventListener('resize', updateOrientation);
    screen.orientation?.addEventListener('change', updateOrientation);
    return () => {
      window.removeEventListener('resize', updateOrientation);
      screen.orientation?.removeEventListener('change', updateOrientation);
    };
  }, [view]);

  useEffect(() => {
    if (view !== 'countdown') {
      return undefined;
    }

    const returnToPreparation = () => {
      const currentOrientation = getOrientationIdentity();
      engineRef.current = undefined;
      setSnapshot(undefined);
      setLandscape(currentOrientation.landscape);
      setPreparationIssue('orientation_changed_during_countdown');
      setView('preparation');
    };
    const orientationStillValid = (): boolean => {
      const currentOrientation = getOrientationIdentity();
      setLandscape(currentOrientation.landscape);
      return currentOrientation.key === initialOrientationRef.current?.key &&
        (desktopPreview || currentOrientation.landscape);
    };
    const handleOrientation = () => {
      if (!orientationStillValid()) {
        returnToPreparation();
      }
    };

    window.addEventListener('resize', handleOrientation);
    screen.orientation?.addEventListener('change', handleOrientation);

    if (!orientationStillValid()) {
      returnToPreparation();
      return () => {
        window.removeEventListener('resize', handleOrientation);
        screen.orientation?.removeEventListener('change', handleOrientation);
      };
    }

    if (countdown <= 0) {
      const currentOrientation = getOrientationIdentity();
      const engine = createEngine();
      engineRef.current = engine;
      initialOrientationRef.current = currentOrientation;
      setSnapshot(engine.start());
      setView('running');
      return () => {
        window.removeEventListener('resize', handleOrientation);
        screen.orientation?.removeEventListener('change', handleOrientation);
      };
    }

    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1_000);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', handleOrientation);
      screen.orientation?.removeEventListener('change', handleOrientation);
    };
  }, [countdown, createEngine, desktopPreview, view]);

  useEffect(() => {
    if (view !== 'running' || snapshot?.nextTransitionAtMs === undefined) {
      return undefined;
    }
    const engine = engineRef.current;
    if (engine === undefined) {
      return undefined;
    }

    let animationFrame: number | undefined;
    const delay = Math.max(0, snapshot.nextTransitionAtMs - snapshot.elapsedMs);
    const timer = window.setTimeout(() => {
      if (snapshot.phase === 'waiting') {
        animationFrame = window.requestAnimationFrame(() => {
          flushSync(() => {
            applySnapshot(engine.activateStimulus());
          });
        });
      } else {
        applySnapshot(engine.advance());
      }
    }, delay);

    return () => {
      window.clearTimeout(timer);
      if (animationFrame !== undefined) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [applySnapshot, snapshot, view]);

  useEffect(() => {
    if (view !== 'running') {
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
    handleOrientation();
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('resize', handleOrientation);
      screen.orientation?.removeEventListener('change', handleOrientation);
    };
  }, [interrupt, view]);

  function beginCountdown(): void {
    const orientation = getOrientationIdentity();
    setLandscape(orientation.landscape);
    if (!desktopPreview && !orientation.landscape) {
      return;
    }
    initialOrientationRef.current = orientation;
    setCountdown(countdownSeconds);
    setSnapshot(undefined);
    setPreparationIssue(undefined);
    engineRef.current = undefined;
    setView('countdown');
  }

  function handleResponse(event: ReactPointerEvent<HTMLButtonElement>): void {
    if (!event.isPrimary || view !== 'running') {
      return;
    }
    event.preventDefault();
    const engine = engineRef.current;
    if (engine !== undefined) {
      applySnapshot(engine.respond());
    }
  }

  return (
    <section className="screen-stack pvt-prototype" aria-labelledby="pvt-prototype-heading">
      <div className="hero-card">
        <p className="eyebrow">{t('pvtPrototype.eyebrow')}</p>
        <h1 id="pvt-prototype-heading">{t('pvtPrototype.heading')}</h1>
        <p>{t('pvtPrototype.introduction')}</p>
      </div>

      <aside className="prototype-warning" role="note">
        <strong>{t('pvtPrototype.warningTitle')}</strong>
        <p>{t('pvtPrototype.warningDescription')}</p>
      </aside>

      {view === 'preparation' && (
        <section className="info-card" aria-labelledby="pvt-preparation-heading">
          <h2 id="pvt-preparation-heading">{t('pvtPrototype.preparationTitle')}</h2>
          <ol className="prototype-instructions">
            <li>{t('pvtPrototype.instructionPhone')}</li>
            <li>{t('pvtPrototype.instructionLandscape')}</li>
            <li>{t('pvtPrototype.instructionThumb')}</li>
            <li>{t('pvtPrototype.instructionFocus')}</li>
          </ol>
          {desktopPreview && (
            <p className="duration-notice" role="status">
              {t('pvtPrototype.desktopWarning')}
            </p>
          )}
          {!desktopPreview && !landscape && (
            <p className="error-message" role="alert">{t('pvtPrototype.landscapeRequired')}</p>
          )}
          {preparationIssue === 'orientation_changed_during_countdown' && (
            <p className="error-message" role="alert">
              {t('pvtPrototype.countdownOrientationChanged')}
            </p>
          )}
          <dl className="prototype-parameters">
            <div>
              <dt>{t('pvtPrototype.durationLabel')}</dt>
              <dd>{t('pvtPrototype.durationValue', { seconds: pvtPrototypeDurationMs / 1_000 })}</dd>
            </div>
            <div>
              <dt>{t('pvtPrototype.intervalLabel')}</dt>
              <dd>{t('pvtPrototype.intervalValue', {
                minimum: pvtPrototypeMinimumIsiMs / 1_000,
                maximum: pvtPrototypeMaximumIsiMs / 1_000
              })}</dd>
            </div>
            <div>
              <dt>{t('pvtPrototype.candidateThresholdLabel')}</dt>
              <dd>{t('pvtPrototype.candidateThresholdValue', {
                milliseconds: pvtPrototypeCandidateLapseThresholdMs
              })}</dd>
            </div>
          </dl>
          <button
            className="primary-button"
            type="button"
            disabled={!desktopPreview && !landscape}
            onClick={beginCountdown}
          >
            {t('pvtPrototype.startAction')}
          </button>
        </section>
      )}

      {view === 'countdown' && (
        <section className="pvt-countdown" role="status" aria-live="polite">
          <p>{t('pvtPrototype.countdownLabel')}</p>
          <strong>{countdown}</strong>
        </section>
      )}

      {view === 'running' && snapshot !== undefined && (
        <section className="pvt-running" aria-labelledby="pvt-running-heading">
          <h2 className="visually-hidden" id="pvt-running-heading">
            {t('pvtPrototype.runningTitle')}
          </h2>
          <div className="pvt-progress" aria-live="off">
            {t('pvtPrototype.timeRemaining', {
              seconds: Math.ceil((pvtPrototypeDurationMs - snapshot.elapsedMs) / 1_000)
            })}
          </div>
          <button
            className={`pvt-response-surface${snapshot.phase === 'stimulus' ? ' stimulus-visible' : ''}`}
            type="button"
            aria-label={t('pvtPrototype.responseSurfaceLabel')}
            onPointerDown={handleResponse}
          >
            <span aria-hidden="true">
              {snapshot.phase === 'stimulus' ? t('pvtPrototype.stimulus') : ''}
            </span>
          </button>
          <p className="pvt-running-help">{t('pvtPrototype.runningHelp', {
            milliseconds: pvtPrototypeFalseStartThresholdMs,
            timeoutSeconds: pvtPrototypeTimeoutMs / 1_000
          })}</p>
        </section>
      )}

      {view === 'summary' && snapshot !== undefined && (
        <section className="info-card" aria-labelledby="pvt-summary-heading">
          <h2 id="pvt-summary-heading">{t('pvtPrototype.summaryTitle')}</h2>
          {snapshot.phase === 'interrupted' && (
            <div className="error-message" role="alert">
              {t(`pvtPrototype.interruption.${snapshot.interruptionReason ?? 'focus_lost'}`)}
            </div>
          )}
          <p>{t('pvtPrototype.summaryCaution')}</p>
          <dl className="prototype-summary">
            <SummaryItem label={t('pvtPrototype.validResponses')} value={snapshot.summary.validResponseCount} />
            <SummaryItem label={t('pvtPrototype.falseStarts')} value={snapshot.summary.falseStartCount} />
            <SummaryItem label={t('pvtPrototype.timeouts')} value={snapshot.summary.timeoutCount} />
            <SummaryItem label={t('pvtPrototype.candidateLapses')} value={snapshot.summary.lapseCount} />
            <SummaryItem
              label={t('pvtPrototype.meanReciprocalRt')}
              value={formatOptionalNumber(
                snapshot.summary.meanReciprocalReactionTimePerSecond,
                locale,
                3
              )}
            />
            <SummaryItem
              label={t('pvtPrototype.medianRt')}
              value={formatOptionalNumber(snapshot.summary.medianReactionTimeMs, locale, 1)}
            />
          </dl>
          <p className="field-help">{t('pvtPrototype.memoryOnly', {
            attempts: snapshot.attempts.length,
            version: snapshot.version
          })}</p>
          <button className="secondary-button" type="button" onClick={beginCountdown}>
            {t('pvtPrototype.restartAction')}
          </button>
        </section>
      )}

      <p className="prototype-version">{t('pvtPrototype.version', { version: pvtPrototypeVersion })}</p>
    </section>
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

function isLandscape(): boolean {
  return getOrientationIdentity().landscape;
}

function getOrientationIdentity(): OrientationIdentity {
  const browserOrientation = screen.orientation;
  const type = typeof browserOrientation?.type === 'string'
    ? browserOrientation.type
    : undefined;
  const screenAngle = typeof browserOrientation?.angle === 'number'
    ? browserOrientation.angle
    : undefined;
  const legacyAngle = typeof (window as Window & { readonly orientation?: number }).orientation === 'number'
    ? (window as Window & { readonly orientation: number }).orientation
    : undefined;
  const landscape = type?.startsWith('landscape') ?? window.innerWidth >= window.innerHeight;

  if (type !== undefined) {
    return { key: `screen:${type}:${screenAngle ?? 'unknown'}`, landscape };
  }
  if (legacyAngle !== undefined) {
    return { key: `legacy-angle:${legacyAngle}`, landscape };
  }
  return { key: `dimensions:${landscape ? 'landscape' : 'portrait'}`, landscape };
}

function formatOptionalNumber(value: number | undefined, locale: string, digits: number): string {
  return value === undefined
    ? '—'
    : new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value);
}
