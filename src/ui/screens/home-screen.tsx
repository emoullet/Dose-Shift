import { useTranslation } from 'react-i18next';

export function HomeScreen() {
  const { t } = useTranslation();

  return (
    <section className="screen-stack">
      <div className="hero-card">
        <p className="eyebrow">{t('app.tagline')}</p>
        <h1>{t('home.heading')}</h1>
        <p>{t('home.introduction')}</p>
      </div>

      <div className="card-grid">
        <article className="info-card">
          <h2>{t('home.offlineTitle')}</h2>
          <p>{t('home.offlineDescription')}</p>
        </article>
        <article className="info-card">
          <h2>{t('home.privacyTitle')}</h2>
          <p>{t('home.privacyDescription')}</p>
        </article>
      </div>

      <aside className="safety-notice">{t('home.safetyNotice')}</aside>
    </section>
  );
}
