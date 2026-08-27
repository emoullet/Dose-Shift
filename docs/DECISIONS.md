# Decision Log

This file records meaningful product and architecture decisions. Keep entries concise and append new decisions rather than rewriting history without a clear reason.

## 2026-08-27 — Repository language

**Decision:** All repository artifacts are written in English.

This includes documentation, source code identifiers, file and directory names, comments, tests, generated repository text, and user-facing strings unless localization is explicitly introduced later.

**Reason:** Maintain a consistent engineering language and make the repository easy to use with development tools, collaborators, and coding agents.

## 2026-08-27 — Initial delivery platform

**Decision:** Start with a responsive Progressive Web App rather than a native Android application.

**Reason:** A PWA provides one codebase for Android and desktop, supports rapid iteration, can work offline, and is sufficient for the initial export/import-based workflow. Native packaging remains possible later if platform integration requires it.

## 2026-08-27 — Local-first initial architecture

**Decision:** The first version does not require a backend or cloud synchronization.

**Reason:** The application is initially single-user, core tracking must remain available offline, and explicit export/import is sufficient for the first study workflow. This also minimizes privacy and infrastructure complexity.

## 2026-08-27 — Protocol as a controlled requirement

**Decision:** `docs/PROTOCOL.md` is the versioned reference for application behavior tied directly to the study protocol.

**Reason:** Medication timing, measurement schedules, safety conditions, and interpretation rules must not drift implicitly as implementation evolves.

## 2026-08-27 — PVT implementation remains open

**Decision:** The data model must support both externally generated PVT results and a future integrated PVT, but direct PVT implementation is not yet committed.

**Reason:** Integrating a PVT may improve usability, but methodological rigor around browser/device timing must be evaluated before using an in-app test as a study instrument.

## 2026-08-27 — Bilingual user interface

**Decision:** English and French are both supported as first-class user-interface languages from the initial version. User-facing text must be routed through an internationalization layer, while source code, identifiers, documentation, and translation keys remain in English.

**Reason:** The application must be usable in both languages without requiring a later internationalization retrofit. Locale selection should affect presentation only and must not alter stored study data or protocol semantics.
