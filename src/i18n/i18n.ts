import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { en } from './resources/en';
import { fr } from './resources/fr';

export const supportedLanguages = ['en', 'fr'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

export const languageStorageKey = 'dose-shift.interface-language';

export function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return typeof value === 'string' && supportedLanguages.includes(value as SupportedLanguage);
}

function getInitialLanguage(): SupportedLanguage {
  const storedLanguage = localStorage.getItem(languageStorageKey);
  if (isSupportedLanguage(storedLanguage)) {
    return storedLanguage;
  }

  return navigator.language.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

export async function initializeI18n(): Promise<void> {
  if (i18n.isInitialized) {
    return;
  }

  await i18n.use(initReactI18next).init({
    resources: { en, fr },
    lng: getInitialLanguage(),
    fallbackLng: 'en',
    supportedLngs: supportedLanguages,
    showSupportNotice: false,
    interpolation: { escapeValue: false }
  });

  document.documentElement.lang = i18n.resolvedLanguage ?? 'en';
}

export async function setInterfaceLanguage(language: SupportedLanguage): Promise<void> {
  localStorage.setItem(languageStorageKey, language);
  await i18n.changeLanguage(language);
  document.documentElement.lang = language;
}

export { i18n };
