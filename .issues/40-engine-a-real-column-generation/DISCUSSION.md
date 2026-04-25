# Diskussion — Scope nach Zwei-Stufen-Workflow-Analyse (2026-04-25)

## Anlass

`sortition-tool/07-two-stage-workflow-analysis.md` zeigt: Engine A operiert in **Stage 3** (Antwortenden-Pool → Panel). Realistische Pool-Größe für eine Gemeinde mit 6.000 Wahlberechtigten und 30er-Panel ist **60–150 Acceptors**, nicht die 200+ aus den bisherigen Iteration-1-Benchmarks.

## Auswirkung auf dieses Issue

Die in der ISSUE.md formulierte 16-%-Lücke wurde auf `example_small_20` (200 Personen) und `kleinstadt-100` (100 Personen) gemessen. **Die kommunal-realistische Untergrenze (n≈60) ist nie gemessen worden** — bei dieser Größe ist die LP nahe der Feasibility-Grenze und die Heuristik-Lücke zu Reference C plausibel kleiner als 16 %.

## Anpassungen für die Akzeptanzkriterien

Zusätzlich zur bisherigen "<2 % min π Lücke auf example_small_20 und kleinstadt-100"-Forderung:

- [ ] Messung auch auf **n=60, n=100, n=150** synthetischen Pools (siehe `docs/synthetic-pools.md` für Generator)
- [ ] **Exit-Bedingung explizit:** Wenn Engine A bei n≤150 schon <2 % Lücke hat, Column-Generation-Implementierung als "nicht erforderlich für kommunale Praxis" einstufen und nur als optionaler Stretch durchziehen
- [ ] Im End-Report: Pool-Größe-vs-Lücke-Kurve, nicht nur zwei Punktmessungen

## Frage offen

Soll das Issue weiterhin Critical-Priorität haben, wenn realistisch n≤150 schon ausreichend abgedeckt sein könnte? Vorschlag: nach Messung an n=60/100/150 entscheiden, dann ggf. auf High oder Medium reduzieren.
