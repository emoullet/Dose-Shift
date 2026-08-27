import { useTranslation } from 'react-i18next';

export function DataScreen() {
  const { t } = useTranslation();

  return (
    <section className="screen-stack">
      <h1>{t('data.heading')}</h1>
      <div className="info-card">
        <p>{t('data.placeholder')}</p>
      </div>
    </section>
  );
}
