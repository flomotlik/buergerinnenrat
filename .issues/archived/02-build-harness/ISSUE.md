---
id: 02
slug: build-harness
title: Build-Harness (Vite + TS strict + SolidJS + Playwright)
track: 0
estimate_pt: 1
deps: []
status: todo
blocks: [05, 06, 07]
---

# Build-Harness

## Kontext

Der Rest der Iteration hängt an einem sauberen Grundgerüst: TypeScript strict, Vite mit WASM-Support, SolidJS, Tailwind, Vitest, Playwright, ESLint, Prettier. Ein leeres App-Skelett, das build-grün ist, bevor irgendein Feature darauf landet.

Solver-Wahl und UI-Framework sind in `sortition-tool/00-masterplan.md` festgelegt (HiGHS via `highs-js`, SolidJS). Keine Neudiskussion.

## Ziel

Ein `apps/web/` Workspace (pnpm) mit:
- Vite + SolidJS + TypeScript `strict: true`
- Tailwind + Kobalte als UI-Basis
- Vitest für Unit/Property-Tests, Playwright (Chromium+Firefox) für E2E
- ESLint + Prettier + `@typescript-eslint`
- Makefile-Targets: `dev`, `build`, `test`, `test:e2e`, `lint`, `typecheck`, `clean`
- Leere App, die auf `/` ein "Sortition Iteration 1" rendert

## Akzeptanzkriterien

- [ ] `make build` erzeugt valides `apps/web/dist/` (statisch, < 500 KB ohne Solver)
- [ ] `make dev` startet Vite auf localhost und liefert die leere App
- [ ] `make test` läuft mit einem Dummy-Test grün (Vitest)
- [ ] `make test:e2e` startet Playwright, rendert die App in Chromium + Firefox, prüft Heading
- [ ] `make typecheck` läuft `tsc --noEmit` ohne Fehler
- [ ] `make lint` läuft ESLint + Prettier-Check ohne Fehler
- [ ] `tsconfig.json` hat `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`
- [ ] `.gitignore` enthält `node_modules`, `dist`, `playwright-report`, `test-results`, `.vite`

## Out of Scope

- Kein Solver, kein Engine-Code
- Keine CSV-/Quoten-Funktionalität
- Kein Routing (eine Seite reicht)
- Kein i18n-Setup (separates Issue später)

## Notizen

- pnpm bevorzugen wegen Vite-Kompatibilität und Platzersparnis; im Container vorinstalliert
- Playwright-Browser sind im Container unter `/opt/playwright-browsers` — keine erneute Installation nötig
