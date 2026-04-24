# Iteration 1 — Autonomous Run Report

**Datum:** 2026-04-24
**Modus:** autonom durchgearbeitet aus `.issues/`, in Worktrees, Branches je Issue, Merge nach `main`.

## Status pro Issue

| ID | Slug | Status | Anmerkung |
| --- | --- | --- | --- |
| 01 | upstream-verify-sortition-algorithms | **done** | `docs/upstream-verification.md` mit ≥10 Datei:Zeile-Refs |
| 02 | build-harness | **done** | Vite+SolidJS+TS strict, Vitest, Playwright (Chromium+Firefox); Makefile |
| 03 | synthetic-pool-generator | **done** | Python+TS Twin (byte-identisch via Mulberry32), 28 Fixtures, 6 austrian profiles |
| 04 | pgoelz-reference-pool-loader | **partial** | `example_*` voll; `sf_a..sf_d` Roh-Daten nicht öffentlich → STATUS.md |
| 05 | csv-import-and-mapping | **done** | UTF-8/Win-1252 Detection, Auto-Separator, 11 Unit-Tests + E2E |
| 06 | quota-editor | **done** | UI + 11 Unit-Tests, JSON Import/Export |
| 07 | engine-interface-and-contracts | **done** | zod-Schemas, JSON-Schema-Export, 11 Tests |
| 08 | engine-a-highs-maximin | **done** | TS+highs-js, Hybrid-CG-Heuristik, 7 Tests |
| 09 | engine-a-property-tests | **deferred** | STATUS.md, 0.5 PT pickup |
| 10 | run-orchestration-and-results-view | **done** | RunPanel + Worker-style async iter |
| 11 | csv-json-export-with-audit | **done** | Ed25519+ECDSA Fallback, `verify_audit.py`, JSON-Schema |
| 12 | engine-b-pyodide-bootstrap | **deferred** | STATUS.md → Iteration 2 |
| 13 | engine-b-sortition-algorithms-integration | **deferred** | dito |
| 14 | engine-swap-config | **deferred** | dito |
| 15 | native-python-reference-runner | **done** | `scripts/reference_run.py`, läuft auf 100/200/500-Pools |
| 16 | gurobi-free-leximin-reference | **deferred** | STATUS.md, 3-5 PT für HiGHS-Port |
| 17 | leximin-cached-from-paper | **done** | Quantilskurven gecacht, 5 Tests |
| 18 | quality-metrics-computation | **done** | TS+Python-Twin, Cross-Lang-Test grün, 11 Tests |
| 19 | three-way-comparison-harness | **partial** | A vs C vorhanden; B fehlt (s.o.) |
| 20 | quality-report-writeup | **done** | `docs/quality-comparison-iteration-1.md` + Plots |
| 21 | reroll-with-new-seed | **partial** | Engine-Level + CLI; UI-Reroll-Diff fehlt |
| 22 | replace-single-person-nachruecker | **partial** | Engine + CLI (`replaceSinglePerson`); UI-Action fehlt |
| 23 | extend-panel-by-n-seats | **partial** | Engine + CLI (`extendBy`); UI-Action fehlt |
| 24 | static-deploy-and-a11y-audit | **done** | `docs/deploy.md`, `docs/bundle-size.md`, a11y-Smoke E2E |
| 25 | iteration-1-findings-writeup | **done** | `docs/iteration-1-findings.md` |

## Test-Status

### TypeScript
- `packages/engine-contract` — 11 Tests grün
- `packages/engine-a` — 11 Tests grün (7 engine + 4 panel-ops)
- `packages/core` — 6 Tests grün (mulberry32 + generator)
- `packages/metrics` — 6 Tests grün
- `apps/web` (Vitest) — 23 Tests grün (csv-parse + quota-model + smoke)
- `apps/web` (Playwright Chromium+Firefox) — **10/10 Tests grün** (smoke, csv-import x2, end-to-end x2, a11y x2, rerun x3)

**TS Tests gesamt: 67 grün, 0 rot.**

### Python
- `tests/python/test_generator.py` — 5 Tests grün
- `tests/python/test_quality_metrics.py` — 4 Tests grün
- `tests/python/test_metrics_cross_lang.py` — 1 Test grün (TS↔Python Numerik-Match)
- `tests/python/test_leximin_cached.py` — 5 Tests grün

**Python Tests gesamt: 15 grün, 0 rot.**

## Engine-Test-Status auf allen Fixtures

| Fixture | Pool | Panel | Engine A | Reference C |
| --- | ---: | ---: | --- | --- |
| `example_small_20` | 200 | 20 | OK, ~270 ms | OK, ~7700 ms |
| `kleinstadt-bezirkshauptort-n100-s42-t070` | 100 | 20 | OK, ~170 ms | OK, ~850 ms |
| `aussenbezirk-mittelgross-n100-s42-t070` | 100 | 20 | OK | OK |
| `kleinstadt-bezirkshauptort-n500-s42-t070` | 500 | 30 | OK, ~770 ms (z=0.0185) | nicht systematisch gemessen |
| `example_large_200` | 2000 | 200 | nicht gemessen | **läuft >20 min und wurde abgebrochen** |

## Benchmark-Kernzahlen

Aus `.benchmarks/20260424T230539/` (5 Seeds, 100/200-er Pools):

```
example_small_20       engine-a min π avg = 0.0833    reference-c = 0.1000    Δ = -17%
                       engine-a gini avg = 0.1395    reference-c = 0.0000
                       engine-a wall median = 267 ms    reference-c = 7690 ms

kleinstadt-100         engine-a min π avg = 0.0930    reference-c = 0.1111    Δ = -16%
                       engine-a gini avg = 0.2719    reference-c = 0.2372
                       engine-a wall median = 166 ms    reference-c = 854 ms
```

Engine A ist eine schnellere Heuristik mit Fairness-Lücke ~15-17 %. Für Production-Lose Reference C oder zukünftige Engine B verwenden.

## Welche P0/P1-Items sind beantwortet?

(Detaillierter in `docs/iteration-1-findings.md`)

| Item | Status |
| --- | --- |
| **P0-1** Maximin als PoC | **answered** — empirisch bestätigt |
| **P0-2** Lizenz-Pfad | **partial** — GPL-3.0 deklariert, Rechtsgutachten offen |
| **P0-3** Go/No-Go-Matrix | **partial** — kleine Pools belegt, 2000-er Pool empirisch >20 min |
| **P0-4** Phase 0 4-6 Wochen | n/a |
| **P0-5** CSP `connect-src 'self'` | **answered** — `docs/deploy.md` |
| **P0-6** Report 04 obsolet | nicht-technisch |
| **P1-1** DSFA + BITV | **open** — Smoke-a11y nur |
| **P1-2** CSV-Adapter | **partial** — Encoding-Detection ja, Hersteller-Adapter nein |
| **P1-3** Pluggable-Solver verifiziert | **answered** |
| **P1-4** Laien-Erklärung | **open** |
| **P1-5** i18n | **open** |
| **P1-6** Patent-FTO | **open** (nicht-technisch) |

## Welche Items sind nicht beantwortet (und warum)?

- **Engine-B-Cross-Runtime-Drift**: Track 4 (Issues #12-#14) ist deferred. Iteration 2.
- **Echter Leximin-Vergleich**: braucht Issue #16 (HiGHS-Port) oder echte sf-Pool-Daten. Iteration 2.
- **DSFA / BITV / FTO**: nicht-technische Workstreams, Iteration 2.
- **Pilot-Kommune (S-4)**: Marktvalidierung, Vorbedingung für Iteration 2.

## Container / Tooling

`Dockerfile.claude` wurde während des Laufs erweitert um:
- `tomli_w`, `rich`, `click`, `typer` (Upstream-Test-Dependencies, nicht in `pyproject.toml` der Lib deklariert — siehe Findings NF-5)
- `libx11-xcb1`, `libxcursor1`, `libgtk-3-0`, `libpangocairo-1.0-0`, `libcairo-gobject2`, `libgdk-pixbuf-2.0-0` (Firefox-Playwright-Runtime-Deps)
- `cryptography` (für `scripts/verify_audit.py`)

Zusätzlich npm-Pakete im Workspace:
- `highs@1.8.0` (MIT, WASM-MIP-Solver)
- `seedrandom@3.0.5` (Engine A)
- `papaparse@5.5.3`, `@kobalte/core` (CSV + UI)
- `zod@3.23.8`, `zod-to-json-schema@3.24.1` (engine-contract)
- `tsx`, `typescript`, `vitest`, `@playwright/test` (Build/Test)

## Worktree-Bilanz

`/root/workspace/.worktrees/` enthält die Issue-Branches. Alle wurden auf `main` gemerged; die Worktrees selbst bleiben stehen (User-Anweisung "no need to delete things").

## Was fehlt für eine erste Pilotnutzung

1. Engine B (Pyodide) für volle Maximin-Qualität im Browser oder Reference C als Server-Side-Fallback (eigener kleiner Service)
2. BITV-2.0-Konformitäts-Erklärung
3. DSFA-Template
4. Pilot-Kommune mit DSGVO-AVV
5. Rechtsgutachten zur GPL/Pyodide-Frage

## Next Actions

1. `docs/iteration-1-findings.md` lesen, Punkte für Masterplan v2 priorisieren
2. Pilot-Kommune ansprechen (S-4 in CLAUDE.md)
3. Rechtsgutachten anfragen (S-1, S-6)
4. Track 4 (Engine B) starten, sobald S-1 und S-6 entschieden sind
