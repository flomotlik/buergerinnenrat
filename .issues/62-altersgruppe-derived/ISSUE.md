---
id: 62
slug: altersgruppe-derived
title: Altersgruppe aus Geburtsjahr ableiten + Default-Achsen-Logik präzisieren
track: Z
estimate_pt: 0.5
status: planned
depends_on: [57, 61]
priority: high
priority_rationale: "Stratifikation ohne Alter ist demografisch unvollständig — heute: nur Geschlecht + Sprengel als Default, weil Geburtsjahr nicht als Band erkannt wird"
---

# Altersgruppe aus Geburtsjahr ableiten

## Kontext

User-Live-Test mit der Beispiel-CSV (Herzogenburg-Format, hat `geburtsjahr` als numerische Spalte) zeigte: nur `geschlecht` und `sprengel` werden als Default-Stratifikations-Achsen ausgewählt. **Altersgruppe fehlt.**

Echte Melderegister enthalten Geburtsjahr, NICHT Altersgruppe — deshalb darf die Generator-CSV das auch nicht. Die Berechnung der Altersgruppe ist Aufgabe des **Tools**, nicht der Datei.

User-Statement: "Du kannst immer davon ausgehen dass wir Geschlecht und Alter haben, Sprengel oder ein anderes Feld wird dann noch explizit vorgeschlagen". Klar formuliert:

- **Pflicht-Default-Achsen**: Geschlecht + Altersgruppe (immer, wenn Felder vorhanden)
- **Optionale zusätzliche Achse**: Sprengel / District / Bezirk (erstes gefundenes Geo-Feld)

## Ziel

CSV-Parser detektiert `geburtsjahr` und ergänzt eine virtuelle Spalte `altersgruppe`. Auto-Mapping erkennt `altersgruppe` als age-band-Feld. Stage 1 wählt es per Default mit aus. Im UI sichtbar als "berechnet aus geburtsjahr". Audit-Doc dokumentiert das transparent.

## Acceptance Criteria

### Berechnungs-Logik

- [ ] Neue Pure-Funktion `deriveAltersgruppe(geburtsjahr: string, refYear?: number): string | null` in `apps/web/src/csv/derive.ts` (oder `packages/core` falls sinnvoll wiederverwendbar)
- [ ] Bands (Bürgerrat-Standard nach OECD/Sortition Foundation Praxis):
  - `unter-16` (für Vollständigkeit, falls Datei rohe Melderegister-Auszüge enthält)
  - `16-24`
  - `25-44`
  - `45-64`
  - `65+`
- [ ] `refYear` Default: aktuelles Jahr (`new Date().getFullYear()`)
- [ ] Bei nicht-parsbarem geburtsjahr (leer, nicht-numerisch, negativ): Funktion gibt `null` zurück, Zeile ohne altersgruppe
- [ ] Bei zukünftigem Geburtsjahr (refYear < geburtsjahr): null

### CSV-Parser-Integration

- [ ] `apps/web/src/csv/parse.ts`: nach erfolgreichem Parse, wenn `geburtsjahr` in Headers, virtuelle `altersgruppe`-Spalte hinzufügen für jede Zeile
- [ ] Derived-Columns in `ParsedCsv`-Type explizit markieren: neues Feld `derivedColumns: string[]` (Liste der Spalten-Namen die berechnet wurden)
- [ ] Bei Doppelung: wenn CSV bereits `altersgruppe` hat, NICHT überschreiben (User hat eigene Werte mitgebracht)

### Auto-Mapping erweitern

- [ ] `apps/web/src/csv/parse.ts` `DEFAULT_GUESS`: ergänze `altersgruppe: 'age_band'` (existing Mapping hat `alter`, `altersband`, ergänze `altersgruppe`)
- [ ] Stage 1 `recommendedAxes` muss diese Erkennung nutzen — sollte ohne Code-Änderung funktionieren

### Default-Achsen-Logik präzisieren

- [ ] `apps/web/src/stage1/Stage1Panel.tsx` `recommendedAxes`: keine Änderung nötig — die Funktion erkennt schon `gender + age_band + district`
- [ ] **Pflicht-Auswahl bleibt**: Geschlecht + Altersgruppe (wenn vorhanden) sind Default-an
- [ ] **Optionale geographische Achse**: bestehende `district`-Mapping erkennt `sprengel`/`bezirk`/`district` als ein Feld — kein Mehrfach-Default
- [ ] AxisPicker: derive Spalten visuell markieren (Badge "berechnet" o.ä.)

### Audit-Transparenz

- [ ] `Stage1AuditDoc` (in `packages/core/src/stage1/types.ts`): neues Feld `derived_columns?: Record<string, string>` — Map Spalten-Name → Berechnungs-Beschreibung (z.B. `{ altersgruppe: "berechnet aus geburtsjahr; Bands: unter-16, 16-24, 25-44, 45-64, 65+; Stichtag <refYear>" }`)
- [ ] `buildStage1Audit` Aufrufer übergibt die derived-info, optional
- [ ] Audit-Footer-UI zeigt derived columns wenn vorhanden
- [ ] Markdown-Bericht zeigt derived-info im Parameter-Block

### Tests

- [ ] Vitest für `deriveAltersgruppe`: alle Edge-Cases (geburtsjahr=2010 → "16-24" mit refYear=2026, leer → null, "abc" → null, 2027 mit refYear=2026 → null, ältere wie 1940 → "65+")
- [ ] Vitest CSV-parse: nach Parse einer Datei mit `geburtsjahr`, `parsed.headers` enthält `altersgruppe`, `parsed.derivedColumns` enthält `altersgruppe`
- [ ] Vitest CSV-parse: Datei ohne `geburtsjahr` produziert keine derived columns (kein Crash)
- [ ] Playwright: nach Upload Herzogenburg-CSV sind drei Achsen-Checkboxen aktiv: `geschlecht`, `altersgruppe`, `sprengel`
- [ ] Playwright: Stage 1-Lauf nach Upload zeigt im Audit-Footer den Hinweis "altersgruppe (berechnet aus geburtsjahr)"

### Bestehende CSVs

- [ ] Beispiel-CSVs (`apps/web/public/beispiele/herzogenburg-melderegister-8000.csv` etc.) bleiben **unverändert** — kein altersgruppe-column. Berechnung passiert beim Upload.
- [ ] Live-Smoke prüft die berechnete Achse

### Editierbare Bands in der UI mit Selektion vs Info-only

- [ ] Neue UI-Sektion "Altersgruppen-Bänder" unterhalb des AxisPickers, sichtbar nur wenn `altersgruppe` als derived column vorhanden ist
- [ ] Default-Vorschlag (Bürgerrat-typisch):
  - `unter-16` mit Modus **"nur Anzeige"** (Default)
  - `16-24`, `25-44`, `45-64`, `65+` mit Modus **"Auswahl"** (Default)
- [ ] Pro Band konfigurierbar:
  - **Min** (inklusive, ganzzahl ≥0)
  - **Max** (inklusive, ganzzahl, oder leer = open-ended)
  - **Label** (frei text, default auto-generiert "min-max" oder "min+")
  - **Modus**: Auswahl / nur Anzeige (Toggle/Radio)
- [ ] User kann:
  - Boundaries und Modus editieren
  - Bands hinzufügen / entfernen
  - "Vorschlag wiederherstellen"
- [ ] Eingabe-Validierung: Boundaries strikt aufsteigend ohne Lücken/Overlaps, alle ganzzahlig, ≥0, ≤120
- [ ] Bei ungültiger Konfiguration: Vorschau zeigt Fehler-Hinweis, Run-Button bleibt deaktiviert bis behoben

### Display-Only-Bands als Stratum-Allokation auf 0 (nicht Pool-Filter!)

- [ ] **Semantik klar formuliert**: Pool bleibt unverändert (alle CSV-Zeilen). Display-Only-Bands sind reguläre Strata, deren Soll-Allokation auf **n_h_target = 0** gesetzt wird statt proportional.
- [ ] Effekt: keine Personen aus Display-Only-Bands werden gezogen — aber die Daten werden NICHT aus dem Pool entfernt. Die Datei bleibt was sie ist.
- [ ] Hamilton-Allokation bekommt das als Override: Strata mit Modus `display-only` werden als "fixed at 0" behandelt, der Rest wird auf die verbleibenden Selection-Strata proportional verteilt
- [ ] Pool-Summary: "Pool gesamt: 8000 (alle CSV-Zeilen werden stratifiziert; Bänder mit Modus 'nur Anzeige' bekommen Soll=0 — keine Personen daraus werden gezogen)"
- [ ] **Kein** Pool-Filter, **keine** Excel-artige Vorab-Filterung im Tool

### Reporting für Info-only-Bands

- [ ] In Result-View: separate Sektion "Nicht in Auswahl einbezogen" mit Tabelle pro Info-only-Band:
  - Band-Label
  - Anzahl im Pool
  - Hypothetische Soll-Quote bei voller Repräsentativität (proportional auf das gewählte target_n umgerechnet)
  - Hinweis-Text: "Diese Personen wurden nicht gezogen — eigene Verfahrenswege denkbar (z.B. Kinderrat)"
- [ ] Markdown-Bericht enthält die gleiche Tabelle

### Audit-Transparenz für editierbare Bands + Filter

- [ ] `Stage1AuditDoc` erweitert um:
  - `derived_columns?: Record<string, { source: string; description: string; bands?: AgeBandConfig[] }>`
  - `pool_filter?: { original_size: number; filtered_size: number; filter_axis: string; excluded_bands: string[] }`
- [ ] AgeBandConfig: `{ min: number; max: number | null; label: string; mode: 'selection' | 'display-only' }`
- [ ] Audit-Footer-UI zeigt: Bands-Liste mit Mode + ggf. "Pool wurde gefiltert: X von Y Personen, ausgeschlossen: <bands>"
- [ ] Markdown-Bericht analog

### UX-Polish — Erklärung direkt auf der Auswahl-Seite

- [ ] **Erklär-Aside im AxisPicker**: prominente Box (collapsible: "Was bedeutet Stratifikation? ▾"), oberhalb der Checkbox-Liste. Inhalt:
  - **2-3 Zeilen Plain-Language**: "Stratifikation teilt die Bevölkerung in Gruppen nach den ausgewählten Merkmalen ein. Die Stichprobe wird so gezogen, dass jede Gruppe proportional zu ihrem Anteil in der Bevölkerung vertreten ist."
  - **Konkretes Mini-Beispiel** mit Zahlen: "Beispiel: Pool 1.000 Personen, davon 510 weiblich (51 %), 490 männlich (49 %). Bei Stichprobengröße 100: 51 Frauen + 49 Männer werden gezogen. Mit Achse Geschlecht × Altersgruppe entstehen Untergruppen wie 'weiblich/45-64' — jeweils proportional bedient."
  - **Was bedeutet jede gewählte Gruppe**: Live-Anzeige sobald Achsen ausgewählt sind: "Sie haben Geschlecht + Altersgruppe + Sprengel gewählt. Das ergibt **45 Untergruppen** (3 Sprengel × 5 Altersgruppen × 3 Geschlechter)."
- [ ] **Pro-Achse-Tooltip**: jede Checkbox bekommt einen kleinen "?" mit Tooltip-Erklärung des Felds. Beispiel für `geschlecht`: "Geschlecht (m/w/d laut Melderegister) — Standard-Stratifikation in jeder Bürgerrats-Methodik."
- [ ] **Distinct-Values-Warnung**: wenn eine ausgewählte Achse mehr als 15 distinct values hat, zeigt der Vorschau-Block einen Hinweis: "Achse `staatsbuergerschaft` hat 32 verschiedene Werte. Viele Strata werden 0 Personen erhalten. Erwägen Sie, ähnliche Werte zusammenzufassen (Feature kommt mit #63)."
- [ ] Der Erklär-Aside ist als kollabierbar (`<details>`) implementiert — beim ersten Besuch standardmäßig **aufgeklappt**, danach merkt sich Solid-Signal den letzten Toggle-State innerhalb der Session

## Out of Scope

- Generic Binning für andere numerische Spalten — heute nur Geburtsjahr
- Pool-Filter wie "nur AT-Staatsbürger:in", "nur Hauptwohnsitz", "Mindest-Wohndauer" — solche Filter gehören in den Excel-Vorab-Export, nicht ins Tool. Würde sonst die Verantwortung verschieben (Tool wird zum CSV-Pre-Processor).
- Werte-Konsolidierung pro Achse — eigener Issue #63 (combine values)
- Persistenz der Band-Konfig zwischen Sessions
- Mehrere parallel-existierende Alters-Achsen (z.B. "Altersgruppe-grob" + "Altersgruppe-fein")

## Verweise

- Today's autoGuessMapping: `apps/web/src/csv/parse.ts:115-135`
- Today's recommendedAxes: `apps/web/src/stage1/Stage1Panel.tsx:37-47`
- Audit-Doc-Schema: `packages/core/src/stage1/types.ts`
- Generator (bleibt unverändert): `scripts/synthetic-meldedaten/`
- Sortition Foundation Bands-Praxis: <https://www.sortitionfoundation.org/how>
