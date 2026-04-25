# Diskussion — Pool-Größen-Skalierung nach Zwei-Stufen-Analyse (2026-04-25)

## Anlass

`sortition-tool/07-two-stage-workflow-analysis.md` legt offen: der **reale** Maximin-Pool (Stage 3, Antwortende) ist 60–300 Personen für kommunale Bürgerräte, bis zu 2.220 nur im Bundes-Bürgerrat-Ausreißer-Fall. Der bisher geplante 500/1000/2000-Benchmark zielt **nicht** auf realistische Größenordnungen.

## Aktueller Scope (problematisch)

`benchmark auf 500/1000/2000-Personen-Pools` — passt zur ein-stufigen App-Annahme, aber nicht zum tatsächlichen Stage-3-Workload.

## Vorgeschlagener neuer Scope

| Pool-Größe | Begründung | Pflicht/Stretch |
|---|---|---|
| 30 / 60 / 100 / 150 | Kommunal-realistische Acceptor-Pool-Untergrenze | **Pflicht** |
| 200 / 300 | Mittlere Bezirks-Bürgerräte | **Pflicht** |
| 500 | Obere Grenze realistischer kommunaler Verfahren | Pflicht |
| 1.000 | Bundesweite Verfahren mit moderater Antwortrate | Stretch |
| 2.000 | Worst-Case Bundes-Bürgerrat (Ernährung 2023: 2.220) | Stretch — abbrechen wenn >30 min |

**Hauptaussage des Reports:** Pool-Größe-vs-Wallzeit-Kurve mit Konfidenzintervallen für n=30..500, mit Anmerkung wie kommunale Workflows im realistischen Bereich liegen. 1.000 und 2.000 als Stretch-Bestätigung "größer geht prinzipiell auch, aber nicht im Browser-Echtzeit-UX".

## Konsequenz für #44 (CI-Benchmark-Gate)

Baseline-Pool für CI sollte **n=100 nicht n=500** sein. Sonst Gate-Fehler bei Code-Änderung weil 500er-Run an HiGHS-Variabilität scheitert.
