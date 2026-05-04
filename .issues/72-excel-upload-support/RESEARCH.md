# Research: Excel-Support (.xlsx Upload + Export für Ergebnis-Listen)

**Researched:** 2026-05-04
**Issue:** 72-excel-upload-support
**Confidence:** HIGH (codebase analysis, library facts verified against SheetJS official docs and CVE registries)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

1. **Library: SheetJS Community Edition `xlsx`** (Apache-2.0). Lazy-load via `await import('xlsx')`. Pinned version, npm audit clean.
2. **Verzeichnis-Rename `apps/web/src/csv/` → `apps/web/src/import/`**. Files: `parse.ts → parse-csv.ts`, neue `parse-xlsx.ts`, `derive.ts` bleibt, `CsvImport.tsx → FileImport.tsx`, `CsvPreview.tsx → FilePreview.tsx`. Type `ParsedCsv → ParsedTable` mit `format: 'csv' | 'xlsx'` discriminator. Test-IDs `csv-* → file-*` (atomar in einem Commit).
3. **Validierung: Nur Endungs-Check, kein Magic-Bytes.** `.xlsx` → SheetJS, sonst Papa Parse. Bei Parse-Failure klare Fehlermeldung (kein silent fallback).
4. **Format-Detail-Behandlung:** Erstes Worksheet, Header in Zeile 1 (leer = Fehler), alle Cells als String, Date → ISO-8601 (`YYYY-MM-DD`), Number ohne `.0`-Suffix, leere Trailing-Rows ignorieren, Formula-Cells nutzen cached Value + Warning.
5. **Excel-Export symmetrisch zu CSV-Export** (Versand-Liste, Panel, Reserve, Ergebnis-View). Audit-Manifest bleibt JSON. Optional 2. Sheet `_audit-info` mit menschenlesbarer Zusammenfassung (kein Signaturanteil).

### Claude's Discretion

- Drop-Zone-Wording für CSV+Excel
- Beispiel-XLSX-Inhalt für Personenauswahl-Use-Case (`delegierten-pool-1500.xlsx`)
- Konvertierungs-Script (`scripts/csv-to-xlsx.ts`) und CI-Integration
- In-App-Doku-Layout in `Beispiele.tsx`
- Mojibake-Detection für xlsx-Strings (vermutlich nicht nötig)
- Bundle-Size-Messung-Setup

### Deferred Ideas (OUT OF SCOPE)

- `.xls` (Legacy Binary), `.ods` (OpenDocument), `.numbers`, `.gsheet`
- Multi-Worksheet-Picker UI
- Inline-Edit oder Cell-Highlighting
- Mojibake-Auto-Korrektur
- Audit-Manifest in Excel-Form
</user_constraints>

## Summary

Excel-Support bedeutet drei distincte Arbeitspakete: (a) ein **atomarer Verzeichnis-Rename** mit ~12 Import-Updates, ~8 distinct Test-IDs in 13 Test-Dateien und einem Type-Rename — das ist mechanisch, aber muss in einem Commit grün durchgehen; (b) **SheetJS-Integration** als lazy-loaded Parser + Writer (xlsx@0.20.3 von SheetJS-CDN, **nicht npm-Registry** weil dort CVE-anfällig 0.18.5 stale steht); (c) **Excel-Export** symmetrisch zu drei bestehenden CSV-Download-Stellen (Stage-1 Versand, Stage-3 Panel, Stage-3 Audit-Snapshot ohne Signatur-Felder).

SheetJS lazy-loaded via `await import('xlsx')` wird von Vite 6 automatisch in einen separaten async-Chunk gesplittet. Der main-Bundle (heute 99 KB raw / ~33 KB gzip nach #65) bleibt unverändert. Erwarteter neuer xlsx-Chunk: ~430 KB raw / ~140 KB gzip (ungetestet, aber konsistent mit Community-Berichten für `xlsx-0.20.3` ohne `xlsx.mini`-Variante). Da Stage-1-User CSV bevorzugen werden, lädt der Chunk nur on-demand.

**Primary recommendation:** Plane drei Tasks getrennt: (1) Rename + Type-Discriminator (mechanisch, zero functional change, alle Tests grün als Akzeptanz), (2) xlsx-Parser hinzufügen + UI-Erweiterung (neuer Code-Pfad, neue Tests), (3) Excel-Export an drei Stellen + Round-Trip-Test (symmetrisch zur Read-Seite, gleiche lazy-load-Strategie). Konvertierungs-Script `scripts/csv-to-xlsx.ts` als 4. Task (Beispiele + CI-Sync). Die Tasks 1→2→3 sind sequentiell zwingend; 4 kann parallel zu 2 laufen.

## Codebase Analysis

### Relevant Code

| File | Purpose | Last Modified | Relevance |
|------|---------|---------------|-----------|
| `apps/web/src/csv/parse.ts` | CSV-Parser, ParsedCsv-Type, Mapping-Logic | (since #05) | RENAME zu `parse-csv.ts`; Type wird `ParsedTable` |
| `apps/web/src/csv/CsvImport.tsx` | Drop-zone + Mapping-UI (Stage 3) | (since #05) | RENAME zu `FileImport.tsx`; `accept` und Wording erweitern |
| `apps/web/src/csv/CsvPreview.tsx` | Tabellen-Preview-Komponente | (since #53) | RENAME zu `FilePreview.tsx`; format-agnostisch — kein Logikwechsel |
| `apps/web/src/csv/derive.ts` | `geburtsjahr → altersgruppe` derivation | (since #62) | NICHT umbenennen (Name beschreibt Funktion, nicht Format). Bleibt `derive.ts` im neuen `import/` Dir. |
| `apps/web/src/stage1/Stage1Panel.tsx` | Stage-1 UI (Upload + Run + Export) | (since #65) | Imports updaten (`../csv/* → ../import/*`); Drop-zone-Wording + `accept` erweitern; CSV-Download um Excel-Variante ergänzen |
| `apps/web/src/stage1/runStage1.ts` | Stage-1 Glue Logic, ParsedCsv-Konsument | — | Type-Import `ParsedCsv → ParsedTable` |
| `apps/web/src/run/RunPanel.tsx` | Stage-3 Run UI mit Panel-CSV-Export | (since #10) | Excel-Export-Button hinzufügen |
| `apps/web/src/run/audit.ts` | `selectedToCsv()` + `downloadBlob()` Helper | — | `selectedToXlsx()` daneben hinzufügen, gleiche Signatur |
| `apps/web/src/App.tsx` | Wires CsvImport into Stage 3 | — | Imports updaten; `<CsvImport>` JSX-Element wird `<FileImport>` |
| `packages/core/src/stage1/csv-export.ts` | RFC-4180 CSV-Writer für Versand-Liste | (since #11) | `xlsx-export.ts` als Geschwister-Datei; Sheet-Schreiben mit gleichen Headers/Rows/Selected-Indices |
| `packages/core/src/stage1/index.ts` | Public exports | — | Neuen `stage1ResultToXlsx()` exportieren |
| `apps/web/public/beispiele/herzogenburg-melderegister-8000.csv` | 620 KB CSV, 8000 Personen, Stage-1-Vollbevölkerung | — | Wird zu `.xlsx` konvertiert; CSV bleibt zusätzlich. |
| `apps/web/src/docs/Beispiele.tsx` | Beispiel-File-Liste (4 Einträge derzeit) | (since #57) | Neue xlsx-Einträge hinzufügen; Layout offen aber `sample-grid` ist da |

### Interfaces

<interfaces>
// From apps/web/src/csv/parse.ts — wird zu apps/web/src/import/parse-csv.ts
export type SupportedEncoding = 'utf-8' | 'windows-1252' | 'iso-8859-1';

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
  separator: ',' | ';' | '\t';
  encoding: SupportedEncoding;
  warnings: string[];
  derivedColumns: string[];   // headers added by parse pipeline (z.B. 'altersgruppe')
}

export async function parseCsvFile(file: File, refYear?: number): Promise<ParsedCsv>
export function parseCsvBuffer(buf: ArrayBuffer, refYear?: number): ParsedCsv

export const SEMANTIC_FIELDS = [
  'person_id', 'gender', 'age_band', 'education',
  'migration_background', 'district',
] as const;
export type SemanticField = (typeof SEMANTIC_FIELDS)[number];
export type ColumnMapping = Record<string, SemanticField | '__ignore__'>;

export interface MappingValidation {
  ok: boolean;
  errors: string[];
  duplicate_person_ids: string[];
}

export function autoGuessMapping(headers: readonly string[]): ColumnMapping
export function validateMapping(rows: Record<string, string>[], mapping: ColumnMapping): MappingValidation
export function applyMapping(rows: Record<string, string>[], mapping: ColumnMapping): Record<string, string>[]

// PROPOSED replacement (CONTEXT.md decision) — both csv and xlsx parsers return this:
export interface ParsedTable {
  format: 'csv' | 'xlsx';
  headers: string[];
  rows: Record<string, string>[];
  warnings: string[];
  derivedColumns: string[];
  // CSV-only fields (optional, only populated when format === 'csv'):
  separator?: ',' | ';' | '\t';
  encoding?: SupportedEncoding;
  // XLSX-only fields (optional, only populated when format === 'xlsx'):
  sheetName?: string;        // name des verwendeten Worksheets
  sheetCount?: number;       // gesamtzahl im File (für Multi-Sheet-Warning)
}
// NEW signature:
export async function parseXlsxFile(file: File, refYear?: number): Promise<ParsedTable>

// From apps/web/src/csv/derive.ts — bleibt apps/web/src/import/derive.ts
export type { AgeBand } from '@sortition/core';   // re-export
export const DEFAULT_AGE_BANDS: readonly AgeBand[]  // 5 Bänder, unter-16 + 4 selection bands
export function deriveAltersgruppe(geburtsjahr: string, refYear: number, bands: readonly AgeBand[]): string | null
export function validateBands(bands: readonly AgeBand[]): string | null
export function recomputeAltersgruppe(rows: Record<string, string>[], bands: readonly AgeBand[], refYear: number): Record<string, string>[]

// From apps/web/src/csv/CsvImport.tsx — wird FileImport.tsx
export interface CsvImportProps {
  onLoaded: (data: { parsed: ParsedCsv; mapping: ColumnMapping }) => void;
}
export const CsvImport: Component<CsvImportProps>
// PROPOSED rename: FileImportProps mit `parsed: ParsedTable`

// From apps/web/src/csv/CsvPreview.tsx — wird FilePreview.tsx
export interface CsvPreviewProps {
  headers: string[];
  rows: Record<string, string>[];
  maxRows?: number;            // default 5
}
export const CsvPreview: Component<CsvPreviewProps>
// PROPOSED rename: FilePreview, Props bleiben format-agnostisch

// From apps/web/src/run/audit.ts
export function selectedToCsv(pool: Pool, selectedIds: string[]): string
export function downloadBlob(filename: string, content: string, mime: string): void
// PROPOSED add (must accept ArrayBuffer | Uint8Array for xlsx binary):
export function downloadBinaryBlob(filename: string, content: ArrayBuffer | Uint8Array, mime: string): void
export function selectedToXlsx(pool: Pool, selectedIds: string[]): ArrayBuffer  // wraps SheetJS write()

// From packages/core/src/stage1/csv-export.ts
export interface Stage1CsvOptions { includeGezogenColumn?: boolean }
export interface Stage1CsvResult { csv: string; warnings: string[] }
export function rfc4180Quote(value: string): string
export function stage1ResultToCsv(headers: string[], rows: Record<string, string>[], selected: number[], opts?: Stage1CsvOptions): Stage1CsvResult
// PROPOSED add (no rfc4180 needed — SheetJS escapes itself):
export interface Stage1XlsxResult { buffer: ArrayBuffer; warnings: string[] }
export function stage1ResultToXlsx(headers: string[], rows: Record<string, string>[], selected: number[], opts?: Stage1CsvOptions): Stage1XlsxResult

// From SheetJS xlsx@0.20.3 — relevant API surface (per docs.sheetjs.com)
import * as XLSX from 'xlsx';
XLSX.read(data: ArrayBuffer, opts: { type: 'array', cellDates?: boolean }): XLSX.WorkBook
XLSX.utils.sheet_to_json<T>(ws, opts: { header?: 1 | string[], raw?: boolean, defval?: string, blankrows?: boolean }): T[]
XLSX.utils.aoa_to_sheet(rows: any[][]): XLSX.WorkSheet
XLSX.utils.json_to_sheet(rows: object[]): XLSX.WorkSheet
XLSX.utils.book_new(): XLSX.WorkBook
XLSX.utils.book_append_sheet(wb: WorkBook, ws: WorkSheet, name: string): void
XLSX.write(wb: WorkBook, opts: { bookType: 'xlsx', type: 'array' }): ArrayBuffer
// Workbook structure: wb.SheetNames: string[]; wb.Sheets: Record<string, WorkSheet>
</interfaces>

### Reusable Components

- **`CsvPreview`** (in `CsvPreview.tsx`) ist bereits format-agnostisch — nimmt `headers + rows`, weiß nichts von CSV. Nach Rename zu `FilePreview` zero behavior change.
- **`derive.ts`** (`deriveAltersgruppe`, `recomputeAltersgruppe`) operiert auf `Record<string, string>` → funktioniert für xlsx-rows out-of-the-box, sobald Cells als Strings konvertiert sind. Kein Code-Änderung nötig.
- **`autoGuessMapping`** (in `parse.ts`) ist headers-only → format-agnostisch. Bleibt unverändert.
- **`validateMapping`, `applyMapping`** sind rows-only → bleiben unverändert.
- **`stage1ResultToCsv`** als Vorlage für `stage1ResultToXlsx` (gleiche Signatur, gleiche Semantik incl. `gezogen`-Spalte).
- **`downloadBlob`** funktioniert für Strings; für Excel-Binary-Output braucht es eine `downloadBinaryBlob`-Variante (oder polymorpher Helper).

### Potential Conflicts

- **`apps/web/src/stage1/Stage1Panel.tsx:472-473`** zeigt `separator` und `encoding` direkt an: `{p().rows.length} Zeilen geladen ({p().headers.length} Spalten, {p().separator === '\t' ? 'TAB' : p().separator}-getrennt, Encoding <code>{p().encoding}</code>).` — das wird mit `ParsedTable` und optionalem separator/encoding zu Conditional-Render. Plane: bei `format === 'xlsx'` zeige `Worksheet 'Tabelle1' (1 von N)` statt Trenner+Encoding.
- **Drop-Zone-Wording** an zwei Stellen: `CsvImport.tsx:79-80` ("CSV hochladen oder hier ablegen"/"CSV mit Header-Zeile, UTF-8 oder Latin-1") UND `Stage1Panel.tsx:436-437` (gleiche Strings dupliziert). Beide updaten.
- **Test-ID-Drift Risiko**: Es gibt zwei distincte Testid-Familien — `csv-*` (in `CsvImport.tsx`) UND `stage1-csv-*` (in `Stage1Panel.tsx`). CONTEXT.md sagt `csv-* → file-*`. **Frage für Planner:** sollen `stage1-csv-*` ebenfalls mitziehen (`stage1-file-*`)? Empfehlung: ja, sonst bleibt der Misnomer stehen. 13 Test-Specs müssen mit. (Siehe Aufstellung unten.)
- **`CsvImport`-Komponente wird in genau einem JSX-Element verwendet** (`apps/web/src/App.tsx:264`). Kein breiter Blast-Radius.
- **`CsvPreview`-Komponente wird in genau einem JSX-Element verwendet** (`apps/web/src/stage1/Stage1Panel.tsx:478`). Kein breiter Blast-Radius.

### Code Patterns in Use

- **Lazy-Load über `await import()`** ist im Repo etabliert: `apps/web/src/App.tsx:17` (`DocsHub`), `:20` (`Overview`). Vite 6 splittet automatisch in async-Chunk. Gleiches Pattern für `xlsx`.
- **Workspace-Layering:** Format-Konvertierungen leben in `packages/core/src/stage1/csv-export.ts` (kein Solid-Code). xlsx-Export sollte **dort** liegen (gleiche Schicht), nicht in `apps/web/`. SheetJS wird damit auch aus `packages/core/` importiert — aber nur lazy aus den Web-Call-Sites; `core` selbst lädt SheetJS nicht synchron.
  - **Achtung:** Wenn `stage1ResultToXlsx` synchron `import * as XLSX` macht, wird SheetJS in den Core-Build gezogen und in jeden Bundle hineingezogen, der Core importiert. Lösung: `stage1ResultToXlsx` in `packages/core` nimmt eine pre-loaded XLSX-Module-Referenz als Parameter (`xlsx: typeof import('xlsx')`) oder ist selbst `async` mit dynamischem Import. Letzteres ist sauberer — Core bleibt Solid-frei und SheetJS-frei zur Build-Zeit.
- **Audit-Workflow** (Stage 1): `runStage1.ts` baut `csv` aus `stage1ResultToCsv` und liefert es im `RunStage1Output`. Excel-Variante kann analog als zweite Property `xlsx?: ArrayBuffer` mitlaufen — **aber** das verdoppelt Speicher und Compute. Besser: Excel wird **on-demand** beim Klick generiert, nicht beim Run. So kostet Excel-Add genau 0 für CSV-Only-User (auch keine xlsx-Lib-Last).

## Standard Stack

| Library | Version | Purpose | Why Standard | Confidence |
|---------|---------|---------|--------------|------------|
| `xlsx` (SheetJS CE) | **0.20.3** (von cdn.sheetjs.com — NICHT npm-Registry) | Excel read + write | Locked decision; Apache-2.0; einzige Library mit beidseitigem Reife-Grad und kleinem-Footprint-Option (`xlsx.mini` — nicht relevant hier weil wir Vollumfang brauchen) | HIGH |
| `papaparse` | `^5.5.3` (existing) | CSV-Parsing — bleibt | Bereits installiert, funktioniert. Nicht ersetzen. | HIGH |

### Installations-Quelle: SheetJS CDN, nicht npm-Registry

**KRITISCH** (verifiziert via SheetJS-Docs und Snyk):

- npm-Registry hat `xlsx@0.18.5` (4 Jahre alt) — **CVE-2023-30533 Prototype Pollution unfixed**.
- Aktuelle Version 0.20.3 ist nur via CDN-Tarball verfügbar. Snyk und npm-audit flaggen Registry-Version permanent.
- Recommended install command (per SheetJS-Doku):
  ```
  pnpm add https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
  ```
- Lockfile pinnt URL+Hash; `pnpm install --frozen-lockfile` (das CI nutzt) ist deterministisch.
- **Dependabot/Renovate-Wirkung**: keiner der beiden tracked Tarball-URL-Dependencies automatisch. Manuelles Watching-Issue im Backlog erstellen, oder wöchentliches CI-Cron-Check gegen `https://cdn.sheetjs.com/`.
- Vendoring-Alternative (per Doku): tarball nach `vendor/xlsx-0.20.3.tgz` ablegen, `pnpm add file:vendor/xlsx-0.20.3.tgz`. Erhöht Repo-Größe um ~280 KB. **Empfehlung:** CDN-URL für jetzt; vendoring nur falls Air-gap-Builds gefordert werden.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `xlsx@0.20.3` | `exceljs` | MIT statt Apache-2.0, ähnlich groß. SheetJS-API ist breiter dokumentiert; CONTEXT.md hat SheetJS gelockt. Nicht weiter erwägen. |
| Tarball-URL | `xlsx@0.18.5` (npm-Registry) | CVE-30533 unfixed. **Ablehnen.** |
| Vollumfang-`xlsx` | `xlsx.mini.js` (Slim-Build) | Mini-Build dropt `.xlsb`/`.xls`/Lotus/SpreadsheetML. **Akzeptabel** für unseren Use-Case (nur `.xlsx`). Aber: Mini-Build ist als loose Datei in der Tarball, kein npm-Subpath. Komplizierterer Setup. **Empfehlung:** Vollumfang erstmal, Mini optimieren falls Bundle-Budget gerissen wird. |

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ZIP/XML-Parsing für .xlsx | Eigenen Parser | SheetJS `XLSX.read(buf, {type:'array'})` | xlsx ist verschachteltes ZIP+XML mit eigener Date-Serial-Logik. Nicht selbst bauen. |
| Date-Serial-Konvertierung Excel | Manuelle (offset-1900-bug etc.) | SheetJS `cellDates: true` Option | Excel-Daten haben Leap-Year-Bug 1900, OS-spezifische Formate. SheetJS handled das. |
| RFC-4180-Quoting für CSV | (bereits vorhanden) | `rfc4180Quote()` in `packages/core/src/stage1/csv-export.ts:17` | Existiert. Nicht duplizieren für xlsx. |
| File-Download Trigger | Eigenes `<a download>`-Wiring | Bestehende `downloadBlob()` in `apps/web/src/run/audit.ts:190` | Existiert. Erweitern für ArrayBuffer (oder zweite Variante daneben). |
| Magic-bytes-Detection | (CONTEXT.md sagt nein) | Endungs-Check + try-catch um Parser | Locked decision. |

## Architecture Patterns

### Recommended Approach

1. **Verzeichnis-Rename als isolierter Diff:**
   - `git mv apps/web/src/csv apps/web/src/import` (preserves history)
   - `git mv apps/web/src/import/parse.ts apps/web/src/import/parse-csv.ts`
   - `git mv apps/web/src/import/CsvImport.tsx apps/web/src/import/FileImport.tsx`
   - `git mv apps/web/src/import/CsvPreview.tsx apps/web/src/import/FilePreview.tsx`
   - Sed-Pass für 9 Import-Pfade (`csv/parse → import/parse-csv`, `csv/derive → import/derive`, `csv/CsvImport → import/FileImport`, `csv/CsvPreview → import/FilePreview`)
   - Type-Rename `ParsedCsv → ParsedTable` mit Discriminator (siehe Interfaces oben)
   - JSX-Tag-Rename `<CsvImport> → <FileImport>` in `App.tsx:264`
   - Test-ID-Rename `csv-* → file-*` (siehe Map unten) — auch für `stage1-csv-* → stage1-file-*` empfohlen
   - **Acceptance:** `pnpm typecheck && pnpm test && pnpm test:e2e` alle grün; Functional-Equivalence mit Pre-Rename
   - **Atomar im einen Commit/PR.** Kein Half-State der einen Test-Spec rot ließe.

2. **`parse-xlsx.ts` als Geschwister von `parse-csv.ts`:**
   - Lazy-load via `const XLSX = await import('xlsx')` innerhalb von `parseXlsxFile()` — der Top-Level-Import wäre eager.
   - `XLSX.read(arrayBuffer, { type: 'array', cellDates: true })` — `cellDates: true` gibt Date-Objekte statt Excel-Serials.
   - `XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '', blankrows: false })` — `header: 1` gibt 2D-Array (erste Zeile = Header), `raw: false` formatiert Numbers/Dates per `dateNF`-Default. **Aber Date-Pattern ist nicht ISO-8601 by default** — siehe Pitfall.
   - Cells-zu-Strings-Konvertierung in eigener Map-Schleife: Date → `toISOString().slice(0,10)` (→ `YYYY-MM-DD`); Number → `String(v)` (kein `.toFixed()` wegen `.0`-Suffix-Anforderung).
   - Multi-Sheet-Detection: `wb.SheetNames.length > 1` → Warning in Output.
   - Formula-Cell-Detection: `for (const cell of Object.values(ws)) if (typeof cell === 'object' && 'f' in cell) formulaCount++` → Warning.
   - `derive.ts` läuft am Ende identisch wie für CSV (geburtsjahr → altersgruppe).

3. **`stage1ResultToXlsx` in `packages/core/src/stage1/xlsx-export.ts`:**
   - Async function, dynamic import von `xlsx` innerhalb (Core selbst importiert SheetJS NICHT zur Build-Zeit).
   - `XLSX.utils.aoa_to_sheet([headers, ...selectedRowsAs2DArray])` baut Worksheet
   - `XLSX.utils.book_new()` + `book_append_sheet(wb, ws, 'Versand')`
   - Optional zweites Sheet `_audit-info` mit `aoa_to_sheet([['Verfahren', name], ['Seed', seed], ...])`
   - `XLSX.write(wb, { bookType: 'xlsx', type: 'array' })` → ArrayBuffer
   - MIME für Download: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

4. **UI-Buttons:** Neben jedem CSV-Download-Button ein zweiter "Excel herunterladen". Drei Stellen (siehe nächste Sektion).

### Anti-Patterns to Avoid

- **Synchroner Top-Level `import * as XLSX from 'xlsx'`** in `apps/web/src/`: zerstört Lazy-Load, blässt main-Bundle um ~430 KB raw auf.
- **Synchroner Import in `packages/core/`:** zieht xlsx in Core-Bundle, das auch von Vitest-Tests in `packages/core/tests/` importiert wird → Tests langsamer, Build inkonsistent.
- **`raw: true`** in `sheet_to_json`: gibt Excel-Date-Serials (z.B. `45292`) statt Date-Objekten. Mit `raw: false` + `cellDates: true` bekommt man strukturierte Date-Objekte, die wir manuell in ISO-8601 String konvertieren.
- **`writeFile()`** statt `write()`: `writeFile` triggert direkten Download, umgeht unsere `downloadBlob`-Symmetrie. `write()` mit `type: 'array'` gibt ArrayBuffer zurück, dann eigener Download.
- **Excel als Second-Sheet im Audit-Manifest:** CONTEXT.md ablehnung — Audit bleibt JSON.
- **Magic-Bytes-Check nachträglich einbauen:** locked decision sagt nein.
- **Eager-Build des Excel-Outputs in `runStage1.ts`:** verdoppelt Compute & RAM für 99 % der User die nur CSV exportieren. On-demand bei Klick.

## CSV-Export-Stellen, die als Excel-Export gespiegelt werden müssen

(Inventory aus `grep`-Pass über `apps/web/src/` und `packages/core/src/stage1/`.)

| File:Line | Was wird heruntergeladen | UI-Element |
|-----------|--------------------------|------------|
| `apps/web/src/stage1/Stage1Panel.tsx:337` | Versand-Liste (Stage 1 Output, RFC-4180-CSV) — `versand-{seed}.csv` via `out.csv` von `stage1ResultToCsv` | Button (impliziert `data-testid="stage1-download-csv"`) |
| `apps/web/src/stage1/Stage1Panel.tsx:343-348` | Audit-JSON Stage 1 — `versand-audit-{seed}.json` | Audit-Button. **NICHT** für Excel-Export — bleibt JSON. |
| `apps/web/src/stage1/Stage1Panel.tsx:354` | Markdown-Bericht Stage 1 — `versand-bericht-{seed}.md` | Bericht-Button. **NICHT** für Excel — bleibt MD. |
| `apps/web/src/run/RunPanel.tsx:53` | Panel-CSV Stage 3 — `panel-{seed}.csv` via `selectedToCsv(pool, r.selected)` | Button `data-testid="run-export-csv"` |
| `apps/web/src/run/RunPanel.tsx:67` | Audit-JSON Stage 3 — `audit-{seed}.json` | Button `data-testid="run-export-audit"`. **NICHT** für Excel — bleibt JSON. |
| `apps/web/src/quotas/QuotaEditor.tsx:72` | `quotas.json` (Konfig-Snapshot) | Quota-Editor-Button. **NICHT** für Excel — Konfig bleibt JSON. |

**Resultat:** Nur **2 Stellen** (`Stage1Panel:337` und `RunPanel:53`) bekommen einen "Excel herunterladen"-Button daneben. Der Reserve-Liste-Export aus #47 ist noch nicht im Code (Issue offen) — wenn #47 vor #72 lands, dort dieselbe Excel-Variante anbringen; sonst markieren als Followup.

## Common Pitfalls

### Pitfall 1: Excel-Date-Cells werden zu Excel-Serials statt Strings

**What goes wrong:** Default `XLSX.utils.sheet_to_json` ohne Optionen gibt für Date-Cells den numerischen Excel-Serial-Wert (z.B. `45292` für 2024-01-01). `derive.ts` parst das als Geburtsjahr `45292` → über Reference-Year → invalid → leere `altersgruppe` ohne Fehler.
**Why it happens:** Excel speichert Daten als 1900-basierte Serials; SheetJS reicht den raw-Number durch.
**How to avoid:** Always pass `cellDates: true` to `XLSX.read()` UND in der Konvertierungs-Schleife `if (val instanceof Date) val.toISOString().slice(0, 10)` (für `YYYY-MM-DD`).
**Warning signs:** Tests mit Date-Cell-Fixture sehen leere `altersgruppe` in der Output-Row, oder `geburtsjahr`-Werte > 9999.

### Pitfall 2: Number-Cells bekommen `.0`-Suffix

**What goes wrong:** `sheet_to_json` mit `raw: false` formatiert Number-Cells je nach Zellformat. Eine Cell mit Wert `2024` ohne explizites Format kommt als `'2024'`; eine mit Format `0.00` kommt als `'2024.00'`.
**Why it happens:** SheetJS respektiert Excel-Cell-Formats.
**How to avoid:** Eigene Konvertierungs-Schleife: `if (typeof v === 'number') v = String(v)` — `String()` gibt für Integers keinen Decimal-Suffix.
**Warning signs:** `geburtsjahr` enthält `'2024.0'` statt `'2024'` → derive.ts schlägt fehl (`Number('2024.0')` ist `2024`, sollte trotzdem klappen, aber Display in Preview zeigt Decimals).

### Pitfall 3: SheetJS npm-Registry-Version 0.18.5 hat unfixed CVE

**What goes wrong:** `pnpm add xlsx` zieht 0.18.5 von npm. CVE-2023-30533 Prototype Pollution. npm-audit fail. CONTEXT.md verlangt clean audit.
**Why it happens:** SheetJS hostet aktuelle Versionen NUR auf cdn.sheetjs.com.
**How to avoid:** Install via `pnpm add https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`. Lockfile-Eintrag enthält URL+Integrity-Hash, deterministisch in CI.
**Warning signs:** `pnpm audit` zeigt CVE-2023-30533 oder CVE-2024-22363 (regex-redos). Wenn so → falsche Quelle.

### Pitfall 4: Vite manualChunks blockt Lazy-Load

**What goes wrong:** `vite.config.ts` hat bereits `manualChunks: { solid: [...] }`. Falls man `xlsx` dort einträgt, wird es eager geladen statt lazy.
**Why it happens:** `manualChunks` mit Library-Name macht den Chunk **statisch importiert**, nicht async.
**How to avoid:** **Nicht** `xlsx` in `manualChunks` setzen. Nur `await import('xlsx')` in den Call-Sites — Vite macht den async-Chunk automatisch.
**Warning signs:** Bundle-Analyzer zeigt `index-*.js` von 99 KB auf >500 KB gewachsen. Network-Tab beim ersten Page-Load zeigt xlsx-Chunk auch ohne File-Upload.

### Pitfall 5: Solid.js JSX-Element-Rename ist case-sensitive

**What goes wrong:** Rename von `<CsvImport>` zu `<FileImport>` muss alle Vorkommen erwischen. JSX nutzt PascalCase; ein verbliebenes `<CsvImport>` ist Build-Error nach Datei-Rename, aber TS prüft strict in `tsc --noEmit`.
**Why it happens:** TypeScript erkennt fehlende Imports — aber nur, wenn die Datei tatsächlich kompiliert wird. JSX in `_visual-iteration*.spec.ts` sind keine TSX.
**How to avoid:** Grep-Audit nach JSX-Tags: `grep -rn "<Csv" apps/web/src/` (es gibt nur 1 Site: `App.tsx:264` für CsvImport, plus `Stage1Panel.tsx:478` für `<CsvPreview>`).
**Warning signs:** `pnpm --filter @sortition/web build` fail mit "CsvImport is not defined".

### Pitfall 6: Test-ID-Rename ohne Test-Update bricht Tests

**What goes wrong:** CONTEXT.md verlangt `csv-* → file-*` Test-ID-Rename. Wenn auch nur ein Test-File nicht mitupdated wird, fail in PR.
**Why it happens:** Playwright-Locators sind String-basiert, kein Type-Check.
**How to avoid:** Vor Commit: `grep -rn "csv-dropzone\|csv-error\|csv-preview\|csv-commit\|csv-validation\|csv-map-" apps/web/tests/ tests/` — muss leer sein nach Rename.
**Warning signs:** e2e-Tests timeouten beim `getByTestId('csv-preview')`-Wait.

### Pitfall 7: Excel-Round-Trip durch unseren Parser ist nicht idempotent

**What goes wrong:** Excel-Cells haben Typen (Number/Date/String/Boolean). Unser Konverter macht alles zu Strings. Re-Upload des selbst-exportierten xlsx liefert nur String-Cells. Wenn der User in Excel zwischenzeitlich rechnet ("`SUM(B2:B10)`"), bekommen wir cached Numerics, nicht die Formel.
**Why it happens:** Beabsichtigte Lossy-Konvertierung.
**How to avoid:** Doku-Section: "Export ist String-Snapshot, kein Excel-natives File. Formeln gehen verloren."
**Warning signs:** User-Bug-Report: "Mein Excel hatte Formeln, jetzt sind das Werte." → erwartet, nicht Bug.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| `pnpm` | Build, Tests, Install | Yes | (workspace) | — |
| `node` | Build, Tests | Yes | 20 (per `.github/workflows/deploy.yml`) | — |
| `vite` | Bundle | Yes | 6.0.7 | — |
| `xlsx` | NEW | NO — install required | Pin 0.20.3 via SheetJS-CDN-Tarball | — |
| `tsx` (für `scripts/csv-to-xlsx.ts`) | NEW (script) | wahrscheinlich vorhanden, ggf. installieren | latest | `node --loader ts-node/esm` |
| Playwright (Chromium+Firefox) | e2e | Yes | 1.49.1 | — |
| GitHub Actions | CI | Yes | — | — |

Keine externen Services, keine Backend-Dependencies. Alles browser-native.

## Test-Patterns (Bestehend → Erweiterung)

### `apps/web/tests/e2e/csv-import.spec.ts` — bestehend (42 Zeilen)

Asserts:
1. Upload synthetic CSV via `<input type="file">`
2. `getByTestId('csv-preview')` visible
3. `getByTestId('csv-validation-ok')` visible
4. Click `csv-commit` → `pool-summary` enthält "100 Personen"
5. Quotas konfigurieren, RunPanel erscheint

**Empfohlene parallele `xlsx-import.spec.ts`** (nach Rename: `file-import.spec.ts` als unified Spec):
- Upload synthetic xlsx fixture (vorab erzeugt durch Konvertierungs-Script)
- `getByTestId('file-preview')` visible
- `getByTestId('file-validation-ok')` visible
- Click `file-commit` → `pool-summary` enthält "100 Personen"
- Quotas konfigurieren → RunPanel
- **Plus** ein Test-Case: Upload XLSX mit 2 Worksheets → assert Warning rendered (`getByTestId('file-warnings')` enthält "2 Worksheets")
- **Plus** ein Test-Case: Upload `.xlsx` mit umbenannter `.csv`-Endung → assert error gerendert (klar "...sieht nicht wie...")

### `packages/core/tests/stage1-csv.test.ts` — bestehend (200+ Zeilen)

Asserts: rfc4180-Quoting, Header-Order, Selected-Order, gezogen-Column, Edge-Cases (leere Zellen, Sonderzeichen).

**Empfohlene parallele `stage1-xlsx.test.ts`:**
- `stage1ResultToXlsx(headers, rows, [0, 1])` → ArrayBuffer
- Round-Trip: ArrayBuffer durch `XLSX.read` → `sheet_to_json` → assert headers/rows match input
- gezogen-Column-Test analog zur CSV-Variante
- Sonderzeichen-Test: `"; , \n` in Cells — assert SheetJS escapt korrekt
- Empty-Selected: leerer Buffer (oder nur Header-Sheet)

### Round-Trip-Test (Issue-AC verlangt es)

```
generate test xlsx → upload via parseXlsxFile → assert headers + row count
   → write again via stage1ResultToXlsx → re-parse → assert identical
```

Empfehlung: **eine** Round-Trip-Spec in `packages/core/tests/stage1-xlsx-roundtrip.test.ts` plus **eine** e2e-Round-Trip in `file-import-export.spec.ts` (lädt Excel, exportiert Panel-Excel, lädt das wieder).

## Konvertierungs-Script: `scripts/csv-to-xlsx.ts`

Empfehlung: TypeScript-Script, run via `pnpm tsx scripts/csv-to-xlsx.ts` — analog zu `scripts/build-tech-manifest.ts` (existiert bereits).

Inhalt:
- Read existierende CSV via `fs.readFileSync` + `Papa.parse`
- Build Workbook via `XLSX.utils.json_to_sheet` oder `aoa_to_sheet`
- Write via `XLSX.writeFile(wb, target)` (script context, kein Browser, daher `writeFile` ok)
- Loop über alle 4 CSV-Beispiele in `apps/web/public/beispiele/*.csv`
- Output: `apps/web/public/beispiele/herzogenburg-melderegister-8000.xlsx` etc.

**CI-Sync:** Neuer Step in `.github/workflows/deploy.yml` (build job) **vor** der Build-Phase:
```
- name: Verify xlsx beispiele in sync with CSV
  run: pnpm tsx scripts/csv-to-xlsx.ts --check
```
Mit `--check` gibt das Script Diff aus statt zu schreiben → fail wenn xlsx älter ist als CSV. Verhindert Drift.

**Determinismus:** SheetJS xlsx-Output ist NICHT byte-deterministisch by default (Timestamps in ZIP-Metadaten, Random IDs). Für `--check`: Vergleiche entpackte XML-Inhalte oder re-parse beide und vergleiche `sheet_to_json` Output. Detail-Frage für den Planner.

### Personenauswahl-Beispiel: `delegierten-pool-1500.xlsx`

Issue verweist auf #70 Use-Case (Landeskongress). Spalten-Vorschlag (Discretion):
- `delegierten_id` — `del-00001`-Stil, sortable
- `vorname`, `nachname` — Namen-Cluster wie Herzogenburg
- `gemeinde` — österreichische Gemeinden, ~50 unique
- `bezirk` — österreichische Bezirke, ~10 unique (für Stratifikation)
- `altersband` — wie `altersgruppe` aber statt `geburtsjahr` direkt vorbereitet (Test-Case für no-derive-needed Path)
- `geschlecht` — w/m/d
- `funktion` — `Vorsitz | Stellvertretung | Schriftführung | Mitglied | Kassier`

**1500 Zeilen** — passt zu Landeskongress-Größe; testet Bands wo derive.ts nicht greift (kein `geburtsjahr`).

Erstellung via Erweiterung von `scripts/synthetic-meldedaten/generator.ts` mit neuem `profile`-Eintrag, oder neues Script `scripts/synthetic-delegierte/generate.ts` daneben. Empfehlung: zweiteres — die Use-Cases sind unterschiedlich genug.

## Bundle-Size-Impact

**Heute** (built `apps/web/dist/`, gemessen 2026-04-26):
- `index-CBaKOgwl.js`: 99 KB raw (~33 KB gzip — extrapoliert von #65-Snapshot)
- `solid-D0WA_Kcl.js`: 17 KB raw / ~7.7 KB gzip
- `highs-B61xkcBQ.js`: 28 KB raw / ~10.8 KB gzip (lazy)
- Sum aller existierenden Lazy-Chunks: ~85 KB raw

**Erwartet nach SheetJS-Add** (extrapoliert aus Community-Berichten und SheetJS-Doku):
- `xlsx-*.js` neuer Lazy-Chunk: ~430 KB raw / ~140 KB gzip — **separat**, nur on-demand
- main `index-*.js`: unverändert (durch async-Chunk-Pattern)
- **Verifikations-Plan:** Vor Add `pnpm --filter @sortition/web build` und `du -sb apps/web/dist/assets/index-*.js` notieren. Nach Add gleicher Befehl. Diff darf NICHT > 5 KB raw sein (sonst Lazy-Load broken).

**Bundle-Delta-Tracking:** Konsistent mit dem Pattern aus `BUNDLE_DELTA.md` (Issue #65) einen Eintrag erstellen: `# Bundle Delta — Issue #72 (Excel support)`. Tabelle für Main+Lazy + Notiz, dass Excel-Chunk nur on-demand fetched wird.

## Project Constraints (from CLAUDE.md)

Diese Direktiven gelten und der Plan muss sie respektieren:

1. **Sprache:** UI-Strings, Doku, Commit-Messages **deutsch**. Code-Kommentare englisch.
2. **Kritisch sein:** Keine positive Affirmation, jede Lib-Behauptung mit Quelle. SheetJS-Versions-Quelle ist hier kritisch (s.o.).
3. **Bei Unsicherheit "unbestätigt" markieren:** Bundle-Größe für xlsx-Chunk ist Schätzung — vor Merge messen.
4. **Lizenz-Frage S-1 (CLAUDE.md):** Apache-2.0 von SheetJS ist kompatibel mit GPL-3.0-or-later (heutiges Ziel) UND mit Apache-2.0-erst-nach-Clean-Room (zukünftig). xlsx ist NICHT der Lizenz-Blocker. (Pyodide-Path ist es, das betrifft #72 nicht.)
5. **Workflow-Stage-Klarheit:** Excel-Upload ist Stage-1-Eingang (Bevölkerungs-File) UND Stage-3-Eingang (Antwortenden-File). Beide UI-Wege (`Stage1Panel` und Stage-3-`CsvImport`-im-`App.tsx`) müssen Excel akzeptieren. Beide bekommen den Drop-zone-Erweiterungs-Patch.

## Risk Register (für den Planner)

### R1: Verzeichnis-Rename als atomarer Diff (HIGH)
- **Risiko:** PR mit ~30 Datei-Änderungen, Tests müssen alle grün bleiben. Half-State würde Tests rot lassen.
- **Mitigation:** Eine separate Task vor dem xlsx-Code, isolierter Commit/PR. Acceptance: zero functional change, zero new feature, alle bestehenden Tests pass.
- **Reihenfolge im Commit:** `git mv` für alle 4 Datei-Renames → Sed/Edit für Imports → Sed/Edit für Test-IDs → Type-Rename (`ParsedCsv → ParsedTable`) mit Discriminator → JSX-Tag-Rename → `pnpm typecheck` → `pnpm test` → `pnpm test:e2e` → commit.

### R2: SheetJS-Bundle-Größe sprengt Lazy-Chunk-Toleranz (MEDIUM)
- **Risiko:** xlsx ist ~430 KB raw. Wenn Lazy-Load broken → 5x main-Bundle.
- **Mitigation:** `pnpm --filter @sortition/web build` mit Bundle-Analyzer oder manueller `du`-Vergleich vor PR-Merge. CI-Gate (Issue #44) idealerweise mit Budget für `index-*.js` ≤ 110 KB raw.

### R3: Test-ID-Rename übersieht Specs (MEDIUM)
- **Risiko:** 13 e2e-Specs, manche referenzieren `stage1-csv-*`, manche `csv-*`. Beim Rename eine vergessen → Test rot.
- **Mitigation:** Pre-commit grep für `csv-` ohne `csv-import-`-File-Pfad muss leer sein. Spec-Dateien `csv-import.spec.ts` selbst sollte zu `file-import.spec.ts` umbenannt werden.

### R4: SheetJS-Tarball-URL läuft weg (LOW)
- **Risiko:** SheetJS-CDN ändert URL-Pattern oder pinned Version 0.20.3 verschwindet.
- **Mitigation:** Lockfile pinnt URL+Integrity. Bei zukünftigen Updates manuelles Bump (Renovate kann nicht). Wöchentlicher CI-Check optional. Vendor-Tarball-Fallback dokumentieren.

### R5: BUNDLE_DELTA.md-Eintrag wird vergessen (LOW)
- **Risiko:** Bundle-Tracking driftet ohne Doku-Update.
- **Mitigation:** Task im Plan: nach Bundle-Messung neuen `# Bundle Delta — Issue #72`-Block in `BUNDLE_DELTA.md` (am Anfang).

### R6: Mojibake in xlsx-Strings (LOW)
- **Risiko:** xlsx ist UTF-8 by spec, aber Files können verstümmelte Strings enthalten (bereits beim Excel-Save zerstört).
- **Mitigation:** Aus Discretion-Sektion: bewusst nicht behandeln. "Wenn deine Excel-Datei kaputte Strings enthält, ist die Quelle kaputt." Doku-Hinweis in Beispiele-Section reicht.

## Sources

### HIGH confidence
- Codebase analysis (Read/Grep über `apps/web/src/`, `packages/core/src/`, `tests/`)
- [SheetJS Vite-Demo](https://docs.sheetjs.com/docs/demos/static/vitejs/) — Vite 2.9.18 bis 7.2.2 getestet
- [SheetJS Node.js install](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/) — Tarball-URL-Methode, npm-Registry-stale-Notiz
- [SheetJS Date docs](https://docs.sheetjs.com/docs/csf/features/dates/) — `cellDates` Option, type 'd', ISO 8601 string handling
- [Snyk CVE-2023-30533 Prototype Pollution](https://security.snyk.io/vuln/SNYK-JS-XLSX-5457926) — fixed in 0.19.3+, registry has unfixed 0.18.5
- [SheetJS write-options](https://docs.sheetjs.com/docs/api/write-options/) — `book_new`, `book_append_sheet`, `write({type:'array'})` API
- `apps/web/package.json` — Vite 6.0.7, papaparse 5.5.3, SolidJS 1.9.3, license GPL-3.0-or-later

### MEDIUM confidence
- Bundle-Größe-Schätzung 430 KB raw für SheetJS-Vollumfang — basiert auf Community-Reports (DEV-Community, Vite-Discussion #17730), nicht direkt gemessen für 0.20.3 in unserem Build
- [Vite Discussion #17730](https://github.com/vitejs/vite/discussions/17730) — Vite-async-chunk-Mechanik mit dynamischen Imports
- [SheetJS GitHub issue #694](https://github.com/SheetJS/sheetjs/issues/694) — Bundle-Größe-Diskussion (alt, aber Pattern gilt)

### LOW confidence (needs validation)
- Genaue Bundle-Größe des xlsx-Chunks im **unserem** Vite-6-Setup mit `target: es2022` und SolidJS — vor Merge messen
- Determinismus-Verhalten von SheetJS xlsx-Output für `scripts/csv-to-xlsx.ts --check` Mode — Test in der Implementierungs-Phase

## Metadata

**Confidence breakdown:**
- Codebase impact map (Imports, Test-IDs, JSX-Sites): HIGH (vollständiger grep durchlauf)
- SheetJS-API: HIGH (offizielle Doku, Code-Pattern bekannt)
- SheetJS-Versions-Quelle: HIGH (CDN vs Registry verifiziert via Snyk + Sheet JS-Doku)
- Bundle-Size-Schätzung: MEDIUM (Community-Werte, nicht selbst gemessen für unser Setup)
- Konvertierungs-Script-Setup: MEDIUM (tsx-Pattern existiert, --check Determinismus unklar)
- CSV-Export-Stellen-Inventory: HIGH (grep across `apps/web/src/`)

**Research date:** 2026-05-04
**Specialist domains researched:** codebase, ecosystem (SheetJS + Vite), pitfalls, bundle-impact, test-patterns
**Raw research files:** Inline in this RESEARCH.md (synthesized directly; no separate `research/*.md` due to Agent-tool unavailability in this environment).
