import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function AppShell() {
  const { t } = useTranslation();

  return (
    <div className="app-frame">
      <header className="app-header">
        <div className="brand-mark" aria-hidden="true">D</div>
        <div>
          <div className="app-name">{t('app.name')}</div>
          <div className="app-tagline">{t('app.tagline')}</div>
        </div>
      </header>

      <main className="app-content">
        <Outlet />
      </main>

      <nav className="app-navigation" aria-label={t('app.name')}>
        <NavLink to="/" end>{t('navigation.home')}</NavLink>
        <NavLink to="/pvt-prototype">{t('navigation.pvtPrototype')}</NavLink>
        <NavLink to="/data">{t('navigation.data')}</NavLink>
        <NavLink to="/settings">{t('navigation.settings')}</NavLink>
      </nav>
    </div>
  );
}
