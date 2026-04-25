---
id: 30
slug: native-large-pool-benchmark
title: Engine A + Reference C Benchmark auf 500/1000/2000-Pools
track: 5
estimate_pt: 1.5
deps: [archived/15, 26]
status: todo
blocks: [37]
source: review-2026-04-25 (Claude #30 — Codex/Gemini implizit über statistical/timeout-handling)
---

# Native-HiGHS Large-Pool-Benchmark

## Kontext

`docs/iteration-1-autorun-2026-04-24.md:63` belegt: `example_large_200` (2000 Respondenten, 200-Panel) Reference C läuft >20 min und wurde abgebrochen. Engine A ist auf n=2000 nicht systematisch gemessen. P0-3 aus `sortition-tool/06-review-consolidation.md` verlangt eine Go/No-Go-Matrix mit harter Datengrundlage — die existiert nur für n≤500.

Bürgerräte historisch: 100–3000 Personen (Klimaschutz-Bürgerrat: 160; Bundes-Bürgerrat Ernährung: 160; größere kommunal: 500–1500; SF-Studie sf_e: 1727). Ohne 1000+-Daten wissen wir nicht, ob Engine A im Pilot benutzbar ist oder ob Reference C als Server-Side-Fallback nötig wird.

## Ziel

Systematischer Benchmark beider Engines auf realistisch großen Pools, mit Timeout-Toleranz, klassifizierten "grün/gelb/rot"-Ampeln pro Pool-Größe.

## Akzeptanzkriterien

- [ ] Test-Pools: `{kleinstadt-1000, kleinstadt-2000, innenstadt-2000, example_large_200}` (alle vorhanden in `tests/fixtures/`)
- [ ] Engine A: Wall-Cap 30 s pro Lauf, 5 Seeds pro Pool. Bei Timeout: weiterlauf mit `status: timeout` in Output
- [ ] Reference C: Wall-Cap 30 min pro Lauf, 5 Seeds pro Pool. Bei Timeout: `status: timeout`, kein Abbruch des Sweeps
- [ ] Ergebnis-Doc `docs/large-pool-benchmark.md` mit Tabelle pro Pool: `wall_time p50/p95`, `ok/timeout`, `min_pi mean ± CI`
- [ ] Klassifizierung pro Engine + Pool-Größe:
  - **Grün**: alle 5 Seeds < 50 % des Wall-Caps, min_pi > 0.5×k/n
  - **Gelb**: median < Wall-Cap, p95 nahe Cap, oder min_pi 0.3–0.5×k/n
  - **Rot**: ein oder mehrere Timeout, oder min_pi < 0.3×k/n
- [ ] Empfehlung im Doc: Welche Pool-Größen sind für welche Engine produktionsreif. Update für Phase-1-Go/No-Go-Schwellen aus `06-review-consolidation.md` P0-3
- [ ] Vergleich gegen `sf_e` Paper-Wert (4011,6 s nativ Gurobi, n=1727 panel=110): unsere Reference C auf vergleichbarer Größe
- [ ] Make-Target `make benchmark-large` mit Hinweis "läuft bis zu 6 Stunden"
- [ ] CSV-Snapshot der Aggregate eingecheckt unter `docs/benchmarks/<timestamp>-large.csv`

## Out of Scope

- Multi-Threading-Optimierung der Engine (eigenes Issue)
- Engine B (kommt mit #12-#14)
- Real-Daten sf_a..sf_d (nicht öffentlich)
- Memory-Profiling (Iteration 3)

## Verweise

- Aktueller Stand: `docs/iteration-1-autorun-2026-04-24.md:63` (Reference C >20 min)
- P0-3: `sortition-tool/06-review-consolidation.md`
- Paper-Referenz: `tests/fixtures/paper-pools/reference-distributions/sf_e_110_prob_allocs.csv`
