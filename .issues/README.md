# Issue-Index

## Iteration 1 (abgeschlossen 2026-04-24)

20 von 25 Issues abgearbeitet, alle Branches in `main` gemerged, Artefakte in `.issues/archived/`. Status-Bilanz in `docs/iteration-1-autorun-2026-04-24.md`, Findings in `docs/iteration-1-findings.md`.

5 Issues deferred mit STATUS-Notiz:
- `09-engine-a-property-tests/STATUS.md` — Pickup als #29
- `12-engine-b-pyodide-bootstrap/STATUS.md` — superseded by #42 (Phase 42a)
- `13-engine-b-sortition-algorithms-integration/STATUS.md` — superseded by #42 (Phase 42b)
- `14-engine-swap-config/STATUS.md` — superseded by #42 (Phase 42c)
- `16-gurobi-free-leximin-reference/STATUS.md` — Iteration 3+ Forschung

## Iteration 2 (technisch, 2026-04-25)

**Fokus: Engine A nahe an Reference C bringen + Engine B als kanonische Alternative — rein technische Implementierung, keine Compliance/Akquise/Recht.**

### Track A — Algorithmus-Lücke schließen (~10 PT, höchste Priorität)

| ID | Slug | Track | Est | Deps |
| ---: | --- | ---: | ---: | --- |
| 40 | engine-a-real-column-generation | 2 | 3 PT | archived/08, 26 |
| 41 | engine-a-pipage-rounding | 2 | 1.5 PT | 40 |
| 42 | engine-b-pyodide-track-active | 4 | 5.5 PT | archived/01, archived/07 |

**Ergebnis:** Engine A min π innerhalb 1–2 % von Reference C (#40). Engine B identisch zu Reference C (#42).

### Track B — Vergleichs-Robustheit (~6 PT)

| ID | Slug | Track | Est | Deps |
| ---: | --- | ---: | ---: | --- |
| 27 | cross-runtime-person-level-drift | 5 | 2 PT | archived/15, archived/19, 26 |
| 28 | statistical-seed-sweep | 5 | 1.5 PT | archived/19, 27 |
| 29 | engine-a-property-tests-activate | 2 | 1 PT | archived/08, archived/22, archived/23 |
| 30 | native-large-pool-benchmark | 5 | 1.5 PT | archived/15, 26 |

**Ergebnis:** Wissenschaftlich belastbarer Vergleich A vs B vs C, ≥ 30 Seeds, n bis 2000, Person-Level-Drift quantifiziert.

### Track C — Engineering-Hygiene (~5 PT)

| ID | Slug | Track | Est | Deps |
| ---: | --- | ---: | ---: | --- |
| 26 | engine-a-worker-isolation | 3 | 1.5 PT | archived/08, archived/10 |
| 36 | hash-parity-golden-test | 5 | 0.5 PT | archived/11 |
| 39 | panel-ops-ui-completion | 6 | 2 PT | archived/11, archived/21–23 |
| 43 | lp-solver-tuning | 2 | 1.5 PT | 40 |
| 44 | ci-benchmark-gate | 5 | 1 PT | 27, 28, 40 |

**Ergebnis:** UI bleibt responsiv (Worker), CI fängt Algorithmus-Regression, Audit-Hash bewiesen TS/Python-konsistent.

### Iteration-2-Total

**~21 PT** rein technische Arbeit. Bei Solo-Vollzeit 4–5 Wochen.

### Bearbeitungsreihenfolge (kürzeste Strecke zur Algorithmus-Parität)

1. **#26** Worker-Isolation (Engineering-Hygiene-Voraussetzung für #42 und für Performance-Tests)
2. **#40** Engine A echte Column Generation (schließt 16-%-Lücke direkt)
3. **#27** Cross-Runtime-Drift (zeigt empirisch, dass #40 die Lücke geschlossen hat)
4. **#28** Statistische Seed-Stichprobe + **#30** Large-Pool-Benchmark + **#29** Property-Tests parallel (Konsolidierung)
5. **#42** Engine B Pyodide-Track (alternative Strategie, falls #40 doch nicht reicht oder als Backup-Engine)
6. **#41** Pipage-Rounding (Determinismus, Iteration-1-Schuld)
7. **#43** LP-Solver-Tuning + **#44** CI-Benchmark-Gate (Hygiene)
8. **#36** Hash-Parity-Test + **#39** Panel-Ops UI (kleinere Aufgaben am Ende)

### Was nicht in Iteration 2 ist

Bewusst ausgelassen — gehört in andere Workstreams oder Iteration 3+:

- DSFA, BITV, Erklärung zur Barrierefreiheit, Methodenblatt, Lizenz-Gutachten, Patent-FTO, Pilot-Akquise, AVV-/LOI-Templates, i18n DE/EN, reale Kommunal-CSV-Adapter (EWO/MESO/VOIS), kommunal-vergebene Audit-Schlüssel.
- Alles über Maximin hinaus (Leximin-Port, Nash, Diversimax).
- Performance-Optimierungen jenseits der HiGHS-Defaults (#43 ist das Maximum).
- iOS-Safari-Support (Pyodide-Issue #5428 unverändert).

## Datei-Konvention

Jedes Issue lebt in `.issues/NN-slug/ISSUE.md`. RESEARCH.md, PLAN.md, NOTES.md, STATUS.md werden bei Bedarf vom Executor daneben abgelegt.

External LLM Reviews (drei Tools parallel) werden bei Plan-Revisionen wiederholt unter `reviews/<topic>/`.
