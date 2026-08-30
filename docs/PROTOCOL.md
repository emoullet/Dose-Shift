# Medication Timing Protocol

Controlled protocol version: `1.1`.

## Objective

Evaluate whether the daily temporal profile of cognitive performance changes when fesoterodine intake is moved from morning to evening, while checking that the timing change does not worsen bladder control.

This single-subject study looks for within-person variation compatible with a direct or indirect temporal treatment effect. It does not assume that fesoterodine causes the reported cognitive dip.

## Reference treatment

- Fesoterodine 8 mg extended release.
- Solifenacin 10 mg.
- Usual schedule: both medications with breakfast, around 08:30–09:00.

## Experimental design

Single-subject A-B-A trial with no dose changes. The selected study start date is the first day of `A1`, not the start of familiarization.

The analyzed phases use one common configurable duration from 1 to 90 calendar days. The default is seven days per phase, preserving the original three-week design. `A1`, `B`, and `A2` must have equal durations and remain contiguous and non-overlapping. A different duration must be identified clearly; this protocol and the application do not claim that all durations are scientifically equivalent.

- `A1`: usual schedule, with both medications in the morning.
- `B`: solifenacin in the morning and fesoterodine in the evening, ideally around 21:00–22:00, only after validation by the prescribing clinician or pharmacist.
- `A2`: return to the usual schedule, with both medications in the morning.

### Familiarization

Before `A1`, complete a short familiarization period with the device and cognitive tests. It should include several sessions, ideally spread over two to three days. Preserve these data, but exclude them from the A-B-A analysis.

During familiarization, adjust associative-memory-test difficulty once to avoid floor or ceiling effects, ideally targeting approximately 70–90% accuracy. Freeze the number of items, difficulty, distractor type, and stimulus-generation rules before `A1`; do not adapt them during `A1`, `B`, or `A2`.

### Transitions

The return to `A2` tests whether a change observed during `B` reverses after the initial schedule is restored. Identify the `A1` → `B` and `B` → `A2` transition days explicitly in the data and interpret them separately when appropriate.

Do not double a dose to shift the schedule. Organize transitions so that two doses are not taken too close together.

## Medication intake tracking

Record the actual intake time of fesoterodine and solifenacin every day. For each planned intake, record one of these statuses:

- `taken`
- `missed`
- `partial`
- `uncertain`

Add a note when useful. Analysis must be able to calculate the elapsed time between every cognitive session and the most recent intake of each medication. Planned timing and observed timing must remain distinct.

## Daily cognitive measurements

Perform measurements around:

- 10:30
- 14:30
- 20:30

Use comparable conditions whenever possible and record the actual start time of every session.

Each session follows the same order:

1. Associative-memory encoding.
2. Cognitive self-ratings.
3. A short PVT of approximately three minutes.
4. Delayed associative-memory recognition.

### Self-ratings

Use five 0–10 scales, all oriented in the same direction: `0` means no symptom or difficulty, and `10` means the maximum symptom or difficulty.

- **Sleepiness:** `0` = not sleepy at all; `5` = clearly noticeable sleepiness with function still adequate; `10` = extreme sleepiness with difficulty staying awake.
- **Mental fog:** `0` = perfectly clear mind; `5` = noticeably less clear, with function still adequate; `10` = very foggy or confused.
- **Concentration difficulty:** `0` = no difficulty; `5` = noticeable difficulty requiring additional effort; `10` = impossible or nearly impossible to sustain attention.
- **Mental fatigue:** `0` = no particular mental effort; `5` = noticeable mental fatigue with work still possible; `10` = mental exhaustion that makes thinking very difficult.
- **Memory difficulty:** `0` = fluent memory with no difficulty; `5` = noticeable difficulty without major interference; `10` = major difficulty keeping recent information in mind or retrieving it.

If memory has not genuinely been engaged since the previous measurement, use `difficult to assess / not meaningfully engaged` instead of forcing a score.

### PVT

Perform a short Psychomotor Vigilance Task of approximately three minutes. Use the same device, response method, position, and conditions whenever possible. Record any interface or device change that may affect reaction time; such a change may make the session atypical.

Retain primarily:

- median reaction time;
- number of very slow responses or lapses, using a defined and stable threshold;
- trial-level reaction times when the PVT is integrated into Dose-Shift, so summary metrics can be recalculated later.

### Associative memory test

Use a brief associative episodic-memory task designed for repeated measurement. In each session, present approximately ten common objects, each paired with an arbitrary value. After the interval occupied by the self-ratings and PVT, present each object with two possible values and ask the user to recognize the previously associated value.

The primary outcome is the proportion of correct responses. Also preserve trial-level responses, stimuli, presentation order, and response times. Response time is not the primary memory outcome because it includes a motor component.

Renew associations between sessions to limit learning and interference. Do not intentionally reuse the same object-value pair.

### Missed measurements

A planned measurement that is not completed must be explicitly markable as missed, with an optional reason such as:

- `forgotten`
- `not_available`
- `too_tired`
- `technical_issue`
- `other`

Do not create synthetic scores to fill a missed session.

## Bladder tracking

At every catheterization, record:

- actual time;
- catheterized volume;
- whether at least one leakage episode occurred since the previous catheterization;
- unusually urgent need or atypical bladder sensation.

For the night, also record any leakage or unusual bladder-related awakening.

## Potential confounders

Record briefly each day:

- bedtime and wake time;
- sleep quality;
- coffee or tea, approximate amount when useful, and timing;
- alcohol consumption and timing;
- unusual pain or a meaningful change in pain;
- unusual physical activity;
- particularly large or unusually timed meals;
- infection or urinary symptoms;
- unusual medication, particularly sedating or anticholinergic medication;
- any meaningful change in concomitant treatment.

## Atypical days and analysis exclusions

A day may be marked as atypical without stopping the study. It may also be marked for exclusion from the primary analysis, with an explicit reason.

Preserve all raw data from that day. Exclusion is an analysis annotation: it must never delete data or be applied silently. Excluded days must remain visible and available for sensitivity analyses.

## Interpretation

The primary question is whether the daily cognitive profile differs consistently between `A1`, `B`, and `A2` when fesoterodine timing changes.

Prioritize:

- objective PVT performance, particularly median reaction time and lapses;
- delayed associative-memory accuracy;
- the five self-ratings, particularly values around 14:30 and differences between daily time slots;
- reproducibility of any change across `A1`, `B`, and `A2`;
- actual elapsed time between medication intake and cognitive measurement;
- possible effects of sleep, caffeine, alcohol, pain, infection, concomitant treatment, atypical days, transition days, and practice;
- absence of deterioration in bladder control.

Interpret coherent trends across multiple sessions rather than isolated scores. Primary-analysis exclusions must be reversible for sensitivity analyses.

## Precautions and limits

This protocol does not change medication doses. The fesoterodine timing change must be validated by the prescribing clinician or pharmacist.

If leakage increases, unusual urinary symptoms appear, signs of autonomic dysreflexia occur, or any significant adverse effect develops, stop the experiment and contact the relevant medical team.

This protocol evaluates short-term temporal cognitive variation. It cannot establish that a particular schedule reduces cumulative brain exposure, chronic cognitive-decline risk, or dementia risk.

This protocol does not replace neuro-urological assessment. In the absence of recent urodynamic testing, urodynamic evaluation remains important for assessing filling pressures, bladder compliance, and the actual effectiveness of treatment for neurogenic bladder.
