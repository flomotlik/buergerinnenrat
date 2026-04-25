---
id: 33
slug: i18n-de-en-foundation
title: i18n-Fundament + DE/EN-Übersetzung — alle hartcodierten Strings extrahieren
track: 7
estimate_pt: 2.5
deps: [archived/05, archived/06, archived/10, archived/11]
status: todo
blocks: [32, 34, 37]
source: review-2026-04-25 (Claude #33, Codex #32, Gemini #26-04 — alle drei einig)
---

# i18n DE/EN Fundament

## Kontext

P1-5 aus `sortition-tool/06-review-consolidation.md`. Aktuelle UI: vollständig deutsch, Strings hart kodiert in:

- `apps/web/src/App.tsx`: Header + Section-Titel (~5 Strings)
- `apps/web/src/csv/CsvImport.tsx`: Upload-UI + Mapping-Optionen (~12 Strings)
- `apps/web/src/quotas/QuotaEditor.tsx`: Editor-Felder + Buttons + Validation (~25 Strings)
- `apps/web/src/run/RunPanel.tsx`: Run-Controls + Result-Tabelle + Errors (~40 Strings)

Plus engine-Errors aus `apps/web/src/run/runEngine.ts` und Audit-Hinweise.

Pilot-Kommunen mit migrantischer Bevölkerung (Berlin, Stuttgart, Frankfurt, Wien) brauchen mindestens EN, langfristig TR/AR/RU/UK. Architektur muss das jetzt zulassen — Refactor-Kosten ohne i18n-Layer wären doppelt.

## Ziel

i18n-Library integriert, alle user-facing Strings extrahiert, DE + EN vollständig, Sprach-Switcher in der UI.

## Akzeptanzkriterien

- [ ] i18n-Library gewählt + begründet in `docs/adr/0001-i18n-library.md` (Kandidaten: `@solid-primitives/i18n`, `solid-i18next`, manuell mit Solid-Stores). Begründung gegen Bundle-Größe + Type-Safety abgewogen
- [ ] Translation-Keys-Schema in `apps/web/src/i18n/keys.ts` mit type-safe Lookup (kompilier-Zeit-Fehler bei fehlendem Key)
- [ ] `apps/web/src/i18n/locales/de.json` + `apps/web/src/i18n/locales/en.json` — alle Strings extrahiert
- [ ] Sprach-Switcher in der Header-Komponente, Wahl persistiert in `localStorage` (key `sortition.locale`)
- [ ] URL-Parameter `?locale=de|en` überschreibt localStorage (für Deep-Links aus Kommunen)
- [ ] Fehler-Messages aus `apps/web/src/run/runEngine.ts` (insbesondere `infeasible_quotas` mit Tipp-Text in `RunPanel.tsx`) übersetzt
- [ ] Audit-Schema (`docs/audit-schema.json`) erweitert: optionales `locale`-Feld, das die UI-Sprache zum Lauf-Zeitpunkt festhält
- [ ] Bundle-Größen-Impact dokumentiert in `docs/bundle-size.md`: erwartet +15 KB für Library + Locales
- [ ] Playwright-E2E `apps/web/tests/e2e/i18n.spec.ts`: lädt mit `?locale=en`, klickt durch Hauptflow, assertet englischen Text; switcht auf DE, assertet deutschen
- [ ] Architektur-Doku `apps/web/src/i18n/README.md`: wie kommt eine weitere Sprache rein (z.B. `tr.json`) ohne Code-Änderung
- [ ] Default-Locale: DE (Bestandsverhalten)

## Out of Scope

- Übersetzung weiterer Sprachen (TR, AR, RU, UK) — Iteration 3
- Format-Lokalisierung von Zahlen / Daten (Intl.NumberFormat reicht aus)
- RTL-Support (Iteration 3)
- Übersetzung der `docs/`-Dateien (separate Workstream)

## Verweise

- P1-5: `sortition-tool/06-review-consolidation.md`
- Findings-Status: `docs/iteration-1-findings.md:60-61`
- Iteration-1 hartcodierte Strings: `apps/web/src/`
