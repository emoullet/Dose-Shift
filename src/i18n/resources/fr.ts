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
      introduction: 'La base de l’application est prête pour les futurs parcours de suivi de l’étude.',
      offlineTitle: 'Conçue pour une utilisation hors ligne',
      offlineDescription: 'Les fichiers essentiels de l’application sont mis en cache après le premier chargement réussi.',
      privacyTitle: 'Les données restent sur cet appareil',
      privacyDescription: 'L’application initiale utilise le stockage local du navigateur et ne comporte aucune synchronisation cloud.',
      safetyNotice: 'Dose-Shift est un outil de suivi personnel. Il ne recommande aucune modification de traitement.'
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
