# Research — #61 Seed No-Gating

> Trivialer Refactor: Signal+Button entfernen, Tests anpassen.

## Konkrete Touched-Locations

<interfaces>
- `apps/web/src/stage1/Stage1Panel.tsx`:
  - Zeile ~60-67: `seedConfirmed` Signal definieren — entfernen
  - Zeile ~74-78: `confirmDefaultSeed` function — entfernen
  - Zeile ~145-167: `canRun()` mit `seedConfirmed()` — Check entfernen
  - Zeile ~169-175: `changeSeed`, `newDefaultSeed` rufen `setSeedConfirmed` — Aufrufe entfernen
  - Zeile ~190-204: Seed-Source-Anzeige mit "(bitte vereinbaren)" / "(bestätigt)" — vereinfachen auf "(Default 4711 — editierbar)" und "(manuell)"
  - Zeile ~297-312: Confirm-Button + amber Hinweis-Box — Button raus, Hinweis-Box-Text aktualisieren

- `apps/web/tests/e2e/stage1.spec.ts`: alle `stage1-seed-confirm`-Klicks entfernen
- `apps/web/tests/e2e/beispiele-stage1.spec.ts`: gleicher Fix
- `apps/web/tests/e2e/stage1.spec.ts` Test "Run-Button bleibt disabled bis Seed bestätigt..." (C) — umbauen zu "Run-Button sofort klickbar nach N-Eingabe"
</interfaces>

## Verifikation

- `pnpm --filter @sortition/web lint && pnpm --filter @sortition/web test && pnpm --filter @sortition/web exec playwright test --project=chromium`
