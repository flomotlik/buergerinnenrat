---
id: 09
slug: engine-a-property-tests
title: Engine A — Property-Based Tests
track: 2
estimate_pt: 1
deps: [08, 03]
status: todo
blocks: []
---

# Engine A — Property-Based Tests

## Kontext

Sortition ist ein Algorithmus, bei dem Einzeltest-Cases wenig aussagen — die Fairness-Eigenschaft gilt über Verteilungen, nicht Einzelläufen. Property-Based Testing (fast-check) prüft Invarianten über generierte Eingaben und erwischt Randfälle, die man nicht händisch aufschreibt.

## Ziel

Testsuite unter `packages/engine-a/tests/properties.test.ts` die über generierte Pools (#03) folgende Invarianten prüft.

## Akzeptanzkriterien

- [ ] Property 1 — Quoten-Erfüllung: Für alle generierten (Pool, Quoten, Seed) erfüllt das gezogene Panel die min/max-Bounds jeder Kategorie
- [ ] Property 2 — Panel-Grösse: `|selected| == panel_size`
- [ ] Property 3 — Seed-Determinismus: Zweimaliger Aufruf mit identischem Input liefert identisches RunResult
- [ ] Property 4 — Marginale Summe: `sum(marginals[i]) == panel_size` (Binomial-Erwartungswert)
- [ ] Property 5 — Marginale Range: für jedes `i` gilt `0 ≤ marginals[i] ≤ 1`
- [ ] Property 6 — Maximin-Optimalität (statistisch): Auf 20 fast-check-Runs ist `min(marginals)` nicht signifikant schlechter als ein direkt gelöstes LP mit allen Variablen (kleiner 10er-Pool)
- [ ] Property 7 — Selected-Subset: `selected ⊆ pool.people[*].person_id`
- [ ] Alle Properties laufen auf Pools mit N∈{10, 30, 100}; grössere N nicht im Property-Test (zu langsam)
- [ ] `make test` führt sie aus, Laufzeit unter 30s

## Out of Scope

- Keine Benchmarks auf 500/1000/2000 — das ist #19
- Keine Cross-Engine-Checks (A vs B) — das ist #19
- Kein Leximin-Vergleich

## Verweise

- fast-check Dokumentation: `fc.assert` + `fc.property`
- `sortition-tool/03-algorithm-port.md` Fairness-Eigenschaften
