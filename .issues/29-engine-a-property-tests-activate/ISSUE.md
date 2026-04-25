---
id: 29
slug: engine-a-property-tests-activate
title: Engine A + Panel-Ops Property-Tests aktivieren (war #09 deferred)
track: 2
estimate_pt: 1
depends_on: []
status: open
blocks: [37]
source: review-2026-04-25 (Claude #29, Codex #34, Gemini #26-01 — alle drei einig)
priority: high
---

# Engine A + Panel-Ops Property-Tests

## Kontext

`.issues/09-engine-a-property-tests/STATUS.md:6-27` hat das selbst als 0.5-PT-Pickup markiert. Die existierenden 7 Engine-Tests + 4 Panel-Ops-Tests in `packages/engine-a/tests/` decken Edge-Cases nicht ab:

- Coverage-Phase-Degeneration (NF-4 in `docs/iteration-1-findings.md`)
- `forceIn`/`forceOut`-Semantik in `packages/engine-a/src/panel-ops.ts:27-89`
- Random-Pool-Topologien aus `packages/core/`
- Determinismus-Invariante über >100 Pool-Variationen

Vor einem Audit-fähigen Pilot muss jemand sagen können: "Engine A hält Quoten und Determinismus auf 100 zufällig generierten Pools" — das geht nur mit Property-Tests.

## Ziel

`fast-check`-basierte Property-Test-Suite für Engine A und Panel-Ops. Teil des regulären `pnpm test`-Laufs.

## Acceptance Criteria

- [ ] `packages/engine-a/tests/properties.test.ts` mit `fast-check@^3.x`
- [ ] Pool-Generator nutzt `packages/core/`-Mulberry32 (deterministisch, reproduzierbar)
- [ ] Properties Engine A:
  - [ ] `selected.length === panel_size` für alle generierten Inputs
  - [ ] Alle `quota_fulfillment[i].ok === true`
  - [ ] Alle `marginals[id] ∈ [0, 1]`
  - [ ] Σ marginals ≈ panel_size (Toleranz 1e-6)
  - [ ] Determinismus: gleicher Input → gleiches `selected` (über 50 Runs)
  - [ ] z* > 0 nach Coverage-Phase (Regression gegen NF-4)
- [ ] Properties Panel-Ops (`replaceSinglePerson`, `extendBy`):
  - [ ] Replace: neue Panel-Größe == alte; `removed` nicht mehr drin; alle Quoten erfüllt
  - [ ] Replace: alle ursprünglichen Members minus `removed` sind im `newPanel`
  - [ ] Extend: `panel ⊆ newPanel`; `newPanel.length === newQuotas.panel_size`
  - [ ] Extend: alle Quoten in `newQuotas` erfüllt
  - [ ] Determinismus: gleicher Seed → gleiches Replacement / gleiche `added`-Liste
- [ ] `fast-check`-Runs pro Property: 100 (default)
- [ ] Pool-Größen in Generator: n ∈ {10, 30, 100} (große Pools testet #28/#30)
- [ ] Gesamt-Laufzeit der Property-Suite < 30 s lokal
- [ ] `pnpm test` enthält die neue Suite ohne separate Konfiguration

## Out of Scope

- Property-Tests auf Pool-Größen >100 (das wird mit #28/#30 statistisch gemessen, nicht property-getestet)
- Property-Tests, die HiGHS-Solver-Numerik prüfen (out of our control)
- Mutation-Tests / Coverage-Reports

## Verweise

- Pickup-Plan: `.issues/09-engine-a-property-tests/STATUS.md`
- Bestehende Tests: `packages/engine-a/tests/engine.test.ts`, `packages/engine-a/tests/panel-ops.test.ts`
- Pool-Generator: `packages/core/src/pool/generator.ts`
- NF-4 Findings: `docs/iteration-1-findings.md`
