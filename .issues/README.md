# Iteration 1 — Issue-Index

Dekomposition der ersten Iteration der browser-nativen Sortition-App.

**Ziel Iteration 1:** statische Web-App, in die man CSV-Meldedaten lädt, Quoten definiert, und per Maximin-Algorithmus ein Panel zieht — mit zwei austauschbaren Engines (TS+highs-js und Pyodide+sortition-algorithms) plus nativer Python-Referenz für Qualitätsvergleich.

**Scope-Grenzen** (aus `sortition-tool/06-review-consolidation.md`):
- Nur **Maximin** (Leximin braucht Gurobi, nicht browsertauglich)
- Chromium + Firefox, **kein WebKit/iOS**
- Iteration 1 lizenziert als **GPL-3.0** (Pyodide + GPL-Library im Bundle)
- Kein echter Melderegister-Datenbetrieb — synthetische Pools + Paper-Pools (`sf_a`..`sf_e`)

## Tracks

| Track | Zweck | Issues |
| --- | --- | --- |
| 0 Grundlage | Upstream-Check, Build-Harness, Testdaten | #01–#04 |
| 1 UI-Kern | CSV-Import, Quoten-Editor | #05–#06 |
| 2 Engine A | TS-Port + highs-js (Maximin) | #07–#09 |
| 3 UI Wire-up | Orchestrierung, Ergebnis-View, Export | #10–#11 |
| 4 Engine B | Pyodide + sortition-algorithms | #12–#14 |
| 5 Referenz & Quality | Native Python, Leximin-Referenz, Metriken | #15–#20 |
| 6 Erweiterungen | Nachrücker, Reroll, Panel-Erweiterung | #21–#23 |
| 7 Abschluss | Static Deploy, Findings-Writeup | #24–#25 |

## Issue-Liste

| ID | Slug | Track | Est | Deps |
| ---: | --- | ---: | ---: | --- |
| 01 | upstream-verify-sortition-algorithms | 0 | 1 PT | — |
| 02 | build-harness | 0 | 1 PT | — |
| 03 | synthetic-pool-generator | 0 | 1 PT | — |
| 04 | pgoelz-reference-pool-loader | 0 | 1 PT | — |
| 05 | csv-import-and-mapping | 1 | 2 PT | 02 |
| 06 | quota-editor | 1 | 2 PT | 02 |
| 07 | engine-interface-and-contracts | 2 | 1 PT | 02 |
| 08 | engine-a-highs-maximin | 2 | 3 PT | 07 |
| 09 | engine-a-property-tests | 2 | 1 PT | 08, 03 |
| 10 | run-orchestration-and-results-view | 3 | 2 PT | 05, 06, 08 |
| 11 | csv-json-export-with-audit | 3 | 2 PT | 10 |
| 12 | engine-b-pyodide-bootstrap | 4 | 2 PT | 07, 01 |
| 13 | engine-b-sortition-algorithms-integration | 4 | 3 PT | 12 |
| 14 | engine-swap-config | 4 | 0.5 PT | 13, 08 |
| 15 | native-python-reference-runner | 5 | 1 PT | 01, 03, 04 |
| 16 | gurobi-free-leximin-reference | 5 | 1 PT | 15 |
| 17 | leximin-cached-from-paper | 5 | 0.5 PT | 04 |
| 18 | quality-metrics-computation | 5 | 2 PT | 11, 15 |
| 19 | three-way-comparison-harness | 5 | 2 PT | 14, 18 |
| 20 | quality-report-writeup | 5 | 1 PT | 19, 16, 17 |
| 21 | reroll-with-new-seed | 6 | 1 PT | 11 |
| 22 | replace-single-person-nachruecker | 6 | 2 PT | 11 |
| 23 | extend-panel-by-n-seats | 6 | 2 PT | 11 |
| 24 | static-deploy-and-a11y-audit | 7 | 1 PT | 11, 21, 22, 23 |
| 25 | iteration-1-findings-writeup | 7 | 1 PT | 20, 24 |

**Gesamt: ≈ 37,5 PT (7–8 Wochen Vollzeit).**

## Bearbeitungsreihenfolge

Kritischer Pfad: 01 → 07 → 08 → 10 → 11 → 18 → 19 → 20 → 25.

Parallelisierbar nach #02:
- UI-Kern (#05, #06)
- Testdaten (#03, #04)
- Engine-Contract (#07)

Track 4 (Engine B) ist **soft-blocked** auf #01 — wenn der Upstream-Check ergibt, dass `sortition-algorithms` auch Maximin nicht sauber ohne Gurobi liefert, entfällt Track 4.

## Datei-Konvention

Jedes Issue lebt in `.issues/NN-slug/ISSUE.md`. RESEARCH.md, PLAN.md, NOTES.md werden bei Bedarf vom Executor daneben abgelegt (Issue-Skill-Konvention).
