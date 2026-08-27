import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { AppShell } from '../ui/components/app-shell';
import { DataScreen } from '../ui/screens/data-screen';
import { HomeScreen } from '../ui/screens/home-screen';
import { NotFoundScreen } from '../ui/screens/not-found-screen';
import { SettingsScreen } from '../ui/screens/settings-screen';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomeScreen />} />
          <Route path="data" element={<DataScreen />} />
          <Route path="settings" element={<SettingsScreen />} />
          <Route path="*" element={<NotFoundScreen />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
