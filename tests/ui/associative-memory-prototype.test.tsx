import { act, cleanup, createEvent, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App, type AppDependencies } from '../../src/app/app';
import { initializeI18n, setInterfaceLanguage } from '../../src/i18n/i18n';
import {
  AssociativeMemoryPrototypeEngine,
  associativeMemoryEncodingBlankMs,
  associativeMemoryEncodingDurationMs,
  associativeMemoryItemCount,
  associativeMemoryRecognitionTimeoutMs,
  associativeMemoryTechnicalDelayMs,
  type AssociativeMemoryDifficulty
} from '../../src/prototype/associative-memory/associative-memory-prototype-engine';
import { AssociativeMemoryPrototypeScreen } from '../../src/ui/screens/associative-memory-prototype-screen';

describe('associative-memory prototype UI', () => {
  const originalOrientationDescriptor = Object.getOwnPropertyDescriptor(globalThis.screen, 'orientation');
  const originalVisibilityDescriptor = Object.getOwnPropertyDescriptor(document, 'visibilityState');
  const originalMatchMedia = window.matchMedia;
  const originalImageDecodeDescriptor = Object.getOwnPropertyDescriptor(
    globalThis.Image.prototype,
    'decode'
  );

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    Object.defineProperty(globalThis.Image.prototype, 'decode', {
      configurable: true,
      value: vi.fn(async () => undefined)
    });
    setVisibilityState('visible');
    await initializeI18n();
    await setInterfaceLanguage('en');
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    restoreProperty(globalThis.screen, 'orientation', originalOrientationDescriptor);
    restoreProperty(document, 'visibilityState', originalVisibilityDescriptor);
    window.matchMedia = originalMatchMedia;
    restoreProperty(globalThis.Image.prototype, 'decode', originalImageDecodeDescriptor);
    document.body.classList.remove('memory-prototype-immersive');
    vi.restoreAllMocks();
  });

  it('presents candidate parameters and remains isolated from study persistence', () => {
    const dependencies = createForbiddenStudyDependencies();
    window.history.pushState({}, '', '/associative-memory-prototype');

    render(<App dependencies={dependencies} />);

    expect(screen.getByRole('heading', { name: 'Associative-memory prototype' })).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('not study data or calibration');
    expect(screen.getByText(/does not reproduce the self-ratings and PVT interval/)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Standard — 3-digit/ })).toBeChecked();
    expect(screen.getByText('10', { selector: 'dd' })).toBeInTheDocument();
    expect(dependencies.studyRepository.list).not.toHaveBeenCalled();
    expect(dependencies.studyDataRepository.getByStudyId).not.toHaveBeenCalled();
  });

  it('passes the selected difficulty into a fresh in-memory run', async () => {
    let selectedDifficulty: AssociativeMemoryDifficulty | undefined;
    render(
      <AssociativeMemoryPrototypeScreen
        countdownSeconds={0}
        createEngine={(difficulty) => {
          selectedDifficulty = difficulty;
          return createEngine(difficulty);
        }}
      />
    );

    fireEvent.click(screen.getByRole('radio', { name: /Hard — 4-digit/ }));
    await startRun();

    expect(selectedDifficulty).toBe('hard');
    expect(screen.getByRole('heading', { name: 'Remember this association' })).toBeInTheDocument();
  });

  it('decodes all ten selected pictograms before activating the first timed pair', async () => {
    const pendingDecodes: Array<() => void> = [];
    const selectedPaths: string[] = [];
    const decodeStimulus = vi.fn((path: string) => {
      selectedPaths.push(path);
      return new Promise<void>((resolve) => pendingDecodes.push(resolve));
    });
    let engine: AssociativeMemoryPrototypeEngine | undefined;
    render(
      <AssociativeMemoryPrototypeScreen
        countdownSeconds={0}
        createEngine={(difficulty) => {
          engine = createEngine(difficulty);
          return engine;
        }}
        decodeStimulus={decodeStimulus}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Start technical run' }));

    expect(screen.getByRole('heading', { name: 'Preparing the selected objects' })).toHaveFocus();
    expect(decodeStimulus).toHaveBeenCalledTimes(10);
    expect(new Set(selectedPaths).size).toBe(10);
    expect(engine!.getRun().trials.every(({ encodingActivatedOffsetMs }) =>
      encodingActivatedOffsetMs === undefined)).toBe(true);

    act(() => vi.advanceTimersByTime(5_000));
    await act(async () => {
      pendingDecodes.forEach((resolve) => resolve());
    });
    act(() => vi.advanceTimersByTime(0));

    expect(screen.getByRole('heading', { name: 'Remember this association' })).toHaveFocus();
    expect(engine!.getRun().trials.find(({ encodingOrder }) => encodingOrder === 1))
      .toHaveProperty('encodingActivatedOffsetMs', 0);
  });

  it('returns to preparation with an explicit error when a selected pictogram cannot decode', async () => {
    render(
      <AssociativeMemoryPrototypeScreen
        countdownSeconds={0}
        createEngine={createEngine}
        decodeStimulus={vi.fn(async () => Promise.reject(new Error('decode failed')))}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Start technical run' }));
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The selected object images could not all be loaded and decoded'
    );
    expect(screen.getByRole('button', { name: 'Start technical run' })).toBeEnabled();
  });

  it('runs encoding, the explicitly technical delay, and recognition without trial feedback', async () => {
    render(<AssociativeMemoryPrototypeScreen countdownSeconds={0} createEngine={createEngine} />);
    await startRun();

    expect(screen.getByText('Pair 1 of 10')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Remember this association' })).toHaveFocus();
    expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent(
      'Remember this association'
    );
    for (let order = 1; order <= associativeMemoryItemCount; order += 1) {
      act(() => vi.advanceTimersByTime(associativeMemoryEncodingDurationMs));
      expect(screen.getByLabelText('Neutral interval between associations')).toBeInTheDocument();
      act(() => vi.advanceTimersByTime(associativeMemoryEncodingBlankMs));
      if (order < associativeMemoryItemCount) {
        expect(screen.getByText(`Pair ${order + 1} of 10`)).toBeInTheDocument();
      }
    }

    expect(screen.getByRole('heading', { name: 'Technical delay' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Technical delay' })).toHaveFocus();
    expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent('Technical delay');
    expect(screen.getByText(/cannot calibrate difficulty/)).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(associativeMemoryTechnicalDelayMs));
    expect(screen.getByRole('heading', { name: 'Choose the associated value' })).toBeInTheDocument();
    expect(screen.getByText('Question 1 of 10')).toBeInTheDocument();
    expect(screen.queryByText(/correct|incorrect/i)).not.toBeInTheDocument();
  });

  it('shows completed accuracy and median response time from raw observed choices', async () => {
    let engine: AssociativeMemoryPrototypeEngine | undefined;
    render(
      <AssociativeMemoryPrototypeScreen
        countdownSeconds={0}
        createEngine={(difficulty) => {
          engine = createEngine(difficulty);
          return engine;
        }}
      />
    );
    await startRun();
    reachRecognition();

    for (let order = 1; order <= associativeMemoryItemCount; order += 1) {
      const trial = engine!.getRun().trials.find((candidate) => candidate.recognitionOrder === order)!;
      act(() => vi.advanceTimersByTime(order * 100));
      fireEvent.pointerDown(screen.getByRole('button', { name: trial.encodedValue }), { button: 0 });
    }

    expect(screen.getByRole('heading', { name: 'Technical summary' })).toBeInTheDocument();
    expect(screen.getByText('10/10')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('550')).toBeInTheDocument();
    expect(screen.getByText(/10 presented trials retained in memory/)).toBeInTheDocument();
    expect(document.body).not.toHaveClass('memory-prototype-immersive');
  });

  it('records a timeout as incorrect without adding it to the observed median', async () => {
    let engine: AssociativeMemoryPrototypeEngine | undefined;
    render(
      <AssociativeMemoryPrototypeScreen
        countdownSeconds={0}
        createEngine={(difficulty) => {
          engine = createEngine(difficulty);
          return engine;
        }}
      />
    );
    await startRun();
    reachRecognition();

    act(() => vi.advanceTimersByTime(associativeMemoryRecognitionTimeoutMs));
    expect(screen.getByText('Question 2 of 10')).toBeInTheDocument();
    const timedOut = engine!.getRun().trials.find(({ recognitionOrder }) => recognitionOrder === 1)!;
    expect(timedOut.outcome).toBe('timeout');
    expect(timedOut).not.toHaveProperty('selectedValue');
    expect(timedOut).not.toHaveProperty('responseTimeMs');
  });

  it('invalidates a partial run on visibility loss and withholds accuracy', async () => {
    render(<AssociativeMemoryPrototypeScreen countdownSeconds={0} createEngine={createEngine} />);
    await startRun();

    setVisibilityState('hidden');
    fireEvent(document, new Event('visibilitychange'));

    expect(screen.getByRole('heading', { name: 'Technical summary' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Technically invalid run');
    expect(screen.getByRole('alert')).toHaveTextContent('page became hidden');
    expect(screen.getByText(/no valid accuracy score/)).toBeInTheDocument();
    expect(screen.queryByText('Accuracy — primary')).not.toBeInTheDocument();
  });

  it('requires landscape on a coarse-pointer phone and invalidates a later rotation', async () => {
    const orientation = installOrientation('portrait-primary', 0);
    installCoarsePointer();
    render(<AssociativeMemoryPrototypeScreen countdownSeconds={0} createEngine={createEngine} />);

    fireEvent.click(screen.getByRole('button', { name: 'Start technical run' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Landscape orientation is required');

    act(() => orientation.changeTo('landscape-primary', 90));
    await startRun();
    act(() => orientation.changeTo('landscape-secondary', 270));

    expect(screen.getByRole('alert')).toHaveTextContent('device orientation changed');
    expect(screen.getByText(/no valid accuracy score/)).toBeInTheDocument();
  });

  it('supports left and right arrow responses in desktop preview', async () => {
    let engine: AssociativeMemoryPrototypeEngine | undefined;
    render(
      <AssociativeMemoryPrototypeScreen
        countdownSeconds={0}
        createEngine={(difficulty) => {
          engine = createEngine(difficulty);
          return engine;
        }}
      />
    );
    await startRun();
    reachRecognition();
    const trial = engine!.getRun().trials.find(({ recognitionOrder }) => recognitionOrder === 1)!;
    const key = trial.correctAnswerSide === 'left' ? 'ArrowLeft' : 'ArrowRight';
    const panel = document.querySelector('.memory-recognition-panel')!;

    expect(panel).toHaveFocus();
    act(() => vi.advanceTimersByTime(400));
    fireEvent.keyDown(panel, { key });

    expect(engine!.getRun().trials.find(({ recognitionOrder }) => recognitionOrder === 1))
      .toMatchObject({ outcome: 'correct', responseTimeMs: 400 });
    expect(screen.getByText('Question 2 of 10')).toBeInTheDocument();
  });

  it('ignores repeated keys, non-primary pointers, and stale events from a resolved choice', async () => {
    let engine: AssociativeMemoryPrototypeEngine | undefined;
    render(
      <AssociativeMemoryPrototypeScreen
        countdownSeconds={0}
        createEngine={(difficulty) => {
          engine = createEngine(difficulty);
          return engine;
        }}
      />
    );
    await startRun();
    reachRecognition();

    const firstTrial = engine!.getRun().trials.find(({ recognitionOrder }) => recognitionOrder === 1)!;
    const firstButton = screen.getByRole('button', { name: firstTrial.encodedValue });
    const nonPrimaryPointer = createEvent.pointerDown(firstButton, { button: 0 });
    Object.defineProperty(nonPrimaryPointer, 'isPrimary', { value: false });
    fireEvent(firstButton, nonPrimaryPointer);
    expect(engine!.getRun().trials.find(({ recognitionOrder }) => recognitionOrder === 1)?.outcome)
      .toBeUndefined();

    const panel = document.querySelector('.memory-recognition-panel')!;
    fireEvent.keyDown(panel, { key: 'ArrowLeft', repeat: true });
    expect(engine!.getRun().trials.find(({ recognitionOrder }) => recognitionOrder === 1)?.outcome)
      .toBeUndefined();

    fireEvent.pointerDown(firstButton, { button: 0, isPrimary: true, pointerId: 1 });
    expect(engine!.getRun().trials.find(({ recognitionOrder }) => recognitionOrder === 1)?.outcome)
      .toBe('correct');
    expect(() => fireEvent.pointerDown(firstButton, {
      button: 0,
      isPrimary: true,
      pointerId: 1
    })).not.toThrow();
    expect(engine!.getRun().trials.find(({ recognitionOrder }) => recognitionOrder === 2)?.outcome)
      .toBeUndefined();
  });

  it('keeps the complete prototype boundary and controls in French', async () => {
    await setInterfaceLanguage('fr');
    render(<AssociativeMemoryPrototypeScreen />);

    expect(screen.getByRole('heading', { name: 'Prototype de mémoire associative' })).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('ni donnée d’étude ni calibration');
    expect(screen.getByRole('radio', { name: /Standard — valeurs à 3 chiffres/ })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Lancer l’essai technique' })).toBeEnabled();
  });
});

async function startRun(): Promise<void> {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Start technical run' }));
  });
  act(() => vi.advanceTimersByTime(0));
}

function reachRecognition(): void {
  for (let order = 1; order <= associativeMemoryItemCount; order += 1) {
    act(() => vi.advanceTimersByTime(associativeMemoryEncodingDurationMs));
    act(() => vi.advanceTimersByTime(associativeMemoryEncodingBlankMs));
  }
  act(() => vi.advanceTimersByTime(associativeMemoryTechnicalDelayMs));
}

function createEngine(difficulty: AssociativeMemoryDifficulty): AssociativeMemoryPrototypeEngine {
  return new AssociativeMemoryPrototypeEngine(
    { now: () => performance.now() },
    cyclingRandom(),
    difficulty
  );
}

function cyclingRandom(): { next: () => number } {
  const values = [0.13, 0.71, 0.31, 0.89, 0.47, 0.05, 0.63, 0.25, 0.81, 0.39];
  let index = 0;
  return { next: () => values[index++ % values.length]! };
}

function setVisibilityState(value: DocumentVisibilityState): void {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value });
}

function installOrientation(initialType: OrientationType, initialAngle: number) {
  let type = initialType;
  let angle = initialAngle;
  const events = new EventTarget();
  const orientation = events as ScreenOrientation;
  Object.defineProperties(orientation, {
    type: { configurable: true, get: () => type },
    angle: { configurable: true, get: () => angle }
  });
  Object.defineProperty(globalThis.screen, 'orientation', { configurable: true, value: orientation });

  return {
    changeTo(nextType: OrientationType, nextAngle: number): void {
      type = nextType;
      angle = nextAngle;
      events.dispatchEvent(new Event('change'));
    }
  };
}

function installCoarsePointer(): void {
  window.matchMedia = vi.fn((query: string) => ({
    matches: query === '(pointer: coarse)',
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }));
}

function restoreProperty(
  target: object,
  key: PropertyKey,
  descriptor: PropertyDescriptor | undefined
): void {
  if (descriptor === undefined) {
    Reflect.deleteProperty(target, key);
  } else {
    Object.defineProperty(target, key, descriptor);
  }
}

function createForbiddenStudyDependencies(): AppDependencies {
  return {
    studyRepository: {
      getById: vi.fn(async () => undefined),
      list: vi.fn(async () => []),
      save: vi.fn(async () => undefined)
    },
    studyDataRepository: {
      getByStudyId: vi.fn(async () => undefined),
      createDraftIfNoContinuingStudy: vi.fn(async () => ({ created: true as const })),
      save: vi.fn(async () => undefined),
      restoreBackup: vi.fn(async () => undefined)
    }
  };
}
