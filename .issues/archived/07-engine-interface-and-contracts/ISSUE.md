---
id: 07
slug: engine-interface-and-contracts
title: Engine-Interface und Datenverträge
track: 2
estimate_pt: 1
deps: [02]
status: todo
blocks: [08, 12]
---

# Engine-Interface und Datenverträge

## Kontext

Iteration 1 hat zwei Engines (A: TS+highs-js, B: Pyodide+sortition-algorithms) und eine Referenz (C: native Python). Alle drei müssen gegen dasselbe JSON-Schema arbeiten, sonst ist der Qualitätsvergleich (#19) nicht sauber.

## Ziel

TypeScript-Interfaces + zod-Schemas + JSON-Schema-Export für: `Pool`, `Quotas`, `RunParams`, `RunResult`, `EngineEvent`. Dokumentiert mit Beispielen. Keine Engine-Implementierung hier — nur die Verträge.

## Akzeptanzkriterien

- [ ] `packages/engine-contract/src/types.ts` mit folgenden Interfaces:
  - `Pool = { id: string; people: Person[] }`
  - `Person = { person_id: string; [attribute: string]: string | number }`
  - `Quotas = { panel_size: number; categories: CategoryQuota[] }`
  - `CategoryQuota = { column: string; bounds: Record<string, {min: number; max: number}> }`
  - `RunParams = { seed: number; algorithm: 'maximin'; timeout_ms?: number }`
  - `RunResult = { selected: string[]; marginals: Record<string, number>; quota_fulfillment: QuotaFulfillment[]; timing: Timing; engine_meta: EngineMeta }`
  - `EngineEvent = { type: 'progress' | 'log' | 'done' | 'error'; ... }`
- [ ] zod-Schemas für Runtime-Validierung bei Engine-Grenzen (JSON rein/raus)
- [ ] JSON-Schemas generiert unter `packages/engine-contract/schemas/*.json`
- [ ] Dokumentation `packages/engine-contract/README.md` mit Beispiel-Payloads für 10er-Toy-Pool
- [ ] Kein Engine-Code, kein Solver

## Out of Scope

- Keine Algorithmus-Auswahl ausser Maximin (Leximin ist nicht browsertauglich, siehe Plan)
- Keine Progress-Granularität festlegen — das ist Engine-intern (#08, #13)
- Keine Versionierungs-Strategie für Schemas (kommt, wenn wir breaking changes haben)

## Verweise

- `sortition-tool/00-masterplan.md` Abschnitt Technik-Stack
