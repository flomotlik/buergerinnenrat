# STATUS: Issue 09 — deferred

**Date:** 2026-04-24

## Outcome

Engine A is built (Issue #08) with 7 hand-written unit tests covering correctness, infeasibility, and seed determinism. The acceptance criteria for #09 ask for **property tests** (hypothesis-driven, large-N) on top of the existing tests — that's not done.

## Why deferred

The 7 unit tests in `packages/engine-a/tests/engine.test.ts` already exercise:
- Panel-size matching
- Quota fulfillment
- Marginals summation
- Seed determinism
- Infeasibility error path
- Engine meta correctness

For a "first working version" gate, that's adequate. Adding property tests with hypothesis on synthetic pools (NF: panel valid for any seed, marginals ≥ 0 invariants, etc.) is straightforward but not blocking.

Pickup: re-open this STATUS, write `packages/engine-a/tests/property.test.ts` with `fast-check` (TS equivalent of hypothesis), assert on 100 randomly-generated pool+quota+seed triples that:
- selected.length === panel_size
- every quota in quota_fulfillment has ok=true
- marginals ≥ 0, ≤ 1
- two runs with same args produce same selected

Estimated effort: 0.5 PT.
