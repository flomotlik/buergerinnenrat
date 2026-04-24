---
id: 18
slug: quality-metrics-computation
title: Qualitäts-Metriken (Python + TS)
track: 5
estimate_pt: 2
deps: [11, 15]
status: todo
blocks: [19]
---

# Qualitäts-Metriken

## Kontext

"Qualität" in der Sortition ist ein Vektor, kein Einzelwert. Für den Drei-Wege-Vergleich (#19) brauchen wir eine konsistente Berechnung derselben Metriken auf jedem RunResult — in TS (für die App) und in Python (für Reference Runner).

## Ziel

Zwei parallele Implementierungen (TS und Python), die aus einem `RunResult` (oder einer Liste von RunResults) einen `QualityMetrics`-Datensatz berechnen. Byte-/numerisch identische Ergebnisse (bis auf FP-Toleranz).

## Akzeptanzkriterien

- [ ] `packages/metrics/src/index.ts` und `scripts/quality_metrics.py` implementieren denselben Metrik-Satz:
  - `min_pi` — Minimum der Marginalen π_i
  - `min_pi_2`, `min_pi_3` — zweit- und drittkleinste π_i
  - `gini` — Gini-Koeffizient der π-Verteilung
  - `variance_pi`
  - `count_below_epsilon(epsilon=0.01)` — Anzahl Personen mit π_i < ε
  - `quota_slack_per_category` — Ist-Minus-Min und Max-Minus-Ist pro Kategorie
  - `reproducibility_hash` — SHA-256 der sortierten Selected-Liste + der sortierten (person_id, π)-Liste
- [ ] Multi-Run-Aggregation für N-Lauf-Statistiken:
  - `panel_frequency` — wie oft wurde jede Person in N Läufen gewählt (Proxy für empirische Marginale)
  - `panel_signature_count` — wie viele unterschiedliche Panels bei N Läufen
- [ ] Unit-Tests auf bekannt-fairer Verteilung (uniform π) und bekannt-unfairer (ein π=0, Rest hoch)
- [ ] Konsistenz-Test: TS und Python produzieren auf denselben Eingaben identische Metriken (Toleranz 1e-9)
- [ ] JSON-Schema für `QualityMetrics` unter `docs/quality-metrics-schema.json`

## Out of Scope

- Keine Visualisierung (das ist #20)
- Keine statistischen Tests (z.B. Vergleichs-p-Values) — in Iteration 1 nur deskriptive Metriken
- Keine domänenspezifischen Fairness-Metriken (Rawls-Index, etc.) — Iteration 2

## Verweise

- `sortition-tool/03-algorithm-port.md` Fairness-Eigenschaften
- Standard-Gini-Formel, Standard-Varianz
