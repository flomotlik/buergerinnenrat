---
id: 08
slug: engine-a-highs-maximin
title: Engine A — TypeScript-Maximin via highs-js
track: 2
estimate_pt: 3
deps: [07]
status: todo
blocks: [09, 10, 14]
---

# Engine A — TS-Maximin via highs-js

## Kontext

Engine A ist der Clean-Room-Pfad ohne Pyodide-Abhängigkeit. Zweck: beweisen dass Browser-MIP-Sortition in ~2 MB Bundle ohne 30–40 MB Pyodide geht. Lizenz: MIT (highs-js) + eigener Code → Apache-2.0-kompatibler Teil der Codebasis.

Nature-Algorithmus-Kern für Maximin: maximiere das Minimum der Auswahlwahrscheinlichkeiten π_i über konvexe Kombinationen zulässiger Panels. Pragmatisch über **Column Generation** mit HiGHS als MIP-Oracle, dann **Pipage Rounding** für die konkrete Panel-Auswahl.

## Ziel

TypeScript-Modul `packages/engine-a/src/` das:
1. Eine `Pool + Quotas + RunParams` konsumiert
2. Column Generation mit `highs-js` als MIP-Solver durchführt (single LP-master + MIP-oracle pro Iteration)
3. Pipage-Rounding auf der resultierenden Verteilung durchführt
4. Ein `RunResult` zurückgibt (Engine-Contract aus #07)
5. Im Web Worker läuft, UI bleibt responsiv
6. Deterministisch bei festem Seed ist

## Akzeptanzkriterien

- [ ] `packages/engine-a/` mit `engine.ts`, `column-generation.ts`, `pipage-rounding.ts`, `worker.ts`
- [ ] `highs-js` via npm `highs@^1.8.0` eingebunden, WASM lazy geladen
- [ ] Löst einen 100er-Toy-Pool mit 30er-Panel + 3 Kategorien in <5 s (Chromium, Desktop)
- [ ] Seed-Bestimmung: `RunParams.seed` steuert sowohl JS-PRNG (seedrandom) als auch HiGHS-`random_seed` — gleicher Input+Seed → identischer RunResult
- [ ] Progress-Events via `postMessage` an den Main-Thread: `{type: 'progress', phase: 'column_generation'|'rounding', iter, eta_ms?}`
- [ ] Infeasibility wird als `EngineEvent.error` mit Typ `'infeasible_quotas'` signalisiert, nicht als Exception
- [ ] Timeout-Respektierung: nach `timeout_ms` wird der Worker terminiert, Fehler zurückgegeben
- [ ] Unit-Tests (Vitest): Quoten-Erfüllung, Seed-Determinismus auf 10er-Pool
- [ ] E2E-Test (Playwright): Engine läuft via Worker in Chromium+Firefox

## Out of Scope

- Kein Leximin (siehe Plan: Gurobi-gated, nicht in Iteration 1)
- Keine Nash-Welfare
- Keine UI — nur Modul mit klarer API
- Keine Multi-Seed-Batch-Runs (das ist #09 / #19)

## Verweise

- `sortition-tool/01-wasm-solver-landscape.md` Abschnitt 2.1 (highs-js Eigenschaften)
- `sortition-tool/03-algorithm-port.md` Abschnitte 1.1 und 4 (Algorithmus-Struktur)
- HiGHS Option `random_seed` für Determinismus
- Flanigan et al. 2021 Supplementary für Pipage-Rounding-Details
