# Dose-Shift

Dose-Shift is a personal research application for studying whether the timing of antimuscarinic medication intake affects daytime vigilance, concentration, and bladder control.

The first target is a responsive web application / PWA that supports structured data entry, local-first storage, and simple export/import for later analysis.

## Project status

Initial application foundation. Feature-level study workflows are not implemented yet.

## Development

Requirements: Node.js 24 and pnpm 11.

```sh
pnpm install
pnpm dev
```

Quality commands:

```sh
pnpm lint
pnpm type-check
pnpm test
pnpm build
```

## Goals

- Make daily protocol adherence easy on desktop and Android.
- Record cognitive self-ratings and short vigilance-test results at predefined times.
- Record catheterization events, volumes, leaks, and bladder-related symptoms.
- Record relevant confounders such as sleep, caffeine, alcohol, unusual activity, meals, infection symptoms, and unusual medication.
- Keep all collected data exportable in simple, documented formats.
- Support later analysis of A-B-A protocol phases without changing medication doses.

## Repository structure

- `AGENTS.md` — repository-wide instructions for Codex and other coding agents.
- `src/domain/` — locale- and UI-independent domain models and validation schemas.
- `src/application/` — use cases and ports.
- `src/persistence/` — IndexedDB schema, migrations, and adapters.
- `src/serialization/` — versioned import/export validation boundaries.
- `src/analysis/` — derived-metric contracts and future analysis logic.
- `src/ui/` — React components and screens.
- `src/i18n/` — internationalization setup and translation resources.
- `tests/` — unit and integration tests.
- `docs/PROTOCOL.md` — versioned description of the current experimental protocol.
- `docs/PRODUCT_SPEC.md` — product requirements and intended user flows.
- `docs/ARCHITECTURE.md` — initial technical architecture and engineering constraints.
- `docs/DECISIONS.md` — lightweight architectural and product decision log.

## Important

Dose-Shift is a personal research and tracking tool. It is not a medical device and must not make autonomous treatment recommendations. Medication schedule changes described in the protocol require validation by the relevant clinician or pharmacist.
