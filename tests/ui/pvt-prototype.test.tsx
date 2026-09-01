import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App, type AppDependencies } from '../../src/app/app';
import { initializeI18n, setInterfaceLanguage } from '../../src/i18n/i18n';
import { PvtPrototypeEngine } from '../../src/prototype/pvt/pvt-prototype-engine';
import { PvtPrototypeScreen } from '../../src/ui/screens/pvt-prototype-screen';

describe('PVT timing prototype UI', () => {
  beforeEach(async () => {
    await initializeI18n();
    await setInterfaceLanguage('en');
  });

  afterEach(cleanup);

  it('presents the isolated technical harness without accessing study persistence', () => {
    const dependencies = createForbiddenStudyDependencies();
    window.history.pushState({}, '', '/pvt-prototype');

    render(<App dependencies={dependencies} />);

    expect(screen.getByRole('heading', { name: 'PVT timing prototype' })).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('Prototype only — not study data');
    expect(screen.getByText(/not been validated on this hardware/)).toBeInTheDocument();
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
    expect(screen.getByText(/1 raw attempts retained in memory/)).toBeInTheDocument();
    expect(screen.getAllByText('0', { selector: 'dd' })).toHaveLength(4);
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
