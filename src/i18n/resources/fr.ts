export const fr = {
  translation: {
    app: {
      name: 'Dose-Shift',
      tagline: 'Suivi d’étude local'
    },
    navigation: {
      home: 'Accueil',
      data: 'Données',
      settings: 'Paramètres'
    },
    home: {
      heading: 'Espace d’étude',
      introduction: 'Créez ou reprenez le brouillon local du plan contrôlé en phases A-B-A.',
      offlineTitle: 'Conçue pour une utilisation hors ligne',
      offlineDescription: 'Les fichiers essentiels de l’application sont mis en cache après le premier chargement réussi.',
      privacyTitle: 'Les données restent sur cet appareil',
      privacyDescription: 'L’application initiale utilise le stockage local du navigateur et ne comporte aucune synchronisation cloud.',
      safetyNotice: 'Dose-Shift est un outil de suivi personnel. Il ne recommande aucune modification de traitement.'
    },
    studySetup: {
      loading: 'Chargement des données locales de l’étude…',
      loadError: 'L’étude locale n’a pas pu être chargée en toute sécurité. Aucune donnée n’a été modifiée.',
      emptyTitle: 'Aucune étude n’est en cours',
      emptyDescription: 'Créez un seul brouillon local pour prévisualiser le plan contrôlé avant la familiarisation.',
      createAction: 'Créer un brouillon d’étude',
      formTitle: 'Configuration du brouillon d’étude',
      planDetails: 'Détails du plan',
      startDate: 'Date de début de A1',
      startDateHelp: 'Cette date marque le début de A1, et non celui de la familiarisation.',
      startDateError: 'Saisissez une date de début de A1 valide.',
      duration: 'Nombre de jours par phase',
      durationHelp: 'A1, B et A2 ont une durée commune de 1 à 90 jours. La valeur par défaut est 7.',
      durationError: 'Saisissez un nombre entier compris entre 1 et 90.',
      timeZone: 'Fuseau horaire de l’étude',
      timeZoneHelp: 'Détecté sur cet appareil. Vérifiez le fuseau horaire IANA canonique avant l’enregistrement.',
      timeZoneError: 'Saisissez un fuseau horaire IANA valide, par exemple Europe/Paris.',
      timeZoneConfirmation: 'Je confirme que {{timeZone}} est le bon fuseau horaire pour l’étude.',
      timeZoneConfirmationError: 'Confirmez le fuseau horaire de l’étude avant l’enregistrement.',
      validationSummary: 'Vérifiez les champs signalés. Le brouillon n’a pas été enregistré.',
      persistenceError: 'Le brouillon n’a pas pu être enregistré localement. Vos saisies sont conservées ; réessayez.',
      saving: 'Enregistrement du brouillon…',
      saveDraft: 'Enregistrer le brouillon',
      saved: 'Brouillon enregistré localement. Il n’a pas été activé.',
      resumed: 'Votre étude locale existante a été reprise. Aucune nouvelle étude n’a été créée.',
      conflict: 'Un autre brouillon ou une étude active a été trouvé : il a été repris et aucune nouvelle étude n’a été créée.',
      previewTitle: 'Aperçu du plan contrôlé',
      savedPlanTitle: 'Plan contrôlé enregistré',
      protocolVersion: 'Version du protocole : {{version}}',
      savedTimeZone: 'Fuseau horaire : {{timeZone}}',
      durationNotice: 'Cette durée diffère du plan initial de trois semaines, avec sept jours par phase. Dose-Shift n’affirme pas que toutes les durées de phase sont scientifiquement équivalentes.',
      transitionStart: 'Début de transition',
      medicationSchedule: 'Programme médicamenteux en lecture seule',
      doseAndFormulation: '{{dose}} mg, {{formulation}}',
      timeWindow: '{{start}}–{{end}}',
      familiarizationTitle: 'Prochaine étape : familiarisation',
      familiarizationDescription: 'Avant A1, la familiarisation avec l’appareil et les tests cognitifs doit être terminée, puis la configuration des tests cognitifs doit être figée. Ce brouillon ne lance aucune séance et n’active pas l’étude.',
      prerequisiteTitle: 'Prérequis de validation clinique',
      prerequisiteDescription: 'Le changement d’horaire de la fésotérodine doit être validé par le médecin prescripteur ou le pharmacien avant la phase B. Dose-Shift n’enregistre ni ne prétend obtenir cette validation dans ce brouillon.',
      precautionsTitle: 'Précautions contrôlées',
      precautionsDescription: 'Ne modifiez pas les doses et ne doublez pas une dose pour décaler l’horaire. Les transitions doivent être organisées de façon à éviter deux prises trop rapprochées.',
      stopCondition: 'En cas d’augmentation des fuites, de symptômes urinaires inhabituels, de signes de dysréflexie autonome ou de tout effet indésirable important, arrêtez l’expérience et contactez l’équipe médicale concernée.',
      status: {
        draft: 'Brouillon',
        active: 'Active',
        completed: 'Terminée',
        stopped: 'Arrêtée'
      },
      phase: {
        A1: 'A1 — horaire habituel du matin',
        B: 'B — horaire décalé de la fésotérodine',
        A2: 'A2 — retour à l’horaire du matin'
      },
      medication: {
        fesoterodine: 'Fésotérodine',
        solifenacin: 'Solifénacine'
      },
      formulation: {
        extended_release: 'à libération prolongée',
        standard: 'formulation standard'
      }
    },
    data: {
      heading: 'Données locales',
      placeholder: 'Les dossiers d’étude et les outils d’importation et d’exportation seront ajoutés lors d’une tâche ultérieure.'
    },
    settings: {
      heading: 'Paramètres',
      language: 'Langue de l’interface',
      languageHelp: 'Ce choix est enregistré sur cet appareil.',
      english: 'Anglais',
      french: 'Français'
    },
    notFound: {
      heading: 'Page introuvable',
      returnHome: 'Retour à l’accueil'
    }
  }
} as const;
