---
id: 21
slug: reroll-with-new-seed
title: Reroll mit neuem Seed + Side-by-Side-Diff
track: 6
estimate_pt: 1
deps: [11]
status: todo
blocks: [24]
---

# Reroll mit neuem Seed

## Kontext

Praxis-Fall: ein erstes Panel gezogen, aus politischen oder praktischen Gründen soll noch mal gezogen werden (anderer Seed). Die Nutzerin will sehen, **was sich ändert** — wer fliegt raus, wer kommt neu dazu.

## Ziel

"Neu losen"-Button im Ergebnis-View (#10), der mit neuem Seed re-runt und beide Ergebnisse nebeneinander anzeigt. Audit-Log hält beide Läufe.

## Akzeptanzkriterien

- [ ] Button "Neu losen (anderer Seed)" im Ergebnis-View
- [ ] Dialog: "Seed manuell festlegen" oder "kryptografisch zufällig"
- [ ] Nach Reroll: Split-View mit Lauf 1 | Lauf 2
- [ ] Diff-Liste: wer war in 1, wer in 2, wer in beiden — sortiert nach Kategorie
- [ ] Audit-Export (#11) beinhaltet beide Läufe, klar gekennzeichnet
- [ ] Werkt in beiden Engines (A und B)
- [ ] Playwright-E2E: Reroll auf Paper-Pool, Diff sichtbar

## Out of Scope

- Keine automatische "bestes von N"-Auswahl (das wäre ein eigenes Feature)
- Keine Seed-Historie jenseits der aktuellen Session

## Verweise

- Typischer Bürgerrat-Workflow (OECD-Methodik): Losung, Absagen, Nachzug
