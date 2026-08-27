export const en = {
  translation: {
    app: {
      name: 'Dose-Shift',
      tagline: 'Local-first study tracking'
    },
    navigation: {
      home: 'Home',
      data: 'Data',
      settings: 'Settings'
    },
    home: {
      heading: 'Study workspace',
      introduction: 'The application foundation is ready for future study tracking flows.',
      offlineTitle: 'Designed for offline use',
      offlineDescription: 'Core application files are cached after the first successful load.',
      privacyTitle: 'Data stays on this device',
      privacyDescription: 'The initial application uses local browser storage and has no cloud synchronization.',
      safetyNotice: 'Dose-Shift is a personal tracking tool. It does not recommend medication changes.'
    },
    data: {
      heading: 'Local data',
      placeholder: 'Study records and import/export tools will be added in a later task.'
    },
    settings: {
      heading: 'Settings',
      language: 'Interface language',
      languageHelp: 'This choice is saved on this device.',
      english: 'English',
      french: 'French'
    },
    notFound: {
      heading: 'Page not found',
      returnHome: 'Return home'
    }
  }
} as const;
