# @sortition/engine-contract

Geteilte TypeScript-Typen, zod-Runtime-Validierung und JSON-Schemas für die drei Iteration-1-Engines:

- **Engine A**: TS + highs-js, läuft im Browser, Maximin-only.
- **Engine B**: Pyodide + sortition-algorithms, läuft im Browser, Maximin-only.
- **Reference C**: nativer Python-Lauf mit `sortition-algorithms` + `highspy`, Maximin-only.

Leximin ist nicht Teil dieses Vertrags — siehe `docs/upstream-verification.md`.

## Beispiel-Payload (10er-Toy-Pool)

```json
{
  "pool": {
    "id": "toy-10",
    "people": [
      { "person_id": "p01", "gender": "female", "age_band": "25-34" },
      { "person_id": "p02", "gender": "male", "age_band": "25-34" }
    ]
  },
  "quotas": {
    "panel_size": 4,
    "categories": [
      {
        "column": "gender",
        "bounds": {
          "female": { "min": 2, "max": 2 },
          "male":   { "min": 2, "max": 2 }
        }
      }
    ]
  },
  "params": {
    "seed": 42,
    "algorithm": "maximin"
  }
}
```

Engine-Antwort als `AsyncIterable<EngineEvent>`:

```json
{ "type": "progress", "phase": "initial-committees", "fraction": 0.2 }
{ "type": "log", "level": "info", "message": "found 12 feasible committees" }
{ "type": "progress", "phase": "lp-primal", "fraction": 0.7 }
{ "type": "done", "result": { "selected": ["p01","p04","p06","p09"], "marginals": {...}, ... } }
```

## Was die Engines garantieren müssen

1. **Vor dem Run**: `validatePool(pool)` und `validateQuotas(quotas)` werden vom Aufrufer geprüft. Engines dürfen Eingaben für interne Repräsentationen umformen, müssen aber keine Re-Validierung machen.
2. **Während des Runs**: Mindestens **ein** `progress`-Event und genau **ein** `done`- oder `error`-Event. Die Reihenfolge ist `progress*` → (`done` | `error`).
3. **Nach dem Run**: `RunResult.engine_meta.engine_id` muss zur Implementierung passen. `marginals` enthält für **jede** `Person` im Pool eine Zahl in `[0,1]`. `selected.length === quotas.panel_size`.

## JSON-Schemas

`pnpm --filter @sortition/engine-contract build:schemas` erzeugt fünf JSON-Schema-Files unter `schemas/` (Pool, Quotas, RunParams, RunResult, EngineEvent). Diese sind die Single-Source-of-Truth für die Datenstruktur an der WASM-/RPC-/CLI-Grenze.

## Versions-Politik

Iteration 1 verwendet Schema-Version `0.1`. Breaking changes erfordern eine bewusste neue Version — out of scope dieses Issues.
