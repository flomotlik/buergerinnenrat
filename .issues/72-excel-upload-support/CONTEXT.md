# Design-Entscheidungen für #72 (Excel-Upload-Support)

Erfasst am 2026-05-04 via `/issue:discuss`.

## Decisions (locked — research/planner müssen folgen)

### Library: SheetJS (xlsx)
- **`xlsx`** (SheetJS Community Edition, Apache-2.0) ist die finale Wahl.
- Lazy-load via `await import('xlsx')` ist Pflicht — verhindert Bundle-Inflation für CSV-only-User.
- Versions-Pin auf neueste stabile Version, dependabot/renovate watcht Security-Updates.
- npm audit muss nach Add clean bleiben.

### Verzeichnis: Rename `csv/` → `import/`
- `apps/web/src/csv/` wird umbenannt zu `apps/web/src/import/`.
- Files innerhalb: `parse.ts` → `parse-csv.ts`, neue `parse-xlsx.ts`, `derive.ts` bleibt, `CsvImport.tsx` → `FileImport.tsx`, `CsvPreview.tsx` → `FilePreview.tsx`.
- Type `ParsedCsv` → `ParsedTable`, mit `format: 'csv' | 'xlsx'` discriminator. CSV-spezifische Felder (`separator`, `encoding`) werden optional/nur-bei-CSV.
- Test-IDs: `csv-dropzone` → `file-dropzone`, `csv-error` → `file-error`, `csv-preview` → `file-preview`. Alle bestehenden Playwright-Specs entsprechend mitziehen — **das ist ein nontrivialer Migrations-Diff**, muss in einem zusammenhängenden Commit/Branch erfolgen damit Tests grün bleiben.

### Datei-Validierung: Endungs-Check, kein Magic-Bytes
- File-Type-Detection: nur `.xlsx`-Endung → xlsx-Parser. Sonst CSV-Parser.
- Kein Magic-Bytes-Check.
- Begründung: Browser-native No-Backend-App, Daten verlassen das Device nie. Risk-Surface durch umbenannte Files ist niedrig — der User schießt sich selbst ins Knie, nicht andere User.
- Wenn Parser failt (z.B. eine `.csv` mit `.xlsx`-Endung bringt SheetJS zum Crash): klare Fehlermeldung "Datei sieht nicht wie eine gültige Excel-Datei aus. Bitte als .csv speichern oder Datei prüfen." Nicht crash, nicht silent fallback.

### Format-Detail-Behandlung
- **Erstes Worksheet** wird verwendet. Mehrere Worksheets → Warnung im `warnings[]`-Array (nicht-fatal): `Datei enthält N Worksheets, nur das erste ('Tabelle1') wurde importiert.`
- **Erste Zeile = Header**, gleich wie CSV. Leere Header-Zellen → Fehler.
- **Datentypen**: alles als String konvertieren (Engine erwartet Strings, derive.ts macht Typumwandlung).
- **Date-Cells**: SheetJS gibt JS-Date zurück → als ISO-8601-String (`YYYY-MM-DD`) formatieren, kompatibel mit `derive.ts` `geburtsjahr`-Parsing.
- **Number-Cells**: ohne `.0`-Suffix als String, gleich-formatiert wie eine handgeschriebene Number-Cell.
- **Empty Trailing Rows**: ignorieren.
- **Cells mit Formula** (`f`-Property): cached Value verwenden, im `warnings[]`-Array vermerken: `N Zellen enthielten Formeln. Es wurden die zuletzt berechneten Werte verwendet.`

### Out-of-Scope (explizit nicht in #72)
- **`.xls` Legacy Binary Format**: nicht unterstützt (Macro-/Code-Risiko).
- **`.ods` OpenDocument**: separate Issue falls jemals nachgefragt.
- **Multi-Worksheet-Picker UI**: erstes Sheet reicht.
- **Excel-Export** (Audit-Manifeste, Ergebnis-Listen): bleibt CSV/JSON. Manifeste müssen text-diffbar sein für Verifikation.
- **Inline-Edit der xlsx im Browser**: read-only.

## Claude's Discretion (research darf hier explorieren)

- **Drop-Zone-Label und Hint-Text**: konkrete Wordings für "CSV oder Excel hochladen oder hier ablegen" / "CSV (UTF-8/Latin-1) oder Excel (.xlsx) mit Header in Zeile 1".
- **Beispiel-XLSX für den Personenauswahl-Use-Case** (Issue #70-Kontext): synthetisch generieren, Spaltenstruktur passt zum Landeskongress-Use-Case (Gemeinde, Bezirk, Altersband, Funktion, …). Realistische Daten (z.B. ~1500 Zeilen) — Test-Daten-Generator (Issue #57) erweitern oder Konvertierungs-Script.
- **Konvertierungs-Script**: `scripts/csv-to-xlsx.ts` (oder `.py`) das die existierenden Beispiel-CSVs in xlsx konvertiert, deterministisch und reproduzierbar. Im CI laufen lassen damit beide Formate synchron bleiben.
- **In-App-Doku-Erweiterung in `Beispiele.tsx`**: Excel-Beispiele parallel zu CSV mit Download-Buttons. Konkretes Layout offen.
- **Mojibake-Detection für Excel-Strings**: ob das den Aufwand wert ist, oder ob "Wenn Excel verstümmelte Strings enthält, ist die Datenquelle kaputt — wir sind kein Encoding-Fixer" akzeptabel ist.
- **Bundle-Size-Messung**: vor und nach SheetJS-Add die Bundle-Größe messen und in CI gegen ein Budget gaten (siehe #44 ci-benchmark-gate). Bei Lazy-Load sollte main-Bundle unverändert bleiben.

## Deferred (out of scope für #72)

- Excel-Export für Audit-Artefakte.
- `.ods` / `.numbers` / `.gsheet`-Support.
- Multi-Worksheet-Picker UI.
- Inline-Edit oder Cell-Highlighting im Preview.
- Mojibake-Auto-Korrektur (Encoding-Heuristik wie bei CSV).

## Migrations-Risiken (research/planner muss berücksichtigen)

- **Verzeichnis-Rename ist ein großer atomarer Diff**: ~12 Imports, ~5 Test-IDs, alle Playwright-Specs in `apps/web/tests/e2e/csv-*.spec.ts`. Muss in **einem Commit** erfolgen damit zwischen-states keine grünen Tests verlieren.
- **`ParsedCsv` → `ParsedTable` Type-Rename** propagiert in Stage1/Stage3-Code, der die Output-Struktur konsumiert. Type-Search (`tsc --noEmit`) als Gate.
- **Lazy-Load von SheetJS** muss korrekt code-split werden — Vite default macht das via `await import()` automatisch, aber Bundle-Analyzer-Check als Verifikation.

## Bezug

- Bezug zu #70: Excel-Upload ist ein konkreter Bedarf des zweiten Anwendungs-Falls (Personenauswahl für Landeskongress / Parteitag).
- Bezug zu #71: orthogonal — Excel ist Input-Format, Override ist Quoten-Logik.
- Bezug zu #57 (Test-Daten-Generator): erweitern um xlsx-Output, oder Konvertierungs-Script daneben.
- Bezug zu #44 (CI Benchmark Gate): Bundle-Size-Check für Lazy-Load-Verifikation.
