---
id: '72'
title: 'Excel-Support: Upload (.xlsx) und Export für Ergebnis-Listen'
status: open
priority: medium
labels:
- feature
- csv-import
- ux
- frontend
source: github
source_id: 6
source_url: https://github.com/flomotlik/buergerinnenrat/issues/6
---

## Kontext

Heute akzeptiert die App ausschließlich CSV-Dateien als Personen-Pool-Input:

- `apps/web/src/csv/CsvImport.tsx:82-83` — `<input type="file" accept=".csv,.txt,text/csv,text/plain">`
- `apps/web/src/csv/parse.ts` — Papa Parse, Encoding-Detection, Separator-Detection, BOM-Stripping
- Beispiel-Daten ausschließlich CSV: `apps/web/public/beispiele/herzogenburg-*.csv`, `kleinstadt-3000.csv`

**Anforderung der zweiten Anwendungs-Organisation** (siehe #70): Ihre Personen-Listen liegen in **Excel**-Dateien (.xlsx) vor. CSV-Export aus Excel ist eine Hürde (Encoding-Probleme, Komma-vs-Semikolon, "Speichert das wirklich Umlaute richtig?", Trennzeichen-Region-Settings) und führt regelmäßig zu Daten-Verlust oder Fehl-Imports. Direkter Excel-Upload würde das eliminieren.

## Ziel

Excel-Upload (`.xlsx`) parallel zu CSV. Erste Tabellen-Zeile = Header (gleich wie CSV). Erstes Worksheet = Daten (mit klarer Fehlermeldung, falls mehrere Worksheets vorhanden — User soll wählen oder explizit das erste verwenden).

Zusätzlich: ein **Beispiel-Excel-File** im Beispiele-Verzeichnis, parallel zu den CSVs.

## Acceptance Criteria

### Library-Auswahl

- [ ] **Library entschieden** — Vorschlag: **`xlsx`** (SheetJS, Apache-2.0, ~600 kB minified gzipped) oder **`exceljs`** (MIT, ~150 kB ohne Streaming-Module, größer mit). 
- [ ] Lizenz mit Projekt-Lizenz-Strategie (CLAUDE.md S-1, GPL-vs-Apache-Frage) abgleichen — beide oben sind kompatibel mit Apache-2.0 und mit GPL-3.0.
- [ ] **Bundle-Impact** dokumentiert: SheetJS hat eine "Community Edition" auf npm, die Lizenz ist trotzdem Apache-2.0 (offiziell), aber Größe ist relevant. Lazy-load via dynamic import (`await import('xlsx')`) wenn User Excel-File auswählt — verhindert Bundle-Inflation für CSV-Only-User.
- [ ] **Security-Check**: Beide Libraries haben in der Vergangenheit CVEs gehabt (Prototype Pollution, ReDoS). Versionsstand prüfen, npm audit clean halten.

### Parser-Integration

- [ ] Neue Datei `apps/web/src/csv/parse-xlsx.ts` (oder `apps/web/src/import/` als gemeinsames Verzeichnis für CSV+XLSX umbenennen) — siehe Architektur-Frage unten
- [ ] Funktion `parseXlsxFile(file: File): Promise<ParsedCsv>` — gleiches Output-Interface wie `parseCsvFile`, damit Downstream (CsvPreview, Stage1, Quoten-Editor) unverändert bleibt
- [ ] Erstes Worksheet wird verwendet
- [ ] Wenn mehrere Worksheets vorhanden: Warnung im `warnings[]`-Array (nicht-fatal): "Datei enthält N Worksheets, nur das erste ('Tabelle1') wurde importiert."
- [ ] Erste Zeile = Header (analog CSV); leere Header-Zellen werden als Fehler abgelehnt
- [ ] Datentypen: alles als String konvertieren (gleich wie CSV-Pfad — Engine erwartet Strings, derive.ts macht Typumwandlung wo nötig)
- [ ] Date-Cells: SheetJS gibt JS-Date-Objekte zurück — explizit als ISO-8601-String formatieren, damit `geburtsjahr`-Parsing in `derive.ts` funktioniert
- [ ] Number-Cells: Excel speichert "2024" oft als Number; auf String konvertieren ohne `.0`-Suffix
- [ ] Empty rows am Ende werden ignoriert (Excel hängt oft 1000+ leere Zeilen an)

### UI-Integration

- [ ] `CsvImport.tsx` umbenennen → `FileImport.tsx` (oder Komponenten-Namen lassen, intern beide unterstützen)
- [ ] `accept=".csv,.txt,text/csv,text/plain,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"` 
- [ ] Drop-Zone-Label: "CSV oder Excel hochladen oder hier ablegen"
- [ ] Hint: "CSV (UTF-8/Latin-1) oder Excel (.xlsx) mit Header in Zeile 1"
- [ ] File-Type-Detection: Endung `.xlsx` → xlsx-Pfad; sonst CSV-Pfad. Magic-Bytes-Check (PK-Header für ZIP-basierte xlsx) als zusätzliche Sicherheit gegen umbenannte Dateien
- [ ] **`.xls`-Files (Legacy Binary Format) explizit ablehnen** mit klarer Fehlermeldung — SheetJS kann sie zwar parsen, aber Code/Macro-Risiko zu hoch
- [ ] Test-IDs (`data-testid="csv-dropzone"`, `csv-error`, `csv-preview`) bleiben oder werden zu generischeren Namen (`file-dropzone`); bestehende Playwright-Specs entsprechend aktualisieren

### Beispiel-Datei

- [ ] Neue Datei `apps/web/public/beispiele/herzogenburg-melderegister-8000.xlsx` — gleicher Datensatz wie das CSV-Pendant, generiert aus dem CSV (Script in `scripts/`)
- [ ] Mindestens **eine zweite Beispiel-XLSX** für den Personenauswahl-Use-Case (siehe #70): z.B. `delegierten-pool-1500.xlsx` — synthetisch generiert, mit Spalten passend für Landeskongress-Use-Case (Gemeinde, Bezirk, Altersband, Funktion, …)
- [ ] In-App-Doku-Sektion (`apps/web/src/docs/Beispiele.tsx`) listet Excel-Beispiele parallel zu CSV-Beispielen auf, mit Download-Buttons
- [ ] Doku erklärt: Excel-Format-Anforderungen (Header in Zeile 1, ein Worksheet, keine verbundenen Zellen, keine Formeln in Daten — Werte explizit kopieren)

### Architektur-Frage (vor Implementierung klären)

- [ ] **Verzeichnis-Struktur**: Bleibt `apps/web/src/csv/` (irreführender Name, da auch xlsx) oder wird umbenannt zu `apps/web/src/import/`? Letzteres ist sauberer aber bricht Imports — Migration-Plan dokumentieren.
- [ ] **Type-Naming**: `ParsedCsv` umbenennen → `ParsedTable` oder `ParsedSheet`? Gleicher Trade-off Cleanliness vs. Diff-Größe.
- [ ] **Output-Struktur**: bleibt einheitlich. `separator: ',' | ';' | '\t'` in `ParsedCsv` macht für xlsx keinen Sinn — entweder optional machen oder durch `format: 'csv' | 'xlsx'` ersetzen mit format-spezifischen Sub-Feldern.

### Tests

- [ ] Unit-Tests `parse-xlsx.test.ts`: einfaches xlsx, mehrere Worksheets, Date-Cells, Number-Cells, leere Trailing-Rows, leere Header-Cells (Fehler), passwortgeschützte Datei (klare Fehlermeldung statt Crash)
- [ ] Playwright-e2e-Spec: Excel-Upload-Flow analog zum CSV-Flow (`apps/web/tests/e2e/csv-import.spec.ts` als Vorlage)
- [ ] Beispiel-Datei wird via Test als Round-Trip-fähig verifiziert (xlsx-Beispiel laden → parseXlsxFile → erwartete Headers/Row-Count)
- [ ] Magic-Bytes-Test: `.csv` mit umbenannter `.xlsx`-Endung wird durch Magic-Byte-Check abgelehnt (oder akzeptiert mit Warnung — klären)

### Excel-Export (zusätzlich zum Upload)

- [ ] Symmetrisch zum Upload: Wo immer heute "CSV herunterladen" angeboten wird (Versand-Liste Stage 1, Panel + Reserve Stage 3, Ergebnis-View, Audit-Snapshot **nur die menschlich-lesbaren Teile**), wird **zusätzlich** "Excel herunterladen" angeboten — gleicher Inhalt, nur Format anders.
- [ ] Audit-Manifest (signiertes JSON) bleibt **ausschließlich JSON** — text-diffbar, kanonisch, signaturfähig. Excel-Export ist eine zusätzliche Convenience-Form für die Listen-Inhalte, **nicht** für die kryptographischen Manifest-Anteile.
- [ ] Excel-Export-Datei enthält Header-Zeile + Daten, ein Worksheet pro Liste (z.B. `Versand`, `Antwortende`, `Panel`, `Reserve`).
- [ ] **Optional**: ein zweites Worksheet `_audit-info` mit menschlich lesbarer Audit-Zusammenfassung (Verfahren-Name, Seed, Zeitstempel, SHA256 der zugehörigen JSON-Manifest-Datei) — explizit als "Info-Tab, nicht Signatur" gekennzeichnet.
- [ ] Datei-Naming konsistent mit CSV-Pfad: `versand-{verfahren}.xlsx`, `panel-{verfahren}.xlsx`.
- [ ] Excel-Export verwendet **dieselbe** SheetJS-Library wie der Upload (kein zweites Lib-Add).
- [ ] Datei-Format-Test: jeder generierte Export-File wird vom Upload-Pfad erfolgreich re-importiert (Round-Trip-Test).

### Doku

- [ ] In-App-Doku (`apps/web/src/docs/Beispiele.tsx` und ggf. eigene Sektion zu Datenformaten)
- [ ] README.md erwähnt Excel-Support (Upload + Export)
- [ ] `apps/web/public/beispiele/README.md` aktualisieren
- [ ] Doku stellt klar: Excel-Export ist Convenience für Office-Workflows. **Audit-Verifikation läuft über das JSON-Manifest**, nicht über die Excel-Datei. Wer die Auswahl prüfen will, prüft das JSON, nicht die XLSX.

## Out-of-Scope

- `.xls` (Legacy Binary, vor Excel 2007) — bewusst nicht unterstützt, Sicherheitsrisiko durch Macros
- `.ods` (OpenDocument Spreadsheet) — späteres Issue, kleine Nutzergruppe
- Multi-Worksheet-Picker UI ("welches Sheet importieren?") — erstes Sheet reicht für jetzt, nur Warnung
- Inline-Bearbeitung in der App (xlsx-Lib bleibt nur lesend)
- **Audit-Manifest in Excel-Form** — Manifest bleibt JSON, weil text-diffbar und signaturfähig. Excel-Export gilt nur für **menschlich lesbare Listen** (Ergebnis-Panel, Versand-Liste, Reserve-Liste).

## Risiken

- **Bundle-Größe**: SheetJS kann je nach Build-Konfig 600 kB+ ergänzen. Lazy-load via `await import()` ist Pflicht.
- **Lizenz**: SheetJS Community Edition ist Apache-2.0 (`https://github.com/SheetJS/sheetjs`). exceljs ist MIT. Beide kompatibel mit S-1-Strategie.
- **Encoding-Probleme verschwinden NICHT vollständig**: xlsx ist UTF-8-by-spec, aber Datei-Inhalt kann trotzdem verstümmelte Strings enthalten wenn sie aus Legacy-Quellen stammen. Validierung (Mojibake-Detection) sollte erwogen werden.
- **Macros / Formeln**: SheetJS evaluiert Formeln nicht standardmäßig. Aber Cells mit `f`-Property (formula) sollten loggen (Warnung), damit User merkt: "deine Datei hatte Formeln, ich habe nur die Cached-Werte gelesen."

## Bezug

- Folgt aus #70 (Personenauswahl-Use-Case) — die zweite Organisation arbeitet primär mit Excel
- Mit #71 (editierbare Gruppen-Allokation) bilden #70/#71/#72 zusammen das "Personenauswahl-Pack" für Iteration 2
- Test-Daten-Generator #57 könnte erweitert werden, um auch `.xlsx`-Beispiele zu erzeugen (oder Konvertierungs-Script daneben)
