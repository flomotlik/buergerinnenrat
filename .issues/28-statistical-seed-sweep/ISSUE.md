---
id: 28
slug: statistical-seed-sweep
title: Statistisch belastbare Seed-Stichprobe (≥30 Seeds, Konfidenzintervalle)
track: 5
estimate_pt: 1.5
depends_on: [27]
status: open
blocks: [33, 37]
source: review-2026-04-25 (Claude #28, Codex #26, Gemini #26-02 — alle drei einig)
priority: high
---

# Statistisch belastbare Seed-Stichprobe

## Kontext

`docs/quality-comparison-iteration-1.md:73-78` benennt explizit: "Nur 5 Seeds pro Setup-Pool-Kombination; statistische Aussagekraft begrenzt". Mit n=5 Stichproben ist der Standardfehler einer Mittelwert-Schätzung etwa σ/√5 ≈ 0.45σ. Die zentrale Iteration-1-Aussage "Engine A liefert ~16 % schlechteres min π" ist damit nicht von einem 1-Sigma-Rauschen unterscheidbar.

Vor einem Pilot, in dem diese Zahl an die Kommune kommuniziert wird (oder gegen die Sortition Foundation als Referenz verteidigt wird), müssen wir mindestens 30 Seeds pro (Pool, Setup) messen. Konfidenzintervalle und ein Hypothesentest gehören dazu.

## Ziel

Erweiterung von `scripts/compare_runs.py` und `compare_runs.py`-Output um statistisch tragfähige Aggregate. Bestehender Bericht in `docs/quality-comparison-iteration-1.md` wird durch eine n=30-Tabelle mit 95 %-CI ersetzt.

## Acceptance Criteria

- [ ] `scripts/compare_runs.py` Default-Seeds = 30; CLI-Flag `--seeds N` für Override
- [ ] `summary.json` enthält pro `(pool, setup)`: `mean`, `median`, `stddev`, `ci_95_lo`, `ci_95_hi` für `min_pi`, `gini`, `var_pi`, `wall_time_ms`
- [ ] Paired-t-Test auf `min_pi`-Differenz `(engine-a − reference-c)` mit p-Value pro Pool im Bericht
- [ ] `comparison.md` zeigt Stichprobengröße + 95 %-CI statt nur Punktschätzer
- [ ] Make-Target `make compare-statistical` läuft auf `{kleinstadt-100, aussenbezirk-100, example_small_20, kleinstadt-500}` × {engine-a, reference-c} × 30 Seeds
- [ ] Laufzeit-Budget: gesamter `make compare-statistical` < 90 min im Container (reference-c dominiert mit ~7 s pro 200-Pool-Lauf, ~1 s pro 100-Pool-Lauf)
- [ ] Timeout-Handling: Reference C auf großem Pool kann scheitern; markiere als `timeout` oder `not_completed` in summary.json statt stillschweigend wegzulassen
- [ ] Reproducibility-Block: `summary.json` enthält Container-Image-Tag, Tool-Versionen (`highs@1.8.0`, `sortition-algorithms` PyPI-Version), Commit-SHA
- [ ] Aktualisierter `docs/quality-comparison-iteration-1.md` (oder Nachfolger `iteration-2.md`) ersetzt n=5-Tabelle, dokumentiert Methodik + Limitationen
- [ ] CSV-Snapshot der Aggregate eingecheckt unter `docs/benchmarks/<timestamp>-statistical.csv` (nicht `.benchmarks/`, weil das gitignored ist)

## Out of Scope

- Bootstrap-Resampling (paired-t reicht für n≥30)
- Bayesian credible intervals (frequentist CI tut's für Iteration-2-Pilot-Entscheidung)
- Power-Analyse (das wäre Iteration 3)
- Engine B (kommt mit #12-#14, wird automatisch in den Sweep einbezogen)

## Verweise

- Aktuelle Limitations-Aussage: `docs/quality-comparison-iteration-1.md:73-78`
- Default-Seeds in Code: `scripts/compare_runs.py:32-34, 204-220`
- Issue #19: `.issues/archived/19-three-way-comparison-harness/ISSUE.md`
