export const fr = {
  translation: {
    app: {
      name: 'Dose-Shift',
      tagline: 'Suivi d’étude local'
    },
    navigation: {
      home: 'Accueil',
      pvtPrototype: 'Prototype PVT',
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
      editFormTitle: 'Modifier le brouillon d’étude',
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
      saveChanges: 'Enregistrer les modifications',
      cancelEdit: 'Annuler',
      editDraft: 'Modifier le brouillon',
      saved: 'Brouillon enregistré localement. Il n’a pas été activé.',
      updated: 'Modifications du brouillon enregistrées localement. L’étude reste inactive.',
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
    pvtPrototype: {
      eyebrow: 'Banc technique de chronométrage',
      heading: 'Prototype de chronométrage PVT',
      introduction: 'Testez la boucle de chronométrage proposée dans le navigateur sans créer ni modifier aucune donnée d’étude.',
      warningTitle: 'Prototype uniquement — aucune donnée d’étude',
      warningDescription: 'Cet instrument n’a pas été validé sur ce matériel. Son horodatage est un indicateur d’activation logicielle, pas une mesure de l’apparition physique de la lumière. Les résultats restent en mémoire, ne sont pas des scores médicaux et ne doivent pas servir aux conclusions de l’étude.',
      preparationTitle: 'Préparer l’essai technique',
      instructionPhone: 'Utilisez le même téléphone que celui prévu pour la future validation technique.',
      instructionLandscape: 'Tenez le téléphone en orientation paysage.',
      instructionThumb: 'Utilisez toujours le même pouce et touchez la grande surface de réponse dès que le stimulus apparaît.',
      instructionFocus: 'Gardez cette page visible et active. La quitter ou changer d’orientation invalide l’essai.',
      desktopWarning: 'L’utilisation sur ordinateur sert uniquement à la prévisualisation. Elle ne valide pas le chronométrage de l’écran ni du toucher du téléphone.',
      landscapeRequired: 'Tournez le téléphone en orientation paysage avant de lancer l’essai technique.',
      countdownOrientationChanged: 'Le compte à rebours a été annulé car l’orientation a changé. Stabilisez le téléphone en paysage, puis recommencez.',
      durationLabel: 'Durée de l’essai',
      durationValue: '{{seconds}} secondes',
      intervalLabel: 'Intervalle pseudo-aléatoire',
      intervalValue: '{{minimum}}–{{maximum}} secondes',
      candidateThresholdLabel: 'Seuil candidat de réponse lente',
      candidateThresholdValue: '≥ {{milliseconds}} ms — non validé',
      startAction: 'Lancer l’essai technique',
      countdownLabel: 'Restez immobile. L’essai commence dans',
      runningTitle: 'Essai technique PVT en cours',
      timeRemaining: 'Jusqu’à {{seconds}} secondes restantes',
      responseSurfaceLabel: 'Surface de réponse tactile',
      stimulus: 'MAINTENANT',
      runningHelp: 'Un toucher avant l’activation logicielle du stimulus ou inférieur à {{milliseconds}} ms est un faux départ. Une absence de réponse pendant {{timeoutSeconds}} secondes est une expiration.',
      summaryTitle: 'Résumé technique',
      summaryCaution: 'Ces valeurs sont calculées uniquement à partir des tentatives conservées en mémoire. Chaque expiration compte comme une réponse lente candidate et reçoit une valeur analytique conventionnelle de 30 000 ms dans la médiane et le TR réciproque moyen ; ce n’est pas une réponse mesurée. Les valeurs ne sont pas enregistrées et n’ont aucune interprétation médicale.',
      validResponses: 'Réponses valides',
      falseStarts: 'Faux départs',
      timeouts: 'Expirations',
      candidateLapses: 'Réponses lentes candidates (≥355 ms, expirations incluses)',
      meanReciprocalRt: 'TR réciproque moyen (1/s)',
      medianRt: 'TR médian (ms), secondaire',
      memoryOnly: '{{attempts}} tentatives brutes conservées en mémoire pour le prototype {{version}}. Recharger ou quitter cette page les efface.',
      restartAction: 'Relancer le prototype',
      version: 'Moteur du prototype {{version}}',
      interruption: {
        visibility_lost: 'Essai interrompu car la page n’était plus visible. La tentative en cours a été conservée comme techniquement invalide.',
        focus_lost: 'Essai interrompu car la page a perdu le focus. La tentative en cours a été conservée comme techniquement invalide.',
        orientation_changed: 'Essai interrompu en raison d’un changement d’orientation. La tentative en cours a été conservée comme techniquement invalide.',
        session_ended: 'L’essai technique a atteint sa limite de durée.'
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
