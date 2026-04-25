---
id: 43
slug: lp-solver-tuning
title: HiGHS LP-/MIP-Tuning für Numerik-Robustheit + Performance
track: 2
estimate_pt: 1.5
depends_on: [40]
status: open
blocks: []
priority: high
priority_rationale: "P1 — Hygiene, schließt Edge-Case-Numerik-Bugs"
---

# HiGHS LP/MIP Tuning

## Kontext

Engine A nutzt `highs@1.8.0` als WASM-Solver. Aktuell werden HiGHS-Optionen weitgehend auf Defaults gelassen (`packages/engine-a/src/feasible-committee.ts:104-110`):

```ts
const opts: { random_seed?: number; time_limit?: number } = {};
if (args.seed !== undefined) opts.random_seed = args.seed;
if (args.timeLimitSec !== undefined) opts.time_limit = args.timeLimitSec;
```

Das ist robust für kleine Pools, aber bei größeren Pools (n ≥ 1000) zeigen sich Probleme:

1. **Numerische Instabilität im LP**: Maximin-LP hat stark unterschiedliche Skalen (z\* ≈ 0.01, π_C ≈ 1/N für N Komitees). Default-Simplex kann numerische Fehler akkumulieren.
2. **MIP-Solving-Zeit**: HiGHS mit Default-Branch-and-Bound ist nicht für unsere strukturierte Quoten-Constraints optimiert.
3. **Random-Seed-Determinismus**: Pre-Solve-Heuristiken haben eigene Randomness; ohne `random_seed`-Forwarding ist Determinismus nicht 100% garantiert.

Das Upstream `sortition-algorithms` setzt für Leximin explizit `Method=2` (Barrier) und `Crossover=0`. Wir sollten für unser Maximin-LP analoge Optionen evaluieren.

## Ziel

Empirisch fundierte HiGHS-Settings für (a) LP-Phase und (b) MIP-Phase. Dokumentation der Wahl in `docs/lp-solver-options.md`.

## Acceptance Criteria

- [ ] **Empirische Studie**: Benchmark-Skript `scripts/lp-tuning-sweep.py` läuft Engine A auf {kleinstadt-500, kleinstadt-1000, innenstadt-1000} mit verschiedenen HiGHS-Settings:
  - Default
  - `solver: 'simplex'` vs `solver: 'ipm'` (= Interior Point Method)
  - `presolve: 'on' | 'off' | 'choose'`
  - `parallel: 'on' | 'off'`
  - `mip_rel_gap: 1e-6 | 1e-4 | 1e-3` (für MIP-Phase)
  - `primal_feasibility_tolerance: 1e-7 | 1e-9` (für LP-Phase)
- [ ] Pro Setting: Wall-Time, min π Stabilität (über 5 Seeds), Erfolgsquote (kein "Unable to parse solution")
- [ ] Ergebnis-Tabelle in `docs/lp-solver-options.md` mit Empfehlung pro Pool-Größenklasse
- [ ] Empfohlene Settings als Default in `packages/engine-a/src/feasible-committee.ts` und `packages/engine-a/src/maximin-lp.ts` umgesetzt
- [ ] **Random-Seed-Forwarding** im LP-Solver: aktuell nur in `feasible-committee.ts`, sollte auch in `maximin-lp.ts:70` weitergegeben werden für volle Determinismus
- [ ] **Robustness-Test**: ein Test, der gegenüber HiGHS-Output-Format-Änderungen graceful degraded — wenn HiGHS einen unerwarteten Status zurückgibt, soll Engine A nicht crashen sondern `EngineEvent.error` produzieren
- [ ] **time_limit pro LP/MIP-Solve**: konfigurierbar, Default 30 s pro Solve. Bei Überschreitung: graceful Error-Event mit Hinweis (statt stiller Fehlschlag)

## Out of Scope

- Andere Solver als HiGHS (CBC, SCIP) — bleibt bei HiGHS
- Custom-Simplex-Pivoting-Strategien — out of HiGHS-Konfiguration
- GPU-Acceleration

## Verweise

- Aktuelle Solver-Optionen: `packages/engine-a/src/feasible-committee.ts:104-110`, `packages/engine-a/src/maximin-lp.ts:70-72`
- HiGHS Options Reference: `node_modules/highs/types.d.ts:5-558`
- Upstream Leximin-Settings (Vergleich): `vendor/sortition-algorithms-src/src/sortition_algorithms/committee_generation/leximin.py:74-77`
