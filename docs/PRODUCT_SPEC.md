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

## Core user flows

### 1. Start or configure a study

The user should be able to:

- Define the study start date.
- See the planned A-B-A phases.
- Confirm the medication schedule associated with each phase.
- See protocol precautions before enabling a schedule change.

The initial implementation may ship with the current three-week protocol as a predefined study template rather than supporting a general protocol builder.

### 2. Complete a scheduled cognitive measurement

At approximately 10:30, 14:30, and 20:30, the user should be able to record:

- Sleepiness score from 0 to 10.
- Mental clarity score from 0 to 10.
- Concentration score from 0 to 10.
- PVT median reaction time.
- PVT lapse count, when available.

The UI should minimize taps and make the current scheduled measurement obvious.

### 3. Record a catheterization event

At any time, the user should be able to quickly record:

- Timestamp.
- Catheterized volume.
- Leakage occurrence.
- Unusual urgency.
- Atypical bladder sensation.
- Optional note.

The timestamp should default to the current time but remain editable.

### 4. Record night events

The user should be able to record:

- Nighttime leakage.
- Unusual bladder-related awakening.
- Optional note and timestamp.

### 5. Record daily confounders

The user should be able to record, at minimum:

- Bedtime.
- Wake time.
- Sleep quality.
- Coffee/tea consumption and timing.
- Alcohol consumption.
- Unusual physical activity.
- Large or unusually timed meals.
- Infection or urinary symptoms.
- Unusual medication, especially sedating medication.

The first implementation should prefer structured fields where analysis benefits from structure, with optional free-text notes for context.

### 6. Review progress

The user should be able to see:

- Current study day and phase.
- Completed and missing scheduled measurements.
- Recent catheterization events.
- Basic trends in cognitive scores and PVT results.
- Basic bladder-control summaries.

Advanced statistical analysis is not required for the first milestone.

### 7. Export and import data

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

## Analysis targets

The application should preserve enough raw data to support at least:

- Concentration at 14:30 by protocol phase.
- Mental clarity at 14:30 by protocol phase.
- Difference between 14:30 and 20:30 measurements.
- Median PVT reaction time by time of day and phase.
- PVT lapse count by time of day and phase.
- Catheterized volumes and leakage frequency by phase and time of day.
- Comparison of A1, B, and A2 phases.

Derived values should not replace raw observations in storage.

## Out of scope for the first version

- Automatic medication recommendations.
- Dose changes.
- Clinician-facing dashboards.
- Multi-user accounts.
- Cloud synchronization.
- Medical-device certification claims.
- Automated interpretation presented as medical advice.
