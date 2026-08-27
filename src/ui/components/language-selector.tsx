import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';

import {
  isSupportedLanguage,
  setInterfaceLanguage,
  type SupportedLanguage
} from '../../i18n/i18n';

export function LanguageSelector() {
  const { i18n, t } = useTranslation();
  const currentLanguage: SupportedLanguage = isSupportedLanguage(i18n.resolvedLanguage)
    ? i18n.resolvedLanguage
    : 'en';

  function handleChange(event: ChangeEvent<HTMLSelectElement>): void {
    const language = event.target.value;
    if (isSupportedLanguage(language)) {
      void setInterfaceLanguage(language);
    }
  }

  return (
    <div className="field-group">
      <label htmlFor="interface-language">{t('settings.language')}</label>
      <select id="interface-language" value={currentLanguage} onChange={handleChange}>
        <option value="en">{t('settings.english')}</option>
        <option value="fr">{t('settings.french')}</option>
      </select>
      <p className="field-help">{t('settings.languageHelp')}</p>
    </div>
  );
}
