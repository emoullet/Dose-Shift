import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from '../../src/app/app';
import {
  initializeI18n,
  languageStorageKey,
  setInterfaceLanguage
} from '../../src/i18n/i18n';

describe('language selector', () => {
  it('switches to French and persists the choice locally', async () => {
    await initializeI18n();
    await setInterfaceLanguage('en');
    window.history.pushState({}, '', '/settings');
    render(<App />);

    fireEvent.change(screen.getByLabelText('Interface language'), {
      target: { value: 'fr' }
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Paramètres' })).toBeInTheDocument();
    });
    expect(localStorage.getItem(languageStorageKey)).toBe('fr');
    expect(document.documentElement.lang).toBe('fr');
  });
});
