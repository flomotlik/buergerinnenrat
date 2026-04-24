---
id: 20
slug: quality-report-writeup
title: Qualitäts-Bericht Iteration 1
track: 5
estimate_pt: 1
deps: [19, 16, 17]
status: todo
blocks: [25]
---

# Qualitäts-Bericht Iteration 1

## Kontext

Die Daten aus #19 (+ Leximin-Referenz aus #16 und/oder #17) werden zu einem lesbaren Bericht, der drei Fragen beantwortet:

1. Stimmen Engine A und Engine B numerisch überein? (Cross-Runtime-Drift)
2. Stimmt Engine B mit Referenz C (nativ) überein? (Pyodide-Drift)
3. Wie weit liegt Maximin hinter Leximin? (Fairness-Kosten unserer Einschränkung)

## Ziel

`docs/quality-comparison-iteration-1.md` — ein lesbares Dokument mit Tabellen, Plots und ehrlicher Einordnung der Grenzen (Gurobi-Free nur für kleine Pools, etc.).

## Akzeptanzkriterien

- [ ] Dokument existiert und referenziert konkret die Benchmark-Timestamps aus `.benchmarks/`
- [ ] Pro-Pool-Tabellen mit Metriken aus #18, für alle verfügbaren Setups
- [ ] Plots (matplotlib) — mindestens: Verteilung von `min_pi` pro Setup, Boxplot pro Pool
- [ ] Frage 1 Antwort — mit klarer Aussage "Engines stimmen überein" / "weichen um X ab"
- [ ] Frage 2 Antwort — gleich
- [ ] Frage 3 Antwort — wenn Leximin-Daten vorhanden, Vergleich; sonst dokumentierte Lücke
- [ ] Einordnung: welche P0/P1-Items aus `sortition-tool/06-review-consolidation.md` sind durch diese Messung beantwortet, welche nicht
- [ ] Alles Zahlen mit Quelle (Benchmark-Timestamp + Fixture), keine Hand-Schätzungen

## Out of Scope

- Keine Handlungsempfehlungen für Masterplan v2 (das ist #25)
- Keine Live-Dashboards
- Keine statistischen Signifikanz-Tests (Sample-Grössen zu klein in Iteration 1)

## Verweise

- `sortition-tool/06-review-consolidation.md` Teil A3 (Go/No-Go-Ampeln)
