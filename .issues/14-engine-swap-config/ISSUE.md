---
id: 14
slug: engine-swap-config
title: Engine-Wahl zur Laufzeit (A ↔ B)
track: 4
estimate_pt: 0.5
deps: [13, 08]
status: todo
blocks: [19]
---

# Engine-Swap-Konfiguration

## Kontext

Beide Engines sollen in derselben statischen App nebeneinander existieren — Nutzerin wählt, welche läuft. Für Qualitätsvergleich (#19) und für Fallback wenn eine Engine auf einem Browser fehlschlägt.

## Ziel

Engine-Wahl über UI-Dropdown **und** URL-Parameter `?engine=a|b`, Default `a`. Läuft ohne Rebuild. Beide Engines erfüllen Contract aus #07, die UI schaltet nur die Worker-Factory um.

## Akzeptanzkriterien

- [ ] Im "Lauf"-Schritt (#10) sichtbarer Engine-Toggle
- [ ] Selection wird in `localStorage` gemerkt (so dass Reload die Wahl beibehält — nicht Datenspeicherung, nur UI-State)
- [ ] `?engine=a` bzw. `?engine=b` in der URL überschreibt den localStorage-State
- [ ] Engine-Label + Version ist in der Ergebnis-View und im Audit sichtbar
- [ ] Playwright-E2E: beide Engines auf demselben 100er-Pool, Ergebnisse strukturell valide (nicht: bit-identisch — Engines haben unterschiedliche Solver-Pfade)

## Out of Scope

- Keine Auto-Fallback-Logik (wenn Engine A fehlt, nicht automatisch B wählen)
- Keine Engine-Dynamik pro Quotenkategorie
- Keine Admin-UI für Engine-Einstellungen

## Verweise

- `sortition-tool/00-masterplan.md` — "Engine-Swap per Config"
