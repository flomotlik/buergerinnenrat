---
id: 44
slug: ci-benchmark-gate
title: CI-Benchmark-Gate gegen Algorithmus-Regression
track: 5
estimate_pt: 1
deps: [27, 28, 40]
status: todo
blocks: []
priority: P1 — schützt das System gegen unbemerkte Qualitäts-Regression
---

# CI Benchmark Gate

## Kontext

Wenn Engine A nach #40 nahe an Reference C ist, müssen wir das Niveau **halten**. Ohne CI-Gate kann ein refactor in `engine.ts` die min π unbemerkt um 5 % verschlechtern, und niemand sieht's bis zum nächsten manuellen Vergleichslauf.

Iteration 1 hat keinen automatischen Benchmark-Lauf — `make compare` muss manuell angestoßen werden.

## Ziel

CI-Job (oder `make ci-benchmark` als Lokal-Pendant), der bei jedem Commit auf `main` einen reduzierten Benchmark fährt und bei min-π-Regression > 2 % gegen die letzte Baseline failed.

## Akzeptanzkriterien

- [ ] `scripts/ci_benchmark.py`: nimmt einen kleinen "CI-Pool"-Set (kleinstadt-100, example_small_20) × 10 Seeds × {engine-a, reference-c}
- [ ] **Baseline-File** `docs/benchmarks/baseline.json` checked in: enthält pro Pool/Setup die letzte akzeptierte mean-min-π und stddev
- [ ] CI-Job:
  - Läuft den Benchmark
  - Vergleicht aktuelle min π mean gegen Baseline
  - **Failt**, wenn aktuelle Mean < Baseline-Mean - 2 × Baseline-Stddev (klassischer 2-σ-Drift-Test)
  - **Warnt**, wenn 1–2 σ
  - **Updated Baseline**, wenn Mean signifikant besser (z.B. nach #40 erfolgreich gemerged)
- [ ] CI-Output: Diff-Tabelle in PR-Comment-Format
- [ ] Lokales Pendant: `make ci-benchmark` läuft denselben Test
- [ ] Laufzeit-Budget: < 5 min im Container (sonst CI-Pain)
- [ ] Dokumentation in `docs/benchmarks/ci-baseline-update.md`: wie Baseline updated wird (z.B. `make update-baseline` nach erfolgreicher Verifikation)

## Out of Scope

- GitHub-Actions-Setup (Repo läuft aktuell ohne CI; das ist eine Infra-Entscheidung)
- Performance-Regression-Tracking (nur Quality-Regression in V1)
- Per-Person-Drift-Regression (das wäre eine Erweiterung, separate Issue wenn nötig)

## Verweise

- Vergleichs-Harness: `scripts/compare_runs.py`
- Statistik-Tests: aus #28
