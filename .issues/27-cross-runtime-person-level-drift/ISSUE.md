---
id: 27
slug: cross-runtime-person-level-drift
title: Cross-Runtime Person-Level Marginal-Drift (A vs C, später + B)
track: 5
estimate_pt: 2
deps: [archived/15, archived/19, 26]
status: todo
blocks: [33, 37]
source: review-2026-04-25 (Claude #27, Codex #27, Gemini #26-02 — alle drei einig)
---

# Cross-Runtime Person-Level-Drift

## Kontext

`scripts/compare_runs.py:121-154` (`_aggregate`) summiert nur skalare Metriken (`min_pi`, `gini`, `wall_time_med_ms`). Die wissenschaftlich fundamentale Frage — "liefern Engine A und Reference C *bei identischem Pool und Seed* dieselben Marginale pro Person?" — bleibt unbeantwortet. Wir sehen aktuell nur "min π weicht um 16-17 % ab" und wissen nicht, ob das ein systematischer Bias gegen bestimmte Sub-Gruppen ist (Migrations-Hintergrund × Alter etwa).

Vor einem Audit, in dem die Kommune das Verfahren verteidigen muss, ist diese Frage Pflicht. Heute ohne Engine B möglich (A vs C reicht); mit Engine B (Iteration 2 Phase B) wird's erweitert.

## Ziel

`scripts/cross_runtime_drift.py`, das aus zwei (oder drei) RunResult-JSONs mit gleichem Pool/Seed pro-Person-Marginal-Differenzen berechnet, aggregiert nach Quoten-Kategorie, und einen Markdown-Bericht produziert.

## Akzeptanzkriterien

- [ ] `scripts/cross_runtime_drift.py --baseline reference-c.json --candidate engine-a.json --pool pool.csv --quotas quotas.json --out drift.md`
- [ ] Pro `person_id`: `Δπ = π_candidate − π_baseline`; Histogramm + p50/p95/max-|Δπ|
- [ ] Aggregat pro Quoten-Kategorie: avg-|Δπ|, max-|Δπ| pro `(column, value)`-Tupel — identifiziert systematische Untergewichtung von Sub-Gruppen
- [ ] L1-Distanz, L∞-Distanz, Spearman-Rangkorrelation der Marginalen-Vektoren
- [ ] Übereinstimmung der konkret gezogenen Panels (Jaccard-Index) bei gleichem Seed
- [ ] Reproducibility: nutzt `reproducibility_hash` aus `packages/metrics/` + Python-Twin (`scripts/quality_metrics.py`) zur Sicherung der Eingabe-Kanonizität
- [ ] Make-Target `make compare-drift`: läuft auf `{kleinstadt-100, aussenbezirk-100, example_small_20}` mit 5 Seeds, produziert ein Drift-Markdown pro Pool-Seed-Kombination
- [ ] Threshold-Empfehlung: ab welcher max-|Δπ| ist die Engine "nicht referenz-nah genug für Pilot"? Vorschlag im Doc, nicht hart-codiert
- [ ] Integration in `scripts/compare_runs.py`: optional `--include-drift` schreibt Drift-Tabelle in `comparison.md`

## Out of Scope

- Engine B (kommt mit #12-#14 wieder rein und wird automatisch in den Vergleich aufgenommen)
- Visualisierungen jenseits Histogramm + Tabelle (Iteration 3)
- Statistische Bias-Tests jenseits der deskriptiven Aggregate (z.B. Bayesian fairness audits)

## Verweise

- Aktuelle Aggregat-nur-Implementation: `scripts/compare_runs.py:121-154`
- Issue #19: `.issues/archived/19-three-way-comparison-harness/ISSUE.md:24-35`
- Iteration-1-Bericht: `docs/quality-comparison-iteration-1.md:7-10`
