---
id: 19
slug: three-way-comparison-harness
title: Drei-Wege-Vergleichs-Harness (A vs B vs C)
track: 5
estimate_pt: 2
deps: [14, 18]
status: todo
blocks: [20]
---

# Drei-Wege-Vergleichs-Harness

## Kontext

Jetzt kommt zusammen, was in Tracks 2/4/5 getrennt entstanden ist: ein reproduzierbarer Benchmark-Lauf über alle drei Setups (Engine A, Engine B, Referenz C), über die Paper-Pools und synthetische Pools, mit multiplen Seeds, und die Qualitäts-Metriken (#18) bewertet.

## Ziel

Orchestrierungs-Skript + Playwright-Runner, die einen vollständigen Qualitätsvergleich als Artefakt-Bundle produzieren. Reproduzierbar per Make-Target.

## Akzeptanzkriterien

- [ ] `make compare` führt folgendes aus:
  - Für jeden Pool in `{sf_a, sf_b, sf_c, synth-100, synth-500, synth-1000}`:
    - Für jedes Setup in `{engine-a, engine-b, reference-c}`:
      - Für jeden Seed in `[1, 2, 3, 4, 5]`:
        - Führe Lauf aus, speichere RunResult als `.benchmarks/<timestamp>/<pool>/<setup>/<seed>.json`
- [ ] Engine-A- und Engine-B-Läufe erfolgen über Playwright (headless Chromium)
- [ ] Reference-C-Läufe erfolgen via `scripts/reference_run.py` nativ im Container
- [ ] Quality-Metriken (#18) werden aggregiert: `.benchmarks/<timestamp>/summary.json`
- [ ] Markdown-Tabellen generiert: `.benchmarks/<timestamp>/comparison.md` mit Pool × Setup × Metrik-Zellen
- [ ] Laufzeit-Metriken ebenfalls erfasst (p50/p95 pro Pool+Setup)
- [ ] Gracefully: wenn Engine B in einem Browser fehlschlägt, Run wird markiert, nicht abgebrochen
- [ ] Gesamtlaufzeit von `make compare` unter 30 min (kleine Pools + 5 Seeds)

## Out of Scope

- Kein Leximin (kommt als separater Vergleich in #20 über #16/#17)
- Kein CI-Auto-Run (Iteration 2)
- Keine Auto-Regression-Checks gegen frühere Timestamps

## Verweise

- `sortition-tool/06-review-consolidation.md` P0-3 (Benchmark-Matrix)
