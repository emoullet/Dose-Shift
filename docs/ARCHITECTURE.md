# Architecture

## Status

Initial architecture direction. Technical choices may evolve during prototyping.

## Product shape

The first version should be a responsive Progressive Web App (PWA) optimized for Android and desktop use.

Reasons:

- One codebase for mobile and desktop.
- Fast iteration during protocol refinement.
- Offline-capable usage is feasible.
- Installation on Android can be supported without committing immediately to a native application.
- Export/import can be implemented without a backend.
- A native wrapper or dedicated Android application can be considered later if platform integration requires it.

## Initial architecture principles

### Local-first

The application should work without a server for its core tracking functions.

Data should be stored locally in a structured database suitable for offline use. Browser storage technology should be selected based on reliability, schema evolution, and developer ergonomics rather than by using raw key-value storage directly throughout the codebase.

### Domain separation

The codebase should clearly separate:

- Domain models and protocol rules.
- Persistence and migrations.
- Application/use-case logic.
- UI components and screens.
- Import/export serialization.
- Analysis and derived metrics.
- Internationalization resources and locale-aware presentation.

The domain layer must not depend on UI components or localized strings.

### Internationalization

Internationalization is a first-version architectural requirement, not a later retrofit.

- English and French must both be supported from the initial version.
- User-facing strings must not be hard-coded in React components.
- Translation keys, source code, identifiers, and engineering-facing content remain in English.
- French text belongs in localization resources.
- Locale choice must be persisted locally and must be user-overridable.
- Browser or device locale may be used only to select an initial default.
- Locale switching must not alter persisted domain data or protocol semantics.
- Date, time, and number presentation should be locale-aware while stored values remain locale-neutral and unambiguous.

The exact internationalization library should be selected during scaffolding, with preference for a mature React-compatible solution that supports typed or reliably validated translation resources.

### Runtime validation

Static typing is not sufficient for persisted or imported data. All external or persisted data crossing a trust boundary should be validated at runtime.

### Versioned data model

Exports should include a schema version. Data migrations should be explicit and tested.

## Proposed stack direction

The exact package choices should be confirmed before scaffolding, but the preferred direction is:

- TypeScript with strict compiler settings.
- React-based web UI.
- Modern fast build tooling suitable for a PWA.
- Local browser database abstraction over IndexedDB.
- Runtime schema validation.
- Internationalization layer supporting English and French.
- Unit tests for domain and persistence logic.
- End-to-end tests for the most important tracking flows once the UI stabilizes.

No backend is required for the first milestone.

## Data model outline

The model should distinguish immutable identity from editable content and should preserve original timestamps.

Likely top-level concepts include:

### Study

- Identifier.
- Protocol version.
- Start date.
- Timezone.
- Study status.

### ProtocolPhase

- Identifier.
- Phase type (`A1`, `B`, `A2` or equivalent explicit representation).
- Start/end dates.
- Medication schedule metadata.

### CognitiveMeasurement

- Identifier.
- Study identifier.
- Scheduled slot.
- Actual timestamp.
- Sleepiness score.
- Mental clarity score.
- Concentration score.
- PVT median reaction time.
- PVT lapse count when available.
- Optional notes.
- Creation/update metadata.

### CatheterizationEvent

- Identifier.
- Timestamp.
- Volume.
- Leakage flag.
- Unusual urgency flag.
- Atypical bladder sensation flag.
- Optional notes.
- Creation/update metadata.

### NightEvent

- Identifier.
- Timestamp or associated night/date.
- Leakage flag.
- Bladder-related awakening flag.
- Optional notes.

### DailyContext

- Date.
- Bedtime.
- Wake time.
- Sleep quality.
- Caffeine events or summary.
- Alcohol information.
- Unusual physical activity.
- Meal-related confounders.
- Infection/urinary symptoms.
- Unusual medications.
- Optional notes.

The detailed schema should be designed before implementation and documented separately if it becomes complex.

## Time handling

Time-of-day is central to the study, so time handling must be explicit.

- Store timestamps in a format that preserves unambiguous instants.
- Store or associate the study timezone.
- Preserve local scheduled times separately from actual measurement timestamps when needed.
- Do not infer protocol phase solely from a formatted local date string.
- Localize only presentation; persisted timestamps and protocol rules must remain locale-independent.

## Export strategy

### JSON

Canonical complete backup/export format.

The export should include:

- Export format version.
- Study/protocol metadata.
- Raw measurements and events.
- Relevant settings.

### CSV

Analysis-oriented exports may use one or more normalized tables rather than forcing heterogeneous events into a single table.

Potential files:

- `cognitive_measurements.csv`
- `catheterization_events.csv`
- `night_events.csv`
- `daily_context.csv`

## PVT architecture

The initial data model should allow PVT results to originate either from:

- Manual/external result entry.
- A future integrated PVT module.

If an integrated PVT is implemented, raw trial-level reaction times should be preservable rather than storing only summary statistics. Methodological details such as stimulus timing, lapse threshold, warm-up behavior, browser timing APIs, and device consistency must be specified before relying on the integrated test for study conclusions.

## Security and privacy

The first version is single-user and local-first.

- No telemetry by default.
- No external transmission of health-related data by default.
- Export files may contain sensitive personal data and should be clearly identified as such in the UI.
- If cloud synchronization is introduced later, encryption, authentication, and threat modeling must be reconsidered explicitly.
