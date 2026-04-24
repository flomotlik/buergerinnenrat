---
id: 13
slug: engine-b-sortition-algorithms-integration
title: Engine B — sortition-algorithms-Integration
track: 4
estimate_pt: 3
deps: [12]
status: todo
blocks: [14]
---

# Engine B — sortition-algorithms-Integration

## Kontext

Nach Pyodide-Bootstrap (#12) die eigentliche Anbindung: Engine-Contract-Payload (JSON) aus dem Main-Thread → Python-seitiger Adapter in Pyodide → `sortition-algorithms` Maximin-Pfad → Result-Payload zurück in JSON-Form.

Wenn #01 festgestellt hat, dass die Library Maximin sauber bereitstellt, ist das hier ein Python-Glue-Layer. Falls das nicht gilt, kann dieses Issue auf einen Fork oder eine eigene Maximin-Aufrufkette ausweichen — das muss #01 entscheiden.

## Ziel

`packages/engine-b/` enthält:
- Python-Adapter (in Pyodide ausgeführt): nimmt JSON, baut `sortition-algorithms`-native Datenstrukturen, ruft Maximin-Pfad, serialisiert Ergebnis als JSON
- TS-Worker-Wrapper: leitet Engine-Events weiter, propagiert Timeout, erfüllt Engine-Contract aus #07

## Akzeptanzkriterien

- [ ] Engine B erfüllt das Interface aus #07 (typesafe)
- [ ] Gleicher 100er-Toy-Pool aus Engine A produziert in Engine B ein RunResult mit denselben Eigenschaften (Quoten erfüllt, Panel-Grösse korrekt, Marginale ∈ [0,1])
- [ ] Seed-Weitergabe: `RunParams.seed` erreicht sowohl NumPy-RNG als auch HiGHS-`random_seed` in der Python-Schicht
- [ ] Cross-Engine-Determinismus ist **nicht garantiert** (verschiedene HiGHS-Builds + Tie-Breaking), aber Engine-B-intern ist Seed-Wiederholbarkeit Pflicht
- [ ] Progress-Events aus Python (z.B. Column-Generation-Iteration) werden via `pyodide.FS` oder `postMessage`-Brücke an Main gemeldet
- [ ] Vitest-Unit-Test: Engine-B-Run auf 30er-Pool, Quoten-Validität
- [ ] Playwright-E2E: Engine B läuft in Chromium und Firefox, Ergebnis im UI sichtbar (über #14)

## Out of Scope

- Kein Cross-Engine-Diff gegen Engine A (das ist #19)
- Kein Leximin (Gurobi-gated)
- Keine Optimierungen (Worker-Sharing, Warm-Starts)

## Verweise

- `sortition-tool/02-pyodide-feasibility.md` Abschnitt 3+ (Port-Optionen)
- Ergebnis von #01 ist Eingabe hier
