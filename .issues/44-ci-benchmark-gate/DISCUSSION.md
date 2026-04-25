# Diskussion — Baseline-Pool-Größe nach Zwei-Stufen-Analyse (2026-04-25)

## Anlass

`sortition-tool/07-two-stage-workflow-analysis.md` zeigt: Stage-3-Maximin läuft auf 60–300 Personen, nicht auf 500–2000.

## Auswirkung auf dieses Issue

CI-Benchmark-Gate sollte den **realen Workload** abbilden, nicht akademische Worst-Case-Größen.

## Empfohlene Baseline-Konfiguration

| Pool / Panel | Setup | Frequenz | Zweck |
|---|---|---|---|
| 60 / 20 | `kleinstadt-60` (synth) | jeder Push | Schnelle Regression-Detection |
| 100 / 20 | `kleinstadt-100` | jeder Push | Hauptregressions-Schwelle |
| 200 / 30 | synth | täglich (cron) | Mittelgroßer Bezirk, akzeptierbarer Wallzeit-Bereich |
| 500 / 50 | synth | wöchentlich | Stretch — nur informativ, nicht Gate |

**Gate-Schwelle:** Wallzeit-Median > 1.3× Baseline ODER min π drop > 5 % vs. Baseline → Fail.

## Was vermieden werden muss

- **Nicht** auf n=2000 als Default-CI-Lauf testen — würde den CI-Build auf 17+ Minuten ziehen, wäre für Pre-Commit-Hook unbenutzbar.
- **Nicht** alle Engines (A/B/C) in jedem CI-Lauf testen — Engine B braucht 30–40 MB Pyodide-Download, das ist CI-Kosten-Killer. Engine A pro Push, Engine B + C nur in nightly.

## Querverweis

Diese Konfiguration kommt aus #30 (`30-native-large-pool-benchmark/DISCUSSION.md`), das die gleiche Pool-Größen-Korrektur durchträgt. Die beiden Issues sollten kohärent ausgeführt werden.
