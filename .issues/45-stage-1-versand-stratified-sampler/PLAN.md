# Plan: Stage 1 — Versand-Auswahl per stratifizierter Zufallsstichprobe

<objective>
Was dieser Plan erreicht: Neuer App-Bereich "Versand-Liste ziehen" in der bestehenden Sortition-Web-App. Verwaltung lädt Melderegister-CSV hoch, konfiguriert Stratifikations-Achsen + Stichprobengröße + Seed, lädt Ergebnis-CSV plus signierten Audit-Snapshot herunter. Reine TypeScript-Pipeline (kein Solver, kein Pyodide, sub-Sekunde bis 100.000 Zeilen).

Warum es zählt: Bisher springt die App direkt von "CSV-Import" zu "Maximin-Lauf auf Antwortenden-Pool" und überspringt damit den ersten verbindlichen Verfahrensschritt eines realen Bürger:innenrats — die proportionale Versand-Liste aus dem Melderegister. Ohne Stage 1 ist die App für reale Verwaltungen nicht einsetzbar.

In Scope: Algorithmus-Modul (`packages/core/src/stage1/`), UI-Komponenten (`apps/web/src/stage1/`), Tab-Switcher in `App.tsx`, BMG-§46-Hinweistext, Unit- + Integrations- + Playwright-Tests, Doku-Update.

Out of Scope: Soft-Constraints / Quoten-Korridore (= Stage 3, bleibt unverändert), mehrwellige Versand-Listen (#48), Reserve-Liste (#47), Verfahren-State-Datei (#46), BMG-§46-API-Anbindung, Auto-Aggregation feiner Strata.

Hinweise zur Plan-Erstellung: CONTEXT.md liegt vor, alle Locked Decisions sind eingeflossen. RESEARCH.md hat drei Issue-Detailaussagen korrigiert (Audit-Modul-Pfad, Test-Verzeichnis, Framework). Diese Korrekturen sind verbindlich gegenüber dem Issue-Text — siehe `<context>`.
</objective>

<context>
Issue: @.issues/45-stage-1-versand-stratified-sampler/ISSUE.md
Decisions: @.issues/45-stage-1-versand-stratified-sampler/CONTEXT.md
Research: @.issues/45-stage-1-versand-stratified-sampler/RESEARCH.md

## Korrekturen am Issue-Text (verbindlich)

Der Issue-Text enthält drei Aussagen, die nach Codebase-Inventur in RESEARCH.md korrigiert wurden. Wo Issue-Text und folgende Korrekturen abweichen, **gelten die Korrekturen**:

1. **Audit-Code-Pfad:** Audit-Logik (Build, Sign, Download) lebt in `apps/web/src/run/audit.ts` (Browser-`crypto.subtle`), NICHT in `packages/core/src/audit/` (existiert nicht). Pure Builder-Funktionen (canonical JSON, SHA-256) gehen nach `packages/core/src/stage1/audit-builder.ts`. Web-Crypto-Signing bleibt im Web-Layer.
2. **Test-Verzeichnis:** Vitest-Glob für `@sortition/core` ist `tests/**/*.test.ts` (siehe `packages/core/vitest.config.ts:1-8`). Stage-1-Tests gehören nach `packages/core/tests/stage1-*.test.ts`, NICHT nach `packages/core/src/stage1/__tests__/`. Tests im letzteren Pfad würden nicht gefunden.
3. **Frontend-Framework:** Solid-JS mit `createSignal`/`<Show>`, NICHT React. Kein Router. Hauptnavigation als Solid-Signal-basierter Tab-Switcher in `App.tsx` (Variante B aus RESEARCH.md). Issue-Text "Route `/stage1-versand`" ist als "neuer App-Bereich aus Hauptnavigation erreichbar" zu lesen — keine echte URL-Route, kein neuer Solid-Router-Dep.
4. **Synthetische 6000er-CSV:** Zur Test-Laufzeit via `generatePool({ size: 6000, ... })` aus `@sortition/core` erzeugen — keine 600-KB-Fixture einchecken.
5. **CSV-Writer:** `selectedToCsv` aus `apps/web/src/run/audit.ts` und `rowsToCsv` aus `packages/core/src/pool/generator.ts:235-247` sind beide untauglich (filtern auf bekannte Felder bzw. quoten nicht). Stage 1 braucht eigenen RFC-4180-Writer in `packages/core/src/stage1/csv-export.ts`.

## Schlüsseldateien (für Wiederverwendung lesen)

@apps/web/src/csv/parse.ts — `parseCsvFile`, `autoGuessMapping`, `applyMapping`, `SEMANTIC_FIELDS`, `ColumnMapping`. Direkt nutzen für Upload und Default-Achsen-Erkennung.
@apps/web/src/run/audit.ts — `signAudit`, `sha256Hex`, `downloadBlob`, kanonische Serialisierungs-Helpers. Web-Crypto-Signing für Stage 1 wiederverwenden.
@apps/web/src/run/RunPanel.tsx — Vorbild für `Stage1Panel.tsx`-Komponentenstruktur, `exportPanelCsv` + `exportAuditJson`-Pattern.
@apps/web/src/App.tsx — App-Root, hier Tab-Switcher einbauen (mode-Signal, zwei Sections).
@packages/core/src/pool/mulberry32.ts — RNG, deterministisch. `nextFloat()` für Fisher-Yates.
@packages/core/src/pool/generator.ts — `generatePool` für Integrations-Test (n=6000), 6 Profile vordefiniert.
@packages/core/src/index.ts — hier `./stage1`-Re-Export hinzufügen.
@packages/core/vitest.config.ts — Test-Glob `tests/**/*.test.ts`.
@apps/web/tests/e2e/end-to-end.spec.ts — Vorlage für Playwright-Smoke (File-Upload via `setInputFiles`, `data-testid`-Konvention).

<interfaces>
<!-- Executor: nutze diese Verträge direkt. Nicht den Code dafür neu erkunden. -->

// apps/web/src/csv/parse.ts:8-16, 60-65
export type SupportedEncoding = 'utf-8' | 'windows-1252' | 'iso-8859-1';
export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
  separator: ',' | ';' | '\t';
  encoding: SupportedEncoding;
  warnings: string[];
}
export async function parseCsvFile(file: File): Promise<ParsedCsv>;
export function parseCsvBuffer(buf: ArrayBuffer): ParsedCsv;

// apps/web/src/csv/parse.ts:102-132
export const SEMANTIC_FIELDS = [
  'person_id', 'gender', 'age_band',
  'education', 'migration_background', 'district',
] as const;
export type SemanticField = (typeof SEMANTIC_FIELDS)[number];
export type ColumnMapping = Record<string, SemanticField | '__ignore__'>;
export function autoGuessMapping(headers: readonly string[]): ColumnMapping;
// erkennt u.a.: bezirk→district, alter→age_band, geschlecht→gender, sprengel→district

// packages/core/src/pool/mulberry32.ts:7-25
export class Mulberry32 {
  constructor(seed: number);     // seed wird via >>> 0 zu uint32 normalisiert
  nextU32(): number;
  nextFloat(): number;           // [0, 1) uniform
}

// packages/core/src/pool/generator.ts:201-247
export interface GenerateOpts {
  profile: CommunityProfile;     // 6 vordefinierte Profile in PROFILES
  size: number;
  seed: number;
  tightness: number;             // 0..1
}
export interface PoolRow {
  person_id: string;
  gender: 'female' | 'male' | 'diverse';
  age_band: '16-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65-74' | '75+';
  education: string;
  migration_background: string;
  district: string;
}
export function generatePool(opts: GenerateOpts): PoolRow[];
export const PROFILES: Record<CommunityProfile, ...>;

// apps/web/src/run/audit.ts:23-34, 169-177 — direkt wiederverwendbar
async function sha256Hex(bytes: Uint8Array): Promise<string>;
function toBase64(bytes: Uint8Array): string;
export function downloadBlob(filename: string, content: string, mime: string): void;

// apps/web/src/run/audit.ts:101-150 — heute Maximin-spezifisch (AuditDoc-typisiert),
// Task 3 generalisiert oder dupliziert das Sign-Pattern für Stage1AuditDoc.
export interface SignedAudit { doc: AuditDoc; bodyJson: string }
export async function signAudit(doc: AuditDoc): Promise<SignedAudit>;
// Verhalten: stripped public_key/signature/signature_algo, kanonisiert via JSON.stringify
// (sortierte Keys nicht garantiert — siehe audit.ts:139), versucht Ed25519, fällt zurück
// auf ECDSA-P256-SHA256, schreibt public_key/signature/signature_algo in doc.
</interfaces>

## Vorhandene Patterns (zur Orientierung)

- **Solid-Component-Style:** siehe `RunPanel.tsx:1-265`. Props-Interface, `createSignal` für lokalen State, `createMemo` für Ableitungen, `<Show when=...>` für conditional Render, `data-testid`-Attribute auf interaktiven Elementen.
- **CSV-Import-UI:** siehe `apps/web/src/csv/CsvImport.tsx:1-155`. File-Drop, async Parse, Fehler-Anzeige.
- **Test-Pattern Determinismus:** siehe `packages/core/tests/generator.test.ts:22-46`. Zweimal mit gleichem Seed laufen → exakte Gleichheit prüfen.
- **E2E-File-Upload:** siehe `apps/web/tests/e2e/end-to-end.spec.ts:1-59`. `page.locator('input[type="file"]').first().setInputFiles({ name, mimeType, buffer })`.
</context>

<commit_format>
Format: conventional (aus `.issues/config.yaml`)
Pattern: `{type}({scope}): {description}`
Beispiele:
- `feat(stage1): add largest-remainder stratification with Fisher-Yates`
- `feat(stage1): add Stage 1 panel UI with axis picker and BMG hint`
- `test(stage1): add 6000-row integration test via generatePool`
- `feat(web): add tab switcher between Stage 1 and Stage 3`
- `docs(stage1): document Versand-Liste workflow in README`

Tests gehen im selben Commit wie der getestete Code (Projekt-Regel).
</commit_format>

<file_conventions>
- **Code-Kommentare: Englisch** (Projekt-Regel CLAUDE.md).
- **Doku-Texte (README, UI-Strings): Deutsch** (Projekt-Regel CLAUDE.md).
- **Lizenz-Header:** Bestehende `.ts`-Dateien (z.B. `audit.ts`, `parse.ts`, `mulberry32.ts`) haben **keinen** SPDX-Header. Konvention beibehalten — Lizenz auf Repo-/Package-Ebene (`package.json: "license": "GPL-3.0-or-later"`), nicht pro Datei. **Keine SPDX-Header** in neuen Dateien einfügen.
</file_conventions>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Pure Stratifikations-Modul + Unit-Tests</name>
  <files>
  packages/core/src/stage1/types.ts,
  packages/core/src/stage1/stratify.ts,
  packages/core/src/stage1/index.ts,
  packages/core/src/index.ts,
  packages/core/tests/stage1-stratify.test.ts
  </files>
  <behavior>
  - Determinismus: zweimal mit gleichem Seed → identisches `selected[]` und identische Stratum-Tabelle.
  - Largest-Remainder-Korrektheit: für jede Konfiguration gilt `sum(strata[i].n_h_target) === targetN` exakt.
  - Edge-Case "leeres Stratum (n_h_target = 0)": Stratum erscheint mit `n_h_target=0`, `n_h_actual=0`, kein Fehler.
  - Edge-Case "n_h_target > N_h": `n_h_actual = N_h`, `underfilled=true`, Warning-String enthält Stratum-Key + Zahl. **Kein Re-Allocation** des Restes auf andere Strata.
  - Edge-Case "n_h_target == N_h": `n_h_actual = N_h`, `underfilled=false` (off-by-one-Risiko explizit testen).
  - Edge-Case "nur ein Stratum (axes=[])": entartet zu einfacher Zufallsstichprobe ohne Sonderfall.
  - Fehlerfall "targetN > rows.length": `throw new Error(...)` mit deutscher Klartext-Message "Eingangs-Pool hat nur N Personen, mehr als das ist nicht ziehbar".
  - Selektion über mehrere Strata in deterministischer Reihenfolge (lex. Stratum-Key, dann Original-Row-Index für reproduzierbare CSV-Reihenfolge).
  </behavior>
  <action>
  RED: Schreibe `packages/core/tests/stage1-stratify.test.ts` mit Test-Cases für jeden Behavior-Punkt oben. Nutze `generatePool` aus `@sortition/core` für Test-Inputs (n=200..2000 reicht hier; n=6000 kommt erst in Task 7). Test-Pattern wie in `packages/core/tests/generator.test.ts:22-46`. Konkret mindestens:
  - `it('produces identical selection for same seed')` — zweimal stratifizieren, deepEqual prüfen.
  - `it('largest-remainder sums to targetN exactly')` — über mehrere targetN-Werte (137, 200, 299, 300, 301, 1000) und mehrere Achsen-Kombinationen.
  - `it('handles single empty stratum')` — Pool ohne Personen in einem Stratum-Cross-Produkt.
  - `it('clamps n_h_actual when n_h_target exceeds N_h')` — Pool mit kleinem Stratum (5 Personen), N_h_target=10 erzwingen via skewed targetN.
  - `it('does NOT mark underfilled when n_h_actual === N_h === n_h_target')`.
  - `it('degenerates to simple random sample with axes=[]')`.
  - `it('throws on targetN > rows.length')` — assert error message contains "Eingangs-Pool".

  GREEN: Implementiere die folgenden Module.

  **`packages/core/src/stage1/types.ts`** — Typen:
  - `Stratum` — `{ key: Record<string,string>; rowIndices: number[] }` (Indizes, keine Kopien).
  - `StratifyOpts` — `{ axes: string[]; targetN: number; seed: number }`.
  - `StratumResult` — `{ key: Record<string,string>; n_h_pool: number; n_h_target: number; n_h_actual: number; underfilled: boolean }`.
  - `StratifyResult` — `{ selected: number[]; strata: StratumResult[]; warnings: string[] }`.

  **`packages/core/src/stage1/stratify.ts`** — Hauptfunktion `stratify(rows: Record<string,string>[], opts: StratifyOpts): StratifyResult`:
  1. Validate `targetN > rows.length` → throw mit deutscher Message.
  2. Bucketize: `Map<string, number[]>` mit Key = `JSON.stringify(...)` über sortierte Achsen-Werte. Für `axes=[]` → ein Bucket mit allen Indizes.
  3. Largest-Remainder-Allocation:
     - `quota_h = targetN * N_h / N_total`
     - `floor_h = Math.floor(quota_h)`
     - `remainder_h = quota_h - floor_h`
     - `delta = targetN - sum(floor_h)`
     - Sortiere Strata nach `remainder_h DESC`, ties: `N_h DESC`, ties: lex. Stratum-Key ASC. Erste `delta` bekommen `+1`.
     - Resultat: `n_h_target` pro Stratum, sum exakt `targetN`.
  4. Clamp: `n_h_actual = Math.min(n_h_target, N_h)`. Bei `n_h_actual < n_h_target` → `underfilled=true`, push Warning `"Stratum {keyJson} unter-vertreten: {n_h_actual} von {n_h_target} angefragt (Pool: {N_h})"`.
  5. Fisher-Yates pro Stratum: einen gemeinsamen `Mulberry32(seed)` instanziieren, Strata in lex. Key-Reihenfolge iterieren, jedes Stratum-`rowIndices`-Array in-place shufflen (Standard-Algorithmus: `for i = len-1 down to 1: j = floor(rng.nextFloat() * (i+1)); swap`). Erste `n_h_actual` Indizes übernehmen.
  6. `selected` = Vereinigung, sortiert (lex. Stratum-Key, dann Original-Row-Index ASC).
  7. Strata-Tabelle (`StratumResult[]`) ebenfalls in lex. Stratum-Key-Reihenfolge ausgeben.

  **`packages/core/src/stage1/index.ts`** — Re-export `./stratify`, `./types`.
  **`packages/core/src/index.ts`** — eine Zeile ergänzen: `export * from './stage1';`.

  REFACTOR: Helper `bucketize(rows, axes)` und `largestRemainderAllocation(strata, targetN)` als interne Funktionen extrahieren — testbar, Lesbarkeit. Englische Code-Kommentare.

  Keine SPDX-Header.
  </action>
  <verify>
  <automated>cd /root/workspace && pnpm --filter @sortition/core test -- stage1-stratify</automated>
  </verify>
  <done>
  - `packages/core/src/stage1/{types,stratify,index}.ts` existieren, exportieren `stratify`, `Stratum*`-Typen.
  - `packages/core/src/index.ts` re-exportiert `./stage1`.
  - `packages/core/tests/stage1-stratify.test.ts` enthält mindestens die 7 oben aufgelisteten `it`-Blöcke, alle grün.
  - Manuell verifiziert: `import { stratify } from '@sortition/core'` funktioniert ohne TS-Fehler in einem hypothetischen Web-App-Konsumenten (= `pnpm --filter @sortition/core build` oder `tsc --noEmit` läuft sauber).
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Audit-Builder (pure, Node-testbar) + RFC-4180-CSV-Writer + Tests</name>
  <files>
  packages/core/src/stage1/audit-builder.ts,
  packages/core/src/stage1/csv-export.ts,
  packages/core/src/stage1/types.ts,
  packages/core/src/stage1/index.ts,
  packages/core/tests/stage1-audit.test.ts,
  packages/core/tests/stage1-csv.test.ts
  </files>
  <behavior>
  Audit-Builder:
  - Baut `Stage1AuditDoc` aus Inputs (Filename, Größe, Bytes, Achsen, Seed, StratifyResult, Timing).
  - Hash: SHA-256 hex über Roh-Bytes der hochgeladenen CSV. Reproduzierbar (gleiche Bytes → gleicher Hash).
  - Canonical JSON: stable Output bei Re-Serialisierung (sortierte Top-Level-Keys, sortierte Strata in Tabelle nach Stratum-Key).
  - Felder ohne Signatur (public_key, signature, signature_algo) noch nicht gesetzt — die werden vom Web-Layer ergänzt.
  - `seed_source` korrekt aus Caller-Input übernehmen (`'user' | 'unix-time-default'`).
  - `actual_n` = `selected.length` (kann < `target_n` bei Underfill sein).
  - `warnings` enthält 1:1 die `StratifyResult.warnings`.

  CSV-Writer:
  - RFC-4180-konformes Quoting: Felder mit `"`, `,`, `;`, `\n`, `\r` werden in `"..."` eingehüllt, interne `"` werden zu `""`.
  - Header-Zeile = `parsed.headers` in Original-Reihenfolge.
  - Data-Zeilen = `parsed.rows[selected[i]]` in `selected[]`-Reihenfolge.
  - Trennzeichen IMMER `,` (auch wenn Eingang `;` war) — UTF-8-Output, RFC-4180-Standard.
  - Optional: Spalte `gezogen` (true/false) als zusätzliche letzte Spalte, parametrisiert per Option `{ includeGezogenColumn: boolean }`. Default: false. Wenn true und Spalte existiert bereits in `headers` → push warning + Spalte trotzdem als `gezogen_2` anhängen (kein Bruch).
  - Round-Trip: Output-CSV durch `parseCsvBuffer` → identische Zeilen-Inhalte (Trim, Quoting korrekt geparst).
  </behavior>
  <action>
  RED: Schreibe `packages/core/tests/stage1-audit.test.ts` und `packages/core/tests/stage1-csv.test.ts`.

  Audit-Tests mindestens:
  - `it('produces stable canonical JSON across re-serialization')` — `JSON.parse(JSON.stringify(audit))` und nochmal stringify, beide Strings müssen identisch sein.
  - `it('hashes identical bytes to identical sha256')` — gleiche Bytes zweimal hashen.
  - `it('hashes different bytes to different sha256')`.
  - `it('preserves warnings from stratify result')`.
  - `it('sets actual_n to selected.length not target_n')` — Underfill-Case konstruieren.
  - `it('exposes seed_source field as provided')`.

  CSV-Tests mindestens:
  - `it('quotes fields containing comma, quote, or newline per RFC-4180')` — Test-Case mit District `Hamburg-Mitte, Innen` und Name `Anna "die Große" Müller` und Adresse mit `\n`.
  - `it('preserves all original headers in original order')`.
  - `it('outputs rows in selected[] order')`.
  - `it('round-trips through parseCsvBuffer')` — Output-CSV als ArrayBuffer encoden, durch `parseCsvBuffer` schicken, Zeilen vergleichen.
  - `it('appends gezogen column when option enabled and no conflict')`.
  - `it('renames gezogen column on conflict and adds warning')`.

  GREEN: Implementiere.

  **`packages/core/src/stage1/types.ts`** — ergänze:
  - `Stage1AuditDoc`-Interface gemäß RESEARCH.md `audit-builder.ts`-Schema-Vorschlag (Zeilen 211-238 von RESEARCH.md): `schema_version: '0.1'`, `operation: 'stage1-versand'`, `seed: number`, `seed_source: 'user' | 'unix-time-default'`, `input_csv_sha256: string`, `input_csv_filename: string`, `input_csv_size_bytes: number`, `pool_size: number`, `target_n: number`, `actual_n: number`, `stratification_axes: string[]`, `strata: Array<{ key: Record<string,string>; n_h_pool: number; n_h_target: number; n_h_actual: number; underfilled: boolean }>`, `warnings: string[]`, `timestamp_iso: string`, `duration_ms: number`, optional `public_key?: string`, `signature?: string`, `signature_algo?: 'Ed25519' | 'ECDSA-P256-SHA256'`.
  - `BuildStage1AuditArgs`-Interface — Inputs für Builder.

  **`packages/core/src/stage1/audit-builder.ts`** — Funktionen:
  - `async function sha256Hex(bytes: Uint8Array): Promise<string>` — nutze `globalThis.crypto.subtle.digest('SHA-256', bytes)`, Bytes → hex (lowercase). `crypto.subtle` ist in Node 20+ verfügbar (RESEARCH.md Risiko 2). Falls Vitest-Env `crypto.subtle` fehlt: dokumentieren, dass `webcrypto`-Polyfill nicht nötig ist.
  - `async function buildStage1Audit(args: BuildStage1AuditArgs): Promise<Stage1AuditDoc>` — baut Doc, ruft sha256Hex über `args.inputBytes`, sortiert Strata-Tabelle nach lex. Stratum-Key, setzt `timestamp_iso = new Date().toISOString()`. Lässt Signatur-Felder leer.
  - `function canonicalStage1Json(doc: Stage1AuditDoc): string` — stable Serialization. Implementiere als Recursive-Sort-Helper: Objekt → Keys sortieren ASC, Arrays bleiben in eigener Reihenfolge. Output `JSON.stringify(sortedDoc)` (ohne `null, 2` — eine Zeile, deterministisch). Kann später vom Web-Layer für Signing genutzt werden statt naivem `JSON.stringify(doc)`.

  **`packages/core/src/stage1/csv-export.ts`** — Funktionen:
  - `function rfc4180Quote(value: string): string` — interner Helper. Wenn value `,` `;` `"` `\n` `\r` enthält → `"` + value-escaped + `"`. Sonst raw.
  - `function stage1ResultToCsv(headers: string[], rows: Record<string,string>[], selected: number[], opts?: { includeGezogenColumn?: boolean }): { csv: string; warnings: string[] }` — Header-Zeile + Data-Zeilen, `,`-Separator, `\r\n`-Line-Ending (RFC-4180). Bei `includeGezogenColumn=true` und Konflikt → letzte Spalte heißt `gezogen_2`, Warning enthält `"Spalte 'gezogen' existiert bereits, neue Spalte als 'gezogen_2' angehängt"`.

  Update `packages/core/src/stage1/index.ts` mit Re-exports.

  REFACTOR: Hex-Konvertierung als Mini-Helper, ggf. `bytesToHex(bytes: Uint8Array): string`. Englische Code-Kommentare. Keine SPDX-Header.
  </action>
  <verify>
  <automated>cd /root/workspace && pnpm --filter @sortition/core test -- stage1-audit stage1-csv</automated>
  </verify>
  <done>
  - `packages/core/src/stage1/audit-builder.ts` exportiert `sha256Hex`, `buildStage1Audit`, `canonicalStage1Json`.
  - `packages/core/src/stage1/csv-export.ts` exportiert `stage1ResultToCsv`.
  - `Stage1AuditDoc` exportiert via `@sortition/core`.
  - Beide Test-Dateien grün.
  - Round-Trip-Test (CSV → parseCsvBuffer → identische Zeilen) grün.
  </done>
</task>

<task type="auto">
  <name>Task 3: Audit-Signatur-Wrapper im Web-Layer</name>
  <files>
  apps/web/src/stage1/audit-sign.ts
  </files>
  <action>
  Erstelle `apps/web/src/stage1/audit-sign.ts` mit einer Funktion, die ein `Stage1AuditDoc` (aus `@sortition/core`) signiert und um Signatur-Felder ergänzt.

  Pflicht-Anforderungen:
  - Wiederverwende die Sign-Mechanik aus `apps/web/src/run/audit.ts:101-150`. Konkret: Ed25519 zuerst probieren via `crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify'])`, bei Fehler (Firefox/Safari) Fallback zu ECDSA-P256-SHA256. Beide Pfade liefern `{ pubB64, sigB64, algo }` zurück.
  - Strip-then-Sign: vor dem Signieren `public_key`, `signature`, `signature_algo` entfernen, dann `canonicalStage1Json(strippedDoc)` (aus `@sortition/core`) als bodyJson nehmen, signen, anschließend `public_key`, `signature`, `signature_algo` in den Doc schreiben.
  - Output: `{ doc: Stage1AuditDoc, bodyJson: string }` (analog `SignedAudit`).

  **Stretch (optional, nur wenn Diff klein bleibt):** Generalisiere die Sign-Helper-Funktionen `signWithEd25519` / `signWithEcdsa` aus `apps/web/src/run/audit.ts` zu einem internen `signString(bodyJson: string): Promise<{ pubB64, sigB64, algo }>` (Ed25519 mit ECDSA-Fallback) und exportiere ihn aus `apps/web/src/run/audit.ts`. Stage-1-Wrapper `signStage1Audit` ruft dann nur diesen Helper auf. **Wenn das auch nur einen einzigen `signAudit`-Test in der bestehenden Test-Suite bricht: zurückrollen und ohne Refactor implementieren** (Logik duplizieren, ~30 Zeilen). Existierende Stage-3-Pfade dürfen NICHT brechen.

  Keine neuen Dependencies. Keine SPDX-Header. Englische Code-Kommentare.

  Pfad-Anmerkung: Datei lebt in `apps/web/src/stage1/`, Verzeichnis muss neu angelegt werden.
  </action>
  <verify>
  <automated>cd /root/workspace && pnpm --filter @sortition/web exec tsc --noEmit && pnpm --filter @sortition/web test -- audit</automated>
  </verify>
  <done>
  - `apps/web/src/stage1/audit-sign.ts` exportiert `async function signStage1Audit(doc: Stage1AuditDoc): Promise<{ doc: Stage1AuditDoc; bodyJson: string }>`.
  - TypeScript kompiliert ohne Fehler.
  - Bestehende `audit.ts`-Unit-Tests (falls vorhanden) bleiben grün; falls nicht vorhanden, manueller Smoketest `signStage1Audit({ /* minimal doc */ })` wirft nicht.
  - Wenn Stretch umgesetzt: `apps/web/src/run/audit.ts` exportiert `signString`-Helper, `signAudit` nutzt ihn intern, kein Behavior-Drift.
  </done>
</task>

<task type="auto">
  <name>Task 4: UI-Komponenten — Stage1Panel, AxisPicker, Glue-Layer</name>
  <files>
  apps/web/src/stage1/Stage1Panel.tsx,
  apps/web/src/stage1/AxisPicker.tsx,
  apps/web/src/stage1/runStage1.ts
  </files>
  <action>
  Solid-Komponenten analog zu `apps/web/src/run/RunPanel.tsx:1-265` (Vorbild für Style + State-Management).

  **`apps/web/src/stage1/runStage1.ts`** — Glue-Layer (kein JSX), exportiert `async function runStage1(input: { file: File; parsed: ParsedCsv; axes: string[]; targetN: number; seed: number; seedSource: 'user' | 'unix-time-default' }): Promise<{ result: StratifyResult; signedAudit: { doc: Stage1AuditDoc; bodyJson: string }; csv: string; csvWarnings: string[]; durationMs: number }>`. Schritte:
  1. `const t0 = performance.now()`.
  2. `const buf = await input.file.arrayBuffer()`.
  3. `const result = stratify(input.parsed.rows, { axes: input.axes, targetN: input.targetN, seed: input.seed })` — kann `throw` (Pool zu klein), Caller muss fangen.
  4. `const auditDoc = await buildStage1Audit({ inputBytes: new Uint8Array(buf), filename: input.file.name, sizeBytes: input.file.size, axes: input.axes, targetN: input.targetN, seed: input.seed, seedSource: input.seedSource, poolSize: input.parsed.rows.length, result, durationMs: performance.now() - t0 })`.
  5. `const signedAudit = await signStage1Audit(auditDoc)`.
  6. `const { csv, warnings: csvWarnings } = stage1ResultToCsv(input.parsed.headers, input.parsed.rows, result.selected, { includeGezogenColumn: false })`.
  7. Return alle Felder + `durationMs`.

  Imports aus `@sortition/core` (`stratify`, `buildStage1Audit`, `stage1ResultToCsv`, Typen) und `./audit-sign`.

  **`apps/web/src/stage1/AxisPicker.tsx`** — Solid-Komponente. Props: `{ headers: string[]; defaultAxes: string[]; selected: () => string[]; onToggle: (header: string) => void }`. Render: Liste von Checkboxen, eine pro Header. `defaultAxes` werden initial vorausgewählt (Logik im Parent, hier nur darstellen). Vorgeschlagene Achsen optisch hervorheben (z.B. Badge "vorgeschlagen"). `data-testid="axis-checkbox-{header}"` pro Checkbox.

  **`apps/web/src/stage1/Stage1Panel.tsx`** — Solid-Komponente. Top-level Signals: `parsed: ParsedCsv | null`, `selectedAxes: string[]`, `targetN: number | null`, `seed: number`, `seedSource: 'user' | 'unix-time-default'`, `running: boolean`, `result: StratifyResult | null`, `signedAudit: SignedStage1Audit | null`, `csv: string | null`, `csvWarnings: string[]`, `error: string | null`, `durationMs: number | null`.

  UI-Elemente (mit `data-testid`):
  - File-Input (`data-testid="stage1-csv-upload"`) → ruft `parseCsvFile`, setzt `parsed`. Bei Erfolg: `defaultAxes` aus `autoGuessMapping(parsed.headers)` ableiten — alle Original-Header-Namen, deren `autoGuessMapping`-Result in `['district','age_band','gender']` liegt. Diese als `selectedAxes` setzen.
  - `<AxisPicker>` (sichtbar nach Upload) — Toggle-Logik in Parent.
  - Number-Input für `targetN` (`data-testid="stage1-target-n"`).
  - Number-Input für `seed` (`data-testid="stage1-seed"`). Default: `Math.floor(Date.now() / 1000)` (uint32-safe — siehe RESEARCH.md Risiko 6, NICHT `Date.now()`). `seedSource` automatisch: wenn User Wert ändert → `'user'`, sonst `'unix-time-default'`. Sichtbar im UI.
  - "Ziehen"-Button (`data-testid="stage1-run"`). Disabled wenn `parsed === null || targetN === null || targetN <= 0 || selectedAxes.length === 0` (auch leere Axes-Liste erlaubt? Ja: degeneriert zu SRS — also Disabled-Bedingung ohne `selectedAxes.length === 0`-Check). Setzt `running=true`, ruft `runStage1(...)`, fängt errors → `setError(e.message)`, sonst `setResult/setSignedAudit/setCsv`.
  - Result-Display (sichtbar wenn `result !== null`): Strata-Tabelle (Stratum-Key, n_h_pool, n_h_target, n_h_actual, underfilled-Marker), Warning-Liste (rot, falls vorhanden), Dauer in ms.
  - Download-Buttons:
    - "CSV herunterladen" (`data-testid="stage1-download-csv"`) → `downloadBlob('versand-${seed}.csv', csv, 'text/csv;charset=utf-8')`.
    - "Audit herunterladen" (`data-testid="stage1-download-audit"`) → `downloadBlob('versand-audit-${seed}.json', JSON.stringify(signedAudit.doc, null, 2), 'application/json')`.
  - BMG-§46-Hinweistext (= Task 6, Platzhalter-Element jetzt einbauen, Inhalt in Task 6).

  Imports: `parseCsvFile`, `autoGuessMapping` aus `../csv/parse`. `downloadBlob` aus `../run/audit`. `runStage1` aus `./runStage1`. Typen aus `@sortition/core`.

  Keine neuen Dependencies. Englische Code-Kommentare. Deutsche UI-Strings.
  </action>
  <verify>
  <automated>cd /root/workspace && pnpm --filter @sortition/web exec tsc --noEmit && pnpm --filter @sortition/web build</automated>
  </verify>
  <done>
  - Drei neue Dateien existieren in `apps/web/src/stage1/`.
  - TypeScript kompiliert ohne Fehler.
  - `pnpm build` für `@sortition/web` erfolgreich (UI ist Teil des Bundles, auch wenn noch nicht in `App.tsx` eingehängt).
  - `data-testid`-Attribute auf allen interaktiven Elementen für Playwright (Task 8).
  </done>
</task>

<task type="auto">
  <name>Task 5: Tab-Switcher in App.tsx</name>
  <files>
  apps/web/src/App.tsx
  </files>
  <action>
  Modifiziere `apps/web/src/App.tsx` (siehe `apps/web/src/App.tsx:34-106` für aktuellen Zustand). Ziel: Header mit zwei Tabs/Buttons "Versand-Liste ziehen" (Stage 1) und "Panel ziehen" (Stage 3).

  Konkret:
  1. Neues Top-level Signal: `const [mode, setMode] = createSignal<'stage1' | 'stage3'>('stage3')`. **Default `'stage3'`**, damit bestehende Stage-3-Funktionalität ohne weiteres funktioniert (Issue Acceptance: "Bestehende Stage-3-Funktionalität bleibt unverändert nutzbar").
  2. Header-Sektion über den bestehenden Sections: zwei Buttons mit `data-testid="tab-stage1"` und `data-testid="tab-stage3"`. Aktiver Tab visuell hervorgehoben (z.B. CSS-Klasse `active`). Beide rufen `setMode(...)`.
  3. Body in zwei `<Show>`-Sections aufteilen:
     - `<Show when={mode() === 'stage3'}>` umschließt die existierenden drei Sections (Pool importieren, Quoten konfigurieren, Lauf starten) — Code 1:1 unverändert.
     - `<Show when={mode() === 'stage1'}>` rendert `<Stage1Panel />`.
  4. Import `Stage1Panel` aus `./stage1/Stage1Panel`.
  5. **State-Trees getrennt:** Stage-1-State lebt komplett in `Stage1Panel` (eigene Signals dort). Top-level `pool`, `quotas`, `enginePool`, `engineQuotas`, `quotaValid` bleiben unverändert für Stage 3. Kein Sharing zwischen Modi.

  CSS: minimaler Inline-Style oder neue Klassen in `apps/web/src/App.css` (falls existiert). Tab-Buttons als simple `<button>`-Elemente, aktiver Zustand z.B. via `class:active={mode() === 'stage1'}`.

  Englische Code-Kommentare. Deutsche UI-Strings ("Versand-Liste ziehen", "Panel ziehen").

  Keine neuen Dependencies (kein Solid Router).
  </action>
  <verify>
  <automated>cd /root/workspace && pnpm --filter @sortition/web exec tsc --noEmit && pnpm --filter @sortition/web build</automated>
  </verify>
  <done>
  - `App.tsx` enthält Header mit zwei Tab-Buttons.
  - `mode`-Signal mit Default `'stage3'` vorhanden.
  - Stage-3-Section steht 1:1 unverändert in `<Show when={mode() === 'stage3'}>`.
  - Stage-1-Section rendert `<Stage1Panel />`.
  - TypeScript + Build grün.
  - Manuell verifiziert (per `pnpm --filter @sortition/web dev`, optional): App lädt mit Stage-3-Tab aktiv, Klick auf Stage-1-Tab zeigt Panel.
  </done>
</task>

<task type="auto">
  <name>Task 6: BMG-§46-Hinweistext im Stage-1-UI</name>
  <files>
  apps/web/src/stage1/Stage1Panel.tsx
  </files>
  <action>
  In `Stage1Panel.tsx` einen prominenten Hinweistext einbauen, sichtbar nach Upload (oder permanent oberhalb der Achsen-Auswahl). Inhalt 1:1 aus CONTEXT.md Punkt 5:

  > Stratifikation kann nur über Felder erfolgen, die im Melderegister enthalten sind. Bildung, Migrationshintergrund, Beruf sind nicht im Melderegister — diese kommen erst nach Selbstauskunft hinzu.

  Anforderungen:
  - Kein Hard-Block (kein `disabled`-Status, keine erzwungene Bestätigung).
  - Visuell als Info-Box (z.B. `<aside data-testid="stage1-bmg-hint" class="info-box">...</aside>`).
  - Position: zwischen Upload-Sektion und AxisPicker.
  - Optional: Link auf BMG-§46 (`https://www.gesetze-im-internet.de/bmg/__46.html`) als ergänzende Quelle. Keine Pflicht, aber wenn eingebaut → `target="_blank" rel="noopener noreferrer"`.

  Englische Code-Kommentare, deutscher UI-Text.
  </action>
  <verify>
  <automated>cd /root/workspace && pnpm --filter @sortition/web exec tsc --noEmit</automated>
  </verify>
  <done>
  - `Stage1Panel.tsx` enthält `<aside data-testid="stage1-bmg-hint">` mit dem CONTEXT.md-Wortlaut.
  - Element rendert vor Achsen-Auswahl, sichtbar nach Upload (oder permanent).
  - Kein interaktiver Block — nur Info.
  - TypeScript grün.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 7: Integrations-Test 6000 Zeilen via generatePool</name>
  <files>
  packages/core/tests/stage1-integration.test.ts
  </files>
  <behavior>
  - Erzeugt n=6000 Pool via `generatePool({ profile: 'kleinstadt-bezirkshauptort', size: 6000, seed: 42, tightness: 0.7 })` (Profil mit 3 Districts, klare Strata).
  - Mappt `PoolRow[]` zu `Record<string,string>[]` (alle Felder als Strings).
  - Stratifiziert auf `axes: ['district', 'age_band', 'gender']`, `targetN: 300`, `seed: 12345`.
  - Verifiziert:
    - `result.selected.length === 300` exakt.
    - Für jedes belegte Stratum: `|n_h_actual - expected| <= 1`, mit `expected = 300 * N_h / 6000`.
    - Sum aller `n_h_target` === 300 (Largest-Remainder-Korrektheit).
    - Determinismus: zweimal mit gleichem Seed → identisches `result.selected`.
    - Keine Underfill-Warnings für n=6000 (Strata sollten alle ausreichend gefüllt sein).
  - Performance-Sanity: gesamte Pipeline (`generatePool` + `stratify`) <500 ms (großzügig, kein Hard-Cap, nur Sicherheitsnetz).
  </behavior>
  <action>
  RED → GREEN: Schreibe `packages/core/tests/stage1-integration.test.ts` mit `describe('Stage 1 integration: 6000-row pool', ...)` und mehreren `it`-Blöcken (siehe behavior). Nutze `generatePool` und `PROFILES` aus `@sortition/core`.

  Konkret:
  - `it('selects exactly 300 from 6000-pool')`.
  - `it('keeps each stratum within ±1 of expected proportional count')` — iteriere `result.strata`, berechne `expected = 300 * s.n_h_pool / 6000`, assert `Math.abs(s.n_h_actual - expected) <= 1`.
  - `it('largest-remainder allocation sums to 300 exactly')` — `assert sum(strata.map(s => s.n_h_target)) === 300`.
  - `it('is deterministic across runs')` — zweimal stratifizieren, deepEqual `result.selected`.
  - `it('produces no underfill warnings on full 6000-pool')` — `assert result.warnings.length === 0`.
  - Optional: `it('completes within 500 ms')` — `performance.now()` vor/nach.

  Hinweis: `PoolRow.district` ist beim Profil `kleinstadt-bezirkshauptort` ein String wie `'01-stadtkern'` (RESEARCH.md Zeile 350). Für `axes: ['district']` darf der Algorithmus das nicht spezialbehandeln.

  Datentyp-Konvertierung: `PoolRow` → `Record<string, string>` via `pool.map(r => Object.fromEntries(Object.entries(r).map(([k,v]) => [k, String(v)])))`. Achtung: alle 6 Felder bleiben — `axes` filtert dann auf die genutzten.

  Englische Code-Kommentare.
  </action>
  <verify>
  <automated>cd /root/workspace && pnpm --filter @sortition/core test -- stage1-integration</automated>
  </verify>
  <done>
  - `packages/core/tests/stage1-integration.test.ts` enthält die 5+ `it`-Blöcke aus `<behavior>`.
  - Alle grün.
  - Test-Laufzeit <2 s (generatePool n=6000 + stratify).
  - Keine 6000er-Fixture-Datei eingecheckt — Pool wird inline erzeugt.
  </done>
</task>

<task type="auto">
  <name>Task 8: Playwright-Smoke für Stage-1-Workflow</name>
  <files>
  apps/web/tests/e2e/stage1.spec.ts
  </files>
  <action>
  Schreibe `apps/web/tests/e2e/stage1.spec.ts` analog zu `apps/web/tests/e2e/end-to-end.spec.ts:1-59`.

  Test-Schritte:
  1. `test.beforeEach` öffnet `/`.
  2. Klick auf `data-testid="tab-stage1"`.
  3. File-Upload: bestehende Fixture aus `tests/fixtures/synthetic-pools/` (z.B. `*-n500-*.csv` oder `*-n1000-*.csv`, n=500 reicht für Smoke). Lade per `page.locator('[data-testid="stage1-csv-upload"]').setInputFiles(FIXTURE_PATH)`.
  4. Warte bis BMG-Hinweis sichtbar (`page.locator('[data-testid="stage1-bmg-hint"]')`).
  5. Verifiziere mindestens eine vorgeschlagene Achse ist preselected (z.B. `district`-Checkbox `checked`).
  6. Setze `targetN`: `page.locator('[data-testid="stage1-target-n"]').fill('50')`.
  7. (Seed unverändert lassen — Default = unix-Sekunde, deterministisch über Lauf.)
  8. Klick `data-testid="stage1-run"`.
  9. Warte bis Result-Tabelle erscheint (z.B. spezifischer Selektor in Result-Display, optional `data-testid="stage1-result"` ergänzen).
  10. Klick auf "CSV herunterladen" — verifiziere Download via `page.waitForEvent('download')`. Filename matcht `versand-*.csv`.
  11. Klick auf "Audit herunterladen" — Download mit `versand-audit-*.json`. Browser-Skip für Firefox falls Audit-Signing-API instabil (siehe RESEARCH.md: Firefox = ECDSA-Fallback; Test sollte beide Browser stemmen, aber falls nicht — `test.skip(browserName === 'firefox', 'ECDSA-fallback verified separately')`).

  Anforderungen:
  - Default-Timeout (30 s) reicht — Stage 1 ist sub-Sekunde.
  - Fixture-Pfad relativ zu `apps/web/`: `path.join(__dirname, '../../../../tests/fixtures/synthetic-pools/<file>')`. Verifiziere existierenden Fixture-Filename per `ls tests/fixtures/synthetic-pools/`.
  - `setInputFiles` erwartet entweder Pfad oder `{ name, mimeType, buffer }` — beides ok, Pfad einfacher.
  - Englische Code-Kommentare.
  </action>
  <verify>
  <automated>cd /root/workspace && pnpm --filter @sortition/web exec playwright test stage1</automated>
  </verify>
  <done>
  - `apps/web/tests/e2e/stage1.spec.ts` existiert.
  - Test grün auf Chromium (Pflicht).
  - Test grün auf Firefox (mit ggf. Skip für Audit-Download wenn ECDSA-Fallback Probleme macht — dokumentieren wieso).
  - Bestehender `end-to-end.spec.ts` läuft weiter grün (kein Regression auf Stage 3).
  - Falls in Task 4/6 noch keine `data-testid`-Attribute auf Result-Display: hier ggf. ergänzen (zurück zu `Stage1Panel.tsx`).
  </done>
</task>

<task type="auto">
  <name>Task 9: README/Docs-Update zur Stage-1-Funktion</name>
  <files>
  README.md
  </files>
  <action>
  Ergänze in `README.md` (deutsch) einen kurzen Abschnitt "Stage 1 — Versand-Liste ziehen" mit:
  - Was die Funktion tut (1-2 Sätze): proportionale stratifizierte Zufallsstichprobe aus Melderegister-CSV, deterministisch über Seed, signierter Audit-Snapshot.
  - Wann zu nutzen: vor dem Anschreiben (Schritt 1), während Stage 3 (Panel-Ziehung aus Antwortenden-Pool) der Schritt nach Selbstauskunft ist.
  - Algorithmus-Kurzbeschreibung: Largest-Remainder-Methode + Fisher-Yates pro Stratum, Mulberry32-RNG.
  - BMG-§46-Hinweis als Zitat (gleicher Wortlaut wie UI).
  - Output-Format kurz: CSV (alle Original-Spalten) + JSON-Audit (Seed, SHA-256 der Eingangs-CSV, Stratum-Tabelle, Ed25519/ECDSA-Signatur).
  - Verweis auf `sortition-tool/08-product-redesign.md` für Architektur-Hintergrund.

  Falls `README.md` keine Anwender-Doku enthält (sondern nur Repo-Status): Abschnitt trotzdem hinzufügen, ggf. unter "## Bedienung" oder "## Funktionen". Prüfe die existierende Struktur per Read und passe sinnvoll ein.

  **Sprache: Deutsch** (Projekt-Regel).

  Quellen-Verlinkung wo möglich (z.B. Wikipedia-Largest-Remainder, BMG-§46).
  </action>
  <verify>
  <automated>cd /root/workspace && grep -i "stage 1\|versand-liste\|stratifizier" README.md | head -5</automated>
  </verify>
  <done>
  - `README.md` enthält neuen Abschnitt zu Stage 1 (mindestens ~10 Zeilen).
  - BMG-§46-Hinweistext im selben Wortlaut wie UI und CONTEXT.md.
  - Verweis auf `sortition-tool/08-product-redesign.md`.
  - Keine neuen Doku-Dateien (CLAUDE.md-Regel: keine ungefragten neuen .md).
  </done>
</task>

</tasks>

<verification>
Nach Abschluss aller Tasks:

1. **Vollständige Test-Suite:**
   ```
   cd /root/workspace && pnpm -r test
   ```
   Erwartung: alle Vitest-Suites grün (Core, Engine-A, Web-Unit). Stage-1-Tests laufen unter `@sortition/core`.

2. **TypeScript-Strict-Check über alle Workspaces:**
   ```
   cd /root/workspace && pnpm -r exec tsc --noEmit
   ```

3. **Playwright-E2E (beide Browser):**
   ```
   cd /root/workspace && pnpm --filter @sortition/web exec playwright test
   ```
   Erwartung: Stage 1 (`stage1.spec.ts`) und Stage 3 (`end-to-end.spec.ts`) beide grün.

4. **Build-Sanity:**
   ```
   cd /root/workspace && pnpm --filter @sortition/web build
   ```
   Erwartung: erfolgreicher Vite-Build, kein Bundle-Größen-Sprung >50 KB (Stage 1 ist pure TS, keine neuen Deps).

5. **Manueller UI-Smoke (optional, vor Merge):**
   ```
   cd /root/workspace && pnpm --filter @sortition/web dev
   ```
   App öffnen → Tab "Versand-Liste ziehen" → Datei aus `tests/fixtures/synthetic-pools/` hochladen → Achsen prüfen → N=50 → Lauf → CSV + Audit downloaden → Audit-JSON-Inhalt prüfen (Felder vorhanden, Signatur gesetzt).
</verification>

<success_criteria>
1:1-Mapping zu ISSUE.md Acceptance Criteria:

- [ ] Neuer App-Bereich "Versand-Liste ziehen" erreichbar via Tab-Switcher in `App.tsx` (Variante B aus Research, kein Solid Router) — Task 5.
- [ ] CSV-Upload nutzt `parseCsvFile` aus `apps/web/src/csv/parse.ts` — Task 4.
- [ ] Defaults für Achsen `district`, `age_band`, `gender` automatisch erkannt via `autoGuessMapping`, abwählbar/erweiterbar — Task 4 + AxisPicker.
- [ ] Eingabe Stichprobengröße N (numerisch, Pflicht) — Task 4.
- [ ] Algorithmus: proportionale Stratifikation + Largest-Remainder + Fisher-Yates + Mulberry32, sum(n_h) = N exakt — Task 1.
- [ ] Edge-Cases (leeres Stratum, n_h_target > N_h, nur ein Stratum, N > sum(N_h)) dokumentiert + getestet — Task 1.
- [ ] Deterministisch über Seed, Default = uint32-safe Unix-Sekunde — Task 1 + Task 4.
- [ ] Output 1: CSV mit allen Original-Spalten, RFC-4180-konform — Task 2.
- [ ] Output 2: signierter Audit-JSON (Seed, Eingangs-CSV-SHA-256, Achsen, Ziel-N, tatsächlich-N, Stratum-Tabelle, Zeitstempel, Ed25519/ECDSA-Signatur) — Task 2 + Task 3.
- [ ] Unit-Tests in `packages/core/tests/stage1-*.test.ts` (KORREKTUR: nicht `__tests__/`) — Tasks 1, 2.
- [ ] Integrationstest: 6000 Zeilen via `generatePool` → 300 → Strata-Verteilung ±1 — Task 7.
- [ ] Playwright-Smoke-Test Upload→Defaults→Größe→Lauf→Download — Task 8.
- [ ] Bestehende Stage-3-Funktionalität unverändert nutzbar (Tab-Default = `stage3`, getrennte State-Trees, kein Refactor von `RunPanel.tsx`) — Task 5.
- [ ] BMG-§46-Hinweistext im UI (kein Hard-Block) — Task 6.
- [ ] Doku-Update in README.md — Task 9.

Locked-Decision-Self-Check (CONTEXT.md):
- Pure TypeScript, kein Solver/Pyodide → Task 1 (lebt in `packages/core/src/stage1/`, keine neuen Deps in Tasks 2-9).
- Sub-Sekunde bis 100.000 → Performance-Sanity Task 7 (n=6000 <500 ms; Extrapolation: n=100k <8 s linear, in der Praxis schneller wegen Cache; falls Bedenken: dedizierter n=100k-Vitest-Timing-Test optional).
- BMG-Hinweistext-Wortlaut 1:1 aus CONTEXT.md → Task 6.
- Verfahren-State (#46) NICHT in Scope → keine Task berührt eine Verfahren-State-Datei.
- Reserve-Liste (#47), Mehrwellig (#48), Auto-Aggregation, Korridore: alle aus Scope, in keiner Task adressiert.

Out-of-Scope-Self-Check: keine Task implementiert deferred items (Verfahren-State, Korridore, Reserve, Mehrwelle, BMG-API, Auto-Aggregation).
</success_criteria>
