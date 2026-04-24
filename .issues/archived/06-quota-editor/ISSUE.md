---
id: 06
slug: quota-editor
title: Quoten-Editor für Stratifizierungs-Kategorien
track: 1
estimate_pt: 2
deps: [02]
status: todo
blocks: [10]
---

# Quoten-Editor

## Kontext

Stratifizierte Zufallsauswahl braucht pro Kategorie (Alter, Geschlecht, Bildung, Migrationshintergrund, Bezirk) min/max-Quoten. Die Quoten-Definition ist das, was Rat/Verwaltung politisch setzt — der Algorithmus erfüllt sie, er erfindet sie nicht.

## Ziel

UI, in der Nutzerinnen aus den Spalten des importierten Pools (#05) Kategorien auswählen und pro **Kategorienwert** (z.B. "Frau") min/max definieren. Validiert gegen Panel-Grösse und Pool-Zusammensetzung.

## Akzeptanzkriterien

- [ ] Nutzerin wählt aus dem Pool eine Spalte als "Kategorie" aus; das UI listet alle vorkommenden Werte
- [ ] Pro Wert: zwei Zahlenfelder (min, max); Default min=0, max=Panel-Grösse
- [ ] Panel-Grösse als globaler Input (Pflichtfeld, ≥ 10 ≤ Pool-Grösse)
- [ ] Validierung pro Kategorie: Summe der min ≤ Panel ≤ Summe der max; sonst Fehler-Anzeige
- [ ] Validierung Pool-Deckung: für jeden Wert mit min ≥ 1 muss es im Pool mindestens min Personen geben; sonst Warnung
- [ ] Mehrere Kategorien parallel: jede wird unabhängig validiert; Konflikte zwischen Kategorien (z.B. nicht simultan erfüllbar) werden im Lauf selbst als Infeasibility erkannt (nicht hier)
- [ ] Quoten-Konfiguration ist als JSON exportierbar/importierbar
- [ ] Playwright-E2E: Import sf_a, konfiguriere Paper-Quoten, Validierung grün

## Out of Scope

- Kein automatisches Quoten-Vorschlag aus Pool-Verteilung (das ist ein späteres Assistent-Feature)
- Keine Cross-Kategorie-Constraints (nur einzel-kategorische min/max — das entspricht dem Nature-Algorithmus)
- Keine UI für Relaxation bei Infeasibility (Algorithmus macht das; UI zeigt Ergebnis in #10)

## Verweise

- `sortition-tool/03-algorithm-port.md` Abschnitt 2 (Quota-Modell)
- Paper-Pools (#04) haben Referenz-Quotenkonfigurationen
