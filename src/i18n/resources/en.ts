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
      introduction: 'Create or resume the local draft for the controlled A-B-A phase plan.',
      offlineTitle: 'Designed for offline use',
      offlineDescription: 'Core application files are cached after the first successful load.',
      privacyTitle: 'Data stays on this device',
      privacyDescription: 'The initial application uses local browser storage and has no cloud synchronization.',
      safetyNotice: 'Dose-Shift is a personal tracking tool. It does not recommend medication changes.'
    },
    studySetup: {
      loading: 'Loading local study data…',
      loadError: 'The local study could not be loaded safely. No data was changed.',
      emptyTitle: 'No study is in progress',
      emptyDescription: 'Create one local draft to preview the controlled phase plan before familiarization.',
      createAction: 'Create a draft study',
      formTitle: 'Draft study setup',
      planDetails: 'Plan details',
      startDate: 'A1 start date',
      startDateHelp: 'This date starts A1. It is not the start of familiarization.',
      startDateError: 'Enter a valid A1 start date.',
      duration: 'Days in each phase',
      durationHelp: 'A1, B, and A2 use one common duration from 1 to 90 days. The default is 7.',
      durationError: 'Enter a whole number from 1 to 90.',
      timeZone: 'Study time zone',
      timeZoneHelp: 'Detected from this device. Review the canonical IANA time zone before saving.',
      timeZoneError: 'Enter a valid IANA time zone, such as Europe/Paris.',
      timeZoneConfirmation: 'I confirm that {{timeZone}} is the correct study time zone.',
      timeZoneConfirmationError: 'Confirm the study time zone before saving.',
      validationSummary: 'Review the highlighted setup fields. The draft has not been saved.',
      persistenceError: 'The draft could not be saved locally. Your entries are still here; try again.',
      saving: 'Saving draft…',
      saveDraft: 'Save draft',
      saved: 'Draft saved locally. It has not been activated.',
      resumed: 'Your existing local study has been resumed. No new study was created.',
      conflict: 'Another draft or active study was found, so it was resumed and no new study was created.',
      previewTitle: 'Controlled plan preview',
      savedPlanTitle: 'Saved controlled plan',
      protocolVersion: 'Protocol version {{version}}',
      savedTimeZone: 'Time zone: {{timeZone}}',
      durationNotice: 'This duration differs from the original three-week design of seven days per phase. Dose-Shift does not claim that all phase durations are scientifically equivalent.',
      transitionStart: 'Transition start',
      medicationSchedule: 'Read-only medication schedule',
      doseAndFormulation: '{{dose}} mg, {{formulation}}',
      timeWindow: '{{start}}–{{end}}',
      familiarizationTitle: 'Next step: familiarization',
      familiarizationDescription: 'Before A1, familiarization with the device and cognitive tests must be completed and the cognitive-test configuration must be frozen. This draft does not run sessions or activate the study.',
      prerequisiteTitle: 'Clinical validation prerequisite',
      prerequisiteDescription: 'The fesoterodine timing change must be validated by the prescribing clinician or pharmacist before the B phase. Dose-Shift does not record or claim that validation in this draft.',
      precautionsTitle: 'Controlled precautions',
      precautionsDescription: 'Do not change the doses or double a dose to shift the schedule. Transitions must be organized so that two doses are not taken too close together.',
      stopCondition: 'If leakage increases, unusual urinary symptoms appear, signs of autonomic dysreflexia occur, or any significant adverse effect develops, stop the experiment and contact the relevant medical team.',
      status: {
        draft: 'Draft',
        active: 'Active',
        completed: 'Completed',
        stopped: 'Stopped'
      },
      phase: {
        A1: 'A1 — usual morning schedule',
        B: 'B — shifted fesoterodine schedule',
        A2: 'A2 — restored morning schedule'
      },
      medication: {
        fesoterodine: 'Fesoterodine',
        solifenacin: 'Solifenacin'
      },
      formulation: {
        extended_release: 'extended release',
        standard: 'standard formulation'
      }
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
