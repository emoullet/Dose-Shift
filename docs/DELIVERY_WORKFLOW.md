# Supervised Delivery Workflow

## Purpose

This workflow governs agent-assisted delivery for Dose-Shift. It keeps implementation reviewable, preserves the scientific and medical-safety boundaries of the product, and leaves every merge decision with a human.

It applies to implementation lots only. Planning and read-only review may happen before approval, but no proposed product lot may be implemented until its scope is explicitly approved.

## Operating model

```text
Orchestrator
`-- Lot lead (sole implementation writer)
    |-- Domain invariants reviewer (read-only)
    |-- Persistence/data integrity/tests reviewer (read-only)
    `-- UI/i18n/accessibility reviewer (read-only)
```

The maximum practical hierarchy depth is two delegation levels: orchestrator to lot lead, then lot lead to reviewers. Reviewers do not delegate.

Project configuration caps spawned threads at three per session. That setting is not a tree-wide concurrency lock. To keep no more than three spawned agents active in the practical workflow, the orchestrator starts one lot lead, the lot lead runs at most two reviewers concurrently, and the remaining reviewer starts only after a reviewer slot is free.

## Roles and ownership

### Orchestrator

- Confirms the requested lot and its human-approved roadmap scope.
- Creates or selects an isolated worktree and focused branch from the latest approved base.
- Starts one lot lead and prevents overlapping write ownership.
- Reconciles reviewer findings, but does not treat summaries as verification evidence.
- Inspects the complete final diff, raw verification results, documentation consistency, and functional acceptance evidence before presenting the lot for acceptance.

### Lot lead

- Is the only implementation writer for the lot.
- Exclusively owns the lot's worktree, branch, commits, and draft pull request.
- May ask the configured specialist reviewers to inspect work, subject to the rolling concurrency rule.
- Receives findings and applies any corrections itself.
- Keeps verification and acceptance evidence current in the draft pull request.

No parallel writer agent may edit the lot's branch or worktree. A new writer may take over only after the previous writer has stopped and ownership has been handed off explicitly; writers must never overlap.

### Specialist reviewers

- Work read-only and report to the lot lead.
- Inspect actual files, diffs, and available evidence rather than reviewing summaries alone.
- Do not edit or format files, mutate Git state, publish, create external side effects, or spawn agents.
- Report prioritized findings with exact file references and identify missing approval or verification evidence.

The standard specialties are:

1. Domain invariants, protocol boundaries, and medical-product safety.
2. Persistence, migrations, data integrity, serialization, and tests.
3. UI, internationalization, accessibility, and understandable functional acceptance.

Use every specialty affected by a lot. For a governance-only or narrowly scoped lot, a reviewer may record that a specialty is not affected after inspecting the diff.

## Human approval gates

### Roadmap and scope approval

Every implementation lot begins as `Proposed` in `docs/ROADMAP.md`. A human must explicitly approve its scope before implementation begins. Approval applies only to the named lot and is not inherited by later lots.

### Scientific and medical-product decisions

A separate explicit human approval is required before implementing any decision involving:

- scientific method or protocol behavior;
- medication, dose, formulation, timing, schedule, or phase;
- cognitive instrument configuration, scoring, thresholds, or outcome definitions;
- inclusion, exclusion, transition-day, or missing-data treatment;
- clinical or causal interpretation;
- safety warnings, precautions, stop conditions, or clinical-safety behavior.

General roadmap approval, an existing requirement, or an earlier merge authorization does not substitute for this decision-specific approval. Agents must not infer, provide, or claim the clinician or pharmacist validation required by `docs/PROTOCOL.md`.

If approval is missing, implementation stops at analysis or a proposal. No agent may silently resolve the decision.

### Functional acceptance

Before merge authorization is requested, provide evidence understandable without reading the implementation:

- scenarios exercised and expected outcomes;
- visible results or screenshots for user-facing changes when applicable;
- data, schema, migration, import, and export impact;
- known limitations or checks that could not be run;
- a plain-language safety and protocol impact statement.

### Merge authorization

Draft pull requests are the default and remain unmerged. After final diff review, verification, specialist review, and functional acceptance evidence are available, merging still requires a new explicit user instruction. Agents must not enable automatic merge or interpret an earlier implementation request as merge authorization.

## Lot lifecycle

1. Record the lot in `docs/ROADMAP.md` as `Proposed`.
2. Obtain explicit human approval for the lot scope and any decision-specific safety or scientific questions.
3. Start from the latest approved base in an isolated worktree and create one focused branch.
4. Assign one lot lead as the sole writer for that worktree, branch, and draft pull request.
5. Implement only the approved scope. Keep unrelated changes out of the lot.
6. Run specialist reviews read-only, using the rolling concurrency rule.
7. Have the lot lead inspect findings, apply corrections, and rerun affected checks.
8. Run all verification gates and capture raw results.
9. Have the orchestrator inspect the complete diff, results, documentation consistency, and functional acceptance evidence.
10. Commit and push the focused changes and open or update one draft pull request.
11. Leave merge authorization pending until the user gives a new explicit merge instruction.

## Required verification gates

Run focused tests during implementation when they help localize failures. Before the lot is ready for acceptance, run all of the following from a clean working tree state except for the intended lot changes:

```sh
pnpm test
pnpm type-check
pnpm lint
pnpm build
git diff --check
```

Also inspect the complete diff against the lot's base branch and check documentation consistency. Verify that behavior, tests, data changes, and documentation tell the same story. A failed, skipped, or unavailable gate remains visible and blocks readiness; it must not be reported as passing.

For configuration-only lots, validate configuration syntax and discovery where the active client supports it. For data-model or migration lots, include regression coverage for upgrade and failure paths. For UI lots, exercise representative mobile and desktop behavior plus English and French presentation and relevant accessibility paths.

## Git and data safety

- Use one isolated worktree, focused branch, and draft pull request per lot.
- Do not force-push, rewrite history, perform destructive resets, discard uncommitted work, or delete branches as part of automated delivery.
- Do not delete, replace, or destructively migrate recorded user data.
- Preserve raw observations, audit history, explicit missingness, and reversible analysis exclusions.
- Stop and request human direction if delivery would require a destructive data or Git operation.

## Enforcement limits

The repository configuration and instructions create durable expectations, but some controls depend on the client and hosting platform:

- `max_concurrent_threads_per_session` is a per-session limit, not a proven tree-wide cap. The rolling-review rule supplies the practical global limit.
- Hierarchy depth and one-writer ownership are instruction-enforced policies, not atomic locks.
- Reviewer `sandbox_mode = "read-only"` depends on a Codex client that loads project agent profiles and honors sandbox overrides. It may not prevent every connector or external side effect, which reviewer instructions prohibit separately.
- Draft status and this workflow do not replace GitHub branch protection, required reviewers, or repository permissions. Hosting settings must enforce those controls when available.
- A client that does not support project custom agents must reproduce these role restrictions in its task prompts and report that the profile sandbox could not be enforced.
