# Domain Model

## Purpose

This document captures the initial domain model for Dose-Shift before feature implementation. It separates protocol intent from observed real-world events so that delays, omissions, deviations, and corrections remain analyzable rather than being overwritten by the planned schedule.

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

A paused/resumed state is intentionally not included in the initial model because a multi-day interruption may invalidate assumptions about continuity. A stopped study remains preserved and a new study may be started if needed.

## Protocol phases

The protocol phases should be represented explicitly as `A1`, `B`, and `A2` rather than as an undifferentiated `A`, `B`, `A` sequence.

A phase snapshot should include:

- phase identifier
- phase kind: `A1`, `B`, or `A2`
- sequence order
- start date
- end date
- planned medication schedule

The planned phase schedule is a snapshot of what was intended when the study started and should not be reconstructed from later observations.

## Planned medication schedule

Planned medication timing belongs to the protocol/phase snapshot and is separate from actual medication intake.

For the current protocol:

- `A1` and `A2`: fesoterodine 8 mg extended release and solifenacin 10 mg in the morning, around 08:30–09:00.
- `B`: solifenacin 10 mg in the morning around 08:30–09:00, fesoterodine 8 mg extended release in the evening around 21:00–22:00.

## Actual medication intake

Actual intake time should be recorded every day for both fesoterodine and solifenacin.

Suggested `MedicationIntake` fields:

- `id`
- `studyId`
- medication identifier/name
- dose
- actual `takenAt` timestamp
- optional note
- creation/update metadata

The phase and planned schedule applicable to an intake should be derived from the study plan and timestamp rather than duplicated when possible.

## Cognitive measurements

Each cognitive measurement corresponds to a planned measurement slot and an actual completion event.

Suggested `CognitiveMeasurement` fields:

- `id`
- `studyId`
- study-local date
- slot: `morning`, `afternoon`, or `evening`
- planned local time
- actual `performedAt` timestamp
- sleepiness score, 0–10
- mental clarity score, 0–10
- concentration score, 0–10
- optional linked PVT session
- optional note
- audit metadata

Initial planned slots:

- `morning`: 10:30
- `afternoon`: 14:30
- `evening`: 20:30

A missed measurement should normally be inferred from a planned slot with no corresponding measurement record rather than represented by an empty measurement object.

## PVT session

PVT results should remain a separate entity so the application can support both external test results and a future integrated PVT.

Suggested `PvtSession` fields:

- `id`
- `studyId`
- `cognitiveMeasurementId`
- source: `external` or `integrated`
- `startedAt`
- `completedAt`
- median reaction time in milliseconds
- optional lapse count
- optional lapse threshold
- optional implementation version
- optional device metadata
- optional raw trials

If an integrated PVT is implemented, raw trial-level reaction times should be preserved so summary metrics can be recalculated.

## Catheterization events

A `CatheterizationEvent` records one catheterization and the bladder observations accumulated since the previous catheterization.

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

### Leakage semantics

The leakage field means:

> At least one leakage episode occurred since the previous catheterization.

It does not mean leakage occurred specifically during the catheterization itself.

Time of day, study day, and protocol phase should be derived from `occurredAt` rather than duplicated into the event.

## Night observations

Nighttime bladder observations should be represented separately from catheterization events.

Suggested `NightObservation` fields:

- `id`
- `studyId`
- `nightDate`
- `leakageOccurred`
- `bladderRelatedAwakening`
- optional awakening count
- optional note
- audit metadata

`nightDate` should refer to the local calendar date on which the user wakes up after that night.

## Daily context and confounders

A daily context record should hold day-level factors that may influence interpretation.

Suggested `DailyContext` fields:

- `studyId`
- local date
- bedtime
- wake time
- sleep quality
- unusual physical activity flag and optional note
- unusual/large/shifted meal flag and optional note
- urinary or infection symptoms flag and optional note
- optional general note
- `isAtypicalDay`
- `excludeFromPrimaryAnalysis`
- optional exclusion reason
- audit metadata

### Atypical or excludable days

The application must allow a day to be marked as atypical and/or excludable from primary analysis without stopping the study.

All raw data from that day remains preserved. Exclusion is an analysis annotation, not data deletion.

This supports situations such as infection, intercurrent illness, travel, unusual sleep disruption, major schedule deviation, or an important missed medication intake.

Analysis code should never silently exclude a day. Exclusion status and reason must remain explicit and inspectable.

## Time-stamped confounder events

Factors for which timing matters should be represented as events rather than only daily text.

### Caffeine intake

Suggested fields:

- `id`
- `studyId`
- `occurredAt`
- type: `coffee`, `tea`, or `other`
- optional amount/serving information
- optional note

### Additional medication intake

Suggested fields:

- `id`
- `studyId`
- `occurredAt`
- medication name
- optional dose text
- optional `potentiallySedating` flag
- optional note

Alcohol may initially be modeled either as a daily structured field or as time-stamped events depending on the desired entry burden.

## Audit and corrections

Recorded observations should not be silently overwritten without trace.

Editable records should include creation and update metadata, and meaningful corrections should be representable through an audit history.

A possible `AuditEntry` contains:

- `id`
- entity type
- entity identifier
- `changedAt`
- previous value
- new value

The exact storage strategy may evolve, but the model must preserve the ability to distinguish original observations from later corrections.

## Versioning boundaries

The following versions are separate concepts and must not be conflated:

- `protocolVersion`: scientific/protocol definition used by a study.
- database version: IndexedDB schema version and migrations.
- export format version: external JSON serialization contract.
- application version: Dose-Shift software version producing or editing data.

## Initial relationship overview

```text
Study
|
|-- ProtocolPhase
|    `-- MedicationSchedule
|
|-- MedicationIntake
|
|-- CognitiveMeasurement
|    `-- PvtSession
|         `-- PvtTrial (optional/future)
|
|-- CatheterizationEvent
|
|-- NightObservation
|
|-- DailyContext
|
|-- CaffeineIntake
|
|-- AdditionalMedicationIntake
|
`-- AuditEntry
```

## Implementation guidance

This document defines domain intent, not the final IndexedDB table layout. Persistence should be designed to support these concepts without duplicating derived fields unnecessarily.

The next implementation task should convert these decisions into validated domain schemas, persistence migrations, and focused tests before building full UI flows.
