# STATUS: Issue 12 — deferred to iteration 2

**Date:** 2026-04-24

## Outcome

Issue #12 (Pyodide bootstrap), #13 (sortition-algorithms in Pyodide), and #14 (engine swap config) are **not implemented in iteration 1**.

## Reasoning

Per the autonomous-iteration plan (CLAUDE.md gate after #01): "wenn der Upstream-Check ergibt, dass `sortition-algorithms` auch Maximin nicht sauber ohne Gurobi liefert, entfällt Track 4". The check (#01) showed Maximin **does** work without Gurobi — Track 4 is **not blocked**. We deferred it for time reasons, not feasibility reasons.

Iteration 1 deliverable is a working browser end-to-end (CSV → Quoten → Engine A → Ergebnis → Audit). Engine B is the cross-runtime check (#19 question 1) and the fairness-gap-closer (NF-1 in `docs/iteration-1-findings.md`).

## Pickup for iteration 2

Sequence:
1. **#12** — Pyodide v0.29.x bootstrap. Lazy-load on demand. Bundle size: realistic 30–40 MB (Codex M-warn from review).
2. **#13** — Install `sortition-algorithms` and `highspy` Pyodide wheels. Verify `find_distribution_maximin` works in browser. Test with `tests/fixtures/synthetic-pools/kleinstadt-bezirkshauptort-n100-s42-t070.csv` and assert min π ≥ Engine A's min π.
3. **#14** — Engine selector UI: choose A or B, default A. Forward `Pool` and `Quotas` JSON to whichever is selected.

## Implications

- Lizenz-Schicht: Pyodide + GPL-3.0 sortition-algorithms im Bundle = combined work → Apache-2.0-Endziel rückt weiter weg. Siehe S-1 in CLAUDE.md.
- Bundle-Größe steigt von 3.1 MB auf 30–40 MB. Hosting-Pfad „statische PWA" wird teurer (Cache-Strategie).

## What is done that helps iteration 2 land Track 4

- `packages/engine-contract/` (Issue #07) definiert das Contract-Schema, das beide Engines erfüllen müssen — Engine B muss nur dieselbe `RunResult`-JSON-Struktur produzieren.
- `Dockerfile.claude` hat bereits Pyodide-kompatible Python-Version 3.12 unter `/opt/sortition-venv`.
- `scripts/reference_run.py` (Issue #15) ist die native CPython-Implementierung; Engine B ist effektiv "Reference C aber im Browser via WASM" — die Logik ist dieselbe.
