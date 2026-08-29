# Product Specification

## Product goal

Dose-Shift should make the medication-timing protocol easy to follow and should produce clean, analyzable longitudinal data with minimal daily friction.

The initial product is intended for a single user and should work well on both Android and desktop browsers.

## Initial product principles

- Mobile-first interaction.
- Offline-capable core flows.
- Local-first data ownership.
- No account requirement for the first version.
- No cloud synchronization requirement for the first version.
- Explicit export/import for backup and analysis.
- Fast entry for repeated measurements.
- Clear separation between protocol configuration, raw observations, and derived analyses.
- User-facing content must be available in both English and French.
- The user must be able to switch the interface language from within the application.
- The selected language should persist locally across sessions.

## Internationalization

English and French are first-class product languages from the initial version.

All user-facing strings, including navigation, labels, buttons, validation messages, protocol explanations, warnings, notifications, settings, empty states, and analysis labels, must use the application's internationalization layer rather than being hard-coded in UI components.

The source code, identifiers, file names, documentation, translation keys, and engineering terminology remain in English. French text should live only in localization resources or other explicitly localized content.

The application may select an initial language from the browser/device locale, but the user must always be able to override it explicitly. Changing the interface language must not modify stored study data or protocol semantics.

## Core user flows

### 1. Start or configure a study

The user should be able to:

- Define the `A1` start date, separately from the preceding familiarization period.
- Set one common `A1`/`B`/`A2` phase duration from 1 to 90 days, defaulting to seven days.
- See the planned `A1`, `B`, and `A2` phases as contiguous, non-overlapping calendar ranges with equal durations.
- Confirm the medication schedule associated with each phase.
- See protocol precautions before enabling a schedule change.
- Complete familiarization sessions and freeze cognitive-test difficulty and administration settings before `A1`.
- See transition days identified explicitly.

Protocol version 1.1 uses the original three-week/seven-day-per-phase design as the default. When another common duration is selected, the UI must state that it differs from the original design and must not claim that all durations are scientifically equivalent. The setup flow creates a draft only; clinician/pharmacist validation is presented as a prerequisite and is not persisted as an attestation. A saved protocol-1.1 draft can be reopened and edited before activation without creating another study or replacing existing study data.

### 2. Record a planned medication intake

For each planned fesoterodine and solifenacin intake, the user should be able to:

- See the planned medication, dose, and time window.
- Record `taken`, `missed`, `partial`, or `uncertain` status.
- Record the actual intake time when applicable.
- Record an actual partial dose and optional note when applicable.

The product must preserve planned and actual timing separately. It must not recommend medication changes or silently resolve schedule deviations.

### 3. Complete a scheduled cognitive measurement

At approximately 10:30, 14:30, and 20:30, the user should be able to record:

- Associative-memory encoding.
- Sleepiness, mental fog, concentration difficulty, mental fatigue, and memory difficulty scores from 0 to 10, all oriented from no problem to maximum problem.
- `Difficult to assess / not meaningfully engaged` instead of a forced subjective-memory score.
- A short PVT with median reaction time and lapse count.
- Delayed two-choice recognition for the encoded object-value associations.

The session must retain its actual start time and follow the protocol order. The UI should minimize taps, make the current slot obvious, and keep device/response conditions stable. A changed device or response method must be recordable as an atypical condition.

A planned session may be explicitly marked missed with an optional reason. The product must never generate replacement scores for a missed session.

### 4. Record a catheterization event

At any time, the user should be able to quickly record:

- Timestamp.
- Catheterized volume.
- Whether at least one leakage episode occurred since the previous catheterization.
- Unusual urgency.
- Atypical bladder sensation.
- Optional note.

The timestamp should default to the current time but remain editable.

### 5. Record night events

The user should be able to record:

- Nighttime leakage.
- Unusual bladder-related awakening.
- Optional note and timestamp.

### 6. Record daily context and confounders

The user should be able to record, at minimum:

- Bedtime.
- Wake time.
- Sleep quality.
- Coffee/tea consumption and timing.
- Alcohol consumption and timing.
- Unusual pain or an important change in pain.
- Unusual physical activity.
- Large or unusually timed meals.
- Infection or urinary symptoms.
- Unusual medication, especially sedating or anticholinergic medication.
- Meaningful changes in concomitant treatment.
- `normal`, `atypical`, or `exclude_from_primary_analysis` analysis status with an optional reason.

The first implementation should prefer structured fields and time-stamped events where analysis benefits from them, with optional free-text notes for context. Excluding a day from primary analysis must preserve all raw data and remain reversible for sensitivity analyses.

### 7. Review progress

The user should be able to see:

- Current study day and phase.
- Completed and missing scheduled measurements.
- Planned and observed medication intake, including deviations.
- Recent catheterization events.
- Basic trends in self-ratings, PVT results, and associative-memory accuracy.
- Basic bladder-control summaries.
- Atypical, excluded, and transition-day annotations.

Advanced statistical analysis is not required for the first milestone.

### 8. Export and import data

The user should be able to:

- Export the complete study dataset to a versioned JSON format.
- Export analysis-friendly tabular data, preferably CSV.
- Import a previously exported dataset.
- Receive clear validation errors for malformed or incompatible imports.

## Notifications

Scheduled reminders are desirable for cognitive measurement times, but the first implementation should not make the data model or core flows depend on notification support.

## PVT scope

The protocol requires a short approximately three-minute PVT. Two implementation paths remain possible:

1. Integrate a PVT directly into Dose-Shift.
2. Record results produced by an external PVT application.

The first development milestone should keep the data model compatible with both approaches. A decision on direct PVT implementation should be made separately because methodological rigor may affect implementation complexity.

Regardless of source, the lapse threshold, device, response method, implementation version, and actual timing must remain recordable. If Dose-Shift later administers the PVT, it should preserve trial-level reaction times.

## Associative memory scope

The protocol requires a brief object-value associative-memory task with delayed two-choice recognition. Familiarization should select a non-floor/non-ceiling difficulty before `A1`; configuration then remains frozen through `A1`, `B`, and `A2`.

The domain model and exports must preserve the frozen configuration, generator version, stimuli, answer order, selected responses, correctness, presentation order, and response times. Accuracy is the primary memory outcome. Implementing the actual task UI and stimulus generator may be delivered separately from the initial domain-schema work.

## Analysis targets

The application should preserve enough raw data to support at least:

- The five self-ratings at 14:30 by protocol phase.
- Within-day differences between measurement slots.
- Median PVT reaction time by time of day and phase.
- PVT lapse count by time of day and phase.
- Delayed associative-memory accuracy by time of day and phase.
- Catheterized volumes and leakage frequency by phase and time of day.
- Comparison of A1, B, and A2 phases.
- Elapsed time from the latest observed intake of each medication to each cognitive session.
- Sensitivity analyses including and excluding flagged days, sessions, and transition days.
- Potential practice effects across familiarization and study sessions.

Derived values should not replace raw observations in storage.

## Out of scope for the first version

- Automatic medication recommendations.
- Dose changes.
- Clinician-facing dashboards.
- Multi-user accounts.
- Cloud synchronization.
- Medical-device certification claims.
- Automated interpretation presented as medical advice.
- Claims about cumulative brain exposure, chronic cognitive decline, or dementia risk.
