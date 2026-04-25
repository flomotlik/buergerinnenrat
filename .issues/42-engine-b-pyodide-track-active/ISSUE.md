---
id: 42
slug: engine-b-pyodide-track-active
title: Engine B Track 4 aktivieren — kanonisches sortition-algorithms im Browser
track: 4
estimate_pt: 5.5
deps: [archived/01, archived/07]
status: todo
blocks: [27, 14]
priority: P0 — schließt die Fairness-Lücke zu 0% durch Nutzung der kanonischen Implementation
note: ersetzt deferred Issues #12, #13, #14 als zusammenhängenden Track
---

# Engine B Track aktivieren

## Kontext

Track 4 (#12 Pyodide-Bootstrap, #13 sortition-algorithms-Integration, #14 Engine-Swap-Config) wurde in Iteration 1 deferred mit STATUS-Notiz. Die Begründung in `.issues/12-engine-b-pyodide-bootstrap/STATUS.md` war: "Iteration 1 deliverable ist End-to-End im Browser — Engine B ist Cross-Runtime-Check und Fairness-Gap-Closer."

Die rein-technische Begründung jetzt: **Engine B nutzt die kanonische `sortition-algorithms`-Library direkt im Browser via Pyodide**. Das schließt die in Iteration 1 gemessene 16-%-min-π-Lücke zu Reference C **definitionsgemäß auf 0 %**, weil dieselbe Code-Basis läuft, nur in WASM-CPython-Umgebung statt nativer CPython.

Das ist die zweite parallele Strategie zu #40 (Engine A korrekt machen). Beide sollten parallel verfolgt werden:

- **#40** ist der Clean-Room-TS-Pfad — kleinerer Bundle (3 MB), schneller, eigene Implementation
- **#42** ist der Pyodide-Pfad — größeres Bundle (30–40 MB), genau gleiche Qualität wie Reference C

Im Vergleich (Issue #27) sieht man dann konkret pro Pool, ob Engine A nach #40 nahe genug an Engine B / Reference C ist, oder ob Engine B als Default-Engine sinnvoll ist.

## Ziel

Engine B läuft im Browser, produziert RunResult-JSON in der gleichen Form wie Engine A. Engine-Swap-Config in der UI lässt User wählen.

## Phasen-Aufteilung

Dieses Issue konsolidiert die ehemaligen #12, #13, #14 in einen kohärenten Track. Drei Phasen:

### Phase 42a — Pyodide-Bootstrap (~2 PT)

- [ ] `packages/engine-b/` Workspace-Package angelegt
- [ ] `packages/engine-b/src/pyodide-loader.ts`: lazy-Load von Pyodide v0.29.x (oder neuste stabile Version mit Python 3.12)
- [ ] Pyodide-Wheel-Bundle: `sortition-algorithms` + `highspy` + Dependencies (`attrs`, `cattrs`, `numpy`) als pre-bundled Packages
- [ ] Bundle-Größen-Doc-Update: Engine-B-Chunk separat ausgewiesen (~30–40 MB)
- [ ] Lazy-Load: Pyodide wird erst beim Klick "Engine B benutzen" heruntergeladen
- [ ] Smoke-Test: Pyodide startet im Browser, importiert `sortition_algorithms`, gibt Versions-String zurück

### Phase 42b — Sortition-Algorithms-Integration (~3 PT)

- [ ] `packages/engine-b/src/engine.ts`: implementiert `SortitionEngine`-Interface aus `@sortition/engine-contract`
- [ ] Brücke TS → Python: serialisiere `Pool` und `Quotas` zu JSON, übergib an Pyodide-Python-Funktion, parse Ergebnis
- [ ] Python-Brücken-Code in `packages/engine-b/python/run.py`: ruft `find_distribution_maximin` aus `sortition_algorithms`, formatiert RunResult-kompatibel
- [ ] Progress-Events: `find_distribution_maximin` akzeptiert einen Progress-Reporter (siehe `progress.py` upstream); leite Updates über `postMessage` ans Main-Thread
- [ ] Tests: gleiche Test-Suite wie Engine A (`packages/engine-b/tests/engine.test.ts`), aber wir erwarten z* identisch zu Reference C

### Phase 42c — Engine-Swap-Config (~0.5 PT)

- [ ] `apps/web/src/run/RunPanel.tsx` erhält Engine-Auswahl-Dropdown: "Engine A (schnell, ~2% Approximations-Lücke nach #40)" vs "Engine B (kanonisch, langsamer beim ersten Lauf wegen Pyodide-Lade)"
- [ ] User-Wahl persistiert in `localStorage`
- [ ] Audit-JSON `engine_meta.engine_id` reflektiert die Wahl
- [ ] Playwright-E2E: Engine B durch Hauptflow durchklicken, RunResult-Schema-Validierung

## Akzeptanzkriterien (gesamt)

- [ ] Engine B im Browser lauffähig, lazy-loaded
- [ ] Selber `RunResult`-JSON-Schema wie Engine A
- [ ] Cross-Runtime-Drift (#27) auf `kleinstadt-100` zeigt Engine B = Reference C bis auf Float-Toleranz (1e-9)
- [ ] Bundle-Strategie: Pyodide nur geladen, wenn User Engine B explizit wählt
- [ ] CSP-Update in `docs/deploy.md`: `connect-src 'self' https://cdn.jsdelivr.net` (oder lokal-bundled Pyodide), `script-src 'self' 'wasm-unsafe-eval'`
- [ ] Worker-Isolation (#26 muss vorher fertig sein): Engine B läuft im Worker, sonst friert UI minutenlang beim Pyodide-Load

## Out of Scope

- Service-Worker für Pyodide-Caching (Iteration 3)
- Eigenes Pyodide-Build mit nur den nötigen Modulen (Bundle-Reduktion) — Iteration 3
- iOS-Safari-Support: bleibt aus dem Scope (Pyodide-Issue #5428)

## Verweise

- STATUS-Notes: `.issues/12-engine-b-pyodide-bootstrap/STATUS.md`, `.issues/13-engine-b-sortition-algorithms-integration/STATUS.md`, `.issues/14-engine-swap-config/STATUS.md`
- Upstream-Verifikation: `docs/upstream-verification.md`
- Engine-Contract: `packages/engine-contract/src/types.ts`
