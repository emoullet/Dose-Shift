import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function NotFoundScreen() {
  const { t } = useTranslation();

  return (
    <section className="screen-stack">
      <h1>{t('notFound.heading')}</h1>
      <Link className="button-link" to="/">{t('notFound.returnHome')}</Link>
    </section>
  );
}
