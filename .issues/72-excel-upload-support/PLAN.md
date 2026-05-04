# PLAN — 72-excel-upload-support

## Objective

Excel-Support (`.xlsx`) parallel zu CSV: (1) Upload via SheetJS lazy-loaded Parser, (2) Symmetrischer Excel-Export für Stage-1 Versand-Liste und Stage-3 Panel/Reserve, (3) Atomarer Verzeichnis-Rename `apps/web/src/csv/` → `apps/web/src/import/` mit Type-Discriminator-Refactor (`ParsedCsv` → `ParsedTable`), (4) Beispiel-XLSX im `beispiele/`-Verzeichnis plus Konvertierungs-Script.

Audit-Manifeste (signiertes JSON) und Konfig-Snapshots (quotas.json) bleiben **ausschließlich JSON** — Excel ist Convenience für menschlich lesbare Listen, nicht für Verifikation.

## Skills

<skills>
  <!-- No workspace skills configured (.claude/skills/ does not exist). Conventions inlined. -->
</skills>

## Open-Questions-Resolutions

Beide aus den Researcher-Notes adressiert:

1. **Sollen `stage1-csv-*` Test-IDs ebenfalls zu `stage1-file-*` umbenannt werden?** → **JA**. Symmetrie zur `csv-* → file-*` Entscheidung in CONTEXT.md, der Misnomer wäre sonst stehen geblieben. Betrifft 5 Test-IDs in `stage1/Stage1Panel.tsx`. Atomar im Rename-Commit (Phase E / Task 12). Spec-File `apps/web/tests/e2e/csv-import.spec.ts` wird zu `file-import.spec.ts` umbenannt im selben Commit.
2. **`csv-to-xlsx.ts --check` Determinismus-Strategie:** SheetJS xlsx-Output ist NICHT byte-deterministisch (ZIP-Timestamps, internal random IDs). `--check` Mode re-parst die existierende `.xlsx` mit `XLSX.read` + `sheet_to_json` und vergleicht das normalisierte 2D-Array gegen das aus der CSV abgeleitete 2D-Array. Mismatch → exit-1 mit Diff-Output. (NICHT byte-diff, NICHT re-write-and-compare.)
3. **BUNDLE_DELTA.md als separater Task:** Ja, in Phase F (Task 16). Phase D bleibt reine Code-Arbeit, Bundle-Messung passiert am Ende.

## Interfaces (verbatim from RESEARCH.md, kondensiert)

<interfaces>
// CURRENT (zu refactoren in Phase A2 + Phase E)
// From apps/web/src/csv/parse.ts
export type SupportedEncoding = 'utf-8' | 'windows-1252' | 'iso-8859-1';
export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
  separator: ',' | ';' | '\t';
  encoding: SupportedEncoding;
  warnings: string[];
  derivedColumns: string[];
}
export async function parseCsvFile(file: File, refYear?: number): Promise<ParsedCsv>
export function parseCsvBuffer(buf: ArrayBuffer, refYear?: number): ParsedCsv
export const SEMANTIC_FIELDS = [
  'person_id', 'gender', 'age_band', 'education',
  'migration_background', 'district',
] as const;
export type SemanticField = (typeof SEMANTIC_FIELDS)[number];
export type ColumnMapping = Record<string, SemanticField | '__ignore__'>;
export function autoGuessMapping(headers: readonly string[]): ColumnMapping
export function validateMapping(rows, mapping): MappingValidation
export function applyMapping(rows, mapping): Record<string, string>[]

// NEW (additive in Phase A2; replaces ParsedCsv in Phase E rename)
export interface ParsedTable {
  format: 'csv' | 'xlsx';
  headers: string[];
  rows: Record<string, string>[];
  warnings: string[];
  derivedColumns: string[];
  // CSV-only (only set when format === 'csv'):
  separator?: ',' | ';' | '\t';
  encoding?: SupportedEncoding;
  // XLSX-only (only set when format === 'xlsx'):
  sheetName?: string;
  sheetCount?: number;
}
export async function parseXlsxFile(file: File, refYear?: number): Promise<ParsedTable>

// From apps/web/src/csv/CsvImport.tsx → apps/web/src/import/FileImport.tsx
export interface FileImportProps {
  onLoaded: (data: { parsed: ParsedTable; mapping: ColumnMapping }) => void;
}
export const FileImport: Component<FileImportProps>

// From apps/web/src/csv/CsvPreview.tsx → apps/web/src/import/FilePreview.tsx
// (format-agnostic — props unchanged)
export interface FilePreviewProps {
  headers: string[];
  rows: Record<string, string>[];
  maxRows?: number;
}
export const FilePreview: Component<FilePreviewProps>

// From apps/web/src/run/audit.ts (Phase D extension)
export function selectedToCsv(pool: Pool, selectedIds: string[]): string
export function downloadBlob(filename: string, content: string, mime: string): void
// NEW:
export function downloadBinaryBlob(filename: string, content: ArrayBuffer | Uint8Array, mime: string): void
export async function selectedToXlsx(pool: Pool, selectedIds: string[]): Promise<ArrayBuffer>

// From packages/core/src/stage1/csv-export.ts → neue Geschwister-Datei xlsx-export.ts
export interface Stage1CsvOptions { includeGezogenColumn?: boolean }
export interface Stage1CsvResult { csv: string; warnings: string[] }
export function stage1ResultToCsv(headers: string[], rows: Record<string, string>[], selected: number[], opts?: Stage1CsvOptions): Stage1CsvResult
// NEW (async dynamic-import — keeps Core SheetJS-frei zur Build-Zeit):
export interface Stage1XlsxResult { buffer: ArrayBuffer; warnings: string[] }
export async function stage1ResultToXlsx(headers: string[], rows: Record<string, string>[], selected: number[], opts?: Stage1CsvOptions): Promise<Stage1XlsxResult>

// SheetJS xlsx@0.20.3 API surface (CDN-Tarball, NICHT npm-Registry)
import * as XLSX from 'xlsx';
XLSX.read(data: ArrayBuffer, opts: { type: 'array', cellDates?: boolean }): XLSX.WorkBook
XLSX.utils.sheet_to_json<T>(ws, opts: { header?: 1 | string[], raw?: boolean, defval?: string, blankrows?: boolean }): T[]
XLSX.utils.aoa_to_sheet(rows: any[][]): XLSX.WorkSheet
XLSX.utils.book_new(): XLSX.WorkBook
XLSX.utils.book_append_sheet(wb: WorkBook, ws: WorkSheet, name: string): void
XLSX.write(wb: WorkBook, opts: { bookType: 'xlsx', type: 'array' }): ArrayBuffer
// Workbook structure: wb.SheetNames: string[]; wb.Sheets: Record<string, WorkSheet>
</interfaces>

## Constraints (verbatim summary from CONTEXT.md, locked)

- **Library: SheetJS Community Edition `xlsx@0.20.3`**, **install via CDN-Tarball** `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` — **NICHT npm-Registry** (CVE-2023-30533 unfixed dort).
- **Lazy-Load via `await import('xlsx')`**: Pflicht. Kein Top-Level-Import. NICHT in `vite.config.ts` `manualChunks` eintragen.
- **Verzeichnis-Rename in EINEM atomaren Commit**: `csv/` → `import/`, alle Imports + Test-IDs + JSX-Tags + Type-Renames gleichzeitig. Tests müssen vor und nach dem Commit grün sein.
- **Type `ParsedCsv` → `ParsedTable`** mit `format: 'csv' | 'xlsx'` discriminator. CSV-only Felder optional.
- **Test-IDs:** `csv-* → file-*` UND `stage1-csv-* → stage1-file-*` (Resolution Open-Question 1).
- **`.xlsx`-Endungs-Check, kein Magic-Bytes-Check** (locked).
- **Audit-Manifest (`audit-{seed}.json`, `versand-audit-{seed}.json`) bleibt JSON** — kein Excel-Export. Auch `quotas.json` bleibt JSON.
- **Excel-Export ON-DEMAND beim Klick**, NICHT eager im Run (sonst doppelte RAM/Compute für 99 % der CSV-User).
- **Sprache:** UI-Strings + Doku deutsch. Code-Kommentare englisch.
- **Tests grün an jedem Commit-Boundary** — kein `.skip`, keine auskommentierten Asserts.

## Tasks

---

<task id="1" phase="A">
  <title>Add SheetJS dependency via CDN-Tarball</title>
  <action>
    Add `xlsx` als Dependency in `apps/web/package.json` mit URL-Source (NICHT npm-Registry):

    ```json
    "dependencies": {
      ...
      "xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"
    }
    ```

    Ausführen:
    ```bash
    pnpm install
    ```

    Verify lockfile pinnt URL+Integrity. Sicherstellen, dass `xlsx` NIRGENDWO statisch importiert wird (noch keine Code-Änderung in dieser Task — nur Dependency).

    NICHT in `vite.config.ts` `manualChunks` eintragen.

    KEIN Code-Diff, nur `package.json` + `pnpm-lock.yaml`.
  </action>
  <verify>
    ```bash
    grep '"xlsx":' apps/web/package.json | grep -q 'cdn.sheetjs.com/xlsx-0.20.3' && echo 'OK: tarball URL pinned'
    grep -q 'xlsx-0.20.3' pnpm-lock.yaml && echo 'OK: lockfile updated'
    pnpm audit --prod 2>&1 | grep -i 'xlsx' && echo 'FAIL: xlsx CVE in audit' || echo 'OK: xlsx audit clean'
    pnpm --filter @sortition/web typecheck
    pnpm --filter @sortition/web test
    pnpm --filter @sortition/web exec playwright test
    ```
    Erwartet: alle drei Test-Commands grün (no behavior change yet).
  </verify>
  <done>
    `xlsx@0.20.3` als Tarball-Dependency installiert, Lockfile aktualisiert, audit clean, alle bestehenden Tests grün.
  </done>
</task>

---

<task id="2" phase="A">
  <title>Define `ParsedTable` type additive (alongside `ParsedCsv`)</title>
  <action>
    In `apps/web/src/csv/parse.ts`: füge `ParsedTable` Interface hinzu (siehe Interfaces oben, mit `format: 'csv' | 'xlsx'` discriminator und optionalen `separator` / `encoding` / `sheetName` / `sheetCount` Feldern).

    `ParsedCsv` bleibt unverändert (additiv). `parseCsvFile` und `parseCsvBuffer` Signaturen bleiben unverändert. Kein Konsumer wird in dieser Task geändert.

    Begründung: Type wird in Phase B von `parseXlsxFile` zurückgegeben und in Phase E flächendeckend statt `ParsedCsv` verwendet. Additiv jetzt = kleinerer Diff später.

    Comment in English: `// ParsedTable: format-agnostic table structure for CSV + XLSX. ParsedCsv kept for backward-compat until rename in #72 phase E.`
  </action>
  <verify>
    ```bash
    grep -q 'export interface ParsedTable' apps/web/src/csv/parse.ts && echo 'OK: ParsedTable defined'
    grep -q "format: 'csv' | 'xlsx'" apps/web/src/csv/parse.ts && echo 'OK: discriminator present'
    pnpm --filter @sortition/web typecheck
    pnpm --filter @sortition/web test
    ```
  </verify>
  <done>
    `ParsedTable` Interface in `parse.ts` exportiert. `ParsedCsv` unverändert. Typecheck + Tests grün.
  </done>
</task>

---

<task id="3" phase="B">
  <title>Implement `parseXlsxFile` (lazy SheetJS import)</title>
  <action>
    Neue Datei `apps/web/src/csv/parse-xlsx.ts` (in Phase E mit anderen umbenannt zu `apps/web/src/import/parse-xlsx.ts`).

    ```ts
    import type { ParsedTable } from './parse';
    import { applyMapping, autoGuessMapping } from './parse';  // re-use mapping pipeline if needed
    import { recomputeAltersgruppe, DEFAULT_AGE_BANDS } from './derive';

    export async function parseXlsxFile(file: File, refYear?: number): Promise<ParsedTable> {
      // Lazy import — SheetJS chunk lädt nur wenn User .xlsx auswählt.
      const XLSX = await import('xlsx');
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: true });
      // ... (siehe Detail-Schritte unten)
    }
    ```

    Implementierungs-Details (alle aus CONTEXT.md "Format-Detail-Behandlung" + RESEARCH.md "Recommended Approach #2"):

    1. **Worksheet-Auswahl:** `wb.SheetNames[0]` verwenden. Wenn `wb.SheetNames.length > 1`: Warning push: `Datei enthält ${n} Worksheets, nur das erste ('${name}') wurde importiert.`
    2. **Empty Sheet:** wenn `wb.SheetNames.length === 0` → throw mit Message `Excel-Datei enthält keine Worksheets.`
    3. **Header-Extraktion:** `XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '', blankrows: false })` gibt `unknown[][]`. Erste Zeile = Header, restliche = Daten.
    4. **Header-Validation:** leere Header-Zellen (`''` oder `null` oder `undefined` oder whitespace-only) → throw mit Message `Header-Zeile enthält leere Zellen (Spalte ${i+1}). Bitte ergänzen oder entfernen.`
    5. **Cell-Konvertierung pro Daten-Zeile:**
       - `Date` → `value.toISOString().slice(0, 10)` (YYYY-MM-DD)
       - `number` → `String(value)` (kein `.toFixed()`, das gibt `.0`-Suffix)
       - `boolean` → `value ? 'true' : 'false'`
       - `null` / `undefined` → `''`
       - `string` → unverändert
    6. **Empty Trailing Rows:** `blankrows: false` ist gesetzt; zusätzlich nach Konvertierung trim: row mit allen Cells `=== ''` raus.
    7. **Formula-Cell-Detection:** vor `sheet_to_json`, einmal über `Object.values(ws)` iterieren, count Cells mit `f`-Property: `for (const cell of Object.values(ws)) if (cell && typeof cell === 'object' && 'f' in cell) formulaCount++`. Wenn `> 0`: Warning push: `${formulaCount} Zellen enthielten Formeln. Es wurden die zuletzt berechneten Werte verwendet.`
    8. **Password-Protected Files:** `XLSX.read` wirft Exception bei verschlüsselten Files → in try/catch wrappen, klare Fehlermeldung: `Datei ist passwortgeschützt. Bitte ohne Verschlüsselung speichern und erneut versuchen.`
    9. **Generische Parse-Fehler:** ebenfalls in try/catch, Message: `Datei sieht nicht wie eine gültige Excel-Datei aus. Bitte als .csv speichern oder Datei prüfen.`
    10. **Derive-Pipeline:** wenn `headers` enthält `geburtsjahr` → `recomputeAltersgruppe(rows, DEFAULT_AGE_BANDS, refYear ?? new Date().getFullYear())` aufrufen, `derivedColumns: ['altersgruppe']` setzen. Sonst `derivedColumns: []`.
    11. **Return:** `{ format: 'xlsx', headers, rows, warnings, derivedColumns, sheetName, sheetCount }`. `separator`/`encoding` bleiben `undefined`.

    KEIN top-level `import * as XLSX from 'xlsx'` — würde Bundle eager machen.

    Code-Kommentare in English. UI-Fehlermeldungen deutsch.
  </action>
  <verify>
    ```bash
    grep -q "await import('xlsx')" apps/web/src/csv/parse-xlsx.ts && echo 'OK: lazy import'
    grep -E "^import .* from ['\"]xlsx['\"]" apps/web/src/csv/parse-xlsx.ts && echo 'FAIL: static xlsx import' || echo 'OK: no static xlsx import'
    pnpm --filter @sortition/web typecheck
    pnpm --filter @sortition/web build
    # Bundle-Sanity: xlsx darf nicht in main-Chunk:
    ls apps/web/dist/assets/index-*.js | head -1 | xargs -I{} sh -c "strings {} | grep -c 'SheetJS' || true"
    # Erwartet: 0 in main; xlsx-Chunk separat als assets/xlsx-*.js oder ähnlich.
    ls apps/web/dist/assets/ | grep -E '^(xlsx|chunk)-.*\.js$' && echo 'OK: separate xlsx chunk'
    ```
  </verify>
  <done>
    `parseXlsxFile` exportiert, lazy-importiert SheetJS, build erzeugt separaten async-Chunk für xlsx, main-Bundle nicht aufgebläht. Typecheck grün.
  </done>
</task>

---

<task id="4" phase="B">
  <title>Vitest unit tests for `parseXlsxFile`</title>
  <action>
    Neue Datei `apps/web/src/csv/parse-xlsx.test.ts` (in Phase E zu `apps/web/src/import/parse-xlsx.test.ts`).

    Verwendet vitest. Test-Fixtures werden inline pro Test gebaut via SheetJS-Writer (`XLSX.utils.aoa_to_sheet` + `XLSX.write({type:'array'})` → ArrayBuffer → `new File([buf], 'test.xlsx')`). Helper am Top:

    ```ts
    async function makeXlsxFile(rows: any[][], sheetName = 'Tabelle1', extraSheets?: Record<string, any[][]>): Promise<File> {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), sheetName);
      if (extraSheets) for (const [name, r] of Object.entries(extraSheets)) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(r), name);
      }
      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
      return new File([buf], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    }
    ```

    Test-Cases (jeder ein eigenes `it(...)`):
    1. **Simple xlsx** — 3 headers + 2 rows of strings → headers + rows korrekt, format='xlsx', warnings=[], sheetName='Tabelle1', sheetCount=1.
    2. **Multiple worksheets** — 2 Sheets → warnings enthält "2 Worksheets", sheetCount=2, nur Sheet 1 in rows.
    3. **Date cell** — Cell `new Date(1990, 5, 15)` → row-value matches `'1990-06-15'` (ISO 8601 date-only).
    4. **Number cell** — Cell `2024` → row-value `'2024'` (kein `.0`).
    5. **Empty trailing rows** — Sheet hat 3 echte Datenzeilen + 5 leere Zeilen am Ende → rows.length === 3.
    6. **Empty header cell** — Header `['name', '', 'age']` → throw mit Message-Match `/Header.*leer/i`.
    7. **Empty workbook** — keine SheetNames → throw mit Match `/keine Worksheets/i`.
    8. **Formula cell warning** — Sheet mit cell die `f`-Property hat (manuell ws zu modifizieren bevor `book_append_sheet`): warnings enthält `/Zellen.*Formeln/`.
    9. **Corrupt buffer** — `new File([new Uint8Array([1,2,3])], 'fake.xlsx')` → throw mit Match `/sieht nicht wie.*Excel/i`.
    10. **Geburtsjahr derive** — Headers `['person_id', 'geburtsjahr']`, rows mit Numbers → `derivedColumns` enthält `'altersgruppe'`, Cells haben `altersgruppe`-Spalte.

    Password-Protected ist optional (bracucht echtes verschlüsseltes File-Fixture, schwer reproduzierbar) — wenn nicht zuverlässig per generated Fixture testbar, dokumentiere in Test-Comment dass nur catch-block-Pfad existiert und ist via Cases 9 (corrupt buffer) abgedeckt.
  </action>
  <verify>
    ```bash
    pnpm --filter @sortition/web exec vitest run src/csv/parse-xlsx.test.ts 2>&1 | tail -20
    # Erwartet: 9-10 tests passed, 0 failed
    pnpm --filter @sortition/web typecheck
    ```
  </verify>
  <done>
    Mindestens 9 Vitest-Tests grün für `parseXlsxFile`. Coverage für: simple, multi-sheet, Date, Number, empty trailing, empty header, empty workbook, formula warning, corrupt file.
  </done>
</task>

---

<task id="5" phase="B">
  <title>Konvertierungs-Script `scripts/csv-to-xlsx.ts` + Beispiel-XLSX generieren</title>
  <action>
    Neue Datei `scripts/csv-to-xlsx.ts`. Run-Modus via `pnpm tsx scripts/csv-to-xlsx.ts` (oder `--check`).

    Funktionalität:
    1. Liest alle `apps/web/public/beispiele/*.csv`.
    2. Pro CSV: Papa.parse mit auto-detected separator (re-use Logik analog zu `parseCsvBuffer` — CSV im script-context mit `papaparse` lesen ist ok), erste Zeile = headers.
    3. Erzeugt parallele `.xlsx` daneben: `herzogenburg-melderegister-8000.csv` → `herzogenburg-melderegister-8000.xlsx`. Verwendet `XLSX.utils.aoa_to_sheet` und `XLSX.writeFile(wb, target)` (script-context, `writeFile` ok hier — kein Browser).
    4. **`--check` mode:** statt zu schreiben, lädt das existierende `.xlsx` mit `XLSX.read` + `sheet_to_json({header:1, raw:false, defval:'', blankrows:false})`, vergleicht das normalisierte 2D-Array gegen das aus der CSV gelesene 2D-Array. Mismatch → console.error mit row/col-Diff, exit-1. Match → console.log "OK" + exit-0. (Open-Question 2 Resolution: re-parse, NICHT byte-diff wegen ZIP-Timestamps.)

    Falls `tsx` nicht in devDependencies: `pnpm add -D tsx -w` als Teil des Tasks.

    Ausführen:
    ```bash
    pnpm tsx scripts/csv-to-xlsx.ts
    ```
    Verifizieren dass alle 4 Beispiel-CSVs ein xlsx-Pendant bekommen haben:
    ```bash
    ls apps/web/public/beispiele/*.xlsx | wc -l  # erwartet: 4 (parallel zu 4 .csv)
    ```

    **Skip** (Discretion): `delegierten-pool-1500.xlsx` mit synthetic content (Personenauswahl-Use-Case) ist nice-to-have aber nicht Acceptance-Criteria-blockierend. **Nicht in dieser Task** — eigenes Followup-Issue oder als optionaler Stretch in Task 14 (Doku) erwähnt. Einfach halten: Script konvertiert nur was da ist.

    Doku-Comment am Top des Scripts: in English. CLI-Output deutsch (für consistency mit anderen scripts).
  </action>
  <verify>
    ```bash
    pnpm tsx scripts/csv-to-xlsx.ts
    ls apps/web/public/beispiele/*.xlsx | wc -l   # erwartet: 4
    pnpm tsx scripts/csv-to-xlsx.ts --check && echo 'OK: check mode passes'
    # Modify a generated xlsx slightly to verify --check actually catches drift:
    # (skip in CI; manual test only)
    pnpm --filter @sortition/web typecheck
    ```
  </verify>
  <done>
    Script schreibt 4 .xlsx-Files parallel zu CSVs. `--check` mode vergleicht via re-parse und passes. Files committable (in .gitattributes ggf. binary marker setzen).
  </done>
</task>

---

<task id="6" phase="C">
  <title>Erweitere `CsvImport.tsx` um Excel-Upload (kein Rename in dieser Task)</title>
  <action>
    Edit `apps/web/src/csv/CsvImport.tsx`:

    1. **`accept`-Attribut erweitern** (vermutlich Zeile ~82-83 per Issue):
       ```
       accept=".csv,.txt,text/csv,text/plain,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
       ```
    2. **Drop-Zone-Label** (Discretion-Wording, deutsch): `CSV oder Excel hochladen oder hier ablegen`
    3. **Hint-Text**: `CSV (UTF-8/Latin-1) oder Excel (.xlsx) mit Header in Zeile 1`
    4. **File-Routing-Logik** im Upload-Handler:
       ```ts
       const ext = file.name.toLowerCase().split('.').pop();
       const parsed = ext === 'xlsx'
         ? await parseXlsxFile(file, refYear)
         : await parseCsvFile(file, refYear);
       ```
       (Endungs-Check, kein Magic-Bytes — locked.)
    5. **Error-Handling:** SheetJS Throws (corrupt, password) bubblen via try/catch genauso hoch wie CSV-Errors → werden im bestehenden `csv-error`-Slot gerendert.
    6. **Konsumer-API:** `onLoaded` callback erhält weiterhin `{ parsed, mapping }`. Da `parsed` bisher `ParsedCsv` ist und jetzt auch `ParsedTable` sein kann: callback-Type auf `ParsedCsv | ParsedTable` erweitern (oder direkt `ParsedTable` mit type-assertion für CSV-Pfad — letzteres sauberer wenn Phase E folgt). Für jetzt minimaler Diff: cast den ParsedCsv zu ParsedTable durch Hinzufügen von `format: 'csv'`-Feld in `parseCsvFile`-Aufruf-Site (oder neuen Helper `csvToTable(p: ParsedCsv): ParsedTable`).
    7. **Stage1Panel duplizierte Drop-Zone**: gleiche Wording-Updates und gleiche Routing-Logik in `apps/web/src/stage1/Stage1Panel.tsx:436-437` (bzw. wo das Stage-1-Pendant lebt). Beide Dropzonen müssen Excel-aware sein.
    8. **NICHT umbenennen** in dieser Task — Datei bleibt `CsvImport.tsx`, Test-IDs bleiben `csv-*`. Rename ist atomar in Phase E (Task 12).
    9. **Stage1Panel `separator`/`encoding` Display** (Stage1Panel.tsx:472-473) muss conditional gerendert werden für `format === 'xlsx'`: zeige stattdessen `Worksheet '${sheetName}' (${sheetCount > 1 ? `${1} von ${sheetCount}` : '1'})`. Nutze die ParsedTable-Felder.

    UI-Strings deutsch, Code-Kommentare englisch.
  </action>
  <verify>
    ```bash
    grep -q '\.xlsx' apps/web/src/csv/CsvImport.tsx && echo 'OK: accept includes xlsx'
    grep -q 'parseXlsxFile' apps/web/src/csv/CsvImport.tsx && echo 'OK: routes to xlsx parser'
    grep -q 'CSV oder Excel' apps/web/src/csv/CsvImport.tsx && echo 'OK: drop-zone wording updated'
    grep -q 'parseXlsxFile' apps/web/src/stage1/Stage1Panel.tsx && echo 'OK: stage1 drop-zone Excel-aware'
    pnpm --filter @sortition/web typecheck
    pnpm --filter @sortition/web test
    pnpm --filter @sortition/web exec playwright test
    pnpm --filter @sortition/web build
    ```
    Erwartet: alle Tests grün (existing CSV-Pfad nicht regressed).
  </verify>
  <done>
    Beide Drop-Zones (Stage 3 CsvImport + Stage 1 Panel) akzeptieren `.xlsx`, routen by extension zu parseXlsxFile, Wording auf "CSV oder Excel" aktualisiert. Bestehende CSV-Tests grün.
  </done>
</task>

---

<task id="7" phase="C">
  <title>Playwright e2e spec `xlsx-import.spec.ts`</title>
  <action>
    Neue Datei `apps/web/tests/e2e/xlsx-import.spec.ts` (wird in Phase E zu `file-import.spec.ts` umbenannt — oder bleibt als zweiter Spec daneben, abhängig davon ob du es als symmetrisches Pendant oder Konsolidierung willst; **Empfehlung: bleibt als `xlsx-import.spec.ts`** — symmetrisch zu `csv-import.spec.ts`, in Phase E werden beide zusammen umbenannt zu `csv-import.spec.ts` und `xlsx-import.spec.ts` ohne weitere Konsolidierung).

    Vorlage: `apps/web/tests/e2e/csv-import.spec.ts` (42 Zeilen).

    Test-Cases:
    1. **Excel upload happy path** — Lade `apps/web/public/beispiele/herzogenburg-melderegister-8000.xlsx` (aus Task 5 generiert) via `<input type="file">`. Assert `getByTestId('csv-preview')` visible (Test-IDs heißen noch `csv-*` bis Phase E — danach mit Phase-E-Commit synchron mitziehen). Assert `csv-validation-ok` visible. Click `csv-commit`. Assert `pool-summary` enthält `8000` (oder Subset wenn Test-Datensatz kleiner ist — dann eigenen kleinen Test-Fixture inline bauen wie in Task 4 helper).
    2. **Multi-Sheet warning** — Upload eines XLSX mit 2 Sheets (inline gebaut via Vorlage von Task 4). Assert dass im Warnings-Slot (vermutlich `csv-warnings` test-id, sonst neu spawn) Text "2 Worksheets" erscheint.
    3. **Corrupt file error** — Upload eines `fake.xlsx` (z.B. CSV mit umbenannter Endung). Assert `csv-error` enthält Match auf "sieht nicht wie".

    Spec sollte für beide Browser (chromium + firefox) laufen über bestehende Project-Konfig.

    **Wichtig für Phase E**: dieser Spec wird beim Rename (Task 12) auch test-ID-mäßig migriert (`csv-*` → `file-*`). Das passiert atomar dort. **Hier nicht vorausgreifen** — verwende noch die alten Test-IDs.
  </action>
  <verify>
    ```bash
    pnpm --filter @sortition/web exec playwright test xlsx-import.spec.ts 2>&1 | tail -10
    # Erwartet: 6 tests passed (3 cases × 2 browsers)
    pnpm --filter @sortition/web exec playwright test  # full suite must stay green
    ```
  </verify>
  <done>
    `xlsx-import.spec.ts` enthält 3 Test-Cases (happy path, multi-sheet warning, corrupt error), alle grün auf chromium + firefox. Existing csv-import.spec.ts unverändert grün.
  </done>
</task>

---

<task id="8" phase="D">
  <title>Implement `stage1ResultToXlsx` in packages/core (lazy SheetJS)</title>
  <action>
    Neue Datei `packages/core/src/stage1/xlsx-export.ts`.

    ```ts
    // Async wrapper around SheetJS xlsx writer.
    // Dynamic import keeps @sortition/core SheetJS-free at build time —
    // only call sites that invoke this function trigger the lazy chunk.

    import type { Stage1CsvOptions } from './csv-export';

    export interface Stage1XlsxResult {
      buffer: ArrayBuffer;
      warnings: string[];
    }

    export async function stage1ResultToXlsx(
      headers: string[],
      rows: Record<string, string>[],
      selected: number[],
      opts?: Stage1CsvOptions,
    ): Promise<Stage1XlsxResult> {
      const XLSX = await import('xlsx');
      // 1. Build 2D array: [headers, ...selectedRows]
      // 2. If opts?.includeGezogenColumn: add 'gezogen' column with 'ja'/'nein' (mirror csv-export logic exactly)
      // 3. aoa_to_sheet → book_new → book_append_sheet(wb, ws, 'Versand')
      // 4. write({bookType:'xlsx', type:'array'}) → ArrayBuffer
      // ... return { buffer, warnings: [] }
    }
    ```

    **Spiegel die Semantik von `stage1ResultToCsv` exakt** (siehe `packages/core/src/stage1/csv-export.ts`): gleiche Header-Order, gleiche Row-Selection-Logik, gleiches `gezogen`-Verhalten. Sonderzeichen-Escaping macht SheetJS selbst — kein `rfc4180Quote` Aufruf nötig.

    Optional: Sheet-Name parametrisierbar (default `'Versand'`). Für Stage-1-Output reicht erstmal hardcoded.

    Public-Export in `packages/core/src/stage1/index.ts` ergänzen: `export { stage1ResultToXlsx } from './xlsx-export'; export type { Stage1XlsxResult } from './xlsx-export';`

    KEIN top-level `import * as XLSX from 'xlsx'` in der Core-Lib — würde das Core-Bundle SheetJS-eager machen.

    Vitest tests in `packages/core/tests/stage1-xlsx.test.ts`:
    1. `stage1ResultToXlsx(headers, rows, [0, 2])` → Round-Trip via `XLSX.read` + `sheet_to_json({header:1, raw:false, defval:'', blankrows:false})` → assert headers + rows[0] + rows[2] match.
    2. `gezogen`-Column-Test: `stage1ResultToXlsx(h, r, [0], { includeGezogenColumn: true })` → re-parse → assert `gezogen` column existiert mit 'ja' für selected, 'nein' für non-selected.
    3. Sonderzeichen-Test: row mit `"; , \n` in Cells → re-parse → assert exact-match.
    4. Empty selected: `stage1ResultToXlsx(h, r, [])` → re-parse → nur Header-Zeile (oder Header + `gezogen`-Column wenn opt).
  </action>
  <verify>
    ```bash
    grep -q "await import('xlsx')" packages/core/src/stage1/xlsx-export.ts && echo 'OK: lazy import in core'
    grep -E "^import .* from ['\"]xlsx['\"]" packages/core/src/stage1/xlsx-export.ts && echo 'FAIL: static xlsx in core' || echo 'OK: no static'
    pnpm --filter @sortition/core test 2>&1 | tail -10
    pnpm typecheck   # workspace-wide
    ```
  </verify>
  <done>
    `stage1ResultToXlsx` exportiert aus `@sortition/core`, dynamic-imports SheetJS, 4 Vitest-Round-Trip-Tests grün, Core-Build SheetJS-frei.
  </done>
</task>

---

<task id="9" phase="D">
  <title>Excel-Download-Button in Stage1Panel.tsx (Versand-Liste)</title>
  <action>
    Edit `apps/web/src/stage1/Stage1Panel.tsx` (Region um Zeile :337 wo CSV-Download-Button ist).

    Neuer Button **NEBEN** dem bestehenden CSV-Download-Button:
    - Label: `Versand-Liste als Excel herunterladen`
    - Test-ID: `stage1-download-xlsx` (in Phase E zu `stage1-file-download-xlsx` migriert)
    - Click-Handler:
      ```ts
      async function downloadVersandXlsx() {
        const { stage1ResultToXlsx } = await import('@sortition/core/stage1');
        const { buffer } = await stage1ResultToXlsx(headers, rows, selectedIndices, { includeGezogenColumn: true });
        downloadBinaryBlob(`versand-${seed}.xlsx`, buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      }
      ```
    - **`downloadBinaryBlob`** als neue Helper-Funktion in `apps/web/src/run/audit.ts` daneben `downloadBlob`:
      ```ts
      export function downloadBinaryBlob(filename: string, content: ArrayBuffer | Uint8Array, mime: string): void {
        const blob = new Blob([content], { type: mime });
        const url = URL.createObjectURL(blob);
        // ... <a download> trigger, gleich wie downloadBlob aber mit Blob statt String
        URL.revokeObjectURL(url);
      }
      ```

    Keine doppelte Compute beim Run — Excel wird **nur on-demand beim Klick** generiert. NICHT im Run-Output mitberechnen.

    Filename-Konvention: `versand-{seed}.xlsx` (parallel zu `versand-{seed}.csv`).

    Audit-Button (`versand-audit-{seed}.json`) und Bericht-Button (`.md`) **nicht** mit Excel-Variante ergänzen — bleiben JSON/MD (locked).
  </action>
  <verify>
    ```bash
    grep -q 'stage1-download-xlsx' apps/web/src/stage1/Stage1Panel.tsx && echo 'OK: xlsx button present'
    grep -q 'downloadBinaryBlob' apps/web/src/run/audit.ts && echo 'OK: helper exported'
    grep -q "await import('@sortition/core/stage1')" apps/web/src/stage1/Stage1Panel.tsx && echo 'OK: lazy core import'
    pnpm --filter @sortition/web typecheck
    pnpm --filter @sortition/web test
    pnpm --filter @sortition/web exec playwright test
    pnpm --filter @sortition/web build
    # Bundle sanity: main-Bundle nicht aufgebläht (xlsx still in async-chunk):
    ls apps/web/dist/assets/index-*.js | xargs du -b | head -1
    ```
  </verify>
  <done>
    Stage1Panel zeigt Excel-Download-Button neben CSV-Button. Click triggert lazy-import + binary download. Existing tests grün.
  </done>
</task>

---

<task id="10" phase="D">
  <title>Excel-Download-Button in RunPanel.tsx (Stage-3 Panel)</title>
  <action>
    Edit `apps/web/src/run/RunPanel.tsx` (Region um Zeile :53 wo `selectedToCsv` + Panel-CSV-Download).

    Implement `selectedToXlsx` in `apps/web/src/run/audit.ts` (analog zu `selectedToCsv`):
    ```ts
    export async function selectedToXlsx(pool: Pool, selectedIds: string[]): Promise<ArrayBuffer> {
      const XLSX = await import('xlsx');
      // Build 2D array from pool + selectedIds
      // Sheet 'Panel' → wb → write({type:'array'})
      return buffer;
    }
    ```

    Neuer Button **NEBEN** dem bestehenden `run-export-csv`:
    - Label: `Panel als Excel herunterladen`
    - Test-ID: `run-export-xlsx`
    - Click-Handler:
      ```ts
      async function downloadPanelXlsx() {
        const buffer = await selectedToXlsx(pool, r.selected);
        downloadBinaryBlob(`panel-${seed}.xlsx`, buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      }
      ```

    **Reserve-Liste**: Issue #47 (Reserve first-class) ist noch nicht im Code. Wenn Reserve-Liste-Export existiert, gleiche Excel-Variante; sonst weglassen (RESEARCH.md "wenn #47 vor #72 lands"). Heutiger Stand: nicht im Code. Skip.

    **Audit-JSON-Button** (`run-export-audit`) bleibt JSON-only (locked).

    **Optional-Stretch**: zweites Worksheet `_audit-info` mit Verfahren-Name, Seed, Zeitstempel, SHA256 of corresponding JSON manifest. Wenn das in dieser Task zu viel Scope ist, **als Followup im Issue dokumentieren** — Acceptance-Criteria im Issue listet das als "Optional".

    Empfehlung: Skip in dieser Task um den Diff zu fokussieren. Followup-Note in EXECUTION.md.
  </action>
  <verify>
    ```bash
    grep -q 'run-export-xlsx' apps/web/src/run/RunPanel.tsx && echo 'OK: xlsx button present'
    grep -q 'selectedToXlsx' apps/web/src/run/audit.ts && echo 'OK: helper present'
    pnpm --filter @sortition/web typecheck
    pnpm --filter @sortition/web test
    pnpm --filter @sortition/web exec playwright test
    pnpm --filter @sortition/web build
    ```
  </verify>
  <done>
    RunPanel zeigt Excel-Download-Button neben CSV. `selectedToXlsx` in audit.ts. Audit-JSON-Button unverändert. Tests grün.
  </done>
</task>

---

<task id="11" phase="D">
  <title>Round-Trip Test: Excel-Export → parseXlsxFile</title>
  <action>
    Neue Datei `packages/core/tests/stage1-xlsx-roundtrip.test.ts` (oder als zusätzlicher `it(...)` in `stage1-xlsx.test.ts` aus Task 8 — Empfehlung eigene Datei für Lesbarkeit).

    Test-Logik:
    1. Setup: synthetische headers + rows + selectedIndices.
    2. `stage1ResultToXlsx(headers, rows, selected, { includeGezogenColumn: true })` → `buffer`.
    3. Wrap: `new File([buffer], 'roundtrip.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })`.
    4. Achtung: `parseXlsxFile` ist in `apps/web/src/csv/parse-xlsx.ts` — d.h. Test muss in `apps/web/src/csv/` (vitest in apps/web) leben, nicht in `packages/core/tests/`. **Korrigiere Pfad zu `apps/web/src/csv/parse-xlsx-roundtrip.test.ts`**.
    5. `parsed = await parseXlsxFile(file)` → assert headers match, assert row count = `selected.length`, assert `gezogen`-column für jede Row = `'ja'`.
    6. Zusätzlicher Test: round-trip durch parseCsvFile aus dem gleichen rows-Set → CSV-Output parse → erwarte gleiche Daten. Beweist Format-Symmetrie.

    Acceptance-Criteria #91: "Round-Trip-Test: jeder generierte Export-File wird vom Upload-Pfad erfolgreich re-importiert" — diese Task erfüllt das.
  </action>
  <verify>
    ```bash
    pnpm --filter @sortition/web exec vitest run src/csv/parse-xlsx-roundtrip.test.ts
    # Erwartet: tests passed
    pnpm --filter @sortition/web typecheck
    ```
  </verify>
  <done>
    Round-Trip-Test grün: Excel-Export-Buffer → parseXlsxFile → assert headers + row count + gezogen-Column.
  </done>
</task>

---

<task id="12" phase="E">
  <title>Atomarer Verzeichnis-Rename `csv/` → `import/` mit Type+TestID-Migration</title>
  <action>
    **Dies ist EIN COMMIT.** Tests müssen sowohl vor- als auch nach diesem Commit grün sein. Kein Half-State.

    Schritte (in dieser Reihenfolge im Working-Tree, Commit am Ende):

    1. **Datei-Renames via `git mv`** (preserves history):
       ```bash
       git mv apps/web/src/csv apps/web/src/import
       git mv apps/web/src/import/parse.ts apps/web/src/import/parse-csv.ts
       git mv apps/web/src/import/CsvImport.tsx apps/web/src/import/FileImport.tsx
       git mv apps/web/src/import/CsvPreview.tsx apps/web/src/import/FilePreview.tsx
       # parse-xlsx.ts und parse-xlsx.test.ts wandern automatisch mit (von Task 3, 4, 11)
       # derive.ts bleibt namentlich (beschreibt Funktion, nicht Format)
       git mv apps/web/tests/e2e/csv-import.spec.ts apps/web/tests/e2e/csv-import.spec.ts.tmp 2>/dev/null  # already named csv-import; keep filename for parity with xlsx-import.spec.ts
       # Entscheidung: csv-import.spec.ts und xlsx-import.spec.ts BEIDE bleiben (parallel, nicht konsolidiert)
       ```

    2. **Import-Pfad-Updates** (sed/Edit über alle TS/TSX im Workspace):
       - `from '../csv/parse'` → `from '../import/parse-csv'`
       - `from '../csv/derive'` → `from '../import/derive'`
       - `from '../csv/CsvImport'` → `from '../import/FileImport'`
       - `from '../csv/CsvPreview'` → `from '../import/FilePreview'`
       - `from '../csv/parse-xlsx'` → `from '../import/parse-xlsx'`
       - Auch relative-deeper Pfade wie `'../../csv/parse'` etc.
       - **Suchcommand für Audit:** `grep -rn "from ['\"].*csv/\(parse\|derive\|CsvImport\|CsvPreview\)" apps/web/src/ apps/web/tests/` muss nach Updates leer sein.

    3. **Komponenten-Identifier-Renames** (im Source):
       - In `App.tsx:264` und überall: `<CsvImport>` → `<FileImport>` (JSX-Tag)
       - In `Stage1Panel.tsx:478` und überall: `<CsvPreview>` → `<FilePreview>`
       - Named-Imports: `import { CsvImport } from ...` → `import { FileImport } from ...`; gleich für `CsvPreview` → `FilePreview`.
       - In `FileImport.tsx`: `export const CsvImport: ...` → `export const FileImport: ...`. Props-Interface `CsvImportProps` → `FileImportProps`.
       - In `FilePreview.tsx`: gleich für `CsvPreview` → `FilePreview`.

    4. **Type-Rename `ParsedCsv` → `ParsedTable`** flächendeckend:
       - In `parse-csv.ts`: `parseCsvFile` und `parseCsvBuffer` returnen jetzt `ParsedTable` (mit `format: 'csv'`, `separator`, `encoding` gesetzt). Old `ParsedCsv` interface löschen (war in Phase A2 additiv).
       - Alle Konsumer (Stage1Panel, runStage1, FileImport, ...): `ParsedCsv` → `ParsedTable`. Audit via `grep -rn 'ParsedCsv' apps/web/ packages/`.
       - Type-Imports updaten.

    5. **Test-ID-Renames** (CONTEXT.md + Open-Question 1 Resolution: BEIDE Familien):
       - `csv-dropzone` → `file-dropzone`
       - `csv-error` → `file-error`
       - `csv-preview` → `file-preview`
       - `csv-validation-ok` → `file-validation-ok`
       - `csv-commit` → `file-commit`
       - `csv-warnings` → `file-warnings` (falls existiert)
       - `csv-map-*` → `file-map-*` (falls existiert)
       - `stage1-csv-*` → `stage1-file-*` (5 IDs in Stage1Panel)
       - **Audit-Command:** `grep -rn 'csv-\(dropzone\|error\|preview\|validation\|commit\|warnings\|map-\)' apps/web/src/ apps/web/tests/` muss leer sein.
       - **Auch `stage1-csv-*`:** `grep -rn 'stage1-csv-' apps/web/` muss leer sein.
       - Test-ID-Strings sowohl in `apps/web/src/**/*.tsx` (data-testid-Attribute) als auch in `apps/web/tests/e2e/**/*.spec.ts` (`getByTestId`-Calls).
       - Stage-1-Download-Button-IDs: `stage1-download-csv` → `stage1-file-download-csv`, `stage1-download-xlsx` → `stage1-file-download-xlsx`. (Falls schon in Task 9 mit dem neuen Namen vergeben, dann hier nichts mehr zu tun für xlsx-Variante.)

    6. **`Stage1Panel.tsx:472-473` Conditional-Render** (separator/encoding nur für CSV, sheetName/sheetCount für XLSX) — falls in Task 6 noch nicht gemacht, jetzt nachziehen weil ParsedTable jetzt der einzige Type ist.

    7. **JSX-Tag-Audit:** `grep -rn "<Csv\(Import\|Preview\)" apps/web/src/` muss leer sein.

    **Verifikation vor Commit (in dieser Reihenfolge ausführen, alle müssen grün sein):**
    ```bash
    pnpm --filter @sortition/web typecheck
    pnpm --filter @sortition/web test
    pnpm --filter @sortition/web exec playwright test
    pnpm --filter @sortition/web build
    pnpm --filter @sortition/core test
    ```

    Erst wenn alle 5 grün: `git add -A && git commit -m "72: refactor(import): rename csv/ to import/, ParsedCsv to ParsedTable, csv-* testids to file-*"`.

    **Wenn ein Test rot:** NICHT teilweise committen. Fix the issue im Working-Tree, re-run all 5 verifications, dann commit.
  </action>
  <verify>
    ```bash
    # Hard gates — all must pass before commit:
    pnpm --filter @sortition/web typecheck
    pnpm --filter @sortition/web test
    pnpm --filter @sortition/web exec playwright test
    pnpm --filter @sortition/web build
    pnpm --filter @sortition/core test

    # Audit greps — all must return empty:
    grep -rn "from ['\"].*csv/\(parse\|derive\|CsvImport\|CsvPreview\)" apps/web/ packages/ && echo 'FAIL: stale csv/ import paths' || echo 'OK'
    grep -rn 'ParsedCsv' apps/web/ packages/ && echo 'FAIL: stale ParsedCsv type' || echo 'OK'
    grep -rn 'csv-\(dropzone\|error\|preview\|validation\|commit\)' apps/web/src/ apps/web/tests/ && echo 'FAIL: stale csv-* testid' || echo 'OK'
    grep -rn 'stage1-csv-' apps/web/ && echo 'FAIL: stale stage1-csv-* testid' || echo 'OK'
    grep -rn '<Csv\(Import\|Preview\)' apps/web/src/ && echo 'FAIL: stale JSX tag' || echo 'OK'
    test -d apps/web/src/csv && echo 'FAIL: old csv/ dir exists' || echo 'OK: csv/ removed'
    test -d apps/web/src/import && echo 'OK: import/ exists' || echo 'FAIL'
    ```
  </verify>
  <done>
    `apps/web/src/import/` exists, `apps/web/src/csv/` removed, alle 5 Test/Build-Commands grün, alle 6 Audit-greps clean, EIN Commit für die ganze Migration.
  </done>
</task>

---

<task id="13" phase="F">
  <title>Update `apps/web/src/docs/Beispiele.tsx` mit Excel-Beispielen</title>
  <action>
    Edit `apps/web/src/docs/Beispiele.tsx`. Bestehende CSV-Beispiele bleiben; Excel-Beispiele werden parallel hinzugefügt.

    Pro existierendem CSV-Beispiel-Eintrag (`herzogenburg-melderegister-8000`, `herzogenburg-versand-300`, `herzogenburg-antwortende-60`, `kleinstadt-3000`):
    - Zweiter Download-Link: `Excel (.xlsx) herunterladen` mit href auf `${base}beispiele/<name>.xlsx`
    - Visuell parallel zum CSV-Link, gleiche Card/Tile-Struktur.

    Doku-Sektion am Ende der Beispiele-Page (oder oberhalb der Tile-Liste) ergänzen:
    > **Excel-Format-Anforderungen:** Header in Zeile 1, ein Worksheet (zusätzliche werden ignoriert mit Warnung), keine verbundenen Zellen, keine Formeln in Daten — Werte explizit kopieren (Excel "Einfügen als Werte"). Datentypen werden zu Strings konvertiert; Datumsfelder werden zu ISO-8601 (`YYYY-MM-DD`) normalisiert.

    UI-Strings deutsch.
  </action>
  <verify>
    ```bash
    grep -c '\.xlsx' apps/web/src/docs/Beispiele.tsx  # erwartet: ≥ 4
    grep -q 'Excel-Format-Anforderungen' apps/web/src/docs/Beispiele.tsx && echo 'OK: doc section'
    pnpm --filter @sortition/web typecheck
    pnpm --filter @sortition/web build
    ```
  </verify>
  <done>
    Beispiele-Page zeigt für jedes CSV-Beispiel auch Excel-Download. Format-Anforderungen-Sektion hinzugefügt.
  </done>
</task>

---

<task id="14" phase="F">
  <title>Update README.md + apps/web/public/beispiele/README.md</title>
  <action>
    1. **`README.md`** (Repo-Root): füge in der Feature-Liste oder Status-Sektion einen Punkt hinzu: `Excel-Support (.xlsx Upload + Export für Versand-Liste und Panel) — Spezifikation in #72`. Wenn das README einen "Datenformate"-Abschnitt hat, dort ergänzen. Sprache: deutsch.

    2. **`apps/web/public/beispiele/README.md`**: dokumentiere die neue `.xlsx`-Datei-Variante neben den CSVs. Erwähne Konvertierungs-Script `pnpm tsx scripts/csv-to-xlsx.ts` und `--check` Mode für CI-Sync.

    Keine Code-Änderungen.
  </action>
  <verify>
    ```bash
    grep -i 'excel\|xlsx' README.md && echo 'OK: README mentions Excel'
    grep -i 'xlsx' apps/web/public/beispiele/README.md && echo 'OK: beispiele/README mentions xlsx'
    ```
  </verify>
  <done>
    Beide README-Files erwähnen Excel-Support.
  </done>
</task>

---

<task id="15" phase="F">
  <title>CI-Step: `csv-to-xlsx.ts --check` in deploy.yml</title>
  <action>
    Edit `.github/workflows/deploy.yml`. Füge im `build` job (oder einem neuen `verify` job, je nach was sauberer ist) **VOR** dem Build-Step einen Step ein:

    ```yaml
    - name: Verify xlsx beispiele in sync with CSV
      run: pnpm tsx scripts/csv-to-xlsx.ts --check
    ```

    Begründung: verhindert Drift zwischen `.csv` und `.xlsx` Beispielen im Repo. Wenn jemand eine CSV updated ohne `pnpm tsx scripts/csv-to-xlsx.ts` neu zu laufen, fail im CI.

    NICHT in den `e2e` job einbauen (sind unabhängige Concerns).

    YAML-Validität nach Edit verifizieren.
  </action>
  <verify>
    ```bash
    python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy.yml'))" && echo 'OK: yaml valid'
    grep -q 'csv-to-xlsx.ts --check' .github/workflows/deploy.yml && echo 'OK: check step present'
    ```
  </verify>
  <done>
    CI verifiziert xlsx/csv-Sync vor jedem Build.
  </done>
</task>

---

<task id="16" phase="F">
  <title>BUNDLE_DELTA.md entry für Issue #72</title>
  <action>
    Build messen vor und nach (vor = pre-Issue-72-Baseline, nach = HEAD nach allen Tasks):

    ```bash
    pnpm --filter @sortition/web build
    du -b apps/web/dist/assets/index-*.js apps/web/dist/assets/*xlsx*.js apps/web/dist/assets/*.js
    ```

    Neue Sektion am **Anfang** von `BUNDLE_DELTA.md` (oberhalb des #65-Eintrags):

    ```markdown
    # Bundle Delta — Issue #72 (Excel support)

    **Build:** `VITE_BASE_PATH=/ pnpm --filter @sortition/web build` (Vite 6, sourcemaps enabled).
    **Baseline:** post-#65 (`index-*.js` 137.40 KB raw / 44.84 KB gzip — siehe Eintrag unten).
    **Post:** commits XXXXXX..YYYYYY on `issue/72-excel-upload-support`.
    **Date:** 2026-MM-DD.

    | Asset                           | Baseline (KB) | After (KB) | Delta (KB) |
    | ------------------------------- | ------------: | ---------: | ---------: |
    | dist/assets/index-*.js (raw)    |        137.40 |       ZZZ  |       ±Z   |
    | dist/assets/index-*.js (gzip)   |         44.84 |       ZZZ  |       ±Z   |

    **Main-Bundle-Budget:** Δ ≈ 0 KB (xlsx ist async-only). **Status: …**

    ## Lazy chunks (separate)

    | Chunk             | Raw (KB) | Gzip (KB) |
    | ----------------- | -------: | --------: |
    | `xlsx-*.js` (NEW) |    ~430  |    ~140   |

    Der xlsx-Chunk wird erst geladen wenn der User eine `.xlsx`-Datei auswählt
    oder einen Excel-Download anklickt. CSV-only-User sehen keinen Bandwidth-Hit.
    ```

    Echte Zahlen messen und einsetzen — die ~430/~140 oben sind RESEARCH.md-Schätzung. Wenn die echten Zahlen >2x davon abweichen, im EXECUTION.md vermerken.

    **Hard-Constraint:** main `index-*.js` Delta darf **NICHT > 5 KB raw** sein. Wenn doch → Lazy-Load broken, fix bevor PR-merge.
  </action>
  <verify>
    ```bash
    head -1 BUNDLE_DELTA.md | grep -q '#72' && echo 'OK: #72 entry on top'
    pnpm --filter @sortition/web build
    # Manual: read BUNDLE_DELTA.md, verify Δ index-*.js raw ≤ 5 KB
    ```
  </verify>
  <done>
    BUNDLE_DELTA.md hat #72-Eintrag am Anfang. Main-Bundle-Delta ≤ 5 KB raw. xlsx-Chunk separat dokumentiert.
  </done>
</task>

---

## Verification Strategy (overall)

Nach allen Tasks, vor PR-Merge:

```bash
pnpm install --frozen-lockfile
pnpm --filter @sortition/web typecheck
pnpm --filter @sortition/web test
pnpm --filter @sortition/web exec playwright test
pnpm --filter @sortition/web build
pnpm --filter @sortition/core test
pnpm tsx scripts/csv-to-xlsx.ts --check
pnpm audit --prod 2>&1 | grep -i xlsx && echo 'FAIL: xlsx CVE' || echo 'OK: audit clean'
# Bundle-Sanity:
ls apps/web/dist/assets/ | grep -E 'xlsx.*\.js' && echo 'OK: xlsx async chunk exists'
du -b apps/web/dist/assets/index-*.js  # ≤ baseline + 5 KB
```

## Success Criteria (1:1 mit ISSUE.md Acceptance-Criteria)

- **Library:** SheetJS Apache-2.0, lazy-loaded, npm audit clean — Tasks 1, 3, 8.
- **Parser-Integration:** `parseXlsxFile` mit allen Format-Detail-Anforderungen (Date ISO-8601, Number ohne `.0`, Multi-Sheet-Warning, Empty-Header-Fehler, Empty-Trailing-Rows ignoriert, Formula-Warning) — Task 3.
- **UI-Integration:** Drop-Zone akzeptiert `.xlsx`, Wording aktualisiert, Stage-1 + Stage-3 beide Excel-aware — Task 6, plus Phase E.
- **`CsvImport.tsx → FileImport.tsx`** + Verzeichnis `csv/ → import/` — Task 12.
- **Beispiel-XLSX-Datei** parallel zum CSV-Pendant — Task 5.
- **Konvertierungs-Script** mit `--check` Mode + CI-Sync — Tasks 5, 15.
- **Test-IDs** `csv-* → file-*` UND `stage1-csv-* → stage1-file-*` — Task 12.
- **Excel-Export** symmetrisch zu CSV (Stage-1 Versand, Stage-3 Panel) — Tasks 8, 9, 10.
- **Audit-Manifest bleibt JSON** — explizit nicht angefasst in Tasks 9, 10.
- **Round-Trip-Test** — Task 11.
- **Doku** in Beispiele + READMEs — Tasks 13, 14.
- **Bundle-Delta-Tracking** — Task 16.

## Out of Scope (per CONTEXT.md "Deferred")

- `.xls` Legacy Binary, `.ods`, `.numbers`, `.gsheet` Support
- Multi-Worksheet-Picker UI
- Inline-Edit der xlsx im Browser (read-only)
- Mojibake-Auto-Korrektur für Excel-Strings
- Excel-Form für Audit-Manifest oder Quotas (bleiben JSON)
- `delegierten-pool-1500.xlsx` (Personenauswahl-Synthetic) — nice-to-have, eigenes Followup-Issue (#70-Sphere)
- Optionales `_audit-info` Sheet im Excel-Export — als Followup dokumentiert

## Rollback

Phase-by-phase rückwärts:
- Phase F (Tasks 13-16): docs + bundle-delta + CI-step rückbauen — additiv, low-impact.
- Phase E (Task 12): `git revert` des Rename-Commits — alle Imports + Test-IDs + Types zurück. Phase A-D Code bleibt funktional, nur in `csv/` statt `import/`.
- Phase D (Tasks 8-11): Excel-Export-Pfade entfernen — Buttons + Helper + tests.
- Phase C (Tasks 6-7): Drop-Zone-Wording + xlsx-Routing zurück.
- Phase B (Tasks 3-5): `parse-xlsx.ts` + Tests + Script entfernen.
- Phase A (Tasks 1-2): `xlsx`-Dependency aus package.json + Lockfile, `ParsedTable` Type entfernen.

Jeder Phase-Rollback ist isoliert revertibar. Phase E ist der einzige Phase-übergreifende Diff.

## Estimated Scope

**Medium-Large.** ~17 neue/geänderte Dateien (parse-xlsx.ts, parse-xlsx.test.ts, xlsx-export.ts, stage1-xlsx.test.ts, stage1-xlsx-roundtrip.test.ts, csv-to-xlsx.ts, xlsx-import.spec.ts, plus 10 Edits in Stage1Panel/RunPanel/audit/CsvImport/Beispiele/READMEs/deploy.yml/BUNDLE_DELTA/package.json/vite.config-check). Phase E ist mechanisch aber breit (~30 Dateien geberührt). Erwartete Executor-Zeit: 4-6 Stunden inkl. Bundle-Messung und CI-grün-Wait.
