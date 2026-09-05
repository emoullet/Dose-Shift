import { BrowserRouter, Route, Routes } from 'react-router-dom';

import type { StudyDataRepository } from '../application/studies/study-data-repository';
import type { StudyRepository } from '../application/studies/study-repository';
import { IndexedDbStudyDataRepository } from '../persistence/indexed-db-study-data-repository';
import { IndexedDbStudyRepository } from '../persistence/indexed-db-study-repository';
import { AppShell } from '../ui/components/app-shell';
import { DataScreen } from '../ui/screens/data-screen';
import { HomeScreen } from '../ui/screens/home-screen';
import { NotFoundScreen } from '../ui/screens/not-found-screen';
import { PvtPrototypeScreen } from '../ui/screens/pvt-prototype-screen';
import { SettingsScreen } from '../ui/screens/settings-screen';

export interface AppDependencies {
  readonly studyRepository: StudyRepository;
  readonly studyDataRepository: StudyDataRepository;
}

const defaultDependencies: AppDependencies = {
  studyRepository: new IndexedDbStudyRepository(),
  studyDataRepository: new IndexedDbStudyDataRepository()
};

export function App({ dependencies = defaultDependencies }: { dependencies?: AppDependencies }) {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomeScreen dependencies={dependencies} />} />
          <Route path="pvt-prototype" element={<PvtPrototypeScreen />} />
          <Route path="data" element={<DataScreen />} />
          <Route path="settings" element={<SettingsScreen />} />
          <Route path="*" element={<NotFoundScreen />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
