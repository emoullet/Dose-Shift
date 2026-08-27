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

## 2026-08-27 — Foundation technology stack

**Decision:** Use React, strict TypeScript, Vite, React Router, `vite-plugin-pwa`, `idb`, Zod, i18next/react-i18next, Vitest, Testing Library, and ESLint. Use pnpm for reproducible dependency management.

**Reason:** These packages provide a small, conventional foundation for a responsive local-first PWA while keeping domain code independent of React and browser persistence details.

## 2026-08-27 — Persistence and validation boundaries

**Decision:** Access IndexedDB only through persistence adapters, keep explicit numbered database migrations, and validate records with Zod when reading and before writing. Define versioned serialization envelopes separately from database records.

**Reason:** Browser data is an untrusted runtime boundary. Central adapters and explicit migrations support safe schema evolution without coupling application use cases to IndexedDB.

## 2026-08-27 — Minimal foundation domain primitives

**Decision:** The foundation defines branded UUID identifiers, offset-aware ISO 8601 instants, validated IANA timezone names, and minimal study metadata. It does not encode protocol phases, medication schedules, measurement records, or clinical interpretation.

**Reason:** These primitives establish safe patterns for identity and time handling without prematurely committing to the complete study schema or altering the controlled protocol.

## 2026-08-27 — Interface language persistence

**Decision:** Store the explicit English/French interface preference in namespaced localStorage while storing study-domain records in IndexedDB.

**Reason:** Language is a small device-level presentation preference, not study data. Keeping it separate ensures locale switching cannot mutate domain semantics.

## 2026-08-27 — Record actual medication intake times

**Decision:** Record the actual daily intake time of both fesoterodine and solifenacin separately from the planned protocol schedule.

**Reason:** Actual dosing time may affect interpretation of cognitive and bladder measurements. Planned timing and observed timing must remain distinguishable.

## 2026-08-27 — Catheterization leakage semantics

**Decision:** The leakage field associated with a catheterization means that at least one leakage episode occurred since the previous catheterization. It does not mean leakage occurred specifically during catheterization.

**Reason:** This matches the intended observation and prevents an ambiguous event definition that would weaken later analysis.

## 2026-08-27 — Atypical days remain in the study

**Decision:** Allow a day to be marked as atypical and optionally excluded from primary analysis while the study continues. Preserve all raw observations from that day.

**Reason:** Illness, infection, travel, sleep disruption, medication deviations, or other confounders should not force study termination. Exclusion is an explicit analysis annotation, not data deletion.

## 2026-08-27 — Revised study question and interpretation boundary

**Decision:** Evaluate whether the within-person temporal cognitive profile changes when fesoterodine timing moves from morning to evening, without assuming that fesoterodine causes the reported cognitive dip. Interpret the study as evidence about short-term temporal association only.

**Reason:** The A1/B/A2 design can identify a repeatable timing-associated pattern, but it cannot establish causality or support conclusions about cumulative brain exposure, chronic cognitive decline, or dementia risk.

## 2026-08-27 — Familiarization and frozen cognitive-test configuration

**Decision:** Preserve familiarization sessions outside the A1/B/A2 analysis and freeze the associative-memory difficulty, stimulus rules, PVT threshold, and administration configuration before A1.

**Reason:** Repeated cognitive testing is vulnerable to practice, floor, ceiling, and configuration effects. Calibrating once before the analyzed phases and retaining the familiarization data makes these effects inspectable without introducing adaptive difficulty as an experimental variable.

## 2026-08-27 — Fixed cognitive battery and aligned self-ratings

**Decision:** Each completed cognitive session follows the order memory encoding → five problem-oriented self-ratings → short PVT → delayed memory recognition. All self-ratings use `0 = no problem` and `10 = maximum problem`; subjective memory may be marked difficult to assess instead of forcing a score.

**Reason:** A fixed order creates the recognition delay, reduces administration variability, and avoids direction errors in repeated subjective measures.

## 2026-08-27 — Trial-level objective cognitive data

**Decision:** Model PVT and associative-memory results as separate sessions and preserve trial-level data when Dose-Shift administers the tests. Delayed associative-memory accuracy is the primary memory outcome; memory response time is secondary.

**Reason:** Trial data allow summary metrics to be recalculated and quality-checked. Accuracy is less directly confounded by the motor component than response time for this memory task.

## 2026-08-27 — Explicit outcomes for planned observations

**Decision:** Represent every planned medication intake and cognitive slot with an explicit observed outcome. Medication statuses are `taken`, `missed`, `partial`, or `uncertain`; cognitive slots are `completed` or explicitly `missed`, with an optional reason.

**Reason:** Absence alone cannot distinguish non-adherence, intentional missingness, technical failure, incomplete synchronization, or an uncreated record. Explicit outcomes preserve analyzable missingness without manufacturing data.

## 2026-08-27 — Time-stamped confounders and auditable corrections

**Decision:** Store caffeine, alcohol, and additional medication as time-stamped events when timing may affect interpretation; capture pain and concomitant-treatment changes in daily context. Preserve meaningful record corrections through audit history.

**Reason:** Cognitive measurements must be interpretable relative to temporally relevant exposures, and later corrections must not erase the original observation silently.
