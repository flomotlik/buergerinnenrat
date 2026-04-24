# STATUS: Issue 04 — partial

**Date:** 2026-04-24

## Outcome

`example_small_20`, `example_large_200`, `sf_e_110_synthetic`, plus reference-distribution curves for `sf_a..sf_e` are converted and committed under `tests/fixtures/paper-pools/`.

## Acceptance criterion not fully met

> tests/fixtures/paper-pools/{sf_a, sf_b, sf_c, sf_d, sf_e}.csv im selben Spaltenschema wie #03

The raw respondents for sf_a..sf_d are **not in the public repo** (privacy: identifiable applicant data was not released for the paper). The `sf_e_110/` directory contains only `intersections.csv` (joint-marginals), no per-respondent rows.

## Mitigation in this iteration

- Use `example_large_200` (2000 respondents, public) as the realistic pool for #15 (native reference runner) and #19 (three-way comparison).
- Use `sf_e_110_synthetic.csv` only for marginal-sanity-checks; clearly labelled in `docs/paper-pools.md` as not equivalent to real sf_e.
- For #17 (leximin-cached-from-paper) compare quantile curves against `reference-distributions/sf_*_prob_allocs.csv` rather than per-respondent allocations.

## What would unblock the original goal

- Direct request to the paper authors / Sortition Foundation for an anonymised, DSGVO-conform release of sf_a..sf_d respondents — Iteration 2.

## Downstream impact

- #15: works on `example_large_200`, no impact.
- #17: works on `reference-distributions/`, no impact.
- #19: three-way comparison runs on `example_large_200` and the synthetic pools from #03 — the missing sf_a..sf_d only narrow the breadth of comparison, not the methodology.
