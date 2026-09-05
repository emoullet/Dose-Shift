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

## 2026-08-27 — Study aggregate, persistence version 2, and export version 2

**Decision:** Represent a complete backup unit as one validated `StudyData` aggregate containing a study and all of its study-scoped records. Store top-level entity types in separate IndexedDB version-2 object stores, while embedding ordered PVT and associative-memory trials in their parent sessions. Serialize complete backups with export format version 2, independently of the database version.

**Reason:** The aggregate enforces study ownership at persistence and import boundaries. Separate top-level stores support focused offline access, while embedded trials keep raw test observations atomic with their session summaries. Independent database and export versions preserve the documented versioning boundaries and allow each contract to evolve explicitly.

## 2026-08-27 — Aggregate consistency and explicit backup restoration

**Decision:** Validate cross-record medication, phase, cognitive-slot, raw-PVT, and frozen-configuration invariants at the `StudyData` boundary. Keep `DailyContext.analysis` as the only day-level analysis state. Expose normal append-preserving saves separately from an explicitly named exact backup restoration operation.

**Reason:** Individually valid records can still contradict the frozen protocol or each other. One authoritative day flag prevents competing exclusion state, while distinct save and restore semantics prevent both accidental observation deletion during routine writes and accidental retention of stale records during complete backup restoration.

## 2026-08-28 — Supervised agent delivery governance

**Decision:** Deliver implementation as human-approved, focused roadmap lots. Each lot uses one isolated worktree, one branch, one sole implementation writer, read-only specialist reviews, and one draft pull request. Required quality, diff, documentation, and functional-acceptance evidence must be inspected directly before a separate explicit merge authorization. Agents never merge automatically.

Project-scoped Codex configuration caps spawned threads at three per session and defines an inheriting lot-lead profile plus read-only domain, persistence/data-integrity/test, and UI/internationalization/accessibility reviewer profiles. The practical hierarchy stops at orchestrator -> lot lead -> reviewer. A rolling review schedule keeps the practical tree-wide spawned-agent count at three even though the client limit is per session.

**Reason:** Dose-Shift combines sensitive longitudinal data with a controlled medication-timing protocol. Exclusive write ownership, evidence-based review, explicit scientific and safety approvals, and human merge control reduce coordination errors and prevent product or protocol decisions from being introduced silently. Repository instructions document client and hosting limitations rather than claiming controls that the configuration cannot enforce.

## 2026-08-28 — Protocol 1.1 draft phase-plan configuration

**Decision:** Newly created study drafts use controlled protocol version `1.1`. The selected study date starts `A1`, while familiarization remains a prerequisite before `A1`. `A1`, `B`, and `A2` share one configurable inclusive duration from 1 to 90 calendar days, defaulting to seven. Phase dates enforce equal duration, contiguity, non-overlap, and explicit `B`/`A2` transition starts without storing a redundant duration field. A non-seven-day plan must state that it differs from the original three-week design and that scientific equivalence across durations is not claimed.

The draft setup displays the controlled medication identities, formulations, doses, and timing windows read-only. Clinician/pharmacist validation is shown only as a prerequisite and is neither recorded nor claimed. Creation preserves every existing study and atomically refuses a second `draft` or `active` study. A resumed protocol-1.1 draft remains editable before activation: replanning preserves all existing entity identifiers and collections, and validation rejects changes that would conflict with preserved records rather than deleting them.

**Reason:** A bounded draft setup makes the controlled plan inspectable before familiarization while preserving the medication-safety boundary, legacy seven-day data, local-first integrity, and explicit human validation requirements.

## 2026-08-30 — PVT timing prototype boundary and parameters

The following seven decisions were explicitly approved for the technical prototype lot:

1. **Non-study prototype:** Build a versioned PVT-B-inspired timing harness outside the study domain. It must not create familiarization evidence, cognitive measurements, activation state, or any other study record.
2. **Fixed prototype timing:** Run for 180 seconds with pseudo-random 1–4-second inter-stimulus intervals, accept the primary `pointerdown` touch response, classify a response before software stimulus activation or below 100 ms as a false start, and record a timeout when no response follows activation for 30 seconds.
3. **Candidate threshold only:** Derive a candidate lapse count using reaction times greater than or equal to 355 ms. This threshold is not validated for the browser, device, or user and must not be presented as final protocol methodology.
4. **Raw in-memory evidence and timestamp boundary:** Use an injected monotonic clock and preserve every raw attempt in memory with order, planned interval, monotonic offsets, outcome, and derived reaction time when applicable. Name the stimulus timestamp `stimulusActivatedOffsetMs`: it is a software activation proxy sampled immediately before a synchronous interface commit, not a measured physical or photonic onset. Derive valid-response count, false starts, timeouts, candidate lapses, mean reciprocal reaction time, and secondary median reaction time only from those attempts.
5. **Controlled interaction conditions:** Present a bilingual, mobile-first preparation, countdown, landscape touch surface, run, and technical summary. Instruct the user to use the same phone, landscape orientation, and thumb. Desktop is a preview with an explicit warning, not a validation environment. Track orientation identity where the browser exposes it so that a 180-degree landscape-primary to landscape-secondary rotation is not mistaken for an unchanged landscape layout.
6. **Invalidating interruptions:** An orientation change during the countdown cancels the start and returns to preparation; landscape is revalidated immediately before the engine starts. Loss of page visibility or focus and an orientation change during the run interrupt it without resumption and retain the current attempt in memory as `technical_invalid` with its reason. Technical interruptions do not count as lapses or timeouts.
7. **Validation and protocol gate:** Add no telemetry, network dependency, persistent storage, IndexedDB record, `StudyData` field, migration, export change, medical score, interpretation, or recommendation. The controlled protocol remains version 1.1 and is not amended by this lot; final instrument methodology and any protocol amendment require separate technical validation and explicit approval.

**Reason:** A browser can exercise deterministic scheduling and data-reduction logic before the target hardware has been characterized, but automated software tests cannot establish display and touch latency. Keeping the harness visibly outside study data prevents an unvalidated implementation or candidate threshold from being mistaken for a controlled study instrument.

## 2026-09-05 — PVT prototype timeout analysis convention

**Decision:** A genuine timeout remains explicitly recorded with outcome `timeout`, has no invented response offset or measured reaction time, counts as one candidate lapse, and receives a separate conventional analytical reaction-time value of 30,000 ms. That analytical value participates in the median reaction time and mean reciprocal reaction time. Technical interruptions remain `technical_invalid` and participate in none of those measures.

**Reason:** Preserving the timeout outcome distinguishes an absence of response from an observed 30-second reaction, while the explicit analytical convention incorporates the event consistently in the approved prototype summaries without misrepresenting it as measured behavior.
