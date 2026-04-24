# STATUS: Issue 16 — deferred to iteration 2

**Date:** 2026-04-24

## Outcome

A gurobi-free Leximin reference (port of `sortition_algorithms/committee_generation/leximin.py` from Gurobi to HiGHS) is **not implemented**.

## Reasoning

Issue #01's verification of upstream (`docs/upstream-verification.md`) showed:
- `committee_generation/leximin.py:60-77` uses `model.setParam("Method", 2)` (barrier-only) and `model.setParam("Crossover", 0)` — these are Gurobi-specific tuning parameters chosen for numerical stability of the leximin dual LP.
- Equivalent semantics in HiGHS exist (`solver=ipm`, `run_crossover=off`) but they would need empirical verification on the same instances.
- The leximin algorithm iterates: (1) solve dual LP for outer fixed-probabilities, (2) solve incremental MIP, (3) update fixed-probabilities, repeat.
- Each step uses Gurobi's Python API directly — not the upstream's `Solver` ABC. Porting requires rewriting ~330 lines of `leximin.py` against `highspy`.

For iteration 1, we substituted:
- **#17** — cached paper Leximin quantile curves (`tests/fixtures/paper-leximin-results/`) for high-level comparison
- **Reference C with Maximin only** as the ground-truth engine

That's enough to answer "is Engine A in the right ballpark for fairness?" but not "how much fairness do we lose vs. Leximin?".

## Pickup for iteration 2

1. Port `_dual_leximin_stage()` and `find_distribution_leximin()` to use `highspy.Highs()` directly with `setOptionValue('solver', 'ipm')` and `setOptionValue('run_crossover', 'off')`.
2. Run on `example_small_20` and compare against the published `LexiMin` curve in `tests/fixtures/paper-leximin-results/sf_a_35.json` (similar size). Document timing + numerical agreement.
3. Add to comparison harness (#19) as a fourth setup `reference-d-leximin-highs`.

Estimated effort: 3–5 PT (depends on how cleanly HiGHS reproduces Gurobi's barrier-only semantics).
