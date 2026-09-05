import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App, type AppDependencies } from '../../src/app/app';
import { i18n, initializeI18n, setInterfaceLanguage } from '../../src/i18n/i18n';
import { PvtPrototypeEngine } from '../../src/prototype/pvt/pvt-prototype-engine';
import { PvtPrototypeScreen } from '../../src/ui/screens/pvt-prototype-screen';

describe('PVT timing prototype UI', () => {
  const originalOrientationDescriptor = Object.getOwnPropertyDescriptor(globalThis.screen, 'orientation');
  const originalVisibilityDescriptor = Object.getOwnPropertyDescriptor(document, 'visibilityState');

  beforeEach(async () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    setVisibilityState('visible');
    await initializeI18n();
    await setInterfaceLanguage('en');
  });

  afterEach(() => {
    cleanup();
    if (originalOrientationDescriptor === undefined) {
      Reflect.deleteProperty(globalThis.screen, 'orientation');
    } else {
      Object.defineProperty(globalThis.screen, 'orientation', originalOrientationDescriptor);
    }
    if (originalVisibilityDescriptor === undefined) {
      Reflect.deleteProperty(document, 'visibilityState');
    } else {
      Object.defineProperty(document, 'visibilityState', originalVisibilityDescriptor);
    }
    document.body.classList.remove('pvt-prototype-immersive');
    vi.restoreAllMocks();
  });

  it('presents the isolated technical harness without accessing study persistence', () => {
    const dependencies = createForbiddenStudyDependencies();
    window.history.pushState({}, '', '/pvt-prototype');

    render(<App dependencies={dependencies} />);

    expect(screen.getByRole('heading', { name: 'PVT timing prototype' })).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('Prototype only — not study data');
    expect(screen.getByText(/not been validated on this hardware/)).toBeInTheDocument();
    expect(screen.getByText(/software activation proxy/)).toBeInTheDocument();
    expect(screen.getByText(/Desktop use is a preview only/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start technical run' })).toBeEnabled();
    expect(dependencies.studyRepository.list).not.toHaveBeenCalled();
    expect(dependencies.studyDataRepository.getByStudyId).not.toHaveBeenCalled();
  });

  it('interrupts on focus loss and reports an in-memory technically invalid attempt', async () => {
    const clock = { value: 0 };
    render(
      <PvtPrototypeScreen
        countdownSeconds={0}
        createEngine={() => new PvtPrototypeEngine(
          { now: () => clock.value },
          { next: () => 0 }
        )}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Start technical run' }));
    expect(await screen.findByRole('button', { name: 'Touch response surface' })).toBeInTheDocument();

    clock.value = 500;
    fireEvent.blur(window);

    expect(await screen.findByRole('heading', { name: 'Technical summary' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('page lost focus');
    expect(screen.getByText(/1 raw attempt retained in memory/)).toBeInTheDocument();
    expect(screen.getAllByText('0', { selector: 'dd' })).toHaveLength(4);
    expect(document.body).not.toHaveClass('pvt-prototype-immersive');
  });

  it('uses a dedicated viewport during countdown and restores the normal shell after cancellation', async () => {
    const dependencies = createForbiddenStudyDependencies();
    window.history.pushState({}, '', '/pvt-prototype');
    render(<App dependencies={dependencies} />);

    fireEvent.click(screen.getByRole('button', { name: 'Start technical run' }));

    expect(document.body).toHaveClass('pvt-prototype-immersive');
    expect(screen.queryByRole('heading', { name: 'PVT timing prototype' })).not.toBeInTheDocument();
    expect(document.querySelector('.pvt-prototype.is-immersive')).toBeInTheDocument();

    fireEvent.blur(window);

    expect(await screen.findByRole('heading', { name: 'Prepare the technical run' }))
      .toBeInTheDocument();
    expect(document.body).not.toHaveClass('pvt-prototype-immersive');
  });

  it('cancels the countdown when the page becomes hidden', async () => {
    render(<PvtPrototypeScreen countdownSeconds={3} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start technical run' }));

    setVisibilityState('hidden');
    fireEvent(document, new Event('visibilitychange'));

    expect(await screen.findByRole('heading', { name: 'Prepare the technical run' }))
      .toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('page was hidden');
  });

  it('cancels the countdown when the page loses focus', async () => {
    render(<PvtPrototypeScreen countdownSeconds={3} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start technical run' }));

    fireEvent.blur(window);

    expect(await screen.findByRole('heading', { name: 'Prepare the technical run' }))
      .toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('page lost focus');
  });

  it('rechecks focus immediately after entering the running view', async () => {
    let focused = true;
    vi.mocked(document.hasFocus).mockImplementation(() => focused);
    render(
      <PvtPrototypeScreen
        countdownSeconds={0}
        createEngine={() => {
          focused = false;
          return new PvtPrototypeEngine(
            { now: () => 0 },
            { next: () => 0 }
          );
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Start technical run' }));

    expect(await screen.findByRole('heading', { name: 'Technical summary' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('page lost focus');
  });

  it('cancels the countdown when landscape orientation identity changes', async () => {
    const orientation = installOrientation('landscape-primary', 90);
    render(<PvtPrototypeScreen countdownSeconds={3} />);

    fireEvent.click(screen.getByRole('button', { name: 'Start technical run' }));
    expect(screen.getByText('Keep still. The run starts in')).toBeInTheDocument();

    act(() => orientation.changeTo('landscape-secondary', 270));

    expect(await screen.findByRole('heading', { name: 'Prepare the technical run' }))
      .toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('countdown was cancelled');
    expect(screen.queryByRole('button', { name: 'Touch response surface' })).not.toBeInTheDocument();
  });

  it('interrupts a run for a landscape-primary to landscape-secondary rotation', async () => {
    const orientation = installOrientation('landscape-primary', 90);
    const clock = { value: 0 };
    render(
      <PvtPrototypeScreen
        countdownSeconds={0}
        createEngine={() => new PvtPrototypeEngine(
          { now: () => clock.value },
          { next: () => 0 }
        )}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Start technical run' }));
    expect(await screen.findByRole('button', { name: 'Touch response surface' })).toBeInTheDocument();

    clock.value = 500;
    act(() => orientation.changeTo('landscape-secondary', 270));

    expect(await screen.findByRole('heading', { name: 'Technical summary' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('orientation changed');
    expect(screen.getAllByText('0', { selector: 'dd' })).toHaveLength(4);
  });

  it.each(['Enter', ' '])('accepts the %s key once in desktop preview', async (key) => {
    const clock = { value: 0 };
    render(
      <PvtPrototypeScreen
        countdownSeconds={0}
        createEngine={() => new PvtPrototypeEngine(
          { now: () => clock.value },
          { next: () => 0 }
        )}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Start technical run' }));
    const responseSurface = await screen.findByRole('button', { name: 'Touch response surface' });
    expect(responseSurface).toHaveFocus();

    clock.value = 200;
    fireEvent.keyDown(responseSurface, { key });
    clock.value = 250;
    fireEvent.blur(window);

    expect(await screen.findByRole('heading', { name: 'Technical summary' })).toBeInTheDocument();
    expect(screen.getByText(/2 raw attempts retained in memory/)).toBeInTheDocument();
    expect(screen.getByText('1', { selector: 'dd' })).toBeInTheDocument();
  });

  it('does not autofocus the response surface on a coarse-pointer phone', async () => {
    installOrientation('landscape-primary', 90);
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: query === '(pointer: coarse)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));
    render(<PvtPrototypeScreen countdownSeconds={0} />);

    fireEvent.click(screen.getByRole('button', { name: 'Start technical run' }));
    const responseSurface = await screen.findByRole('button', { name: 'Touch response surface' });

    expect(responseSurface).not.toHaveFocus();
  });

  it('pluralizes retained raw attempts in English and French', async () => {
    expect(i18n.t('pvtPrototype.memoryOnly', { count: 1, version: 'test' }))
      .toContain('1 raw attempt retained');
    expect(i18n.t('pvtPrototype.memoryOnly', { count: 2, version: 'test' }))
      .toContain('2 raw attempts retained');

    await setInterfaceLanguage('fr');
    expect(i18n.t('pvtPrototype.memoryOnly', { count: 1, version: 'test' }))
      .toContain('1 tentative brute conservée');
    expect(i18n.t('pvtPrototype.memoryOnly', { count: 2, version: 'test' }))
      .toContain('2 tentatives brutes conservées');
  });

  it('keeps the warnings and controls available in French', async () => {
    await setInterfaceLanguage('fr');
    render(<PvtPrototypeScreen />);

    expect(screen.getByRole('heading', { name: 'Prototype de chronométrage PVT' }))
      .toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('aucune donnée d’étude');
    expect(screen.getByText(/ne sont pas des scores médicaux/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lancer l’essai technique' })).toBeEnabled();
  });
});

function installOrientation(initialType: OrientationType, initialAngle: number) {
  let type = initialType;
  let angle = initialAngle;
  const events = new EventTarget();
  const orientation = events as ScreenOrientation;
  Object.defineProperties(orientation, {
    type: { configurable: true, get: () => type },
    angle: { configurable: true, get: () => angle }
  });
  Object.defineProperty(globalThis.screen, 'orientation', {
    configurable: true,
    value: orientation
  });

  return {
    changeTo(nextType: OrientationType, nextAngle: number): void {
      type = nextType;
      angle = nextAngle;
      events.dispatchEvent(new Event('change'));
    }
  };
}

function setVisibilityState(value: DocumentVisibilityState): void {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value
  });
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
