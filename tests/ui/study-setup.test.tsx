import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { App, type AppDependencies } from '../../src/app/app';
import { initializeI18n, setInterfaceLanguage } from '../../src/i18n/i18n';
import { resetDoseShiftDatabase } from '../persistence/database-test-utils';

describe('draft study setup', () => {
  beforeEach(async () => {
    await initializeI18n();
    await setInterfaceLanguage('en');
    window.history.pushState({}, '', '/');
    await resetDoseShiftDatabase();
  });

  afterEach(async () => {
    cleanup();
    await resetDoseShiftDatabase();
  });

  it('saves and resumes a canonical bilingual-ready draft with the controlled plan', async () => {
    const firstRender = render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Create a draft study' }));
    fillValidForm('2026-09-01', '7');

    expect(screen.queryByText(/scientifically equivalent/)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'A1 — usual morning schedule' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /B — shifted fesoterodine schedule/ })).toHaveTextContent('Transition start');
    expect(screen.getAllByText('Fesoterodine')).toHaveLength(3);
    expect(screen.getAllByText('Solifenacin')).toHaveLength(3);
    expect(screen.getAllByText('8 mg, extended release')).toHaveLength(3);
    expect(screen.getAllByText('10 mg, standard formulation')).toHaveLength(3);
    expect(screen.getAllByText('08:30–09:00')).toHaveLength(5);
    expect(screen.getByText('21:00–22:00')).toBeInTheDocument();
    expect(screen.getByText(/must be validated by the prescribing clinician or pharmacist/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(await screen.findByText('Draft saved locally. It has not been activated.')).toBeInTheDocument();
    expect(screen.getByText('Protocol version 1.1')).toBeInTheDocument();

    firstRender.unmount();
    render(<App />);
    expect(await screen.findByText(/existing local study has been resumed/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Saved controlled plan' })).toBeInTheDocument();
  });

  it('shows localized validation and the non-seven-day notice in French', async () => {
    await setInterfaceLanguage('fr');
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Créer un brouillon d’étude' }));

    fireEvent.change(screen.getByLabelText('Nombre de jours par phase'), { target: { value: '1' } });
    expect(screen.getByRole('status')).toHaveTextContent('n’affirme pas que toutes les durées');
    expect(screen.getByRole('heading', { name: /B — horaire décalé de la fésotérodine/ }))
      .toHaveTextContent('Début de transition');

    fireEvent.change(screen.getByLabelText('Nombre de jours par phase'), { target: { value: '91' } });
    fireEvent.change(screen.getByLabelText('Fuseau horaire de l’étude'), { target: { value: 'Invalide/Zone' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Vérifiez les champs signalés');
    expect(screen.getByText('Saisissez un nombre entier compris entre 1 et 90.')).toBeInTheDocument();
    expect(screen.getByText(/fuseau horaire IANA valide/)).toBeInTheDocument();
    expect(screen.getByText(/Confirmez le fuseau horaire/)).toBeInTheDocument();
  });

  it('preserves the form and permits retry after a localized persistence failure', async () => {
    const dependencies: AppDependencies = {
      studyRepository: {
        getById: async () => undefined,
        list: async () => [],
        save: async () => {
          throw new Error('Standalone study save must not be called');
        }
      },
      studyDataRepository: {
        getByStudyId: async () => undefined,
        createDraftIfNoContinuingStudy: async () => {
          throw new Error('Simulated persistence failure');
        },
        save: async () => undefined,
        restoreBackup: async () => undefined
      }
    };
    render(<App dependencies={dependencies} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Create a draft study' }));
    fillValidForm('2026-09-15', '7');
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('could not be saved locally');
    expect(screen.getByLabelText('A1 start date')).toHaveValue('2026-09-15');
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeEnabled();
  });
});

function fillValidForm(startDate: string, duration: string): void {
  fireEvent.change(screen.getByLabelText('A1 start date'), { target: { value: startDate } });
  fireEvent.change(screen.getByLabelText('Days in each phase'), { target: { value: duration } });
  fireEvent.change(screen.getByLabelText('Study time zone'), { target: { value: 'Europe/Paris' } });
  fireEvent.click(screen.getByRole('checkbox', { name: /correct study time zone/ }));
}
