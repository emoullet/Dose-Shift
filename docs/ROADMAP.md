# Delivery Roadmap and Backlog

## Purpose

This file is the durable source for implementation-lot status. Product specifications describe intended capabilities; they do not by themselves authorize implementation.

## Status definitions

- **Proposed:** Not approved for implementation. Agents may inspect, clarify, or prepare a proposal only.
- **Approved:** A human explicitly approved the bounded lot scope, but implementation has not started.
- **In progress:** One lot lead owns the active branch, worktree, and draft pull request.
- **In review:** Implementation and required checks are complete and the draft pull request awaits functional acceptance or merge authorization.
- **Done:** The accepted lot has been merged only after explicit user authorization.
- **Deferred:** Intentionally postponed; not approved for implementation.

Only explicit human direction may promote a product lot from `Proposed`. Scientific or medical-product decisions inside an approved lot still require their own explicit approval under `docs/DELIVERY_WORKFLOW.md`.

## Delivered foundation

| Lot | Status | Evidence or note |
| --- | --- | --- |
| Application and local-first PWA foundation | Done | Present on the default branch. |
| Validated study domain, persistence, migrations, and versioned export foundation | Done | Present on the default branch with domain, persistence, migration, and serialization tests. |
| Durable supervised multi-agent delivery workflow | Done | Merged in PR #6 on 2026-08-28. |

## Active product lot

| Lot | Status | Scope | Approval note |
| --- | --- | --- | --- |
| Draft study setup and controlled phase-plan preview | In review | Protocol 1.1 documentation; one draft `StudyData` with equal configurable 1–90-day phases; atomic single-continuing-study creation; read-only controlled schedules; bilingual mobile-first preview, prerequisite, precautions, validation, persistence errors, and resume. No activation, familiarization sessions, cognitive configuration, planned observations, or treatment recommendations. | Explicit scope and decision-specific approval received on 2026-08-28. |

## Proposed product backlog

The following lots are proposals, not commitments. Their ordering is provisional and does not imply approval.

| Proposed lot | Status | Approval-sensitive questions |
| --- | --- | --- |
| Familiarization sessions and frozen cognitive-test configuration | Proposed | Session count/timing, calibration workflow, difficulty target, instrument configuration, freeze evidence, and pre-A1 readiness. |
| Planned medication-intake recording flow | Proposed | Medication and schedule semantics, partial-dose handling, deviations, warnings, and stop conditions. |
| Scheduled cognitive-session shell and self-ratings | Proposed | Instrument order, anchors, missingness, session timing, and frozen configuration. |
| Integrated PVT methodology and implementation decision | Proposed | Whether to integrate, lapse threshold, timing rigor, device/response constraints, trial handling, and interpretation limits. |
| Associative-memory task UI and stimulus generator | Proposed | Difficulty calibration, frozen rules, stimulus generation, scoring, trial preservation, and practice effects. |
| Catheterization and night-observation entry flows | Proposed | Leakage semantics, timestamp correction, safety-warning visibility, and audit behavior. |
| Daily context, confounders, and analysis annotations | Proposed | Exclusion semantics, reversibility, structured events, transition-day treatment, and sensitivity-analysis expectations. |
| Complete JSON import/export and analysis CSV exports | Proposed | Format evolution, runtime validation, safe failure, privacy warnings, and non-destructive import behavior. |
| Progress review and descriptive analysis UI | Proposed | Derived metrics, exclusions, uncertainty, non-causal language, clinical-interpretation limits, and bilingual presentation. |
| Reminder and notification support | Proposed | Platform constraints, offline behavior, warning content, and behavior when reminders are missed or unavailable. |

Cloud synchronization, multi-user accounts, clinician dashboards, autonomous medication recommendations, dose changes, medical-device claims, and automated medical interpretation remain outside the initial product scope unless the product specification and roadmap are explicitly revised and approved.

## Backlog maintenance

- Keep each implementation lot small enough for one writer, one branch, one worktree, and one draft pull request.
- Record newly identified work as `Proposed` unless a human explicitly approves it.
- Do not use roadmap status to bypass decision-specific scientific or clinical-safety approval.
- Update the status and approval note when a human changes scope or authorizes delivery.
- Keep completed lot evidence concise and link to the pull request when available.
