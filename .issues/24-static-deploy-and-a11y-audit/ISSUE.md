---
id: 24
slug: static-deploy-and-a11y-audit
title: Static-Deploy + Accessibility-Audit
track: 7
estimate_pt: 1
deps: [11, 21, 22, 23]
status: todo
blocks: [25]
---

# Static-Deploy + A11y-Audit

## Kontext

Iteration 1 soll als **statisches Artefakt** vorliegen — ein `dist/`-Verzeichnis, das lokal per `vite preview` läuft oder 1:1 zu Cloudflare Pages/Netlify oder als signiertes ZIP deploybar ist.

Parallel ein erster Accessibility-Pass: nicht BITV-2.0-konforme Audit (das ist Iteration 2), aber automatisierte Low-Hanging-Fruit mit Lighthouse + axe.

## Ziel

Gebuilded, geprüft, mit Deploy-Anleitung.

## Akzeptanzkriterien

- [ ] `make build` erzeugt `apps/web/dist/` mit allen Assets (JS, WASM, Pyodide-Loader-Stubs)
- [ ] Bundle-Grösse dokumentiert in `docs/bundle-size.md`:
  - Ohne Engine B (nur A): Ziel unter 3 MB uncompressed, unter 1 MB gzip
  - Mit Engine B (Pyodide): realistisch 30–40 MB — dokumentiert
- [ ] `vite preview` serviert lokal; manuelle Rauch-Prüfung
- [ ] Lighthouse CI (oder manueller Lauf) — Score >= 90 für Accessibility, Best Practices
- [ ] axe-core Automation (via Playwright) findet keine **critical** Issues in der Haupt-UI
- [ ] Deploy-Anleitungen in `docs/deploy.md`:
  - Cloudflare Pages: Drop-in `dist/`
  - Netlify: gleiches Prinzip
  - Lokales ZIP: `zip -r sortition-v0.1.zip dist/` + How-to-open
- [ ] CSP-Header für Hosted-Variante dokumentiert: `default-src 'self'; connect-src 'self'; script-src 'self' 'wasm-unsafe-eval'` (nicht `'none'` — Pyodide braucht `fetch`, siehe `sortition-tool/06-review-consolidation.md` P0-5)

## Out of Scope

- Kein echter Deploy (das entscheidet die Nutzerin — Iteration-2-Thema mit realer Domain)
- Keine vollständige BITV-2.0-Konformität (das ist P1-1, Iteration 2)
- Keine Pen-Tests

## Verweise

- `sortition-tool/06-review-consolidation.md` P0-5 (CSP-Korrektur)
- `sortition-tool/06-review-consolidation.md` P1-1 (BITV ist Iteration 2)
