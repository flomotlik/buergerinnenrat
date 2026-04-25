---
id: 35
slug: real-csv-adapters
title: Reale Kommunal-CSV-Adapter (EWO/MESO) + Import-Diagnostik
track: 1
estimate_pt: 3
deps: [archived/03, archived/05]
status: todo
blocks: [37]
source: review-2026-04-25 (Codex #31, Gemini #26-05)
---

# Reale Kommunal-CSV-Adapter

## Kontext

Issue #05 (`/.issues/archived/05-csv-import-and-mapping/ISSUE.md:16-18,36-41`) hat bewusst nur generischen CSV-Parser + manuelles Mapping geliefert, mit explizitem "Hersteller-Format-Adapter (EWO, MESO, VOIS) — out of scope". Iteration 1 nutzt synthetische CSVs mit gepflegten 6-Spalten-Schemas.

Reale Kommunal-Exports sind komplexer:
- **Encoding**: CP1252/Windows-1252 (häufig in Bestand-Behörden-Software)
- **Spalten-Heterogenität**: 30–60 Spalten, davon ~6 für unsere Zwecke relevant; Rest muss ignoriert werden
- **Geteilte Felder**: "Geburtsdatum" als 1 Spalte, oder als 3 (Tag/Monat/Jahr); Namens-Felder häufig zerlegt
- **Halbe Zeilen**: Adressfelder mit Zeilenumbrüchen innerhalb (RFC-4180-konform aber selten richtig escaped)
- **Missing Values**: nicht NULL, sondern "0", "unbekannt", leerstring, oder "k.A."
- **Sondernzeichen**: Umlaute in Win-1252-Encoding teils doppelt-encoded (UTF-8-aus-Win-1252-aus-UTF-8)
- **Line-Endings**: CR-only (alte Mac-Exporte), CRLF, LF gemischt

Ein Pilot droht ohne diese Robustheit am Datenimport zu scheitern, nicht am Solver.

## Ziel

(a) Pre-defined Mapping-Presets für 2–3 reale Format-Strukturen, (b) robuste Import-Diagnostik im UI mit klarer Trennung "Datei lesbar" vs. "Daten verwendbar".

## Akzeptanzkriterien

### Adapter

- [ ] `apps/web/src/csv/presets/` mit Preset-Files (TypeScript-Konstanten):
  - `meso-classic.ts`: Beispiel-Schema einer typischen MESO-Export-Struktur (anonymisiert, basierend auf öffentlich verfügbaren MESO-Schema-Dokumentationen)
  - `ewo-niedersachsen.ts`: Beispiel-Struktur eines Niedersächsischen EWO-Exports
  - `voiseinwohner-stuttgart.ts`: Beispiel einer VOIS-Einwohner-Export-Struktur
- [ ] Pro Preset: Mapping-Tabelle CSV-Spalte → semantisches Feld + Transformations-Regel (z.B. "AltersGrp" → `age_band` mit Mapping-Lookup)
- [ ] UI: "Format wählen"-Dropdown im CSV-Import-Schritt; Default "Manuell mappen"
- [ ] Bei Preset-Auswahl: Mapping wird vorausgefüllt, Nutzerin kann individuell überschreiben

### Diagnostik

- [ ] Strukturierte Import-Diagnose-Meldungen statt einer langen Liste:
  - **Encoding-Diagnose**: erkanntes Encoding + Fallback-Versuche
  - **Zeilen-Statistik**: gesamte Zeilen, gültige Zeilen, übersprungene Zeilen mit Gründen
  - **Doppelte `person_id`**: Liste der ersten 10
  - **Leere `person_id`**: Anzahl + erste 10 Zeilen-Nummern
  - **Unbekannte Werte pro Kategorie-Spalte**: z.B. "Bildung enthält 'unbekannt' (47×) — wird in keine Kategorie fallen"
  - **Spalten ohne Mapping**: Liste der ignorierten CSV-Spalten + Bestätigung
- [ ] UI-Trennung:
  - **Grün**: Datei lesbar UND Daten verwendbar
  - **Gelb**: Datei lesbar, aber X Zeilen werden ignoriert (z.B. Duplikate). Nutzerin entscheidet
  - **Rot**: Datei nicht lesbar oder weniger als Mindestanzahl gültige Zeilen für Panel-Größe
- [ ] Diagnose-JSON-Export: Nutzerin kann die strukturierten Befunde als `import-diagnose.json` runterladen für Audit
- [ ] Audit-JSON erweitert: optionales `import_diagnostics`-Feld, das die Diagnose zum Lauf-Zeitpunkt mitführt

### Tests

- [ ] Fixtures unter `tests/fixtures/real-csv-shapes/`:
  - `meso-classic-anonymized.csv` (50 Zeilen, CP1252, alle Edge-Cases)
  - `ewo-niedersachsen-anonymized.csv` (50 Zeilen, mit halben Zeilen)
  - `vois-stuttgart-anonymized.csv` (50 Zeilen, mit gemischten Line-Endings)
- [ ] Vitest: pro Fixture testet, dass der Preset-Adapter zur erwarteten Anzahl gültiger Zeilen führt
- [ ] Playwright-E2E: lädt eine reale Fixture, wählt Preset, prüft Diagnose-Banner + Pool-Summary

## Out of Scope

- API-Pull aus Melderegister-Systemen (Iteration 4+)
- OCR aus Papier-Listen (Iteration 4+)
- Weitere Adapter über die drei Beispiele hinaus — kommt mit Pilot-Kommune-Bedarf
- Excel-Import (.xlsx) — Iteration 3, wenn überhaupt sinnvoll

## Verweise

- #05 ursprüngliche Scope-Beschränkung: `.issues/archived/05-csv-import-and-mapping/ISSUE.md:36-41`
- Aktuelle Parser-Implementation: `apps/web/src/csv/parse.ts`
- P1-2 Original-Forderung: `sortition-tool/06-review-consolidation.md`
- Codex M4: `sortition-tool/06-review-consolidation.md`
