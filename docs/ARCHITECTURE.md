# Architecture

## Status

Implemented foundation, validated study domain model, local persistence, complete JSON backup envelope, and draft study setup with a controlled phase-plan preview. Later measurement workflows remain intentionally open.

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

## Foundation stack

- React and React Router for the application shell and client-side routing.
- TypeScript with strict mode and additional unchecked-index and optional-property checks.
- Vite and `vite-plugin-pwa` for development, production builds, the web app manifest, and a generated Workbox service worker.
- IndexedDB through the small `idb` wrapper. Database access is confined to persistence adapters.
- Zod schemas at persisted and serialized trust boundaries.
- i18next and react-i18next with English and French resources.
- Vitest, Testing Library, jsdom, and fake-indexeddb for domain, UI, and persistence tests.
- ESLint with TypeScript and React Hooks rules.

The repository uses pnpm and records the resolved dependency graph in `pnpm-lock.yaml`.

## Source boundaries

Dependencies point inward toward the domain:

- `domain` contains language-independent value and entity schemas and has no React dependency.
- `application` declares use cases and persistence ports in domain terms.
- `persistence` owns the IndexedDB schema, explicit version migrations, and repository adapters. Values are validated when read and before write.
- `serialization` owns versioned external data envelopes and validation. It does not yet provide complete import/export workflows.
- `analysis` is reserved for pure derived metrics that do not replace raw observations.
- `ui` contains React screens and components; it accesses user-facing text through `i18n`.
- `app` composes routes and UI. Future composition should inject concrete adapters into application use cases here.

Interface language is a presentation setting persisted in localStorage under a namespaced key. Domain and study data use IndexedDB and do not contain localized values.

## PWA and offline behavior

Production builds generate a web app manifest and a service worker that precaches the compiled application shell. Client-side navigation falls back to `index.html`, so previously cached shell routes remain available offline after a successful initial production load. Development mode does not enable the service worker to avoid stale-cache confusion.

No backend is required for the first milestone.

## Implemented study data model

`docs/DOMAIN_MODEL.md` defines the implemented study entities. Each trust boundary uses a strict Zod schema and its inferred TypeScript type. Conditional observation states use discriminated unions so that, for example, a missed cognitive slot cannot contain synthetic scores and a missed medication intake cannot contain an actual intake timestamp.

`StudyData` is the domain aggregate used for complete persistence and serialization. It contains one study plus its phase snapshot, frozen cognitive-test configuration, observations, raw objective-test sessions and trials, confounders, analysis annotations, and audit entries. It validates that every enclosed entity belongs to the same study.

PVT and associative-memory trials are embedded in their parent session records. This preserves ordered raw test data atomically with the summaries from which analysis may recalculate metrics; it does not couple the domain to a test-administration UI.

IndexedDB version 2 stores each top-level entity type separately and indexes study-scoped records by study identifier. The study-data adapter validates on both reads and writes. Its normal save operation upserts supplied records without deleting omissions; its explicitly named backup-restore operation atomically replaces all local study data from the authoritative complete envelope. Database version 1 remains an explicit migration step, and the version-2 migration adds the complete stores while upgrading foundation-era study records.

Aggregate validation checks controlled phase schedules, medication-plan references, phase and measurement dates, per-day slot uniqueness, objective-test summaries, and frozen PVT administration settings. `DailyContext.analysis` is authoritative for day-level analysis state; generic annotations apply only to cognitive sessions and protocol transitions.

The draft-study application builder creates a complete protocol-1.1 `StudyData` aggregate with three controlled phases and empty observation collections. It derives the common 1–90-day duration from phase dates rather than persisting a redundant field. Calendar plans use UTC component arithmetic over ISO local dates, avoiding elapsed-time and daylight-saving shifts.

Draft creation uses a creation-only `StudyDataRepository` operation. The adapter validates the aggregate, checks for every existing `draft` or `active` study, and adds the complete draft in one IndexedDB read-write transaction. This prevents concurrent creation of a second continuing study without changing the database schema. Existing completed and stopped studies remain untouched. The setup flow uses `StudyRepository` only for listing/resume and never persists a standalone active `Study`.

The app boundary composes the concrete repositories into the bilingual home workflow. Saved plans are read-only in this lot; familiarization, cognitive configuration, planned daily observations, and activation remain separate proposed work.

## Time handling

Time-of-day is central to the study, so time handling must be explicit.

- Store timestamps in a format that preserves unambiguous instants.
- Store or associate the study timezone.
- Preserve local scheduled times separately from actual measurement timestamps when needed.
- Do not infer protocol phase solely from a formatted local date string.
- Localize only presentation; persisted timestamps and protocol rules must remain locale-independent.

## Export strategy

### JSON

Canonical complete backup/export format. Export format version 2 serializes one or more validated `StudyData` aggregates in a strict envelope containing the producing application version and export timestamp. Unsupported versions and malformed JSON fail validation without writing to persistence.

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
