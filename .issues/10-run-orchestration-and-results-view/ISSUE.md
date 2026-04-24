---
id: 10
slug: run-orchestration-and-results-view
title: Run-Orchestrierung + Ergebnis-View
track: 3
estimate_pt: 2
deps: [05, 06, 08]
status: todo
blocks: [11, 21, 22, 23]
---

# Run-Orchestrierung und Ergebnis-View

## Kontext

Zusammenführen des bisher separaten UI-Kerns (#05, #06) mit der Engine (#08). Nutzerin startet einen Lauf, sieht Fortschritt, bekommt ein lesbares Ergebnis. Das ist das erste Mal, dass die App "eine Auswahl zieht".

## Ziel

Eine Workflow-Seite: CSV-Import → Mapping → Quoten-Editor → Seed + Engine-Wahl → **Run**-Button → Progress → **Ergebnis-View**. Alle Schritte in derselben Session ohne Reload. Engine läuft im Worker, UI bleibt responsiv.

## Akzeptanzkriterien

- [ ] Stepper-/Wizard-UI mit vier Schritten: Pool, Quoten, Lauf, Ergebnis
- [ ] "Lauf"-Schritt: Seed-Eingabe (Default: Kryptographisch zufällig, aber änderbar), Engine-Wahl (in #14 aktiv, hier schon in der UI vorgesehen), Start-Button
- [ ] Progress-Bar und Log-Zeile zeigen Column-Generation-Iteration und Phase
- [ ] "Abbrechen"-Button terminiert den Worker
- [ ] Ergebnis-View zeigt:
  - Liste der ausgewählten Personen (Person-ID + wichtigste Attribute)
  - Pro-Person-Marginale (π_i) als Spalte, sortierbar
  - Tabelle der Quoten-Erfüllung pro Kategorie (Ist vs. min/max)
  - Summary: Laufzeit, Iterationen, Engine, Seed, Input-Hash
- [ ] Fehler-Handling: Infeasibility → verständlicher Hinweis mit Vorschlag (welche Kategorie ist knapp)
- [ ] Playwright-E2E: end-to-end von sf_a-CSV bis Ergebnis-View, Assert auf Panel-Grösse

## Out of Scope

- Kein Export (das ist #11)
- Keine Re-Roll-/Nachrücker-Buttons (Track 6)
- Keine Engine-B-Integration (das ist #14)
- Keine i18n (Iteration 2)

## Verweise

- `sortition-tool/00-masterplan.md` Phase-1-Beschreibung (Ergebnis-Anzeige)
