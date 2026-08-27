import { useTranslation } from 'react-i18next';

import { LanguageSelector } from '../components/language-selector';

export function SettingsScreen() {
  const { t } = useTranslation();

  return (
    <section className="screen-stack">
      <h1>{t('settings.heading')}</h1>
      <div className="info-card">
        <LanguageSelector />
      </div>
    </section>
  );
}
