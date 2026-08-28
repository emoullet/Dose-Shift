# Domain Model

## Purpose

This document captures the initial domain model for Dose-Shift before feature implementation. It separates protocol intent from observed events so that delays, omissions, deviations, transition effects, and corrections remain analyzable rather than being overwritten by the planned schedule.

It defines domain intent, not the final IndexedDB table layout.

## Study

A `Study` represents one execution of a versioned protocol.

Suggested fields:

- `id`
- `protocolVersion`
- `startDate`
- `timeZone`
- `status`
- `createdAt`
- `updatedAt`
- optional `stoppedAt`
- optional `stopReason`

Initial study statuses:

- `draft`
- `active`
- `completed`
- `stopped`

A paused/resumed state is intentionally omitted from the initial model because a multi-day interruption may invalidate continuity assumptions. A stopped study remains preserved; a new study may be started if needed.

## Familiarization and protocol phases

Familiarization precedes the analyzed A-B-A study. Familiarization sessions remain stored but are excluded from the A-B-A analysis by design.

The analyzed phases are explicit `A1`, `B`, and `A2` phases rather than an undifferentiated `A`, `B`, `A` sequence.

A phase snapshot should include:

- phase identifier
- phase kind: `A1`, `B`, or `A2`
- sequence order
- start date
- end date
- planned medication schedule
- transition-day identification where applicable

The planned phase schedule is a snapshot of what was intended when the study started. It must not be reconstructed from later observations.

Each session or event can derive its study stage from the study plan and timestamp. Where ambiguity is possible at a transition, the resolved stage must remain explicit and inspectable.

## Familiarization configuration

The familiarization period establishes stable test conditions before `A1`.

Suggested `CognitiveTestConfiguration` fields:

- `id`
- `studyId`
- memory item count
- memory difficulty level
- distractor type
- stimulus-generation rules version
- PVT lapse threshold
- PVT implementation or source configuration
- `frozenAt`
- audit metadata

The configuration may be adjusted during familiarization, then must be frozen before `A1`. Changes during `A1`, `B`, or `A2` are protocol deviations and must never happen silently.

## Planned medication schedule

Planned medication timing belongs to the protocol/phase snapshot and is separate from actual intake.

For the current protocol:

- `A1` and `A2`: fesoterodine 8 mg extended release and solifenacin 10 mg in the morning, around 08:30–09:00.
- `B`: solifenacin 10 mg in the morning around 08:30–09:00, and fesoterodine 8 mg extended release in the evening around 21:00–22:00.

## Planned and observed medication intake

Every planned daily intake of both medications must have an observable outcome.

Suggested `MedicationIntake` fields:

- `id`
- `studyId`
- planned medication reference
- planned local time or time window
- medication identifier/name
- planned dose
- status: `taken`, `missed`, `partial`, or `uncertain`
- optional actual `takenAt` timestamp
- optional actual dose
- optional note
- audit metadata

`takenAt` is required when status is `taken` and may be present for `partial` or `uncertain`; it is absent for `missed`.

Phase, study day, and elapsed time since the latest intake should be derived from timestamps and the study plan rather than stored redundantly. Planned and actual timing must remain distinct.

## Planned cognitive slots

The current protocol defines three daily slots:

- `morning`: 10:30
- `afternoon`: 14:30
- `evening`: 20:30

A planned slot has one outcome: `completed` or `missed`. This makes intentional missingness distinguishable from an incomplete or absent record.

Suggested `CognitiveMeasurement` fields:

- `id`
- `studyId`
- study-local date
- slot
- planned local time
- status: `completed` or `missed`
- optional actual `startedAt` and `completedAt` timestamps
- optional missed reason: `forgotten`, `not_available`, `too_tired`, `technical_issue`, or `other`
- optional missed-reason note
- optional session-conditions note
- audit metadata

Completed sessions follow a fixed order: memory encoding, self-ratings, PVT, then delayed memory recognition. Do not create placeholder scores for missed sessions.

## Cognitive self-ratings

Completed cognitive sessions record five problem-oriented 0–10 scales:

- `sleepinessScore`
- `mentalFogScore`
- `concentrationDifficultyScore`
- `mentalFatigueScore`
- optional `memoryDifficultyScore`

For every score, `0` means no symptom or difficulty and `10` means the maximum symptom or difficulty. The score anchors are controlled by the protocol.

Memory difficulty may instead be marked `difficult_to_assess` when memory has not been meaningfully engaged since the previous session. This is not equivalent to a zero score or a missed session.

## PVT session

PVT results remain a separate entity so the application can support both external results and a future integrated test.

Suggested `PvtSession` fields:

- `id`
- `studyId`
- `cognitiveMeasurementId`
- source: `external` or `integrated`
- `startedAt`
- `completedAt`
- median reaction time in milliseconds
- lapse count
- lapse threshold in milliseconds
- optional implementation version
- device and response-method metadata
- optional position/conditions note
- optional condition-change flag
- optional raw trials
- audit metadata

If an integrated PVT is implemented, preserve trial-level reaction times so summary metrics can be recalculated. A device, interface, or response-method change can mark the enclosing cognitive session as atypical.

## Associative memory session

An `AssociativeMemorySession` represents the encoding and delayed-recognition portions of one cognitive session.

Suggested fields:

- `id`
- `studyId`
- `cognitiveMeasurementId`
- test configuration reference or frozen configuration version
- `encodingStartedAt`
- `encodingCompletedAt`
- `recognitionStartedAt`
- `recognitionCompletedAt`
- item count
- correct-response count
- accuracy proportion
- generator version
- ordered trial records
- audit metadata

Each `AssociativeMemoryTrial` should preserve:

- trial identifier and presentation order
- object stimulus identifier
- encoded value
- distractor value
- displayed-answer order
- selected value
- correctness
- response time

Accuracy is the primary memory outcome. Response time is secondary because it includes a motor component. Object-value pairs should not be intentionally reused across sessions.

## Catheterization events

A `CatheterizationEvent` records one catheterization and bladder observations accumulated since the previous catheterization.

Suggested fields:

- `id`
- `studyId`
- `occurredAt`
- catheterized volume in milliliters
- `leakageSincePreviousCatheterization`
- `unusualUrgency`
- `atypicalBladderSensation`
- optional note
- audit metadata

`leakageSincePreviousCatheterization` means that at least one leakage episode occurred since the previous catheterization. It does not mean leakage occurred during the catheterization itself.

Time of day, study day, and protocol phase should be derived from `occurredAt` rather than duplicated.

## Night observations

Suggested `NightObservation` fields:

- `id`
- `studyId`
- `nightDate`
- `leakageOccurred`
- `bladderRelatedAwakening`
- optional awakening count
- optional note
- audit metadata

`nightDate` refers to the local calendar date on which the user wakes after that night.

## Daily context and analysis flags

A `DailyContext` record holds day-level factors that may influence interpretation.

Suggested fields:

- `studyId`
- local date
- bedtime
- wake time
- sleep quality
- unusual-pain flag and optional severity/context note
- unusual-physical-activity flag and optional note
- unusual/large/shifted-meal flag and optional note
- urinary/infection-symptoms flag and optional note
- concomitant-treatment-change flag and optional note
- analysis flag: `normal`, `atypical`, or `exclude_from_primary_analysis`
- optional analysis-flag reason
- optional general note
- audit metadata

Marking a day atypical does not stop the study. Excluding it from the primary analysis is an explicit, reversible annotation. All raw data remain preserved and available for sensitivity analyses; analysis code must never exclude a day silently.

`DailyContext.analysis` is the single authoritative day-level analysis state. Generic `AnalysisAnnotation` records must not target a day, because a second active representation could contradict the daily context.

## Time-stamped confounder events

Factors whose timing may affect a cognitive session should be events rather than only daily text.

### Caffeine intake

- `id`
- `studyId`
- `occurredAt`
- type: `coffee`, `tea`, or `other`
- optional amount/serving information
- optional note

### Alcohol intake

- `id`
- `studyId`
- `occurredAt`
- optional type
- optional amount/serving information
- optional note

### Additional medication intake

- `id`
- `studyId`
- `occurredAt`
- medication name
- optional dose text
- optional `potentiallySedating` flag
- optional `potentiallyAnticholinergic` flag
- optional note

Regular concomitant medications and meaningful treatment changes should remain representable even when they are not isolated one-off doses.

## Session and transition analysis annotations

In addition to the authoritative daily analysis flag, a cognitive session may need an explicit atypical annotation for device changes, interruptions, unusual administration conditions, or technical issues. An annotation includes a reason and never removes the underlying record.

Transition days are also explicit analysis context. They are not automatically discarded.

## Audit and corrections

Recorded observations must not be overwritten without trace.

Editable records include creation and update metadata, and meaningful corrections are represented through audit history. A possible `AuditEntry` contains:

- `id`
- entity type
- entity identifier
- `changedAt`
- changed fields
- previous values
- new values
- optional correction reason

Audit history is particularly important for medication timing/status, cognitive scores and sessions, PVT results, associative-memory results, catheterizations, and analysis flags.

## Versioning boundaries

These versions are separate concepts and must not be conflated:

- `protocolVersion`: scientific definition used by a study.
- cognitive test/generator version: instrument behavior and stimulus rules.
- database version: IndexedDB schema and migrations.
- export format version: external JSON serialization contract.
- application version: Dose-Shift software version producing or editing data.

## Initial relationship overview

```text
Study
|
|-- CognitiveTestConfiguration
|-- ProtocolPhase
|    `-- MedicationSchedule
|-- MedicationIntake
|-- CognitiveMeasurement
|    |-- PvtSession
|    |    `-- PvtTrial
|    `-- AssociativeMemorySession
|         `-- AssociativeMemoryTrial
|-- CatheterizationEvent
|-- NightObservation
|-- DailyContext
|-- CaffeineIntake
|-- AlcoholIntake
|-- AdditionalMedicationIntake
|-- AnalysisAnnotation
`-- AuditEntry
```

## Implementation guidance

Persistence should support these concepts without duplicating derived fields unnecessarily. Derived elapsed-time, phase, study-day, and summary values must not replace raw timestamps, planned records, trial data, or observations.

The next implementation task should convert these decisions into validated domain schemas, persistence migrations, and focused tests before building full UI flows. This documentation change does not implement those schemas or migrations.
