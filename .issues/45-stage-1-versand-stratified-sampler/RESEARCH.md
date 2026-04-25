# Research — Issue #45: Stage 1 Versand-Sampler

**Recherchiert:** 2026-04-25
**Issue:** 45-stage-1-versand-stratified-sampler
**Confidence:** HIGH (Codebasis vollständig gelesen, alle behaupteten Wiederverwendungen verifiziert oder korrigiert)

## User Constraints (verbatim aus CONTEXT.md)

### Locked Decisions

1. **Defaults erkennen, überschreibbar:** Tool erkennt Spalten `district`, `age_band`, `gender` in der Eingangs-CSV; wenn vorhanden, werden diese drei als Default-Achsen vorgeschlagen. Nutzer kann ab- oder dazuwählen (jede Spalte ist mögliche Achse).
2. **Algorithmus:** proportionale Stratifikation, Largest-Remainder-Methode für Bruchteil-Rundung (sum(n_h) = N exakt). Innerhalb Stratum: Fisher-Yates-Shuffle mit Mulberry32. Deterministisch über Seed (Default = aktuelle Unix-Zeit, sichtbar).
3. **Pure TypeScript, kein Solver, kein Pyodide.** Lebt in `packages/core/src/stage1/` (neuer Submodul). Sub-Sekunde für Eingangs-Größe bis 100.000.
4. **Output 2-teilig:** CSV der Gezogenen (alle Original-Spalten erhalten) + Audit-JSON (Seed, Eingangs-CSV-SHA256, Achsen, Stratum-Tabelle, Ed25519/ECDSA-signiert).
5. **BMG-§46-Hinweistext:** "Stratifikation kann nur über Felder erfolgen, die im Melderegister enthalten sind. Bildung, Migrationshintergrund, Beruf sind nicht im Melderegister." Kein Hard-Block.
6. **Edge-Cases:** leeres Stratum (skip, kein Fehler), n_h_target > N_h (alle ziehen, im Audit vermerken), nur ein Stratum (entartet zu SRS), N > sum(N_h) (klare Fehlermeldung "Eingangs-Pool zu klein").
7. **UI-Position:** neuer Tab/Route `/stage1-versand` in `apps/web/`. Hauptnavigation mit zwei separaten Wegen "Versand-Liste ziehen" und "Panel ziehen". Bestehende Stage-3-Funktionalität bleibt unverändert nutzbar.
8. **Verfahren-State (#46) nicht in #45-Scope.** Stage 1 produziert eigenständig CSV + Audit-JSON.

### Out of Scope

Soft-Constraints / Korridore (Stage 3); Mehrwellige Versand-Listen (#48); BMG-§46-API; Auto-Aggregation; Reserve-Liste (#47).

### Performance-Erwartung

100.000 Zeilen <1 s, O(N) Memory, keine Worker-Isolation nötig.

## Summary

Die Codebasis ist gut vorbereitet. CSV-Pipeline (Parser + Mapping + Validierung), RNG (Mulberry32), Audit-Modul (kanonische JSON-Serialisierung + Ed25519-Signierung mit ECDSA-Fallback) und der CSV-Download-Helper existieren bereits in produktions-tauglichem Zustand und können größtenteils direkt wiederverwendet werden — allerdings mit zwei wichtigen **Korrekturen am Issue-Text**:

1. **Audit-Code lebt in `apps/web/src/run/audit.ts`, NICHT in `packages/core/src/audit/`.** Letzteres existiert nicht. Der `audit.ts`-Modul nutzt `crypto.subtle` (Browser-Web-Crypto-API), ist also pur Browser-side — er kann nicht 1:1 in `packages/core` (Node-Vitest-Umgebung) wandern, ohne die Sign-Pfade zu trennen. Empfehlung: pure Audit-**Builder**-Funktionen (Hash, Canonicalization) nach `packages/core/src/audit/` extrahieren, **Signaturen** im Web-App-Layer (`apps/web/src/stage1/audit-sign.ts` oder Wiederverwendung von `apps/web/src/run/audit.ts`) belassen.
2. **Frontend-Framework ist Solid, nicht React.** App ist eine **Single-Page-State-Machine** mit `createSignal`/`Show`-Conditionals (kein React Router, kein Solid Router). Die Hauptnavigation muss neu eingeführt werden — als Solid-Signal-basierter Tab-Switcher in `App.tsx` oder per Solid Router (neue Dependency, ~12 KB).

**Primäre Empfehlung für Plan/Execute:**

- Algorithmus + Datenmodell **isoliert in `packages/core/src/stage1/`** entwickeln (pure functions, Vitest-Node-Umgebung, vollständig deterministisch). Das ergibt: `stratify.ts` (Largest-Remainder + Fisher-Yates), `audit.ts` (canonical JSON + SHA-256, ohne Signing), `csv-export.ts` (CSV-Serializer der Original-Reihen), `index.ts` (re-export).
- **App-UI** als zweiter, separater Bereich in `apps/web/src/stage1/`: `Stage1Panel.tsx` (Komponente analog zu `RunPanel.tsx`), nutzt `parseCsvFile` aus `apps/web/src/csv/parse.ts`, ruft `@sortition/core` für Algorithmus auf, ruft `signAudit()` aus dem bestehenden `apps/web/src/run/audit.ts` (nach kleinem Refactor) für die Signatur.
- **Navigation:** minimaler Tab-Switcher in `App.tsx` per `createSignal<'stage1' | 'stage3'>`, kein Router. Stage-3-Pfad bleibt strukturell identisch.
- **Test-Strategie:** Unit-Tests in `packages/core/tests/stage1.test.ts` (Vitest, Node), Integrationstest mit `generatePool` (n=6000, mehrere Profile gemischt), Playwright-E2E in `apps/web/tests/e2e/stage1.spec.ts` (parallel zu `end-to-end.spec.ts`).

## Codebase Analysis

### Workspace-Struktur (HIGH)

| Pfad | Inhalt |
|---|---|
| `apps/web/` | Vite + Solid-JS Frontend (`@sortition/web`) |
| `packages/core/` | Pool-Generator + Mulberry32 (`@sortition/core`), Vitest-Node |
| `packages/engine-a/` | HiGHS-Maximin-Engine (`@sortition/engine-a`) |
| `packages/engine-contract/` | Zod-Schemas + Typen (`@sortition/engine-contract`) |
| `packages/metrics/` | Quality-Metriken (`@sortition/metrics`) |
| `tests/fixtures/synthetic-pools/` | CSVs n=100/500/1000/2000 (max 2001 Zeilen — **kein 6000er-Fixture vorhanden**) |
| `tests/fixtures/paper-pools/`, `paper-leximin-results/` | Referenzdaten aus Procaccia-Paper |

`pnpm-workspace.yaml:1-3` listet `apps/*` + `packages/*`. Vite-Aliases (`apps/web/vite.config.ts:8-12`) lösen `@sortition/core`, `@sortition/engine-a`, `@sortition/engine-contract` direkt auf die `src/index.ts`-Datei auf — damit greift TypeScript-HMR ohne Build-Schritt.

### CSV-Pipeline

<interfaces>
// apps/web/src/csv/parse.ts:8-16
export type SupportedEncoding = 'utf-8' | 'windows-1252' | 'iso-8859-1';
export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
  separator: ',' | ';' | '\t';
  encoding: SupportedEncoding;
  warnings: string[];
}

// apps/web/src/csv/parse.ts:60-62 — File → ParsedCsv (browser)
export async function parseCsvFile(file: File): Promise<ParsedCsv>

// apps/web/src/csv/parse.ts:65 — ArrayBuffer → ParsedCsv (Node-/Test-fähig)
export function parseCsvBuffer(buf: ArrayBuffer): ParsedCsv

// apps/web/src/csv/parse.ts:102-113 — semantic mapping
export const SEMANTIC_FIELDS = [
  'person_id', 'gender', 'age_band',
  'education', 'migration_background', 'district',
] as const;
export type SemanticField = (typeof SEMANTIC_FIELDS)[number];
export type ColumnMapping = Record<string, SemanticField | '__ignore__'>;

// apps/web/src/csv/parse.ts:132 — Heuristisches Default-Mapping (DE+EN-Header)
export function autoGuessMapping(headers: readonly string[]): ColumnMapping
// erkennt u.a.: bezirk→district, alter→age_band, geschlecht→gender, sprengel→district

// apps/web/src/csv/parse.ts:147 — Validierung mit Duplikat-Check
export function validateMapping(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
): { ok: boolean; errors: string[]; duplicate_person_ids: string[] }

// apps/web/src/csv/parse.ts:173 — Mapping anwenden (rename + drop ignored)
export function applyMapping(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
): Record<string, string>[]
</interfaces>

**Wiederverwendung für Stage 1:** `parseCsvFile` und `autoGuessMapping` direkt nutzen. Das Default-Mapping erkennt bereits `district`, `age_band`, `gender` (siehe `parse.ts:115-130`) — die Achsen-Default-Erkennung des Issues fällt damit als One-Liner an. **Aber Vorsicht:** Stage 1 muss die **Original-Spalten** der Eingangs-CSV erhalten (Issue-Anforderung "alle Original-Spalten"). `applyMapping` würde nur die semantischen Felder behalten und nicht-gemappte droppen. Stage 1 darf `applyMapping` daher **nicht** auf den Output-Roundtrip anwenden — nur die ursprünglichen `parsed.rows + parsed.headers` an die Stratifikations-Funktion weitergeben.

`SEMANTIC_FIELDS` enthält **nicht** `nationality`/`Staatsangehörigkeit` — das in Doc 08 als Pflichtfeld genannte Melderegister-Feld ist heute nicht im Auto-Mapping. Für Stage-1-Achsenwahl braucht das Tool ohnehin "jede Spalte ist mögliche Achse" — also keine Pflicht zum Erweitern, aber als Hinweis dokumentieren.

### RNG (Mulberry32)

<interfaces>
// packages/core/src/pool/mulberry32.ts:7-25
export class Mulberry32 {
  constructor(seed: number)         // seed wird via >>> 0 zu uint32 normalisiert
  nextU32(): number                 // 32-bit unsigned int
  nextFloat(): number               // [0, 1) — uniform
}

// packages/core/src/index.ts:11
export { Mulberry32 } from './pool/mulberry32';
</interfaces>

**Hilfsfunktionen fehlen:** Kein `shuffle`, kein `nextInt(min, max)`, kein `choice`. Stage 1 muss Fisher-Yates selbst implementieren — Standard-Pattern:

```ts
function shuffleInPlace<T>(arr: T[], rng: Mulberry32): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng.nextFloat() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}
```

Hinweis: Das Pendant existiert auch in Python (`scripts/generate_pool.py`, siehe Kommentar `mulberry32.ts:1-2`). Wer Cross-Lang-Determinismus braucht, müsste Fisher-Yates dort gespiegelt halten — für #45 ist nur TS-seitiger Determinismus Pflicht.

### Audit-Signatur

<interfaces>
// apps/web/src/run/audit.ts:3-19 — Maximin-spezifisches Audit-Doc
export interface AuditDoc {
  schema_version: string;        // '0.1' (audit.ts:21)
  engine: { id: string; version: string };
  algorithm: 'maximin';          // <-- HARTKODIERT, Stage 1 braucht eigene Variante
  seed: number;
  input_sha256: string;
  panel_size: number;
  pool_size: number;
  selected: string[];
  marginals: Record<string, number>;
  quota_fulfillment: RunResult['quota_fulfillment'];
  timing: { duration_ms: number; total_ms: number; num_committees?: number };
  public_key?: string;
  signature?: string;
  signature_algo?: 'Ed25519' | 'ECDSA-P256-SHA256';
}

// apps/web/src/run/audit.ts:23-28
async function sha256Hex(bytes: Uint8Array): Promise<string>   // crypto.subtle

// apps/web/src/run/audit.ts:30-34
function toBase64(bytes: Uint8Array): string                   // btoa-basiert (Browser)

// apps/web/src/run/audit.ts:36-66 — kanonische Serialisierung (sortierte Keys/Kategorien)
function canonicalQuotas(q: Quotas): string
function canonicalPool(p: Pool): string

// apps/web/src/run/audit.ts:68 — über Pool+Quotas, nicht über Roh-CSV-Bytes
export async function inputSha256(pool: Pool, quotas: Quotas): Promise<string>

// apps/web/src/run/audit.ts:73-99 — baut AuditDoc, ruft inputSha256 intern
export async function buildAudit(args: {
  pool: Pool; quotas: Quotas; seed: number;
  result: RunResult; duration_ms: number;
}): Promise<AuditDoc>

// apps/web/src/run/audit.ts:106-130 — Web-Crypto-API
async function signWithEd25519(bodyJson: string): Promise<{ pubB64: string; sigB64: string; algo: string }>
async function signWithEcdsa(bodyJson: string): Promise<{ pubB64: string; sigB64: string; algo: string }>

// apps/web/src/run/audit.ts:101-104, 132-150 — public sign-API mit Fallback
export interface SignedAudit { doc: AuditDoc; bodyJson: string }
export async function signAudit(doc: AuditDoc): Promise<SignedAudit>
// strippt public_key/signature/signature_algo bevor signiert wird (audit.ts:152-155)

// apps/web/src/run/audit.ts:158-167 — selected → CSV-Zeilen mit allen Attributen
export function selectedToCsv(pool: Pool, selectedIds: string[]): string

// apps/web/src/run/audit.ts:169-177 — universeller Browser-Download
export function downloadBlob(filename: string, content: string, mime: string): void
</interfaces>

**Direkte Wiederverwendung möglich:**

- `signAudit(doc)` ist generisch über `AuditDoc` — Stage 1 kann ein erweitertes/eigenes `Stage1AuditDoc` bauen und die `signAudit`-Mechanik (Strip-then-Sign + Ed25519+Fallback) klauen. Sauberer: `signAudit` zu einer typgeparametrisierten Variante refaktorieren, die ein beliebiges JSON-Objekt signiert. Konkret:
  ```ts
  // Vorschlag: extract & generalize
  export async function signJsonDoc<T extends object>(
    doc: T,
    keysToStrip: (keyof T)[],
  ): Promise<{ doc: T & { public_key: string; signature: string; signature_algo: string }, bodyJson: string }>
  ```
  Damit können Maximin-Audit (Issue #44 etc.) und Stage-1-Audit dasselbe Signing nutzen.
- `downloadBlob` direkt nutzen für CSV- und JSON-Downloads.
- `sha256Hex` direkt nutzen für `input_sha256` über Roh-CSV-Bytes.

**Was Stage 1 NICHT wiederverwenden kann:**

- `inputSha256(pool, quotas)` — kennt nur Pool+Quotas, Stage 1 hashed CSV-Bytes (ArrayBuffer der hochgeladenen Datei).
- `buildAudit()` und `AuditDoc` — Maximin-spezifisch (Marginale, Quota-Fulfillment, num_committees). Stage 1 hat eigenes Schema (Stratum-Tabelle).
- `selectedToCsv(pool, ids)` — projiziert nur auf `pool.people`-Felder, würde Original-Eingangs-Spalten nicht rein-roundtrippen. Stage 1 braucht eigenen CSV-Writer auf `parsed.headers + parsed.rows`.

**Stage-1-Audit-Schema-Vorschlag (für Plan):**

```ts
export interface Stage1AuditDoc {
  schema_version: '0.1';
  operation: 'stage1-versand';
  seed: number;
  seed_source: 'user' | 'unix-time-default';
  input_csv_sha256: string;       // SHA-256 über Roh-Bytes der hochgeladenen Datei
  input_csv_filename: string;     // file.name
  input_csv_size_bytes: number;
  pool_size: number;
  target_n: number;
  actual_n: number;               // kann < target_n sein bei N_h-Knappheit
  stratification_axes: string[];  // gewählte CSV-Spalten
  strata: Array<{
    key: Record<string, string>;  // z.B. { district: '01-zentrum', age_band: '25-34' }
    n_h_pool: number;             // wie viele Personen im Pool
    n_h_target: number;           // berechnetes Soll (Largest-Remainder)
    n_h_actual: number;           // tatsächlich gezogen (= min(target, pool))
    underfilled: boolean;         // n_h_actual < n_h_target
  }>;
  warnings: string[];             // z.B. "Stratum X unterbesetzt: 12 von 20 angefragt"
  timestamp_iso: string;
  duration_ms: number;
  public_key?: string;
  signature?: string;
  signature_algo?: 'Ed25519' | 'ECDSA-P256-SHA256';
}
```

### Routing / App-Struktur

<interfaces>
// apps/web/src/App.tsx:34-106
// Single-Page-State-Machine, kein Router. Drei Sections per `<Show when=...>`:
//
//   1. Pool importieren     (immer sichtbar)
//   2. Quoten konfigurieren (sichtbar wenn pool() != null)
//   3. Lauf starten         (sichtbar wenn pool() && quotas() && quotaValid())
//
// Top-level Signals:
const [pool, setPool] = createSignal<ImportedPool | null>(null);
const [quotas, setQuotas] = createSignal<QuotaConfig | null>(null);
// + abgeleitete Memos: enginePool, engineQuotas, quotaValid

// apps/web/src/main.tsx — montiert <App /> in #root
// apps/web/index.html:9 — <div id="root"></div>
</interfaces>

**Einhäng-Punkt für Stage 1:** drei realistische Optionen, der Plan sollte sich für Variante B entscheiden:

| Variante | Ansatz | Pro | Con |
|---|---|---|---|
| A | Solid-Router-Dependency hinzufügen, Routes `/stage1` und `/` definieren | echte URLs, zurück-Button funktioniert | neue Dep ~12 KB, mehr Refactoring an `main.tsx` |
| **B** | **Tab-Switcher in `App.tsx`: `createSignal<'stage1' \| 'stage3'>('stage3')`, Header mit zwei Buttons** | **kein neuer Dep, minimaler Diff zu bestehender App, Stage 3 unverändert** | **kein URL-Routing — bei Reload landet man immer auf Default-Tab** |
| C | Komplett neue Route via Hash-Listener (`window.location.hash`) selbst gebaut | echte URL-Bookmarks ohne Dep | Reinventing-the-wheel, fehleranfällig |

**Empfehlung Variante B** (passt zu CONTEXT.md "Hauptnavigation: zwei separate Wege"). Acceptance-Kriterium "neue Route `/stage1-versand`" ist im Issue formuliert, lässt sich aber im Sinne von "neuer App-Bereich erreichbar aus Hauptnavigation" lesen — der DISCUSSION-Text spricht von "Tab oder Route".

Konkret: Header-Bereich in `App.tsx` mit zwei Buttons / Tabs, `mode()`-Signal entscheidet, welche Section gerendert wird. Beide Tabs haben **getrennte State-Trees** — kein gemeinsamer Pool, kein gemeinsamer Quoten-State, weil Stage 1 (Melderegister) und Stage 3 (Antwortenden-Pool) konzeptionell verschiedene Daten sind.

### CSV-Export / Download

<interfaces>
// apps/web/src/run/audit.ts:158-167 — Maximin-spezifisch (filtert pool.people)
export function selectedToCsv(pool: Pool, selectedIds: string[]): string

// apps/web/src/run/audit.ts:169-177 — universell, direkt wiederverwendbar
export function downloadBlob(filename: string, content: string, mime: string): void

// apps/web/src/run/RunPanel.tsx:48-66 — Beispielnutzung im Stage-3-Flow
async function exportPanelCsv() {
  downloadBlob(`panel-${seed()}.csv`, selectedToCsv(props.pool, r.selected), 'text/csv');
}
async function exportAuditJson() {
  const audit = await buildAudit({ ... });
  const signed = await signAudit(audit);
  downloadBlob(`audit-${seed()}.json`, JSON.stringify(signed.doc, null, 2), 'application/json');
}

// packages/core/src/pool/generator.ts:235-247 — minimaler CSV-Writer (kein Quoting)
export function rowsToCsv(rows: PoolRow[]): string
// erzeugt fixed-field CSV mit comma-separator. ACHTUNG: kein Quoting für Werte
// mit Komma/Newline/Quote — für Stage 1 unzureichend wenn Eingangs-CSV freie Texte enthält.
</interfaces>

**Konsequenz für Stage 1:** Eigener CSV-Writer in `packages/core/src/stage1/csv-export.ts` mit RFC-4180-konformem Quoting (Felder mit `"`, `,`, `;`, `\n` müssen in `"..."` mit `""`-Escape). Beispiel-Implementierung kompakt halten (~15 Zeilen). `selectedToCsv` aus `audit.ts` ist NICHT geeignet (filtert auf bekannte Pool-Felder, kein Quoting).

Für Encoding-Round-Trip: Output-CSV als UTF-8 schreiben (auch wenn Eingang Win-1252 war) — der Browser-Download funktioniert nur mit UTF-8 zuverlässig, und der `parsed.encoding`-Hinweis sollte im Audit-JSON dokumentiert sein. Das ist Tradeoff "konsistent über Plattform" vs "1:1-Bytes" — UTF-8-Output ist die saubere Wahl.

### Test-Infrastruktur

| Test-Layer | Tool | Config | Verzeichnis |
|---|---|---|---|
| Core-Unit (Node) | Vitest | `packages/core/vitest.config.ts` (env=node, include `tests/**/*.test.ts`) | `packages/core/tests/` |
| Engine-A-Unit | Vitest | `packages/engine-a/vitest.config.ts` | `packages/engine-a/tests/` |
| Web-Unit | Vitest | `apps/web/vite.config.ts:38-43` (env=jsdom, include `tests/unit/**/*.test.ts(x)`) | `apps/web/tests/unit/` |
| Web-E2E | Playwright | `apps/web/playwright.config.ts` (chromium + firefox, baseURL `127.0.0.1:4173` via `vite preview`) | `apps/web/tests/e2e/` |

**Wichtig:** Issue-Spec sagt `packages/core/src/stage1/__tests__/` — das **passt nicht** zur bestehenden Test-Konvention (`packages/core/tests/`, nicht `__tests__/` neben Source). Vitest-Config glob ist `tests/**/*.test.ts` (relativ zum Package-Root). Plan muss korrigieren auf `packages/core/tests/stage1.test.ts` oder `packages/core/tests/stage1/*.test.ts`. Sonst werden die Tests nicht gefunden.

**E2E-Pattern (analog `apps/web/tests/e2e/end-to-end.spec.ts:1-59`):**
- File-Input über `page.locator('input[type="file"]').first().setInputFiles({ name, mimeType, buffer: readFileSync(FIXTURE) })`
- Buttons über `page.getByTestId('...')` — Konvention `data-testid` Pattern überall in der App
- Browser-Skip für Ed25519: nur Chromium für Audit-Download-Check, Firefox-Fallback ist offiziell ECDSA (siehe `audit.ts:133` Kommentar)
- Test-Timeout: `test.setTimeout(60_000)` für Runs, Stage 1 ist Sub-Sekunde, also reicht Default 30 s

**Fixtures-Verzeichnis:** `tests/fixtures/synthetic-pools/` enthält bestehende CSVs (max **2001 Zeilen** = `*-n2000-*.csv`). Die im Issue geforderten 6000 Zeilen müssen entweder:
- (Variante 1, **empfohlen**) zur **Test-Laufzeit** mit `generatePool({ size: 6000, ... })` aus `@sortition/core` erzeugt werden — kein Disk-Footprint, deterministisch über Seed,
- (Variante 2) als neue Fixture-Datei eingecheckt werden — ~600 KB, unnötiger Repo-Bloat.

Variante 1 ist klar überlegen: `generatePool` ist genau für solche Tests geschrieben (siehe `generator.test.ts:22-46` als Vorlage), läuft in <100 ms für n=6000, garantiert Determinismus. Die Stage-1-Test-Suite sollte einen 6000er-Pool **inline** im Test erzeugen, daraus 300 ziehen, Strata-Verteilung prüfen.

### Synthetische Pool-Generierung (für Tests)

<interfaces>
// packages/core/src/pool/generator.ts:201-233
export interface GenerateOpts {
  profile: CommunityProfile;     // 6 vordefinierte Profile in PROFILES
  size: number;
  seed: number;
  tightness: number;             // 0..1, mischt Verteilung mit Uniform
}
export function generatePool(opts: GenerateOpts): PoolRow[]

// packages/core/src/pool/generator.ts:41-48
export interface PoolRow {
  person_id: string;
  gender: Gender;                // 'female' | 'male' | 'diverse'
  age_band: AgeBand;             // '16-24' | '25-34' | ... | '75+'
  education: Education;
  migration_background: Migration;
  district: string;              // Profil-spezifisch, z.B. '01-zentrum'
}

// packages/core/src/index.ts:1-11 — alles bereits exportiert
import { generatePool, PROFILES, Mulberry32 } from '@sortition/core';
```
</interfaces>

Profile (`generator.ts:50-175`): `innenstadt-gross`, `aussenbezirk-mittelgross`, `kleinstadt-bezirkshauptort`, `bergdorf-tourismus`, `wachstumsgemeinde-umland`, `industriestadt-klein`. Jedes hat realistische Verteilungen für `gender`, `age_band`, `education`, `migration_background`, `district`. Für Stage-1-Stratifikations-Test ideal: `kleinstadt-bezirkshauptort` mit 3 districts gibt für n=6000, N=300 saubere Strata-Counts pro District.

**Wichtig:** `PoolRow.district` ist `string` (profilbezogene Werte wie `'01-stadtkern'`), nicht enum — der Stratifikations-Algorithmus muss mit beliebigen String-Werten umgehen. `validateMapping` kennt `district` als semantisches Feld bereits.

## Architektur-Empfehlung für Stage-1-Modul

### Neue Dateien

```
packages/core/src/stage1/
├── index.ts              # Re-exports
├── stratify.ts           # Largest-Remainder-Allocation + Fisher-Yates pro Stratum
├── audit-builder.ts      # canonical JSON, sha256, AuditDoc-Builder (ohne Signing)
├── csv-export.ts         # RFC-4180-CSV-Writer (mit Quoting)
└── types.ts              # Stage1Input, Stage1Result, Stage1AuditDoc, Stratum, ...

packages/core/tests/
├── stage1-stratify.test.ts   # Determinismus, Largest-Remainder-Sum, Edge-Cases
├── stage1-audit.test.ts      # canonical JSON stable, sha256 reproduzierbar
├── stage1-csv.test.ts        # CSV-Quoting, UTF-8-Roundtrip
└── stage1-integration.test.ts # 6000-Zeilen via generatePool → 300 → Verteilung ±1

apps/web/src/stage1/
├── Stage1Panel.tsx       # Solid-Komponente, analog RunPanel.tsx
├── AxisPicker.tsx        # Multi-Select für CSV-Spalten (mit Default-Vorschlag)
├── runStage1.ts          # Glue: parsed CSV → stratify() → AuditDoc → signAudit
└── audit-sign.ts         # OPTIONAL: kapselt signAudit-Refactor falls extrahiert

apps/web/tests/e2e/
└── stage1.spec.ts        # Upload → Defaults erkannt → Größe → Lauf → Download

apps/web/src/App.tsx      # MODIFIZIEREN: Tab-Switcher, mode()-Signal
```

### Zu modifizierende bestehende Dateien (minimal)

1. **`apps/web/src/App.tsx`** — Tab-Switcher hinzufügen, ohne Stage-3-Logik zu verändern. Beide Sections in eigene Sub-Komponenten extrahieren (`<Stage3App />` + `<Stage1App />`) wäre sauberer, ist aber größerer Diff.
2. **`packages/core/src/index.ts`** — Re-export `./stage1`.
3. **`apps/web/src/run/audit.ts`** (OPTIONAL) — `signAudit` generalisieren für beliebige Doc-Typen (siehe oben). Wenn nicht extrahiert: Stage-1-Code dupliziert die ~30 Zeilen sign-with-Fallback-Logik. Plan-Decision: Generalisierung ist sauberer, kostet 1 PT, ist aber strukturelle Änderung.

### Algorithmus-Skizze (für Plan-Referenz)

```ts
// packages/core/src/stage1/stratify.ts (Skeleton)
export interface Stratum {
  key: Record<string, string>;
  rows: number[];           // Indizes in input.rows[], nicht Kopien
}
export interface StratifyOpts {
  axes: string[];           // CSV-Spaltennamen
  targetN: number;
  seed: number;
}
export interface StratifyResult {
  selected: number[];       // Indizes in input.rows[], in deterministischer Reihenfolge
  strata: Array<{
    key: Record<string, string>;
    n_h_pool: number;
    n_h_target: number;
    n_h_actual: number;
    underfilled: boolean;
  }>;
  warnings: string[];
}
export function stratify(rows: Record<string, string>[], opts: StratifyOpts): StratifyResult
```

Schritte:
1. **Bucket-by-axes:** rows → `Map<string, number[]>` mit Key = JSON-stringified `{axis1: val, axis2: val, ...}` (sortierte Keys für Determinismus).
2. **Edge-Case N > sum(N_h):** wenn `targetN > rows.length`, throw mit klarer Fehlermeldung "Eingangs-Pool hat nur N Personen, mehr als das ist nicht ziehbar".
3. **Largest-Remainder-Allocation:** für jedes Stratum berechne `quota_h = targetN * N_h / N_total`, `floor_h = floor(quota_h)`, `remainder_h = quota_h - floor_h`. Initial `n_h_target = floor_h`. `delta = targetN - sum(floor_h)`. Weise die `delta` größten Reste auf, ties via `N_h` desc → Stratum-Key lex asc. Resultat: `sum(n_h_target) === targetN` exakt.
4. **N_h < n_h_target:** clamp `n_h_actual = min(n_h_target, N_h)`. Notiere `underfilled = true` und Warning. Fehlbestand wird **nicht** auf andere Strata umverteilt (Issue: "vermerken im Audit-Snapshot", kein Re-Allocation).
5. **Fisher-Yates pro Stratum:** in-place Shuffle der Stratum-Indizes mit Mulberry32 (gemeinsamer RNG für alle Strata, deterministische Iteration über Strata in lexikographischer Key-Reihenfolge). Nimm die ersten `n_h_actual` Indizes.
6. **Output:** `selected[]` = Vereinigung aller Stratum-Auswahlen, sortiert nach Stratum-Key dann Original-Index (für reproducible Output-Reihenfolge in CSV).

### Datenfluss im UI (für Plan-Referenz)

```
User wählt Tab "Versand-Liste ziehen"
  → File-Drop Eingangs-CSV (parseCsvFile aus apps/web/src/csv/parse.ts)
  → autoGuessMapping erkennt district/age_band/gender → AxisPicker preselected
  → User passt Achsen an, gibt N + Seed ein
  → "Lauf starten":
      buf  = await file.arrayBuffer()
      hash = await sha256Hex(new Uint8Array(buf))
      result = stratify(parsed.rows, { axes, targetN, seed })
      auditDoc = buildStage1Audit({ filename, fileSize, hash, axes, targetN, seed, result, ... })
      signed = await signJsonDoc(auditDoc, ['public_key', 'signature', 'signature_algo'])
  → Render: Strata-Tabelle (Soll vs Ist), Warnings, zwei Download-Buttons
  → "CSV exportieren": stage1CsvExport(parsed.headers, parsed.rows, result.selected) → downloadBlob
  → "Audit exportieren": JSON.stringify(signed.doc, null, 2) → downloadBlob
```

## Konkrete Implementierungs-Risiken

1. **Signing-Modul-Standortwechsel.** `signAudit()` lebt im Web-Layer (Browser-`crypto.subtle`). Wenn Plan Audit-Builder nach `packages/core/src/stage1/audit-builder.ts` zieht, MUSS die Signing-Logik im Web-Layer bleiben — `crypto.subtle.generateKey({name:'Ed25519'}, ...)` wirft im Node-Vitest-Umfeld (siehe `audit-builder.ts` braucht `vitest`-Tests, also Node-Env). Saubere Trennung: Builder = pure (canonical JSON + sha256 mit Web-Crypto, das in modernen Node 20+ ebenfalls existiert), Signing = Browser-only Wrapper.

2. **`crypto.subtle.digest('SHA-256', ...)` ist in Node 20+ verfügbar** (`globalThis.crypto`). Vitest Node-Env unterstützt das. **ABER `crypto.subtle.generateKey({name:'Ed25519'}, ...)` ist in Node 20 nicht standard** — würde Tests brechen. Daher: Tests für audit-builder testen Hash + canonical JSON, NICHT Signing. Signing-Smoketest im E2E-Layer.

3. **CSV-Quoting.** `rowsToCsv` in `generator.ts:235` quotet NICHT. Stage-1-CSV-Export braucht eigenen RFC-4180-Writer. Sonst Bruch bei District-Namen wie `"Hamburg-Mitte, Innen"` mit Komma.

4. **Original-Spalten-Erhalt.** `applyMapping` würde droppen — Stage 1 muss `parsed.rows + parsed.headers` direkt verwenden, NICHT durch `applyMapping` schicken. Achsen-Auswahl arbeitet auf Original-Spaltennamen.

5. **Default-Achsen vs autoGuessMapping.** `autoGuessMapping` mappt `Bezirk → district` etc. — die Default-Achsen-Erkennung sollte auf den **gemappten** semantischen Namen (`district`/`age_band`/`gender`) prüfen, nicht auf die Original-Header. Das wäre konsistent mit dem heutigen Verhalten der App. Konkret: nach `parsed.rows` durch `applyMapping(parsed.rows, autoGuessMapping(headers))` schicken (NUR um die Default-Erkennung zu machen), aber die echten Stratifikations-Achsen auf Original-Headers laufen lassen. Sauberer wäre: AxisPicker zeigt alle Original-Header, hebt die hervor, deren `autoGuessMapping`-Result in `['district','age_band','gender']` liegt, und preselected diese.

6. **Seed-UInt32-Overflow.** Mulberry32 normalisiert via `>>> 0`, also funktioniert jeder JS-Number-Seed. Aber: `Math.floor(Date.now() / 1000)` (Unix-Sekunden) ist ~1.7e9 = passt in uint32 bis 2106. Wenn `Date.now()` (Millisekunden) genommen wird, bricht uint32 (1.7e12). **Plan muss explizit:** Default-Seed = `Math.floor(Date.now() / 1000)` oder `Date.now() & 0xffffffff`. Nicht einfach `Date.now()`.

7. **n_h_target = N_h Edge-Case.** Wenn ein Stratum exakt so groß ist wie sein Target, ist das **kein** Underfill — n_h_actual == n_h_target == N_h. Tests müssen den Fall explizit abdecken (Off-by-one-Risiko).

8. **Leere Strata bei Achsen-Kombinationen.** Wenn User zwei Achsen wählt und ein Cross-Stratum (z.B. `district=01 ∩ gender=diverse`) hat 0 Personen im Pool, ist es schlicht nicht in der Bucket-Map vorhanden — wird automatisch übersprungen. **Aber:** das Audit-JSON listet nur **belegte** Strata, nicht das vollständige Cartesian Product. Plan muss entscheiden, ob Audit "Stratum X mit n_h_pool=0" auch listet (Vorschlag: nein, weil bei mehr als zwei Achsen Cartesian-Explosion).

9. **GPL-3.0-Lizenz-Header.** `package.json` aller Workspaces deklariert `"license": "GPL-3.0-or-later"`. Bestehende `.ts`-Dateien in der Codebasis enthalten **keinen** SPDX-Header (z.B. `audit.ts`, `parse.ts`, `mulberry32.ts`). Plan muss entscheiden: Konvention beibehalten (kein Header) oder erstmals einführen. Empfehlung: **Konvention beibehalten** — Lizenz auf Repo/Package-Ebene, nicht pro Datei. Sonst inkonsistent zum Rest.

10. **CSV-Header-Konflikt mit `gezogen`-Spalte.** Issue Acceptance: "neue Spalte `gezogen` (true/false) optional". Wenn die Eingangs-CSV bereits eine Spalte `gezogen` hat, würde der Output diese überschreiben. Plan muss: (a) Konflikt erkennen, (b) Suffix anhängen (`gezogen_2`) oder Fehler werfen, (c) optional ganz weglassen — Issue sagt "optional", default-off ist sicher. Empfehlung: per Default aus, mit Checkbox einschaltbar, bei Konflikt warnen.

11. **6000-Zeilen-Test-Performance.** `generatePool({ size: 6000 })` läuft in <100 ms (extrapoliert aus n=200 Tests in `generator.test.ts:23-27`). Stratifikations-Lauf für n=6000 → 300 sollte <50 ms sein. Test-Suite total <1 s — kein Performance-Risiko.

12. **Playwright File-Upload bei großen CSVs.** Standard Playwright `setInputFiles({buffer})` lädt den Buffer in den Browser-Process — bei 6000 Zeilen ~500 KB, unkritisch. Bei E2E-Test mit 100.000 Zeilen (5 MB+) wäre Timeout-Risiko. Empfehlung: E2E-Smoke nutzt n=500-Fixture aus `tests/fixtures/synthetic-pools/` (existiert bereits), die Performance-Verifikation für n=100.000 läuft als Vitest-Unit-Test (Node, ohne Browser-Overhead).

## Sources

### HIGH confidence (Code direkt gelesen)

- `apps/web/src/csv/parse.ts:1-184` — vollständige CSV-Pipeline, Mapping-Helpers
- `apps/web/src/csv/CsvImport.tsx:1-155` — UI-Pattern für CSV-Import (Solid-Komponente)
- `apps/web/src/run/audit.ts:1-178` — Audit-Doc, kanonische Serialisierung, Signing, Download-Helper
- `apps/web/src/run/RunPanel.tsx:1-265` — Beispiel-Komponente analog Stage-1-Panel
- `apps/web/src/App.tsx:1-106` — App-Root, State-Machine, Einhäng-Punkt
- `apps/web/src/quotas/model.ts:1-120` — Reine Validierungs-Funktionen als Vorbild
- `packages/core/src/pool/mulberry32.ts:1-25` — RNG-API
- `packages/core/src/pool/generator.ts:1-247` — Pool-Generator + 6 Profile + `rowsToCsv`
- `packages/core/src/index.ts:1-11` — Public-Surface von `@sortition/core`
- `packages/core/tests/generator.test.ts:1-47` — Test-Pattern für deterministische RNG-Tests
- `packages/core/vitest.config.ts:1-8` — Vitest-Glob `tests/**/*.test.ts`
- `packages/core/package.json:1-20` — `@sortition/core` Workspace-Manifest
- `apps/web/package.json:1-41` — Web-Workspace, Solid + Papaparse + Vitest + Playwright
- `apps/web/vite.config.ts:1-43` — Vite-Aliases, JSDOM-Test-Env
- `apps/web/playwright.config.ts:1-22` — E2E-Setup (chromium + firefox, Port 4173)
- `apps/web/tests/e2e/end-to-end.spec.ts:1-59` — E2E-Pattern für File-Upload + Run + Download
- `apps/web/tests/unit/csv-parse.test.ts:1-101` — Unit-Test-Pattern für CSV
- `packages/engine-contract/src/types.ts:1-80` — Pool/Quotas-Schemas (für Bezug bei Audit)
- `pnpm-workspace.yaml:1-3` — Workspace-Definition
- `tests/fixtures/synthetic-pools/*.csv` — bestehende Fixtures (max 2001 Zeilen)
- `sortition-tool/08-product-redesign.md:20-25,75-88` — Stage-1-Architektur-Begründung

### MEDIUM confidence

- Largest-Remainder-Methode mathematisch korrekt — Wikipedia-Artikel ist die Issue-Referenz, Standard-Algorithmus, kein Implementierungs-Risiko bei sauberer Tie-Breaking-Regel.
- Fisher-Yates-Shuffle Standard-Algorithmus — TS-Implementierung trivial, einziger Stolperstein ist Off-by-one bei Range `[0, i+1)` statt `[0, i)`.

### LOW confidence (zu validieren beim Planen)

- **Solid-Router vs Tab-Switcher Entscheidung:** Issue-Wortlaut "neue Route `/stage1-versand`" liest sich nach echter URL. CONTEXT.md "Hauptnavigation: zwei separate Wege" lässt offen. **Plan-Entscheidung nötig.** Empfehlung: Tab-Switcher (Variante B), kein neuer Dep, geringerer Diff.
- **Audit-Signing-Refactor (signAudit generalisieren) vs duplizieren:** struktureller Tradeoff. Plan muss entscheiden, ob 1 PT für sauberen Refactor investiert wird oder 30 Zeilen Duplikat akzeptiert werden.

## Project Constraints (aus CLAUDE.md)

- **Sprache der Dokumente: Deutsch.** Code-Kommentare auf Englisch.
- **Quellen-Pflicht:** Jede technische Behauptung mit Datei:Zeile/URL/Version belegen.
- **Keine positive Affirmation, kritisch bleiben.**
- **GPL-3.0-or-later** ist Lizenz aller Workspaces (`package.json` aller Pakete bestätigt).
- **Stand 2026-04-25:** Iteration 1 ist gebaut, Engine A funktioniert, Stage 1 fehlt komplett (siehe `08-product-redesign.md` Tabelle).
- **CONTEXT.md trumpft Issue-Detailfragen** — wo Issue-Spec und CONTEXT.md leicht abweichen (z.B. `__tests__/`-Pfad, Audit-Modul-Standort, "Route" vs "Tab"), gilt CONTEXT.md / die in dieser Recherche begründete Korrektur.

## Metadata

**Confidence breakdown:**
- Codebase-Inventur: HIGH (alle relevanten Dateien gelesen)
- Architektur-Empfehlung: HIGH (passt 1:1 zu bestehenden Patterns)
- Algorithmus-Skizze: HIGH (Largest-Remainder ist deterministisch + standardisiert)
- Audit-Refactor-Pfad: MEDIUM (zwei valide Wege, Plan muss wählen)
- Routing-Entscheidung: MEDIUM (Issue-Text vs CONTEXT.md leicht unterschiedlich)

**Recherche-Methode:** Single-Researcher-Modus (Codebase-Lesen, keine Web-Suche nötig — Issue ist algorithmisch klar, alle Wiederverwendungs-Quellen liegen in der Codebasis).

**Wichtige Issue-Korrekturen, die der Plan einpflegen muss:**
1. Audit-Modul-Pfad: `apps/web/src/run/audit.ts`, NICHT `packages/core/src/audit/`.
2. Test-Verzeichnis: `packages/core/tests/stage1*.test.ts`, NICHT `packages/core/src/stage1/__tests__/` (passt nicht zur Vitest-Glob).
3. Frontend-Framework: Solid mit `createSignal`, NICHT React; kein Router vorhanden.
4. 6000-Zeilen-CSV: zur Test-Laufzeit via `generatePool` erzeugen, keine neue Fixture-Datei einchecken.
