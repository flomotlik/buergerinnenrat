---
id: 26
slug: engine-a-worker-isolation
title: Engine A in Web Worker isolieren — UI nicht blockieren, harter Cancel
track: 3
estimate_pt: 1.5
depends_on: []
status: open
blocks: [27, 30, 39]
source: review-2026-04-25 (Claude opus-4-7 #26, Codex gpt-5-4 #28, Gemini #26-09 — alle drei einig)
priority: high
---

# Engine A im Web Worker isolieren

## Kontext

`apps/web/src/run/runEngine.ts:19-46` ruft `engine.run()` direkt im Main-Thread. Issue #08 (`/.issues/archived/08-engine-a-highs-maximin/ISSUE.md:22-40`) hatte Worker-Isolation als Akzeptanzkriterium gefordert — wurde nicht umgesetzt. Bei Pool-Größen ≥ 500 Personen blockiert die UI für mehrere Sekunden, der "Abbrechen"-Button ist faktisch unbedienbar (AbortController prüft nur an `await`-Punkten). Bei Bürgerrats-typischen Pool-Größen (100–3000) ist das ein Pilot-Block.

Alle drei externe Reviewer (Claude, Codex, Gemini) haben das unabhängig als High-Severity-Lücke markiert.

## Ziel

Engine A läuft in einem echten Web Worker. UI bleibt während des Laufs voll bedienbar. Cancel terminiert den Worker hart innerhalb 100 ms.

## Acceptance Criteria

- [ ] `apps/web/src/run/engine-worker.ts` als `new Worker(new URL('./engine-worker.ts', import.meta.url), { type: 'module' })`
- [ ] Worker importiert `EngineA` aus `@sortition/engine-a`, lädt `highs.wasm` lazy via `locateFile`
- [ ] `runEngine.ts` ersetzt durch eine `postMessage`-basierte Wrapper-Funktion mit derselben Signatur
- [ ] `EngineEvent`-Stream wird über MessageChannel weitergereicht (Progress, Log, Done, Error)
- [ ] `Abbrechen`-Button ruft `worker.terminate()`; UI bekommt `{type: 'aborted'}` ≤ 100 ms
- [ ] Vorhandene Engine-A-Tests in `packages/engine-a/tests/` laufen weiter grün (Engine-Klasse unverändert)
- [ ] Playwright-E2E: 500-Pool laden, "Lauf starten", während des Laufs einen anderen Button klicken — Click registriert ohne Verzögerung
- [ ] Playwright-E2E: Cancel während laufendem Lauf, assertet `data-testid=run-error` mit `code='aborted'` ≤ 1 s nach Click
- [ ] Bundle-Größen-Doc (`docs/bundle-size.md`) aktualisiert: Worker-Chunk separat ausgewiesen
- [ ] CSP in `docs/deploy.md` enthält `worker-src 'self'`

## Out of Scope

- SharedArrayBuffer / cross-origin isolation — Engine A braucht das nicht
- Worker-Pool für parallele Multi-Seed-Runs (das ist #28)
- Reusable Worker zwischen Runs — pro Lauf eine frische Worker-Instanz reicht für Iteration 1

## Verweise

- Aktuelle Implementation: `apps/web/src/run/runEngine.ts:19-46`
- Issue #08 ursprüngliche Forderung: `.issues/archived/08-engine-a-highs-maximin/ISSUE.md:22-40`
- Review-Findings: `reviews/iteration-2-issue-gaps/`
