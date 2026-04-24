---
id: 12
slug: engine-b-pyodide-bootstrap
title: Engine B — Pyodide-Bootstrap im Web Worker
track: 4
estimate_pt: 2
deps: [07, 01]
status: todo
blocks: [13]
---

# Engine B — Pyodide-Bootstrap

## Kontext

Zweiter Engine-Pfad: Pyodide 0.29.x im Web Worker, `sortition-algorithms` via micropip installiert, Algorithmus unverändert aus der Referenz-Library laufen lassen.

Harte Realität (aus #01 zu bestätigen): Library läuft ohne Gurobi nur mit Maximin. Wenn #01 zeigt, dass auch Maximin Probleme macht, entfällt Track 4 — deshalb `deps: [01]`.

## Ziel

Web Worker lädt Pyodide, ruft micropip-Install auf, importiert `sortition_algorithms`, meldet "ready" an Main-Thread. Dokumentiert Bundle-Grösse und Cold-Start-Zeit.

## Akzeptanzkriterien

- [ ] `packages/engine-b/` mit `worker.ts`, `pyodide-bootstrap.ts`
- [ ] Pyodide 0.29.3 (oder neuer stable) wird in Worker geladen, Core + benötigte Pakete
- [ ] `micropip.install(["sortition-algorithms", "highspy", "cvxpy", "numpy", "scipy", ...])` läuft grün
- [ ] `import sortition_algorithms; print(sortition_algorithms.__version__)` erfolgreich
- [ ] Worker sendet `EngineEvent` `{type: 'ready', bootstrap_ms, bundle_size_bytes}` an Main
- [ ] `docs/engine-b-bundle-report.md` dokumentiert: gemessene Cold-Start-Zeit, Gesamt-Download-Grösse, Packages-Liste + Versionen — aus realen Messungen in Chromium + Firefox
- [ ] Kein iOS-Safari-Test (explizit excluded per Plan)
- [ ] Wenn #01 Maximin-ohne-Gurobi als nicht-funktional ergibt: Issue dokumentiert das in `NOTES.md` und schliesst mit "blocked by upstream"

## Out of Scope

- Keine Integration mit der App-UI (das ist #14)
- Kein Sortition-Lauf (das ist #13)
- Kein Pyodide-Snapshot-Warm-Start (Optimierung, Iteration 2)

## Verweise

- `sortition-tool/02-pyodide-feasibility.md` Abschnitte 1 und 2 (Versionsmatrix)
- Pyodide Issue #5428 (iOS-Safari nicht unterstützt — wir ignorieren das, Desktop-only)
