# Plan: Altersgruppe-Derivation + Bands-Editor + Display-Only-Modus + Stratifikations-UX-Erklärung

<objective>
Was dieser Plan erreicht: Der CSV-Parser leitet beim Upload eine virtuelle Spalte
`altersgruppe` aus `geburtsjahr` ab, sobald die Datei das Feld enthält. In Stage 1
wird ein Bands-Editor sichtbar, mit dem die Boundaries und der Modus pro Band
(Auswahl vs. nur Anzeige) konfigurierbar sind. Display-Only-Bänder werden über
einen erweiterten Hamilton-Allokator als Strata mit `n_h_target=0` behandelt —
**der Pool selbst bleibt unverändert** (kein Pool-Filter, keine Excel-artige
Vorab-Filterung). Das Stage-1-Reporting bekommt eine "Nicht in Auswahl
einbezogen"-Sektion (Pool-Counts + hypothetische Soll-Werte) und einen
kollabierbaren Erklär-Aside, der Stratifikation in Plain-Language plus
konkretem Zahlenbeispiel erläutert. Audit-Schema wird auf 0.3 angehoben mit
neuen Feldern `derived_columns` und `forced_zero_strata` (kein `pool_filter`-Feld).

Warum es zählt: Der Live-Test mit der Herzogenburg-CSV zeigte, dass nur
geschlecht + sprengel als Default-Achsen erkannt wurden — Altersgruppe fehlte,
weil die Datei nur `geburtsjahr` enthält. Echte Melderegister liefern Geburtsjahr,
nicht Altersgruppen — die Berechnung gehört ins Tool. Der Display-Only-Modus
löst das ethische Dilemma "Kinder unter 16 sollen nicht im Bürgerrat landen,
aber wir wollen die Daten nicht verfälschen" — die Datei bleibt unangetastet,
das Soll für die Kinder wird auf 0 gesetzt, der proportionale Rest wird auf die
Selection-Bands verteilt. UX-Erklärung adressiert die größere Lücke
"Stratifikation ist für Nicht-Statistiker:innen ein Blackbox-Begriff".

Scope:
- IN: derive.ts (neu), AgeBandsEditor (neu), Hamilton-Erweiterung mit
  forced-zero-strata, Reporting für Display-Only-Bands, StratificationExplainer
  (neu), Per-Achse-Tooltips, Distinct-Values-Warnung, Audit-Schema 0.3
- OUT: Pool-Filter (wurde explizit verworfen — Datei bleibt was sie ist),
  generic Binning für andere Spalten, Werte-Konsolidierung pro Achse (#63),
  Persistenz der Band-Konfig zwischen Sessions, mehrere parallele Alters-Achsen
</objective>

<context>
Issue: @.issues/62-altersgruppe-derived/ISSUE.md
Research: @.issues/62-altersgruppe-derived/RESEARCH.md

<interfaces>
<!-- Executor: use these contracts directly. Do not explore the codebase for them. -->

From apps/web/src/csv/parse.ts (existing — to be extended):
export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
  separator: ',' | ';' | '\t';
  encoding: SupportedEncoding;
  warnings: string[];
  // NEW (Task 1):
  derivedColumns: string[];
}

export const SEMANTIC_FIELDS = [
  'person_id', 'gender', 'age_band', 'education',
  'migration_background', 'district',
] as const;
export type SemanticField = (typeof SEMANTIC_FIELDS)[number];
export type ColumnMapping = Record<string, SemanticField | '__ignore__'>;

// existing DEFAULT_GUESS map (apps/web/src/csv/parse.ts:115-130) currently
// has: person_id, id, geschlecht, gender, age_band, alter, altersband,
// bildung, education, migration, migration_background, bezirk, district,
// sprengel. Task 1 ADDS one entry: altersgruppe → 'age_band'.

export async function parseCsvFile(file: File): Promise<ParsedCsv>;
export function parseCsvBuffer(buf: ArrayBuffer, refYear?: number): ParsedCsv;  // refYear param NEW in Task 1
export function autoGuessMapping(headers: readonly string[]): ColumnMapping;

From packages/core/src/stage1/types.ts (existing — to be extended for schema 0.3):
export interface StratifyOpts {
  axes: string[];
  targetN: number;
  seed: number;
  // NEW (Task 3): set of stratum-key-strings to force to n_h_target=0.
  forcedZeroStrataKeys?: ReadonlySet<string>;
}

export interface StratumResult {
  key: Record<string, string>;
  n_h_pool: number;
  n_h_target: number;
  n_h_actual: number;
  underfilled: boolean;
  // NEW (Task 3, optional, only set when stratum was forced to 0):
  forced_zero?: boolean;
}

export interface Stage1AuditDoc {
  schema_version: '0.3';   // BUMP from '0.2'
  operation: 'stage1-versand';
  algorithm_version: 'stage1@1.1.0';   // BUMP minor — allocator behavior changed
  // ... existing fields preserved ...
  // NEW (Task 4):
  derived_columns?: Record<string, {
    source: string;
    description: string;
    bands?: AgeBand[];
  }>;
  forced_zero_strata?: string[];  // canonical stratum-key-strings forced to 0
}

From packages/core/src/stage1/stratify.ts (existing — to be extended in Task 3):
export function largestRemainderAllocation(
  stratumKeys: string[],
  stratumSizes: number[],
  targetN: number,
  forcedZeroIndices?: ReadonlySet<number>,  // NEW PARAM
): number[];

export function stratify(
  rows: Record<string, string>[],
  opts: StratifyOpts,
): StratifyResult;

export function bucketize(
  rows: Record<string, string>[],
  axes: string[],
): Map<string, number[]>;
// NB: bucketize emits keys as JSON-encoded array of [axis, value] pairs.
// Use the same encoding when constructing forcedZeroStrataKeys.

From apps/web/src/stage1/runStage1.ts (existing — extended in Task 3):
export interface RunStage1Input {
  file: File;
  parsed: ParsedCsv;
  axes: string[];
  targetN: number;
  seed: number;
  seedSource: Stage1SeedSource;
  // NEW (Task 3):
  bands?: AgeBand[];
  ageBandColumn?: string;       // typically 'altersgruppe'
  bandsRefYear?: number;
}

export async function runStage1(input: RunStage1Input): Promise<RunStage1Output>;

From packages/core/src/stage1/index.ts (existing — re-exports extended):
// already exports: stratify, bucketize, largestRemainderAllocation,
// previewAllocation, marginalAggregates, sortUnderfillsByGap, coverageMetric,
// stage1ToMarkdownReport, buildStage1Audit, stage1ResultToCsv, sha256Hex,
// canonicalStage1Json, plus all type aliases.
// Task 3 adds re-export for AgeBand (defined in packages/core/src/stage1/age-bands.ts).
// Task 4 adds re-export for infoOnlyBandsReport + InfoOnlyBandsReportRow.

From apps/web/src/stage1/Stage1Panel.tsx (existing component to be extended):
export const Stage1Panel: Component;
// owns signals: parsed, file, defaultAxes, selectedAxes, targetN, seed,
// seedSource, running, output, error, strataExpanded.
// Task 2 adds: bands signal + recompute effect.
// Task 4 adds: explainer-open signal, axisDescriptions/distinctValueCounts memos.
// Helper: recommendedAxes(headers) (Stage1Panel.tsx:37-47) — no change needed
// once altersgruppe lands in DEFAULT_GUESS (Task 1).

From apps/web/src/stage1/AxisPicker.tsx (existing — to be extended in Task 4):
export interface AxisPickerProps {
  headers: string[];
  defaultAxes: string[];
  selected: () => string[];
  onToggle: (header: string) => void;
  // NEW (Task 4):
  derivedColumns?: string[];          // adds "berechnet" badge
  axisDescriptions?: Record<string, string>;  // adds per-axis "?" tooltip
  distinctValueCounts?: Record<string, number>;  // for >15 warning
}
export const AxisPicker: Component<AxisPickerProps>;

From packages/core/src/stage1/age-bands.ts (NEW, Task 3):
export interface AgeBand {
  min: number;             // inclusive, integer ≥0
  max: number | null;      // inclusive, integer or null = open-ended
  label: string;           // human-readable, also the value used in altersgruppe column
  mode: 'selection' | 'display-only';
}

From apps/web/src/csv/derive.ts (NEW, Task 1):
// Re-exports AgeBand from @sortition/core to avoid a duplicate definition.
export type { AgeBand } from '@sortition/core';

export const DEFAULT_AGE_BANDS: readonly AgeBand[];
// 5 entries:
//  { min: 0,  max: 15,  label: 'unter-16', mode: 'display-only' }
//  { min: 16, max: 24,  label: '16-24',    mode: 'selection' }
//  { min: 25, max: 44,  label: '25-44',    mode: 'selection' }
//  { min: 45, max: 64,  label: '45-64',    mode: 'selection' }
//  { min: 65, max: null, label: '65+',     mode: 'selection' }

export function deriveAltersgruppe(
  geburtsjahr: string,
  refYear: number,
  bands: readonly AgeBand[],
): string | null;
// Returns matching band's label, or null if:
//  - geburtsjahr is empty/non-numeric/non-integer
//  - geburtsjahr > refYear (future)
//  - age (= refYear - geburtsjahr) doesn't match any band

export function validateBands(bands: readonly AgeBand[]): string | null;
// Returns German error message, or null if bands are valid.

export function recomputeAltersgruppe(
  rows: Record<string, string>[],
  bands: readonly AgeBand[],
  refYear: number,
): Record<string, string>[];
// Returns NEW row array with the altersgruppe column overwritten.
// Does NOT mutate input rows.
</interfaces>

Key files:
@apps/web/src/csv/parse.ts — extend ParsedCsv.derivedColumns + altersgruppe in DEFAULT_GUESS, inject derived column post-parse
@apps/web/src/stage1/Stage1Panel.tsx — wire bands signal, recompute effect, new sections
@apps/web/src/stage1/AxisPicker.tsx — derived-column badge, per-axis tooltip, distinct-values warning
@apps/web/src/stage1/runStage1.ts — pass bands + forced-zero set into stratify + audit
@packages/core/src/stage1/stratify.ts — largestRemainderAllocation forcedZeroIndices param
@packages/core/src/stage1/types.ts — schema_version 0.3, derived_columns, forced_zero_strata, algorithm_version bump
@packages/core/src/stage1/audit-builder.ts — pass through new fields
@packages/core/src/stage1/reporting.ts — infoOnlyBandsReport helper + Markdown extension
@packages/core/src/stage1/index.ts — export AgeBand and infoOnlyBandsReport
@apps/web/public/beispiele/herzogenburg-melderegister-8000.csv — UNCHANGED (fixture stays raw)
@apps/web/tests/e2e/stage1.spec.ts — existing e2e for axis defaults — to be referenced/extended in Task 5
</context>

<commit_format>
Format: conventional, no issue prefix
Pattern: {type}({scope}): {description}
Examples:
  feat(csv): derive altersgruppe from geburtsjahr + auto-mapping
  feat(stage1): age bands editor with selection vs display-only modes
  feat(stage1): hamilton allocation with display-only-zero strata
  feat(stage1): info-only bands report + stratification explainer + audit transparency
  test(stage1): e2e for bands editor + bundle delta
</commit_format>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Derive altersgruppe from geburtsjahr (csv/derive.ts + parse.ts)</name>
  <files>apps/web/src/csv/derive.ts, apps/web/src/csv/parse.ts, apps/web/tests/unit/derive.test.ts, apps/web/tests/unit/csv-parse.test.ts, packages/core/src/stage1/age-bands.ts, packages/core/src/stage1/index.ts</files>
  <action>
  STEP A. Create `packages/core/src/stage1/age-bands.ts` (small, pure):
  - Export the AgeBand interface from `<interfaces>`. Plus a tiny doc comment
    in English (one paragraph) explaining selection vs display-only semantics.
  - Re-export from `packages/core/src/stage1/index.ts`:
    `export type { AgeBand } from './age-bands';`

  STEP B. Create `apps/web/src/csv/derive.ts` exporting:
  - Re-export the AgeBand type from `@sortition/core` (single source of truth).
  - `DEFAULT_AGE_BANDS`: exact 5 entries shown in `<interfaces>`. Mark as
    `readonly` (`as const` with type assertion) so callers can't mutate.
  - `deriveAltersgruppe(geburtsjahr, refYear, bands)`:
    1. Trim the input string. If empty → return null.
    2. Parse with `Number(...)`. If `!Number.isFinite(n)` or `!Number.isInteger(n)`
       or `n < 0` → null.
    3. If `n > refYear` → null (future birth year).
    4. age = refYear - n.
    5. Linear scan bands in given order; return first matching `band.label` where
       age >= min AND (max === null OR age <= max). If none match → null.
  - `validateBands(bands)`: returns German error string or null. Rules:
    - bands.length >= 1: "Mindestens ein Band ist erforderlich."
    - For each band: min and max (if not null) must be integers in [0, 120]:
      "Band {label}: min/max muss eine ganze Zahl zwischen 0 und 120 sein."
    - For each band where max !== null: min <= max:
      "Band {label}: min ({min}) darf nicht größer als max ({max}) sein."
    - bands ascending by min:
      "Bänder müssen aufsteigend sortiert sein."
    - No overlaps/gaps: for adjacent bands `bands[i]` (closed) and `bands[i+1]`,
      `bands[i].max + 1 === bands[i+1].min`. Else if overlap:
      "Bänder dürfen sich nicht überlappen ({a.label} und {b.label})."
      Else if gap:
      "Lücke zwischen Band {a.label} und Band {b.label} ({prevMax+1}..{nextMin-1} fehlt)."
    - Only the LAST band may have max=null. Otherwise:
      "Nur das letzte Band darf 'offen' (max leer) sein."
  - `recomputeAltersgruppe(rows, bands, refYear)`: returns a fresh array of
    fresh row objects (do not mutate input). For each row, set `altersgruppe`
    to `deriveAltersgruppe(row.geburtsjahr ?? '', refYear, bands) ?? ''`.

  STEP C. Modify `apps/web/src/csv/parse.ts`:
  - Extend `ParsedCsv` interface with `derivedColumns: string[]`.
  - Change `parseCsvBuffer` signature: `parseCsvBuffer(buf: ArrayBuffer, refYear?: number)` — default `refYear ?? new Date().getFullYear()`.
  - Update `parseCsvFile` to pass through optional refYear arg.
  - After building `headers` and `rows`:
    - Lowercase-trim a copy of headers for detection.
    - If detected headers contain `geburtsjahr` AND NOT `altersgruppe`:
      - For each row, compute `altersgruppe` via `deriveAltersgruppe(row.geburtsjahr ?? '', refYear, DEFAULT_AGE_BANDS)`. Assign `row.altersgruppe = result ?? ''`.
      - Append `'altersgruppe'` to headers.
      - `derivedColumns: ['altersgruppe']`.
    - Else if detected headers contain BOTH: log warning
      "CSV enthält bereits 'altersgruppe' — keine automatische Berechnung aus geburtsjahr."
      Set `derivedColumns: []`. Do not overwrite.
    - Else: `derivedColumns: []`.
  - Extend `DEFAULT_GUESS` with `altersgruppe: 'age_band'` (place after `altersband`).

  Code comments in English. UI/error strings in German.

  STEP D. Tests in `apps/web/tests/unit/derive.test.ts` (NEW):
  - `deriveAltersgruppe` with `refYear=2026`:
    - '2010' → '16-24' (age 16)
    - '2024' → 'unter-16' (age 2)
    - '1940' → '65+' (age 86)
    - '1961' → '65+' (age 65)
    - '1962' → '45-64' (age 64)
    - '' / '  ' / 'abc' → null
    - '2027' → null (future)
    - '-5' → null
    - '2010.5' → null (non-integer)
    - With custom bands `[{min:0,max:99,label:'all',mode:'selection'}]`,
      '2000' → 'all'.
  - `validateBands`: cover empty, overlap, gap, descending, mid-band null max,
    out-of-range; valid case (DEFAULT_AGE_BANDS) returns null.
  - `recomputeAltersgruppe`:
    - input row { geburtsjahr: '1990', name: 'X' } →
      row { geburtsjahr: '1990', name: 'X', altersgruppe: '25-44' }
    - original rows unmutated (deep clone check)
    - rows with bad geburtsjahr get altersgruppe: ''.

  STEP E. Add cases to `apps/web/tests/unit/csv-parse.test.ts`:
  - Parse a CSV with `geburtsjahr` column (refYear=2026) → headers includes
    'altersgruppe', derivedColumns equals ['altersgruppe'], row values derived correctly.
  - Parse a CSV WITHOUT `geburtsjahr` → derivedColumns is `[]`, headers unchanged.
  - Parse a CSV with both `geburtsjahr` AND `altersgruppe` → derivedColumns
    `[]`, original altersgruppe values preserved, warning contains "bereits".
  - autoGuessMapping covers: `'altersgruppe' → 'age_band'`.
  - Use the new explicit `refYear` arg for determinism.
  </action>
  <verify>
  <automated>cd /root/workspace/.claude/worktrees/altersgruppe-derived && pnpm --filter @sortition/web test -- derive csv-parse 2>&1 | tail -40</automated>
  </verify>
  <done>
  - `packages/core/src/stage1/age-bands.ts` exists with AgeBand type
  - `apps/web/src/csv/derive.ts` exports DEFAULT_AGE_BANDS, deriveAltersgruppe, validateBands, recomputeAltersgruppe; AgeBand re-exported
  - `apps/web/src/csv/parse.ts` ParsedCsv has `derivedColumns: string[]`
  - DEFAULT_GUESS contains `altersgruppe: 'age_band'`
  - parseCsvBuffer derives altersgruppe when geburtsjahr present and altersgruppe absent; preserves user-supplied altersgruppe with warning
  - parseCsvBuffer/parseCsvFile accept optional `refYear` (default = current year)
  - All vitest cases for derive.test.ts and csv-parse.test.ts pass
  - All code comments in English; all UI/error strings in German
  </done>
</task>

<task type="auto">
  <name>Task 2: Age bands editor with selection vs display-only modes</name>
  <files>apps/web/src/stage1/AgeBandsEditor.tsx, apps/web/src/stage1/Stage1Panel.tsx, apps/web/tests/unit/age-bands-editor.test.ts</files>
  <action>
  STEP A. Create `apps/web/src/stage1/AgeBandsEditor.tsx`:

  Props (Solid component):
  ```ts
  export interface AgeBandsEditorProps {
    bands: () => AgeBand[];                     // controlled signal getter
    onBandsChange: (next: AgeBand[]) => void;
    refYear: number;
  }
  ```

  Layout:
  - `<fieldset data-testid="stage1-age-bands-editor">` with `<legend>`
    "Altersgruppen-Bänder (berechnet aus geburtsjahr)".
  - Helper text: "Stichtag: <refYear>. Bänder mit Modus 'nur Anzeige' werden
    nicht in die Auswahl gezogen — die Personen bleiben aber im Pool."
  - One row per band with inputs:
    - `min` (number, integer-only, min=0, max=120, `data-testid="band-min-{i}"`)
    - `max` (number, integer-only, min=0, max=120, `data-testid="band-max-{i}"`).
      A small "offen" checkbox right next to the max input (`data-testid="band-open-{i}"`)
      sets max to null when checked and disables the max input.
    - `label` (text, `data-testid="band-label-{i}"`)
    - `mode` (radio group with two options: "Auswahl" / "nur Anzeige" —
      `data-testid="band-mode-{i}-selection"` / `band-mode-{i}-display`)
    - "Entfernen"-button per row (`data-testid="band-remove-{i}"`),
      disabled when only one band remains.
  - Footer buttons:
    - "Band hinzufügen" (`data-testid="bands-add"`) — appends a new band
      `{min: lastClosedMax+1 || 0, max: lastClosedMax+10, label: 'neu', mode: 'selection'}`.
      If the last band is currently open (max=null), close it at min+9 first
      via the same onBandsChange call before appending.
    - "Vorschlag wiederherstellen" (`data-testid="bands-reset"`) — replaces
      bands with `DEFAULT_AGE_BANDS` (clone using `[...DEFAULT_AGE_BANDS]` and
      clone each entry to avoid sharing readonly refs with consumers).
  - Validation block at the bottom (`data-testid="bands-validation"`):
    - On every change, run `validateBands(currentBands)`. If non-null,
      render `<p class="text-red-700">` with the German error.
    - If valid, render `<p class="text-emerald-700">`: "Bänder gültig — {count}
      Bänder, davon {selectionCount} Auswahl, {displayOnlyCount} nur Anzeige."

  Behavior rules:
  - Inputs commit on `onChange` (blur), NOT `onInput`. This avoids the
    "user typing 1 → meant 10" panic from RESEARCH.md risk 2.
  - Component is "controlled" — never holds its own band state; calls
    `onBandsChange` with a freshly-cloned new array on every commit.
  - Extract three pure helpers in the same file (exported for unit testing):
    - `addBandTo(bands: AgeBand[]): AgeBand[]`
    - `removeBandAt(bands: AgeBand[], index: number): AgeBand[]`
    - `resetToDefaults(): AgeBand[]`

  STEP B. Modify `apps/web/src/stage1/Stage1Panel.tsx`:

  - Add new signals near existing ones (top of component):
    ```ts
    const [bands, setBands] = createSignal<AgeBand[]>([...DEFAULT_AGE_BANDS]);
    const refYear = new Date().getFullYear();
    ```
    Import `AgeBand`, `DEFAULT_AGE_BANDS`, `recomputeAltersgruppe`,
    `validateBands` from `../csv/derive`.
  - Add a deferred reactive effect:
    ```ts
    createEffect(on(bands, (b) => {
      const p = parsed();
      if (!p || !p.derivedColumns.includes('altersgruppe')) return;
      const newRows = recomputeAltersgruppe(p.rows, b, refYear);
      setParsed({ ...p, rows: newRows });
    }, { defer: true }));
    ```
  - In `handleFile`, after `setParsed(p)`, also call `setBands([...DEFAULT_AGE_BANDS])` so each new upload starts fresh.
  - Insert the AgeBandsEditor as `<Show when={parsed()?.derivedColumns?.includes('altersgruppe')}>` block immediately AFTER `<AxisPicker .../>` inside the existing "2. Stratifikation konfigurieren" section.
  - Wire `bands={bands}` (signal getter) and `onBandsChange={setBands}` (or `(next) => setBands(next)`).
  - Disable the "Versand-Liste ziehen" button when bands invalid: extend
    `canRun()` to also check `validateBands(bands()) === null`. Inline
    explanation under the button (small `<p>`):
    "Run deaktiviert: Altersgruppen-Bänder sind ungültig — siehe oben."

  Code comments in English. UI strings in German.

  STEP C. Tests in `apps/web/tests/unit/age-bands-editor.test.ts` (NEW):
  - Use the exported pure helpers (`addBandTo`, `removeBandAt`, `resetToDefaults`):
    - `addBandTo([{min:0,max:9,label:'a',mode:'selection'}])` → returns
      a 2-element array, second band starts at 10, label 'neu'.
    - `addBandTo` with an open last band closes the last band first.
    - `removeBandAt([a,b,c], 1)` returns [a, c].
    - `resetToDefaults()` returns a 5-band array with mode pattern
      `[display-only, selection, selection, selection, selection]`.
    - `removeBandAt` with single-band input: returns input unchanged or
      throws — pick "returns input unchanged" + assert.
  - These tests validate the core logic without needing a Solid render
    harness. The full component-level interaction is covered by Playwright
    in Task 5.
  </action>
  <verify>
  <automated>cd /root/workspace/.claude/worktrees/altersgruppe-derived && pnpm --filter @sortition/web test -- age-bands-editor 2>&1 | tail -30 && pnpm --filter @sortition/web typecheck 2>&1 | tail -20</automated>
  </verify>
  <done>
  - `apps/web/src/stage1/AgeBandsEditor.tsx` exists, type-checks
  - Three pure helpers exported and tested
  - Stage1Panel imports + renders AgeBandsEditor when altersgruppe is derived
  - Bands signal recomputes altersgruppe on change (effect defer:true)
  - Run-button disabled when bands invalid; explanatory message visible
  - All unit tests pass; no regression in csv-parse / derive tests
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Hamilton allocation with display-only-zero strata + runStage1 wiring</name>
  <files>packages/core/src/stage1/stratify.ts, packages/core/src/stage1/types.ts, packages/core/src/stage1/audit-builder.ts, packages/core/src/stage1/index.ts, apps/web/src/stage1/runStage1.ts, packages/core/tests/stage1-stratify.test.ts, packages/core/tests/stage1-audit.test.ts</files>
  <action>
  STEP A. Modify `packages/core/src/stage1/stratify.ts`:

  - Extend `largestRemainderAllocation` signature to accept optional
    `forcedZeroIndices?: ReadonlySet<number>`:
    ```ts
    export function largestRemainderAllocation(
      stratumKeys: string[],
      stratumSizes: number[],
      targetN: number,
      forcedZeroIndices?: ReadonlySet<number>,
    ): number[]
    ```
  - Behavior when forcedZeroIndices is non-empty:
    1. Compute `remainingTotal = sum of stratumSizes[i] where i not in forcedZeroIndices`.
    2. If `remainingTotal === 0`: return `stratumSizes.map(() => 0)`.
    3. Compute `quotas[i] = (targetN * stratumSizes[i]) / remainingTotal`
       for i not in forcedZeroIndices; for i in forcedZeroIndices: `quotas[i] = 0`.
    4. `floors[i] = Math.floor(quotas[i])`. For forced indices, floors[i] = 0.
    5. Initial `assigned = sum(floors)`. `delta = targetN - assigned`.
    6. Build the `remainders` array EXCLUDING forced-zero indices.
    7. Sort by: larger remainder first; tie → larger N_h first; tie →
       codepoint-smaller stratum-key. (Same rule as today, just over the
       non-forced subset.)
    8. Bump first `delta` entries by 1.
  - Backward compatibility: when forcedZeroIndices is undefined or empty,
    behavior is **byte-identical** to the existing implementation. Existing
    tests must NOT regress.

  - Modify `stratify()`:
    - Read new `opts.forcedZeroStrataKeys?: ReadonlySet<string>`.
    - After bucketize and stratumKeys sort, compute
      `forcedZeroIndices = new Set<number>()`. For i in stratumKeys.length,
      if `opts.forcedZeroStrataKeys?.has(stratumKeys[i])`, add i.
    - Pass `forcedZeroIndices` into largestRemainderAllocation.
    - In the per-stratum loop, when populating `stratumResults[i]`, set
      `forced_zero: forcedZeroIndices.has(i) ? true : undefined` (omit when
      false to keep canonical JSON small).
    - Add a comment: "When forced_zero is true, n_h_target=0 and n_h_actual=0,
      so underfilled is naturally false. We do NOT push an underfill warning
      for forced-zero strata even if n_h_pool > 0 — the zero is intentional."
  - Update Edge cases comment block (lines ~115-122) to mention the new
    `forcedZeroStrataKeys` semantic.

  STEP B. Modify `packages/core/src/stage1/types.ts`:
  - Bump `schema_version: '0.2'` → `schema_version: '0.3'`.
  - Bump `algorithm_version: 'stage1@1.0.0'` → `algorithm_version: 'stage1@1.1.0'`.
  - Add to `Stage1AuditDoc` (after warnings, before timestamp_iso):
    ```ts
    /**
     * Optional: derived/calculated columns documentation. Present iff the
     * upload pipeline auto-generated columns from raw fields (e.g. altersgruppe
     * from geburtsjahr).
     */
    derived_columns?: Record<string, {
      source: string;
      description: string;
      bands?: AgeBand[];
    }>;
    /**
     * Optional: canonical stratum-key strings whose n_h_target was forced
     * to 0 (e.g. age bands with mode 'display-only'). The pool itself is
     * unchanged — these strata simply never receive an allocation.
     */
    forced_zero_strata?: string[];
    ```
    NB: do NOT add `pool_filter` — explicitly excluded per user decision.
  - Add to `StratumResult`: `forced_zero?: boolean`.
  - Add to `StratifyOpts`: `forcedZeroStrataKeys?: ReadonlySet<string>`.
  - Add to `BuildStage1AuditArgs`:
    ```ts
    derivedColumns?: Stage1AuditDoc['derived_columns'];
    forcedZeroStrata?: string[];
    ```
  - Import `AgeBand` from `./age-bands` at the top.

  STEP C. Modify `packages/core/src/stage1/audit-builder.ts`:
  - Set `schema_version: '0.3'` and `algorithm_version: 'stage1@1.1.0'`.
  - Conditionally include `derived_columns` and `forced_zero_strata` from args
    when provided; omit fields entirely when undefined. Use object spread
    `...(args.derivedColumns ? { derived_columns: args.derivedColumns } : {})`.

  STEP D. Modify `packages/core/src/stage1/index.ts`:
  - (Already exporting AgeBand from Task 1.) Add later in Task 4: infoOnlyBandsReport.

  STEP E. Modify `apps/web/src/stage1/runStage1.ts`:

  - Extend `RunStage1Input` per `<interfaces>`: `bands?`, `ageBandColumn?`,
    `bandsRefYear?`.
  - Inside runStage1, before calling stratify:
    1. Initialize `forcedZeroStrataKeys: Set<string> | undefined = undefined`.
    2. Initialize `forcedZeroStrataList: string[] | undefined = undefined`.
    3. Initialize `derivedColumnsForAudit: Stage1AuditDoc['derived_columns'] | undefined`.
    4. If `input.bands && input.ageBandColumn && input.axes.includes(input.ageBandColumn)`:
       - Compute `displayOnlyLabels = new Set(input.bands.filter(b => b.mode === 'display-only').map(b => b.label))`.
       - Import `bucketize` from `@sortition/core`.
       - Call `bucketize(input.parsed.rows, input.axes)`.
       - For each bucket key in the map: parse it as
         `[axis, value][]`, find `[input.ageBandColumn, value]`, if `value` is
         in `displayOnlyLabels`, add the original key string into a Set.
       - Set `forcedZeroStrataKeys` to that Set (only if non-empty; else leave
         undefined to keep audit clean).
       - `forcedZeroStrataList = [...forcedZeroStrataKeys].sort()`.
       - `derivedColumnsForAudit = { altersgruppe: { source: 'geburtsjahr',
         description: \`berechnet aus geburtsjahr; Stichtag ${input.bandsRefYear ?? new Date().getFullYear()}; Bänder: ${input.bands.map(b => \`${b.label}(${b.mode})\`).join(', ')}\`, bands: input.bands } }`.
    5. Pass `forcedZeroStrataKeys` into stratify opts (only when defined).
    6. Pass `derivedColumns: derivedColumnsForAudit` and
       `forcedZeroStrata: forcedZeroStrataList` into buildStage1Audit args
       (only when defined).

  STEP F. Tests:

  In `packages/core/tests/stage1-stratify.test.ts` (extend):
  - largestRemainderAllocation:
    - Without forcedZeroIndices, sample inputs match existing snapshots.
    - With `forcedZeroIndices = new Set([0])` and stratumSizes `[100, 200, 300]`,
      targetN=60: index 0 → 0; indices 1+2 sum to 60. 200/(200+300)*60=24,
      300/500*60=36 → [0, 24, 36]. Sum === 60.
    - With all indices forced to zero: returns all zeros even if targetN > 0.
  - stratify with forcedZeroStrataKeys:
    - Build a small dataset (rows) with axis `band` having values
      `unter-16, 25-44, 65+` (10 rows of each, total 30).
    - Pass `forcedZeroStrataKeys = new Set([JSON.stringify([['band','unter-16']])])`,
      targetN=10.
    - Result: stratum unter-16 has n_h_target=0, n_h_actual=0,
      forced_zero=true, no underfill warning.
    - Other strata sum to targetN=10.
    - selected.length === 10.
    - selected indices do NOT contain any rows whose band is `unter-16`.
    - Backward-compat: omitting `forcedZeroStrataKeys` produces the same
      result as before (snapshot a fixture against the existing implementation).

  In `packages/core/tests/stage1-audit.test.ts` (extend):
  - `schema_version` is now `'0.3'`, `algorithm_version` is `'stage1@1.1.0'` (update
    existing assertion at line ~200 from 0.2 → 0.3).
  - When `derivedColumns` is passed in, doc.derived_columns is included.
    When undefined, doc.derived_columns is undefined (not present).
  - Same for `forcedZeroStrata` / `doc.forced_zero_strata`.
  - canonicalStage1Json output for a doc with derived_columns sorts
    keys deterministically (sanity check via two builds).
  </action>
  <verify>
  <automated>cd /root/workspace/.claude/worktrees/altersgruppe-derived && pnpm --filter @sortition/core test -- stage1-stratify stage1-audit 2>&1 | tail -50 && pnpm --filter @sortition/web typecheck 2>&1 | tail -20</automated>
  </verify>
  <done>
  - largestRemainderAllocation accepts forcedZeroIndices and respects it
  - stratify accepts forcedZeroStrataKeys and produces forced_zero=true entries
  - schema_version is `'0.3'`, algorithm_version is `'stage1@1.1.0'`
  - StratumResult has optional forced_zero; Stage1AuditDoc has optional derived_columns + forced_zero_strata
  - runStage1 wires bands → forcedZeroStrataKeys correctly
  - All existing stratify tests still pass (backward-compat verified)
  - Grep `pool_filter` returns zero hits in packages/core and apps/web/src
  </done>
</task>

<task type="auto">
  <name>Task 4: Info-only bands report + StratificationExplainer + AxisPicker tooltips + audit footer + Markdown</name>
  <files>packages/core/src/stage1/reporting.ts, packages/core/src/stage1/index.ts, packages/core/tests/stage1-reporting.test.ts, apps/web/src/stage1/StratificationExplainer.tsx, apps/web/src/stage1/AxisPicker.tsx, apps/web/src/stage1/Stage1Panel.tsx, apps/web/src/stage1/AuditFooter.tsx</files>
  <action>
  STEP A. Add `infoOnlyBandsReport` to `packages/core/src/stage1/reporting.ts`:

  ```ts
  export interface InfoOnlyBandsReportRow {
    label: string;             // band label
    poolCount: number;         // number of CSV rows whose ageBandColumn === label
    hypotheticalSoll: number;  // Math.round(targetN * poolCount / totalPoolSize)
  }

  export function infoOnlyBandsReport(
    rows: Record<string, string>[],
    bands: readonly AgeBand[],
    ageBandColumn: string,
    targetN: number,
    totalPoolSize: number,
  ): InfoOnlyBandsReportRow[];
  ```
  - For each band where `mode === 'display-only'`, count rows where
    `row[ageBandColumn] === band.label`.
  - hypotheticalSoll = `totalPoolSize > 0 ? Math.round(targetN * poolCount / totalPoolSize) : 0`.
  - Returns one row per display-only-band, in the input bands' order.
  - Re-export from `packages/core/src/stage1/index.ts`:
    `export { infoOnlyBandsReport } from './reporting';`
    `export type { InfoOnlyBandsReportRow } from './reporting';`

  STEP B. Update `stage1ToMarkdownReport(audit)` in reporting.ts:

  - In the Parameter block, if `audit.derived_columns` is non-empty, render
    a sub-section "## Berechnete Spalten" listing each entry:
    `### {colname}`
    `**Quelle:** {source}`
    `**Beschreibung:** {description}`
    if bands provided, a small table:
    `| Band | Min | Max | Modus |`
    `| --- | ---: | ---: | --- |`
  - Right BEFORE the existing "## Detail-Tabelle" section: if
    `audit.forced_zero_strata?.length > 0`, render a new section:
    `## Nicht in Auswahl einbezogen`
    Aggregate per altersgruppe-band: iterate `audit.strata`, when
    `s.forced_zero === true`, sum `n_h_pool` per `s.key.altersgruppe`.
    Compute hypothetical Soll per band:
    `Math.round(audit.target_n * sum / audit.pool_size)`.
    Render as table:
    ```
    | Band | Im Pool | Hypothetisch (Soll-Proportion) |
    | --- | ---: | ---: |
    ```
    Closing line: "_Diese Personen wurden nicht gezogen — eigene Verfahrenswege denkbar (z.B. Kinderrat)._"

  STEP C. Tests in `packages/core/tests/stage1-reporting.test.ts` (extend):
  - `infoOnlyBandsReport`:
    - 100 rows with 20 unter-16, targetN=10, totalPoolSize=100 →
      `[{ label: 'unter-16', poolCount: 20, hypotheticalSoll: 2 }]`.
    - With multiple display-only bands, returns one row each, in bands order.
    - When poolCount=0, the row is still emitted (poolCount=0, hypotheticalSoll=0).
    - When totalPoolSize=0: hypotheticalSoll=0 (no division).
  - `stage1ToMarkdownReport` with a doc containing both derived_columns and
    forced_zero_strata:
    - Output contains "## Berechnete Spalten".
    - Output contains "## Nicht in Auswahl einbezogen".
    - Output contains "Kinderrat".
    - Output contains the markdown table headers.
  - Without those fields, the sections do NOT appear (regression guard).

  STEP D. Create `apps/web/src/stage1/StratificationExplainer.tsx`:

  Props:
  ```ts
  export interface StratificationExplainerProps {
    selectedAxes: () => string[];
    rows: () => Record<string, string>[];
    open: () => boolean;
    onToggle: (next: boolean) => void;
  }
  ```
  - `<details open={props.open()} onToggle={(e) => props.onToggle((e.currentTarget as HTMLDetailsElement).open)} data-testid="stage1-stratification-explainer">`
  - Summary: "Was bedeutet Stratifikation?"
  - Body content (German, exactly per ISSUE.md acceptance):
    1. Plain-language paragraph: "Stratifikation teilt die Bevölkerung in
       Gruppen nach den ausgewählten Merkmalen ein. Die Stichprobe wird so
       gezogen, dass jede Gruppe proportional zu ihrem Anteil in der
       Bevölkerung vertreten ist."
    2. Mini-Beispiel-Block (boxed, monospace numbers): "Beispiel: Pool 1.000
       Personen, davon 510 weiblich (51 %), 490 männlich (49 %). Bei
       Stichprobengröße 100: 51 Frauen + 49 Männer werden gezogen. Mit Achse
       Geschlecht × Altersgruppe entstehen Untergruppen wie 'weiblich/45-64'
       — jeweils proportional bedient."
    3. Live-Anzeige der Untergruppen-Anzahl (`data-testid="stage1-explainer-live-count"`):
       compute `axes = props.selectedAxes()`, `rows = props.rows()`. For each
       axis, `distinct = unique values in rows for that header`. Product
       across axes is the cross-product cell count.
       Display: "Sie haben {axes.length} Achsen gewählt ({axes.join(', ')}).
       Das ergibt **{product}** Bevölkerungsgruppen ({per-axis breakdown:
       'altersgruppe: 5 × geschlecht: 3 × sprengel: 3 = 45'})."
       Edge case: when `axes.length === 0`: show "Keine Achsen gewählt — die
       Stichprobe wäre eine einfache Zufallsstichprobe ohne Strukturierung."

  STEP E. Modify `apps/web/src/stage1/AxisPicker.tsx`:

  - Add optional props per `<interfaces>`.
  - For each header h, if `derivedColumns?.includes(h)`:
    - Render an additional badge `<span class="ml-1 px-1.5 py-0.5 text-[10px]
      rounded bg-sky-100 text-sky-800" data-testid={`axis-badge-derived-${h}`}>berechnet</span>`
      next to the existing "vorgeschlagen" badge.
  - For each header h, render a small `?` info span with `title`
    attribute equal to `axisDescriptions?.[h]` if provided. Use
    `<span class="ml-1 inline-block w-4 h-4 text-[10px] text-slate-500 cursor-help" title="...">?</span>`.
    Skip the icon entirely when the description is missing.
  - Below the checkbox list (still inside the fieldset), render warnings for
    each currently selected axis where `distinctValueCounts?.[h] > 15`:
    ```html
    <p data-testid={`axis-warn-distinct-${h}`} class="text-xs text-amber-700">
      Achse `{h}` hat {n} verschiedene Werte. Viele Strata werden 0 Personen
      erhalten. Erwägen Sie, ähnliche Werte zusammenzufassen (Feature kommt
      mit #63).
    </p>
    ```

  STEP F. Modify `apps/web/src/stage1/Stage1Panel.tsx`:

  - Add new signal `const [explainerOpen, setExplainerOpen] = createSignal(true);` (open by default; persists across renders within session).
  - Build `axisDescriptions` (constant inside component, German):
    - `geschlecht`/`gender` → "Geschlecht (m/w/d laut Melderegister) — Standard-Stratifikation in jeder Bürgerrats-Methodik."
    - `altersgruppe` → "Altersgruppe (berechnet aus geburtsjahr) — kontrolliert Generationen-Repräsentation."
    - `sprengel`/`bezirk`/`district` → "Geographische Untergliederung — sichert lokale Vielfalt."
    - default: undefined (icon not rendered)
  - Build a memo `distinctValueCounts` keyed by header for the currently
    selected axes (only count axes the user has selected; counting all
    headers would be wasteful).
  - Pass to AxisPicker:
    `derivedColumns={parsed()?.derivedColumns ?? []}`,
    `axisDescriptions={axisDescriptions}`,
    `distinctValueCounts={distinctValueCounts()}`.
  - Render `<StratificationExplainer selectedAxes={selectedAxes} rows={() => parsed()?.rows ?? []} open={explainerOpen} onToggle={setExplainerOpen} />` ABOVE `<AxisPicker .../>` inside the "2. Stratifikation konfigurieren" section.
  - Insert the new "Nicht in Auswahl einbezogen" report SECTION inside the
    Result-View, AFTER the existing axis-breakdowns section and BEFORE the
    strata detail table (`<details>` for "Detail-Tabelle"). Render only when
    `output()?.signedAudit.doc.forced_zero_strata?.length > 0`. Use the new
    `infoOnlyBandsReport` helper to compute rows from
    `parsed()?.rows`, `bands()`, `'altersgruppe'`, target_n, pool_size.
    The table:
    ```
    | Band | Im Pool | Hypothetisch (Soll-Proportion) |
    | --- | ---: | ---: |
    ```
    With a closing italic note "Diese Personen wurden nicht gezogen — eigene
    Verfahrenswege denkbar (z.B. Kinderrat)."
    Add `data-testid="stage1-info-only-bands-report"`.
  - Pass `bands: bands()`, `ageBandColumn: 'altersgruppe'`, `bandsRefYear: refYear` into the runStage1 call (only when altersgruppe is in derivedColumns AND in selectedAxes).

  STEP G. Modify `apps/web/src/stage1/AuditFooter.tsx`:
  - When `props.doc.derived_columns` is defined and non-empty, render an
    additional `<dt>Berechnete Spalten</dt><dd>` block listing each derived
    column name and a truncated description (first 80 chars + "…").
  - When `props.doc.forced_zero_strata` is defined and non-empty, render a
    `<dt>Strata mit Soll=0 (nur Anzeige)</dt><dd>`: number of forced-zero
    strata + parenthetical "Pool wurde NICHT gefiltert — diese Personen
    bleiben Teil des Pools." `data-testid="audit-footer-forced-zero"`.

  Code comments in English. UI strings in German.
  </action>
  <verify>
  <automated>cd /root/workspace/.claude/worktrees/altersgruppe-derived && pnpm --filter @sortition/core test -- stage1-reporting 2>&1 | tail -30 && pnpm --filter @sortition/web typecheck 2>&1 | tail -20 && pnpm --filter @sortition/web lint 2>&1 | tail -10</automated>
  </verify>
  <done>
  - `infoOnlyBandsReport` exported from @sortition/core, tested
  - `stage1ToMarkdownReport` includes "Berechnete Spalten" + "Nicht in Auswahl einbezogen" sections when audit fields present, otherwise omits them
  - `StratificationExplainer.tsx` renders explainer + live cell-count
  - `AxisPicker` shows "berechnet" badge for derived columns, per-axis tooltip via `title`, distinct-values warning >15
  - Stage1Panel renders explainer above AxisPicker, info-only-bands-report in result view
  - runStage1 receives bands + ageBandColumn from Stage1Panel
  - AuditFooter renders derived_columns + forced_zero_strata blocks when present
  - Lint and typecheck clean
  </done>
</task>

<task type="auto">
  <name>Task 5: E2E + bundle delta + existing-tests update</name>
  <files>apps/web/tests/e2e/stage1-bands.spec.ts, apps/web/tests/e2e/stage1.spec.ts, apps/web/tests/e2e/beispiele-stage1.spec.ts, BUNDLE_DELTA.md</files>
  <action>
  STEP A. Create `apps/web/tests/e2e/stage1-bands.spec.ts` (NEW Playwright spec):

  Use `apps/web/public/beispiele/herzogenburg-melderegister-8000.csv` as the
  fixture (it has `geburtsjahr` but no `altersgruppe`). Read it via
  `fs.readFileSync` like in stage1.spec.ts. Set `test.describe.configure({ mode: 'serial' })`.

  Test 1: "default axes after upload include geschlecht, altersgruppe, sprengel"
  - Goto / → click stage1 tab → upload herzogenburg CSV.
  - Pool summary shows ~8000.
  - All three axis-checkbox-{geschlecht,altersgruppe,sprengel} are checked
    by default (this is the regression guard for the original issue: without
    derive, altersgruppe wasn't there).

  Test 2: "stratification explainer is open by default and shows live cell-count"
  - Upload herzogenburg CSV.
  - `getByTestId('stage1-stratification-explainer')` is visible AND has the
    `open` attribute on the `<details>` element.
  - `getByTestId('stage1-explainer-live-count')` contains text matching
    `/\d+ Bevölkerungsgruppen/` and the count is `5 × {distinct geschlecht} × {distinct sprengel}` (verify count > 1).
  - Click the summary to collapse — `open` attribute removed.

  Test 3: "AgeBandsEditor shows 5 default bands with correct modes"
  - Upload herzogenburg CSV.
  - `getByTestId('stage1-age-bands-editor')` is visible.
  - Five rows visible (`band-mode-0-display`, `band-mode-1-selection`,
    `band-mode-2-selection`, `band-mode-3-selection`, `band-mode-4-selection`)
    are each checked appropriately.

  Test 4: "switching unter-16 to selection changes bands-validation message and triggers a re-derivation"
  - Click `band-mode-0-selection` radio.
  - `getByTestId('bands-validation')` text changes to mention 5 selection
    bands.
  - Set targetN=50, click run → result view appears. The "Nicht in Auswahl
    einbezogen" section is NOT rendered (no display-only bands).

  Test 5: "default display-only unter-16 → result view contains info-only bands report and 0 forced-zero strata in audit"
  - Upload herzogenburg CSV (default bands keep unter-16 as display-only).
  - Set targetN=50, click run.
  - Result view contains `getByTestId('stage1-info-only-bands-report')`
    visible, with table row for "unter-16" and a non-zero "Im Pool" count.
  - Strata detail table (after expanding) — find the unter-16 strata, all
    have Soll=0 and Ist=0 with status `ok` (not `unterbesetzt`).
  - `getByTestId('audit-footer-forced-zero')` is visible.
  - The downloaded audit-JSON (intercept the download) has
    `schema_version: '0.3'`, `algorithm_version: 'stage1@1.1.0'`,
    `forced_zero_strata.length > 0`, `derived_columns.altersgruppe` defined,
    NO `pool_filter` field anywhere.

  Test 6: "invalid bands disable run-button"
  - Upload herzogenburg CSV.
  - In band-min-1 input, type "100" (creates an overlap or invalid order).
    Tab off the input to commit.
  - `getByTestId('bands-validation')` shows the German error.
  - `getByTestId('stage1-run')` is disabled.

  Test 7: "axis-warn-distinct fires for staatsbuergerschaft if user adds it"
  - Skip if the herzogenburg CSV doesn't have an axis with >15 distinct
    values. Inspect the file: `staatsbuergerschaft` likely has only 1-3
    values. If we cannot trigger the >15 warning naturally, write the test
    using a synthetic small CSV via `setInputFiles` with inline buffer
    creation (header + 16 distinct dummy values). Or: skip test 7 entirely
    if no natural axis has >15 distinct values — comment with TODO #63.
    Pick: skip with a comment.

  STEP B. Update existing `apps/web/tests/e2e/stage1.spec.ts`:
  - The fixture (`kleinstadt-bezirkshauptort-n500-s42-t070.csv`) already has
    `district`/`age_band`/`gender` headers, NOT `geburtsjahr` — so the
    derive logic doesn't fire. Verify: existing assertions should still pass
    unchanged.
  - Add a small assertion after pool-summary: AgeBandsEditor is NOT visible
    (`expect(page.getByTestId('stage1-age-bands-editor')).not.toBeVisible()`)
    because the fixture has no derived altersgruppe.
  - Audit-JSON download check: add `expect(audit.schema_version).toBe('0.3')`
    instead of '0.2' — wherever the existing test checks the schema.

  Update `apps/web/tests/e2e/beispiele-stage1.spec.ts`:
  - After upload of herzogenburg CSV, assert the AgeBandsEditor is visible
    AND the 5-band default is rendered. No need to run a full Stage 1 here —
    just smoke the bands editor mounts.

  STEP C. Update existing unit/integration tests that hit the audit schema:
  - Search for `schema_version` and `'0.2'` in `packages/core/tests/` and
    `apps/web/tests/unit/`. Replace each with `'0.3'`. Two known sites:
    `packages/core/tests/stage1-audit.test.ts:200` and
    `apps/web/src/run/audit.ts:82` (NB: this one is a different audit file
    from #44/run/audit.ts — verify it's the panel-pipeline audit, not the
    Stage1 audit. If it's a separate audit doc unrelated to Stage1, leave
    it alone.) Also check `docs/audit-schema.json` for documented schema —
    update if it documents Stage1 schema_version. Keep changes scoped to
    Stage1 audit doc shape.
  - Run full repo tests: anything that breaks must be addressed.

  STEP D. Create `BUNDLE_DELTA.md` at the repo root:
  - Run a fresh build with `pnpm build`. Capture sizes from `dist/assets/`
    for `index-*.js` and `index-*.css`.
  - Compare against the baseline in `docs/bundle-size.md`:
    - Baseline: `index-*.js` 61.41 KB raw, 21.90 KB gzip.
    - New: <measure>.
  - Document: file size delta, gzip delta, percent change.
  - Expectation: <2 KB gzip delta. The new code is small (one new TSX
    component, parser extension, allocator branch). If delta exceeds 5 KB
    gzip, investigate before merging.
  - Format:
    ```
    # Bundle Delta — Issue #62

    | Asset | Baseline (KB) | After (KB) | Delta |
    | --- | ---: | ---: | ---: |
    | dist/assets/index-*.js (raw) | 61.41 | <new> | +X.XX |
    | dist/assets/index-*.js (gzip) | 21.90 | <new> | +X.XX |
    | dist/assets/index-*.css (raw) | 9.48 | <new> | +X.XX |
    | dist/assets/index-*.css (gzip) | 2.51 | <new> | +X.XX |

    Raw HiGHS WASM: unchanged (2.60 MB).

    Notes: <one paragraph commentary>
    ```
  - Place this file at `/root/workspace/.claude/worktrees/altersgruppe-derived/BUNDLE_DELTA.md` (repo root).
  </action>
  <verify>
  <automated>cd /root/workspace/.claude/worktrees/altersgruppe-derived && pnpm --filter @sortition/web test 2>&1 | tail -10 && pnpm --filter @sortition/core test 2>&1 | tail -10 && pnpm --filter @sortition/web build 2>&1 | tail -20 && pnpm --filter @sortition/web test:e2e -- stage1-bands stage1 beispiele-stage1 2>&1 | tail -40</automated>
  </verify>
  <done>
  - `apps/web/tests/e2e/stage1-bands.spec.ts` exists with 6+ scenarios passing
  - Existing stage1.spec.ts and beispiele-stage1.spec.ts updated, still pass
  - All `'0.2'` schema assertions replaced with `'0.3'` where they refer to Stage1AuditDoc
  - `BUNDLE_DELTA.md` exists at repo root with measured numbers and percent change
  - Full test suite green: vitest (web + core), playwright e2e
  - No `pool_filter` in any test fixture or assertion
  </done>
</task>

</tasks>

<verification>
After all tasks, run final checks from the repo root:

- `cd /root/workspace/.claude/worktrees/altersgruppe-derived && pnpm test` — all vitest suites green (web + core)
- `cd /root/workspace/.claude/worktrees/altersgruppe-derived && pnpm typecheck` — no TS errors across packages/core, apps/web
- `cd /root/workspace/.claude/worktrees/altersgruppe-derived && pnpm lint` — eslint + prettier pass
- `cd /root/workspace/.claude/worktrees/altersgruppe-derived && pnpm build` — production build succeeds
- `cd /root/workspace/.claude/worktrees/altersgruppe-derived && pnpm test:e2e` — Playwright suite green (Chromium + Firefox)
- Manual sanity: grep `pool_filter` across `packages/`, `apps/web/src/`, `apps/web/tests/` — 0 hits
- Manual sanity: grep `schema_version` shows only `'0.3'` for the Stage1AuditDoc context
- Audit-JSON shape check: download a Stage 1 audit, verify `derived_columns.altersgruppe.bands` is the 5-band array, `forced_zero_strata` lists the unter-16 stratum keys, `pool_size === parsed.rows.length` (NOT a filtered subset)
</verification>

<success_criteria>
Acceptance criteria from ISSUE.md, mapped 1:1:

- [Berechnungs-Logik] Pure-Funktion `deriveAltersgruppe` exists in derive.ts (Task 1).
- [Berechnungs-Logik] 5 default bands with the exact labels (Task 1).
- [Berechnungs-Logik] refYear default = current year (Task 1).
- [Berechnungs-Logik] Edge cases (empty, non-numeric, future) return null (Task 1).
- [CSV-Parser-Integration] altersgruppe injected when geburtsjahr present (Task 1).
- [CSV-Parser-Integration] derivedColumns field on ParsedCsv (Task 1).
- [CSV-Parser-Integration] Existing altersgruppe NOT overwritten (Task 1).
- [Auto-Mapping] DEFAULT_GUESS includes `altersgruppe: 'age_band'` (Task 1).
- [Default-Achsen] recommendedAxes already covers age_band — works without change (Task 1).
- [Default-Achsen] AxisPicker badge "berechnet" for derived columns (Task 4).
- [Audit-Transparenz] derived_columns optional Record on Stage1AuditDoc (Task 3).
- [Audit-Transparenz] forced_zero_strata field; NO pool_filter (Task 3).
- [Audit-Transparenz] Audit footer shows derived_columns + forced_zero (Task 4).
- [Audit-Transparenz] Markdown report has "Berechnete Spalten" section (Task 4).
- [Tests] Vitest covers all derive edge cases (Task 1).
- [Tests] Vitest covers parse with derivedColumns (Task 1).
- [Tests] Playwright: 3 default checkboxes for herzogenburg CSV (Task 5).
- [Tests] Playwright: audit footer mentions altersgruppe(berechnet aus geburtsjahr) (Task 5).
- [Bestehende CSVs] Beispiel-CSVs unverändert — fixture file untouched (all tasks).
- [Editierbare Bands] AgeBandsEditor visible only when altersgruppe is derived (Task 2).
- [Editierbare Bands] 5 defaults with mode pattern [display, sel, sel, sel, sel] (Task 1+2).
- [Editierbare Bands] Per-band: min/max/label/mode editable, add/remove/reset (Task 2).
- [Editierbare Bands] Validation, run-button disabled on invalid (Task 2).
- [Display-Only-Bands als Stratum-0] Hamilton supports forcedZeroIndices (Task 3).
- [Display-Only-Bands als Stratum-0] Pool unchanged — file untouched (Task 3).
- [Display-Only-Bands als Stratum-0] No pool_filter field anywhere (Task 3).
- [Reporting] "Nicht in Auswahl einbezogen" section in result + Markdown (Task 4).
- [Reporting] Closing line about Kinderrat (Task 4).
- [UX-Polish] Erklär-Aside above AxisPicker, kollabierbar, default-open (Task 4).
- [UX-Polish] Plain-language + Mini-Beispiel + Live-Untergruppen-Anzahl (Task 4).
- [UX-Polish] Per-Achse Tooltip via title attribute (Task 4).
- [UX-Polish] Distinct-Values-Warnung >15 (Task 4).
- [Bundle Delta] Documented in BUNDLE_DELTA.md (Task 5).
</success_criteria>
