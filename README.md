# Dose-Shift

Dose-Shift is a personal research application for studying whether the timing of antimuscarinic medication intake affects daytime vigilance, concentration, and bladder control.

The first target is a responsive web application / PWA that supports structured data entry, local-first storage, and simple export/import for later analysis.

## Project status

Early design and prototyping.

## Goals

- Make daily protocol adherence easy on desktop and Android.
- Record cognitive self-ratings and short vigilance-test results at predefined times.
- Record catheterization events, volumes, leaks, and bladder-related symptoms.
- Record relevant confounders such as sleep, caffeine, alcohol, unusual activity, meals, infection symptoms, and unusual medication.
- Keep all collected data exportable in simple, documented formats.
- Support later analysis of A-B-A protocol phases without changing medication doses.

## Repository structure

- `AGENTS.md` — repository-wide instructions for Codex and other coding agents.
- `docs/PROTOCOL.md` — versioned description of the current experimental protocol.
- `docs/PRODUCT_SPEC.md` — product requirements and intended user flows.
- `docs/ARCHITECTURE.md` — initial technical architecture and engineering constraints.
- `docs/DECISIONS.md` — lightweight architectural and product decision log.

## Important

Dose-Shift is a personal research and tracking tool. It is not a medical device and must not make autonomous treatment recommendations. Medication schedule changes described in the protocol require validation by the relevant clinician or pharmacist.
