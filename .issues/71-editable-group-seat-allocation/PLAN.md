# Plan: Manuell editierbare Gruppen-Sitz-Allokation (Quoten-Override mit Audit)

<objective>
Was: 1-D Achsen-Override für Stage-3-Quoten (Maximin) mit Pflicht-Begründung (≥20 Zeichen non-whitespace), backwards-kompatibler Audit-Schema-Erweiterung (0.1 → 0.2) und vollständiger Audit-Coverage über die bestehende Ed25519/ECDSA-Signatur.

Warum: Zweite Anwendungs-Organisation (#70) braucht die Möglichkeit, gezielt von der proportionalen Pool-Verteilung abzuweichen ("min 50% unter 50") und diese Abweichung vollständig nachvollziehbar im Audit zu hinterlegen. Generisches Override-Primitive für alle Use-Cases (BR, Landeskonferenz, Parteitag) — kein BR-spezifisches Feature.

Scope:
- IN: 1-D Achsen-Override pro Achse, Override-Editor-Komponente, runEngine-Adapter, Audit-Schema 0.2 + Signatur, Quality-Metric `seat_allocation_drift`, Inline-Badge, In-App-Doku, e2e-Spec.
- OUT: Stage-1-Override, N-D Cell-Override, Auto-Justierung, Override-History/Undo, Multi-User-Approval, Engine-A-Solver-Eingriff, vollwertiger Stage-3-AuditFooter.
</objective>

<skills>
Keine Workspace-Skills definiert (`.claude/skills/` existiert nicht). Konventionen aus `CLAUDE.md` befolgen:
- UI-Strings & Doku auf Deutsch.
- Code-Kommentare auf Englisch.
- Quellen-Pflicht für technische Behauptungen (Datei:Zeile).
- "Unbestätigt" markieren statt raten.
</skills>

<context>
Issue: @.issues/71-editable-group-seat-allocation/ISSUE.md
Decisions: @.issues/71-editable-group-seat-allocation/CONTEXT.md
Research: @.issues/71-editable-group-seat-allocation/RESEARCH.md

**Wichtiger Merge-Kontext**: Zwei parallele Feature-Branches werden voraussichtlich VOR diesem Plan in `main` landen:
- `issue/72-excel-upload-support` benennt `apps/web/src/csv/` → `apps/web/src/import/` um.
- `issue/70-rebrand-personenauswahl` ändert UI-Copy (Personenauswahl-Sprache statt "Bürgerinnenrat") und führt einen Use-Case-Hub ein.

Merge-Reihenfolge: #72 → #70 → #71. Konsequenzen für die Ausführung dieses Plans:
1. **Pfad-Drift**: Datei-Zeilen-Referenzen in RESEARCH.md können nach #72/#70-Merge leicht verschoben sein. Wenn ein Edit fehlschlägt, weil Zeile/Inhalt nicht mehr passt, **vorher re-greppen** (`rg "<symbol>" apps/web/src/`) und Kontext neu lesen. Quoten-Code lebt unverändert in `apps/web/src/quotas/`.
2. **UI-Sprache**: alle neuen UI-Strings in Personenauswahl-Sprache schreiben, nicht "Bürgerinnenrat-spezifisch". Patterns aus `Stage1Panel.tsx` (post-#70) und neuem Use-Case-Hub übernehmen.

<interfaces>
<!-- Executor: nutze diese Verträge direkt. Nicht im Codebase explorieren. -->

// From apps/web/src/quotas/model.ts (existing — DO NOT modify)
export interface QuotaBound { min: number; max: number; }
export interface CategoryQuota { column: string; bounds: Record<string, QuotaBound>; }
export interface QuotaConfig {
  panel_size: number;
  categories: CategoryQuota[];
}
export interface QuotaValidation {
  ok: boolean;
  panel_errors: string[];
  per_category: CategoryValidation[];
}
export function uniqueValues(rows: Record<string, string>[], column: string): string[]
export function valueCounts(rows: Record<string, string>[], column: string): Record<string, number>
export function validateQuotas(rows: Record<string, string>[], config: QuotaConfig): QuotaValidation
export function quotaConfigToJson(config: QuotaConfig): string
export function quotaConfigFromJson(text: string): QuotaConfig

// From packages/engine-contract/src/types.ts (Zod-inferred, existing)
export type Person = { person_id: string } & Record<string, string>;
export type Pool = { id: string; people: Person[] };
export type Quotas = { panel_size: number; categories: CategoryQuota[] };
export type RunParams = { seed: number; algorithm: 'maximin'; timeout_ms?: number };
export type QuotaFulfillment = {
  column: string; value: string; selected: number;
  bound_min: number; bound_max: number; ok: boolean;
};
export type RunResult = {
  selected: string[];
  marginals: Record<string, number>;
  quota_fulfillment: QuotaFulfillment[];
  timing: Timing;
  engine_meta: EngineMeta;
  committees?: Array<{ members: string[]; probability: number }>;
};

// From apps/web/src/run/audit.ts (current schema 0.1 — to be bumped to 0.2)
export const AUDIT_SCHEMA_VERSION = '0.1'; // bump to '0.2'
export interface AuditDoc {
  schema_version: string;
  engine: { id: string; version: string };
  algorithm: 'maximin';
  seed: number;
  input_sha256: string;          // SHA-256 over canonicalPool + canonicalQuotas
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
export async function inputSha256(pool: Pool, quotas: Quotas): Promise<string>
export async function buildAudit(args: {
  pool: Pool; quotas: Quotas; seed: number;
  result: RunResult; duration_ms: number;
}): Promise<AuditDoc>
export interface SignedAudit { doc: AuditDoc; bodyJson: string; }
export async function signAudit(doc: AuditDoc): Promise<SignedAudit>
// Signature mechanics: stripSignature(doc) → JSON.stringify(remainder) → sign.
// JSON.stringify uses insertion order (NOT canonicalised). buildAudit MUST
// initialise all keys in fixed order — no Object.spread for AuditDoc construction.

// From packages/engine-a/src/feasible-committee.ts (existing — DO NOT modify)
// LP constraints emitted (lines ~84-110):
//   panel_size:        Σ x_i = quotas.panel_size
//   {col}_{val}_min:   Σ x_i (i ∈ group) >= b.min
//   {col}_{val}_max:   Σ x_i (i ∈ group) <= b.max
// → 1-D Override per axis = setting b.min == b.max == override_value pro Wert.
//    LP akzeptiert das ohne neue Constraint-Klasse.

// From scripts/verify_audit.py
REQUIRED_FIELDS = (schema_version, engine, algorithm, seed, input_sha256,
                   panel_size, pool_size, selected, marginals,
                   quota_fulfillment, timing, public_key, signature)
// Verifier strips public_key/signature/signature_algo, regeneriert
// JSON.stringify(remainder) und prüft Signatur. Für 0.2 bleibt REQUIRED_FIELDS
// identisch — seat_allocation ist optional. Verifier akzeptiert beide Versionen.

// NEW types to be created in apps/web/src/quotas/seat-allocation.ts
export interface SeatAllocationOverride {
  axis: string;                          // CSV column being overridden
  seats: Record<string, number>;         // value → seat count, Σ == panel_size
  rationale: string;                     // German free-text, ≥20 non-whitespace chars
  timestamp_iso: string;                 // ISO-8601 UTC, set at commit time
}
export interface SeatAllocation {
  baseline: Record<string, Record<string, number>>; // axis → value → seats
  override: SeatAllocationOverride | null;
}
export function nonWhitespaceLength(s: string): number;
export function computeBaseline(
  rows: Record<string, string>[],
  panelSize: number,
  axes: string[],
): SeatAllocation['baseline'];
export interface OverrideValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
}
export function validateOverride(
  rows: Record<string, string>[],
  panelSize: number,
  override: SeatAllocationOverride,
): OverrideValidation;
export function applyOverrideToQuotas(
  quotas: Quotas,
  override: SeatAllocationOverride | null,
): Quotas;

// NEW Audit fields (in apps/web/src/run/audit.ts after bump)
export interface SeatAllocationAudit {
  baseline: Record<string, Record<string, number>>;
  override: SeatAllocationOverride | null;
  deviation: Record<string, { delta_seats: number; delta_percent: number }> | null;
}
// AuditDoc gets optional `seat_allocation?: SeatAllocationAudit;` appended.

// NEW Quality-Metric (in packages/metrics/src/index.ts)
export interface SeatAllocationDrift {
  axis: string;
  l1_drift: number;            // Σ |override - baseline|, in seats
  l1_drift_pct: number;        // l1_drift / panel_size
  max_value_drift: number;     // max |override[v] - baseline[v]|
  max_value_drift_pct: number; // max_value_drift / panel_size
}
export function seatAllocationDrift(
  axis: string,
  baseline: Record<string, number>,
  override: Record<string, number>,
  panelSize: number,
): SeatAllocationDrift;
</interfaces>

Key files (read before editing):
@apps/web/src/quotas/model.ts — bestehende QuotaConfig + Validatoren
@apps/web/src/quotas/QuotaEditor.tsx — Bounds-Editor (215 Zeilen, NICHT inline patchen)
@apps/web/src/run/audit.ts — Schema 0.1 + buildAudit + signAudit + canonicalQuotas
@apps/web/src/run/runEngine.ts — App→Engine Bridge
@apps/web/src/run/RunPanel.tsx — Stage-3 UI + Test-IDs
@apps/web/src/App.tsx — Top-level State (für SeatAllocation-Hoisting)
@packages/engine-a/src/feasible-committee.ts — LP-Constraint-Pfad (DO NOT modify)
@packages/metrics/src/index.ts — Quality-Metrics
@scripts/verify_audit.py — externer Verifier (REQUIRED_FIELDS)
@apps/web/tests/unit/run-audit-sign-verify.test.ts — Round-Trip + Tampering-Pattern
</context>

<commit_format>
Format: conventional with issue prefix (per `.issues/config.yaml` und Repo-Konvention `69: docs(issues): ...`)
Beispiel: `71: feat(quotas): add SeatAllocation model + validators`
Pattern: `71: <type>(<scope>): <description>`
Types: feat, fix, test, refactor, docs, chore. Scopes: quotas, run, metrics, docs, audit, e2e.
</commit_format>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: SeatAllocation-Datenmodell + Pure Helpers</name>
  <files>
  apps/web/src/quotas/seat-allocation.ts (NEW),
  apps/web/tests/unit/seat-allocation-model.test.ts (NEW)
  </files>
  <behavior>
  - `nonWhitespaceLength('  hello  world  ') === 10`; `nonWhitespaceLength('                    ') === 0` (20 Spaces blockieren).
  - `computeBaseline(rows, panelSize, axes)` liefert pro Achse Hamilton/Largest-Remainder-Allokation. Σ pro Achse == panelSize. Empty-Pool → leere Records pro Achse, keine Exception.
  - `validateOverride(rows, panelSize, override)`:
    - error wenn `override.axis` nicht in rows-Spalten.
    - error wenn Σ override.seats != panelSize.
    - error wenn ein override.seats[v] < 0.
    - error wenn override.seats[v] > poolCounts[v] (Pool-Capacity-Check; nennt v und Anzahl).
    - error wenn nonWhitespaceLength(rationale) < 20.
    - error wenn timestamp_iso nicht ISO-8601 (regex-validate, kein Date-Parsing).
    - ok=true wenn alle Checks pass.
  - `applyOverrideToQuotas(quotas, null) === quotas` (Identität).
  - `applyOverrideToQuotas(quotas, override)` ersetzt `bounds` der overrideten Achse mit `{[v]: {min: n, max: n}}`. Andere Achsen unverändert.
  </behavior>
  <action>
  RED: Schreibe Vitest-Tests in `apps/web/tests/unit/seat-allocation-model.test.ts` für jeden behavior-Punkt. Mindestens 12 Test-Cases. Decke besonders ab:
    - `nonWhitespaceLength` mit reinen Whitespace-Strings (Tabs, Newlines, Unicode-Spaces).
    - `computeBaseline` mit einfachem 30-Personen-Pool und panel=10, axes=['gender'] → baseline['gender']['m'] + baseline['gender']['f'] == 10.
    - `validateOverride` für jeden error-Pfad einzeln (jeweils ein assert pro test).
    - `applyOverrideToQuotas` als pure Funktion: input-Quotas-Objekt darf nicht mutiert werden (deep-equal-Check vor und nach).

  GREEN: Implementiere in `apps/web/src/quotas/seat-allocation.ts`:
    - `nonWhitespaceLength(s)`: `s.replace(/\s+/g, '').length`. Stelle sicher dass `\s` Unicode-Spaces matched (Standard in JS-Regex mit `/s/u`-Flag, aber ohne `/u` reicht).
    - `computeBaseline`: für jede Achse uniqueValues, dann Hamilton-Quote: `quota[v] = panelSize * count[v] / total`. Floor + Largest-Remainder-Verteilung der Restsitze. Σ == panelSize garantiert.
    - `validateOverride`: alle Checks in fester Reihenfolge wie in behavior-Block. Akkumuliert errors[]-Liste; ok = errors.length === 0. Deutsche Fehlermeldungen.
    - `applyOverrideToQuotas`: pure Komposition wie in RESEARCH.md L490-505. Verwende `Object.fromEntries(Object.entries(...).map(...))`-Pattern für bounds-Rebuild.

  Importiere `valueCounts` und `uniqueValues` aus `apps/web/src/quotas/model.ts`. Keine neue Dependency.

  REFACTOR: Extrahiere Pool-Capacity-Helper falls duplikat. Code-Kommentare auf Englisch ("Hamilton/largest-remainder allocation per axis").
  </action>
  <verify>
  <automated>pnpm --filter @sortition/web test -- seat-allocation-model</automated>
  </verify>
  <done>
  - Datei `apps/web/src/quotas/seat-allocation.ts` exportiert `SeatAllocation`, `SeatAllocationOverride`, `OverrideValidation`, `nonWhitespaceLength`, `computeBaseline`, `validateOverride`, `applyOverrideToQuotas`.
  - Alle Tests grün, mindestens 12 Test-Cases.
  - `pnpm --filter @sortition/web typecheck` grün.
  - `apps/web/src/quotas/model.ts` ist UNVERÄNDERT.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Quality-Metric `seatAllocationDrift`</name>
  <files>
  packages/metrics/src/seat-allocation-drift.ts (NEW),
  packages/metrics/src/index.ts (modify — add export),
  packages/metrics/tests/seat-allocation-drift.test.ts (NEW)
  </files>
  <behavior>
  - `seatAllocationDrift(axis, baseline, override, panelSize)` liefert `{ axis, l1_drift, l1_drift_pct, max_value_drift, max_value_drift_pct }`.
  - `l1_drift = Σ |override[v] - baseline[v]|` über alle Werte der Achse.
  - `l1_drift_pct = l1_drift / panelSize` (NICHT halbiert; Doku erklärt dass durch Σ-Constraint jeder gewinnende Sitz einem verlierenden entspricht und daher L1 doppelt zählt — siehe RESEARCH.md L625).
  - `max_value_drift = max |override[v] - baseline[v]|` über alle Werte.
  - `max_value_drift_pct = max_value_drift / panelSize`.
  - panelSize == 0 → alle Pct-Werte = 0 (kein NaN/Infinity).
  - Werte aus `baseline` und `override` müssen identische Key-Set haben; bei Abweichung error werfen mit klarer Message (oder fehlende Werte als 0 behandeln — entscheide für letzteres, robuster gegen Edge-Cases).
  </behavior>
  <action>
  RED: Tests in `packages/metrics/tests/seat-allocation-drift.test.ts`:
    - Synthetisches Beispiel: baseline {a:5, b:5}, override {a:7, b:3} → l1_drift=4, max_value_drift=2, beide pct = 0.4 / 0.2 bei panelSize=10.
    - panelSize=0 → alle pct=0.
    - Override == baseline → alle Werte 0.
    - Asymmetrische Keys: baseline {a:5, b:5}, override {a:10} → b implizit 0 → l1_drift=10.

  GREEN: Implementiere in `packages/metrics/src/seat-allocation-drift.ts` als pure Funktion. Re-exportiere via `packages/metrics/src/index.ts`. Englische Kommentare. Keine neue Dependency.

  REFACTOR: JSDoc-Kommentar erklärt L1-Doppelzählung (nicht halbiert, dafür intuitiv "Σ aller absoluten Verschiebungen").
  </action>
  <verify>
  <automated>pnpm --filter @sortition/metrics test -- seat-allocation-drift</automated>
  </verify>
  <done>
  - `packages/metrics/src/seat-allocation-drift.ts` existiert, exportiert `seatAllocationDrift` + Type `SeatAllocationDrift`.
  - `packages/metrics/src/index.ts` re-exportiert beides.
  - Mindestens 6 Test-Cases grün.
  - `pnpm --filter @sortition/metrics typecheck` grün (falls vorhanden, sonst Workspace-typecheck).
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: runEngine-Adapter (Override-Komposition + Pre-Flight)</name>
  <files>
  apps/web/src/run/runEngine.ts (modify),
  apps/web/tests/unit/seat-allocation-engine-adapter.test.ts (NEW)
  </files>
  <behavior>
  - `runEngineA` (oder analoger Bridge-Function) akzeptiert optionalen Parameter `override?: SeatAllocationOverride | null`.
  - Vor `engine.run()` wird `applyOverrideToQuotas(quotas, override)` aufgerufen → `effectiveQuotas`.
  - Pre-Flight-Validierung: `validateOverride(pool.people, quotas.panel_size, override)` ausführen. Wenn nicht ok → return `{ kind: 'pre_flight_invalid', errors: validation.errors }` (oder ähnliche existierende Fehlerstruktur des runEngine — re-greppen vor Edit).
  - `engine.run({ pool, quotas: effectiveQuotas, params })` wird mit Post-Override-Quotas aufgerufen.
  - Pre-Override-Quotas (original) und Post-Override-Quotas werden BEIDE an den Caller zurückgegeben oder verfügbar gemacht, damit `buildAudit` (Task 5) `effectiveQuotas` für `inputSha256` verwenden kann.
  </behavior>
  <action>
  Re-grep `apps/web/src/run/runEngine.ts` und schaue auf die aktuelle Signatur — RESEARCH.md gibt die Datei als 1-57 Zeilen an, kann nach #72/#70-Merge leicht anders sein.

  RED: Tests in `apps/web/tests/unit/seat-allocation-engine-adapter.test.ts`:
    - `applyOverrideToQuotas`-Verhalten in Kombination mit echten Quotas (Smoke).
    - Pre-Flight-Pfad: Override mit ungültiger Begründung → return shape signalisiert error, engine.run wurde NICHT aufgerufen (Spy/Mock auf engine).
    - Pre-Flight-Pass: gültiger Override → engine.run wurde mit transformierten Quotas aufgerufen (assert dass übergebene Quotas die Override-Bounds enthalten).
    - Override null → identisches Verhalten wie heute (Backward-Compat).

  GREEN: Erweitere `runEngine.ts`:
    - Importiere `SeatAllocationOverride`, `applyOverrideToQuotas`, `validateOverride` aus `../quotas/seat-allocation`.
    - Optionaler `override`-Parameter (default null).
    - Pre-Flight-Check zuerst, return-early-error-Pfad verwendet das **bereits existierende** Error-Pattern in runEngine (re-grep, nicht raten).
    - `effectiveQuotas` an engine.run weitergeben.
    - Caller bekommt `effectiveQuotas` zurück (entweder als Teil des Return-Werts oder via Side-Channel — entscheide Minimal-invasive Option nach re-grep).

  REFACTOR: Englische Code-Kommentare. Keine Verdopplung der Validierungs-Logik (alles aus Task 1 wiederverwenden).
  </action>
  <verify>
  <automated>pnpm --filter @sortition/web test -- seat-allocation-engine-adapter</automated>
  </verify>
  <done>
  - `runEngineA` akzeptiert `override?` Parameter ohne Breaking-Change für bestehende Aufrufe.
  - Tests grün: Pre-Flight-Reject, Pre-Flight-Pass, Null-Override-Identität.
  - `pnpm --filter @sortition/web typecheck` grün.
  - `pnpm --filter @sortition/web test` (alle Tests) grün — kein Regression in `run-audit.test.ts` etc.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 4: OverrideEditor-Komponente + SeatAllocationPanel-Wrapper</name>
  <files>
  apps/web/src/quotas/OverrideEditor.tsx (NEW),
  apps/web/src/quotas/SeatAllocationPanel.tsx (NEW),
  apps/web/tests/unit/override-editor.test.tsx (NEW — falls @solidjs/testing-library verfügbar; sonst Smoke-Test mit jsdom)
  </files>
  <behavior>
  Komponenten-Layout (entsprechend RESEARCH.md L548-595):
  - `<SeatAllocationPanel pool quotas seatAllocation onChange>`:
    - Read-only Baseline-Tabelle (alle Achsen, Sitze pro Wert).
    - AxisPicker (Single-Select): "Override aktivieren für: [Achse wählen / keine]".
    - Bei selectedAxis: rendert `<OverrideEditor axis={...} baseline={...} pool={...} panelSize={...} onChange={...}>`.
  - `<OverrideEditor>`:
    - Warning: "Du weichst von der proportionalen Bevölkerungs-Verteilung ab. Diese Entscheidung wird im Audit dokumentiert."
    - 4-Spalten-Tabelle: Wert | im Pool | Baseline | Override (Input) | Diff (mit Vorzeichen, Farbe rot/grün).
    - SumValidator (live): "Σ override = X / panel_size = Y → noch ±N zuzuteilen".
    - Begründungs-Textarea + Live-Counter "n/20 Zeichen — Pflicht-Begründung", min. 20 non-whitespace.
    - Reset-Button "Zurück zur statistischen Baseline" (clear seats + rationale + axis).
    - `onChange(SeatAllocationOverride | null)` wird gefeuert wenn Editor commit-fähig ist (Σ ok + Begründung ≥ 20 chars).
  - **UI-Sprache**: Personenauswahl-konform, NICHT "Bürgerinnenrat-spezifisch". Nach #70-Merge an dortige Patterns angleichen (re-greppen).
  - **Test-IDs** (alle Pflicht für e2e):
    - `seat-allocation-panel`
    - `seat-allocation-baseline`
    - `seat-allocation-axis-picker`
    - `seat-allocation-override-editor`
    - `seat-allocation-override-warning`
    - `seat-allocation-override-table`
    - `override-input-{axis}-{value}` (pro Eingabefeld)
    - `seat-allocation-sum-validator`
    - `seat-allocation-rationale`
    - `seat-allocation-rationale-counter`
    - `seat-allocation-reset`
  </behavior>
  <action>
  Re-grep `apps/web/src/quotas/QuotaEditor.tsx` für Solid.js-Patterns (createSignal, createMemo, Show, For). Übernehme dieselben Tailwind-Klassen für Tabellen-Konsistenz (`tabular-nums`, `status-pill`, etc.).

  Vor Implementation: `pnpm --filter @sortition/web list @solidjs/testing-library` prüfen. Wenn vorhanden → echte Component-Tests. Wenn nicht → Smoke-Test der Pure-Helper-Funktionen (computeDiff, formatSumDelta) und e2e-Spec deckt UI-Verhalten ab.

  Implementation:
  - `OverrideEditor.tsx`: Solid.js-Komponente, Inputs binden an `createSignal<Record<string, number>>`. Rationale separater Signal. `createMemo` für sum-delta und validation-status. `onChange` wird aus `createEffect` gefeuert wenn alle Validierungen ok sind, sonst `null`.
  - `SeatAllocationPanel.tsx`: orchestriert AxisPicker + Baseline-Display + OverrideEditor. Verwaltet `selectedAxis`-Signal lokal.
  - Englische Code-Kommentare, deutsche UI-Strings.
  - Keine Inline-Patches in `QuotaEditor.tsx` (separate Komponenten halten beide Files unter ~250 Zeilen).

  Tests (falls testing-library verfügbar):
  - Counter zeigt korrekt n/20.
  - Reset-Button setzt Override auf null.
  - Sum-Validator zeigt Differenz live.
  - Submit blockiert bei Begründung < 20 chars (kein onChange-Call mit valid override).
  </action>
  <verify>
  <automated>pnpm --filter @sortition/web test -- override-editor</automated>
  </verify>
  <done>
  - `OverrideEditor.tsx` und `SeatAllocationPanel.tsx` existieren.
  - Alle Test-IDs aus behavior-Block vorhanden (manuell verifiziert oder durch e2e-Spec in Task 8).
  - Component-Tests grün (oder Smoke-Tests grün, falls testing-library nicht verfügbar).
  - `pnpm --filter @sortition/web typecheck` grün.
  - `QuotaEditor.tsx` ist UNVERÄNDERT.
  </done>
</task>

<task type="auto">
  <name>Task 5: Audit-Schema-Bump 0.1 → 0.2 + seat_allocation-Feld + buildAudit-Erweiterung</name>
  <files>
  apps/web/src/run/audit.ts (modify),
  apps/web/tests/unit/run-audit.test.ts (modify — add new test cases),
  apps/web/tests/unit/run-audit-sign-verify.test.ts (modify — add tampering tests)
  </files>
  <action>
  Re-greppen: `rg "AUDIT_SCHEMA_VERSION|buildAudit|signAudit" apps/web/src/run/audit.ts`. Aktuelle Schema-Version ist '0.1' (RESEARCH.md L121).

  Schema-Änderung:
  1. `AUDIT_SCHEMA_VERSION = '0.2'`.
  2. Neuer Type `SeatAllocationAudit` in derselben Datei (siehe interfaces-Block oben).
  3. `AuditDoc` bekommt optionales Feld `seat_allocation?: SeatAllocationAudit;` **am Ende** der Interface-Definition (nach den signature-Feldern oder davor — wichtig: in `buildAudit` MUSS die Property in **fester Reihenfolge** initialisiert werden, weil Stage-3-Audit `JSON.stringify` ohne Canonicalisierung verwendet, siehe RESEARCH.md L378-380 + Pitfall 6).
  4. `buildAudit(args)` bekommt neuen Parameter `seatAllocation?: SeatAllocation` (Default undefined). Wenn gesetzt UND `seatAllocation.override !== null`:
     - Berechne `deviation`: pro Wert `delta_seats = override.seats[v] - baseline[axis][v]`, `delta_percent = delta_seats / panel_size`.
     - Setze `doc.seat_allocation = { baseline: seatAllocation.baseline, override: seatAllocation.override, deviation }`.
     - Wenn `seatAllocation` gesetzt aber override null: setze `doc.seat_allocation = { baseline: seatAllocation.baseline, override: null, deviation: null }`.
     - Wenn seatAllocation undefined: kein Feld gesetzt (Backward-Compat-Pfad, schema_version trotzdem 0.2).
  5. **Wichtig für Hash-Stabilität**: `buildAudit` empfängt die **Post-Override-Quotas** (effectiveQuotas aus Task 3) in `args.quotas`. `inputSha256` wird über die effektive LP-Konfig berechnet, nicht über die Original-Pre-Override-Quotas. Das stellt sicher, dass externer Verifier mit identischen `pool + effectiveQuotas` denselben Hash regeneriert (siehe RESEARCH.md Pitfall 4 + L416-418).
  6. **`signAudit` UNVERÄNDERT** — `bodyJson === JSON.stringify(stripSignature(doc))` deckt das neue Feld automatisch ab.

  Test-Erweiterungen in `run-audit.test.ts`:
  - `buildAudit` ohne seatAllocation → `schema_version === '0.2'`, `seat_allocation` undefined.
  - `buildAudit` mit seatAllocation + override → `seat_allocation.baseline/override/deviation` gesetzt, deviation korrekt berechnet.
  - `buildAudit` mit seatAllocation aber override null → seat_allocation gesetzt, override=null, deviation=null.
  - Property-Order-Test: `Object.keys(doc)` Reihenfolge ist deterministisch (definierte Reihenfolge in buildAudit-Implementierung).

  Test-Erweiterungen in `run-audit-sign-verify.test.ts` (Round-Trip + Tampering, Pattern aus L72-84):
  - Signed audit MIT seat_allocation.override → re-verify ok (Round-Trip).
  - Tampering: rationale ändern ohne re-sign → verify fail.
  - Tampering: override.seats[v] ändern ohne re-sign → verify fail.
  - Tampering: schema_version downgrade '0.2' → '0.1' ohne re-sign → verify fail.
  - Backward-Compat: 0.1-Doc (handgeschrieben in Test-Fixture) verifiziert weiterhin ok mit unverändertem signAudit/verify-Pfad.
  </action>
  <verify>
  <automated>pnpm --filter @sortition/web test -- run-audit</automated>
  </verify>
  <done>
  - `AUDIT_SCHEMA_VERSION === '0.2'`.
  - `AuditDoc` hat optionales `seat_allocation?: SeatAllocationAudit`.
  - `buildAudit` akzeptiert optionales `seatAllocation`-Argument.
  - Alle bestehenden Tests in `run-audit.test.ts` und `run-audit-sign-verify.test.ts` bleiben grün.
  - Mindestens 4 neue Tests für seat_allocation + 4 neue Tampering-Tests grün.
  - Commit-Message dokumentiert Schema-Bump explizit: `71: feat(audit): bump schema 0.1 → 0.2, add seat_allocation field`.
  </done>
</task>

<task type="auto">
  <name>Task 6: RunPanel-Integration + State-Hoisting + Override-Badge</name>
  <files>
  apps/web/src/App.tsx (modify),
  apps/web/src/run/RunPanel.tsx (modify)
  </files>
  <action>
  Re-greppen vor Edit: `rg "createSignal|RunPanel|seatAllocation|pool|quotas" apps/web/src/App.tsx`. App.tsx-Zeilen können nach #72/#70 verschoben sein.

  **State-Hoisting** (RESEARCH.md Pitfall 7 + R4):
  - In `App.tsx`: neuer Top-Level Signal `const [seatAllocation, setSeatAllocation] = createSignal<SeatAllocation | null>(null);`.
  - `createEffect(on([pool, quotas], () => setSeatAllocation(null)));` — Override invalidieren wenn Pool oder Quotas-Achsen sich ändern (RESEARCH.md R7).
  - `seatAllocation` und `setSeatAllocation` als Props an `<RunPanel>` durchreichen.

  **RunPanel-Integration**:
  - Über/neben dem QuotaEditor (vor "Engine starten"-Button) `<SeatAllocationPanel pool={pool} quotas={quotas} seatAllocation={seatAllocation} onChange={setSeatAllocation}>` rendern.
  - "Engine starten"-Button disabled wenn:
    - bestehende Quoten-Validierung fail, ODER
    - `seatAllocation.override !== null` UND `validateOverride(pool, panel_size, override).ok === false`.
  - runEngine-Aufruf erweitert: `runEngineA(pool, quotas, params, seatAllocation()?.override ?? null)`.
  - buildAudit-Aufruf erweitert: `buildAudit({ pool, quotas: effectiveQuotas, seed, result, duration_ms, seatAllocation: seatAllocation() ?? undefined })`.
  - Wenn engine.run `infeasible_quotas` UND override aktiv → zusätzliche deutsche Fehlermeldung im Result-Bereich: "Override und andere Bounds inkompatibel — bitte andere Achsen-Bounds prüfen oder Override-Werte anpassen." mit Test-ID `override-infeasibility-hint`.
  - **Override-Badge** im Result-Block: bei `seatAllocation()?.override` rendert ein `<Badge>` "Manuelle Sitz-Allokation aktiv — siehe Audit-Export" mit Test-ID `seat-allocation-active-badge`. Tailwind-Klasse `status-pill status-pill-warn` (oder vergleichbar — re-greppen wie bestehende Pills aussehen).
  - **Quality-Metric-Anzeige**: `seatAllocationDrift(...)` aufrufen wenn override aktiv, ergebnis als Text in Result-Block einblenden: "5 von 30 Sitzen umgeschichtet (17 %), maximaler Eingriff: +3 Sitze für Wert <50". Test-ID `seat-allocation-drift-display`.
  </action>
  <verify>
  <automated>pnpm --filter @sortition/web test && pnpm --filter @sortition/web typecheck</automated>
  </verify>
  <done>
  - `App.tsx` hostet `seatAllocation`-Signal mit Auto-Invalidation bei Pool/Quotas-Änderung.
  - `RunPanel.tsx` rendert `<SeatAllocationPanel>` über dem Run-Button.
  - Engine-Lauf verwendet effective Quotas, Audit speichert seatAllocation.
  - Override-Badge `seat-allocation-active-badge` sichtbar bei aktivem Override.
  - Infeasibility-Hint `override-infeasibility-hint` sichtbar wenn engine `infeasible_quotas` returnt UND override aktiv.
  - Drift-Display `seat-allocation-drift-display` zeigt L1 + Max bei aktivem Override.
  - Alle bestehenden Tests grün, typecheck grün.
  </done>
</task>

<task type="auto">
  <name>Task 7: In-App-Doku + CLAUDE.md-Update</name>
  <files>
  apps/web/src/docs/Override.tsx (NEW — oder Sektion in existierendem Doku-File falls vorhanden, re-grep `apps/web/src/docs/`),
  CLAUDE.md (modify — Section "Aktueller Stand" oder Section "Solver-Entscheidung"-Nachbar)
  </files>
  <action>
  Re-greppen: `ls apps/web/src/docs/` und `rg "Algorithmus|Engine A" apps/web/src/docs/` — schauen ob bereits ein Override-relevanter Doku-Eintrag existiert. Falls ja, dort Sektion ergänzen. Falls nicht, neuen `Override.tsx` erstellen und in das Doku-Routing einbinden (Pattern aus existierenden Docs übernehmen).

  In-App-Doku-Inhalt (Deutsch, Markdown-äquivalent in Solid-Komponente):
  - **Wann Override sinnvoll**: Beispiel "min 50% unter 50" wenn Bevölkerungsverteilung nur 40% liefert. Politische Vorgaben für Geschlechter-Parität, geografische Repräsentation, Sprach-Gruppen.
  - **Wann Override problematisch**: verzerrt Repräsentativität — der Punkt von stratifizierter Auswahl ist gerade die proportionale Pool-Treue. Override-Drift sollte begründet und proportional gering bleiben.
  - **Wie im Audit erscheint**: Schema 0.2 mit `seat_allocation`-Block (baseline + override + rationale + timestamp + deviation), gemeinsam signiert mit Ed25519/ECDSA. Externer Verifier akzeptiert sowohl 0.1 (kein Override-Feld) als auch 0.2 (mit oder ohne Override).
  - **Mechanik**: 1-D Achsen-Override (eine Achse gleichzeitig). Pro Wert ersetzt Override die min/max-Bounds (`min == max == override_value`). Andere Achsen werden vom Solver auto-verteilt. Begründung min. 20 Zeichen non-whitespace, Pflicht.
  - **Use-Case-Hub** (#70) referenzieren falls vorhanden.

  **CLAUDE.md-Update** (am Ende der Section "Aktueller Stand" oder als neue Section "Tool-Primitive"):
  ```
  ### Tool-Primitive (Stand 2026-05-04)
  Generische Operationen, die für alle Use-Cases (BR, Landeskonferenz, Parteitag) gleich funktionieren:
  - **Auswahl**: statistische Stratifikation + Maximin (Stage 1 + Stage 3).
  - **Override** (#71): manuelle 1-D Achsen-Sitz-Allokation, ersetzt Bounds, Pflicht-Begründung ≥20 Zeichen, voll im Audit-Manifest signiert (Schema 0.2).
  - **Nachwahl** (#48): Drop-out-Replacement aus Reserve.
  ```
  </action>
  <verify>
  <automated>pnpm --filter @sortition/web build</automated>
  </verify>
  <done>
  - Doku-Eintrag (entweder neue `Override.tsx` oder Sektion in existierendem File) existiert und ist im Doku-Routing erreichbar.
  - `CLAUDE.md` enthält Tool-Primitive-Section mit Override-Beschreibung.
  - Build grün.
  </done>
</task>

<task type="auto">
  <name>Task 8: Playwright e2e — vollständiger Override-Flow</name>
  <files>
  apps/web/tests/e2e/seat-allocation-override.spec.ts (NEW)
  </files>
  <action>
  Re-greppen: `ls apps/web/tests/e2e/` und mind. ein bestehendes Spec lesen (z.B. `stage3.spec.ts` oder ähnlich) für Setup-Pattern (Test-Fixture-Pool laden, page-objects, Test-IDs).

  Spec deckt diesen Flow ab:
  1. App laden, Stage-3 öffnen, Pool + Quotas setzen (Test-Fixture).
  2. `seat-allocation-axis-picker` → Achse "age_group" wählen.
  3. `seat-allocation-override-editor` ist sichtbar.
  4. `override-input-age_group-<50` setzen, andere Werte editieren bis Σ = panel_size.
  5. Begründung tippen — bei < 20 chars: `seat-allocation-rationale-counter` zeigt rote Warnung, Run-Button disabled.
  6. Begründung auf ≥ 20 chars erweitern → Run-Button aktiv.
  7. Run ausführen, `seat-allocation-active-badge` ist im Result sichtbar, `seat-allocation-drift-display` zeigt L1 + Max.
  8. `run-export-audit` klicken, JSON-Inhalt parsen (Playwright `download`-Event), assert:
     - `schema_version === '0.2'`.
     - `seat_allocation.override.axis === 'age_group'`.
     - `seat_allocation.override.rationale.length >= 20`.
     - `seat_allocation.deviation` korrekt für jede Achsen-Wert.
     - `signature` und `public_key` gesetzt.
  9. **Re-Verify-Pfad**: Audit-JSON via `scripts/verify_audit.py` (oder JS-side Verify-Helper) ausführen → exit 0.
  10. **Tampering-Pfad**: rationale im JSON manuell ändern, re-verify → exit non-zero (oder JS-side fail).
  11. **Reset-Pfad**: zurück in Editor, `seat-allocation-reset` klicken → Override-Editor verschwindet, Run-Button verwendet wieder Baseline-Quotas.

  Verify-Schritt: bevorzugt JS-side via `verify`-Helper aus `audit.ts`. Falls Python-Verifier nötig: subprocess via Playwright-Test mit `child_process`.

  Test-IDs alle aus Task 4 + 6 verwenden.
  </action>
  <verify>
  <automated>pnpm --filter @sortition/web exec playwright test seat-allocation-override</automated>
  </verify>
  <done>
  - `seat-allocation-override.spec.ts` existiert, deckt 11 Schritte des Flows ab.
  - Spec grün in Chromium UND Firefox (oder mind. Chromium falls Firefox-Setup fehlt — entscheide nach Repo-Konfig).
  - Round-Trip-Verify und Tampering-Detection beide assertet.
  </done>
</task>

<task type="auto">
  <name>Task 9: Final integration check + ISSUE.md status update</name>
  <files>
  .issues/71-editable-group-seat-allocation/ISSUE.md (modify frontmatter only)
  </files>
  <action>
  Final Quality-Gates ausführen (alle müssen grün sein):
  1. `pnpm --filter @sortition/web typecheck`
  2. `pnpm --filter @sortition/web test`
  3. `pnpm --filter @sortition/metrics test` (falls separates Test-Setup)
  4. `pnpm --filter @sortition/web exec playwright test`
  5. `pnpm --filter @sortition/web build`
  6. Optional: `python3 scripts/verify_audit.py <fixture>` mit bestehender 0.1-Audit-Fixture → noch grün (Backward-Compat).

  Wenn alle gates grün:
  - In `.issues/71-editable-group-seat-allocation/ISSUE.md` frontmatter: `status: open` → `status: done`.
  - Final commit: `71: docs(issues): mark issue done`.

  Bei Test-Failure: NICHT status updaten. Stattdessen Failure analysieren, fixen, neuen Commit, gates erneut laufen lassen.
  </action>
  <verify>
  <automated>pnpm --filter @sortition/web typecheck && pnpm --filter @sortition/web test && pnpm --filter @sortition/web build && pnpm --filter @sortition/web exec playwright test seat-allocation-override</automated>
  </verify>
  <done>
  - Alle 5 Quality-Gates grün.
  - ISSUE.md frontmatter `status: done`.
  - Final commit gepusht (Branch).
  </done>
</task>

</tasks>

<verification>
Nach allen Tasks final:
- `pnpm --filter @sortition/web typecheck` grün
- `pnpm --filter @sortition/web test` grün (alle Vitest-Specs inkl. neue)
- `pnpm --filter @sortition/metrics test` grün (falls separates Test-Setup)
- `pnpm --filter @sortition/web exec playwright test` grün (e2e)
- `pnpm --filter @sortition/web build` grün
- Backward-Compat-Smoke: existierende 0.1-Audit-Fixtures (falls vorhanden) verifizieren weiterhin sauber via `scripts/verify_audit.py`.
- Manueller Smoke-Check: `apps/web/src/quotas/QuotaEditor.tsx` und `packages/engine-a/src/feasible-committee.ts` UNVERÄNDERT (`git diff --stat` zeigt sie nicht).
</verification>

<success_criteria>
Maps 1:1 to ISSUE.md acceptance criteria:

**Daten-Modell**
- [x] Neue `SeatAllocation`-Struktur mit `baseline`, `override` (mit `axis`, `seats`, `rationale`, `timestamp_iso`) — Task 1.
- [x] Validierung Σ override == panel_size, Werte ≥ 0, Begründung non-empty + ≥ 20 chars non-whitespace — Task 1 (`validateOverride`).
- [x] Backward-Compat bestehende QuotaConfig: SeatAllocation lebt SEPARAT von QuotaConfig, alte JSON-Quotas bleiben lesbar — Task 1 (Architektur-Entscheidung).

**UI**
- [x] Vier-Spalten-Anzeige (Wert, Pool, Baseline, Override, Diff mit Vorzeichen + Farbe) — Task 4.
- [x] Override-aktivieren-Toggle (AxisPicker) mit Warn-Hinweis — Task 4.
- [x] Pflicht-Textfeld Begründung mit Live-Counter, Speichern blockiert solange < 20 chars — Task 4 + 6.
- [x] Constraint-Visualisierung (SumValidator live) — Task 4.
- [x] Reset-Button "Zurück zur statistischen Baseline" — Task 4.
- [x] Sichtbarkeit in Stage 3 + Result-View (Badge) — Task 6.

**Audit-Trail**
- [x] Manifest enthält baseline, override, rationale, timestamp, deviation — Task 5.
- [x] Signatur deckt diese Felder ab (kein nachträgliches Editieren ohne re-sign) — Task 5 (signAudit unverändert + Tampering-Tests).
- [x] CSV/JSON-Export zeigt Override prominent — Task 6 (Badge im Result vor Export-Buttons) + Task 5 (Audit-JSON enthält volles seat_allocation).
- [x] Visuelle Indikation bei aktivem Override — Task 6 (`seat-allocation-active-badge`). NB: Vollwertiger Stage-3-AuditFooter ist bewusst out-of-scope (RESEARCH.md R5) — Badge erfüllt AC.

**Algorithmus / Engine**
- [x] Engine A akzeptiert override als harte Constraint — Task 3 (`applyOverrideToQuotas`, kein Engine-Code-Change nötig per RESEARCH.md L42).
- [x] Pre-Flight-Validierung statt LP-Infeasible — Task 3 (Pool-Capacity-Check) + Task 6 (Cross-Bounds-Infeasibility-Hint).
- [x] Quality-Metric `seat_allocation_drift` — Task 2 + Task 6 (Display).

**Doku**
- [x] In-App-Doku-Eintrag — Task 7.
- [x] CLAUDE.md aktualisiert — Task 7.

**Tests**
- [x] Unit-Tests `quotas/model.test.ts`-äquivalent: `seat-allocation-model.test.ts` — Task 1.
- [x] Engine-A-Tests: Override-Constraints respektiert (via `applyOverrideToQuotas` + Engine-Smoke) — Task 3.
- [x] Playwright e2e: vollständiger Flow Toggle → Edit → Begründung → Sign → Export → Re-Verify — Task 8.
- [x] Audit-Verifikations-Test: sauberes Override-Manifest verifiziert, manipuliert failt — Task 5 (Tampering-Tests) + Task 8 (e2e).
- [x] Test: Override speichern ohne Begründung → blockiert — Task 4 (component) + Task 8 (e2e).

**Locked Decisions aus CONTEXT.md**
- [x] 1-D Achsen-Override, kein N-D Cell-Override — Task 1 (Datenmodell hat axis: string singular) + Task 4 (AxisPicker single-select).
- [x] Override ersetzt Bounds — Task 1 (`applyOverrideToQuotas` setzt min == max == n) + Task 4 (Bounds-Editor wird für overridete Achse implizit ignoriert).
- [x] Begründungs-Pflicht ≥ 20 Zeichen non-whitespace — Task 1 (`nonWhitespaceLength`) + Task 4 (Counter + Block) + Task 5 (Validierung im Audit).
- [x] Override greift NUR in Stage 3 — Task 6 (Integration in RunPanel = Stage 3, kein Eingriff in Stage1Panel).
- [x] Generisch für alle Use Cases — Personenauswahl-konforme UI-Sprache (Task 4) + In-App-Doku referenziert Use-Case-Hub (Task 7) + CLAUDE.md spricht von "Tool-Primitive für alle Use-Cases" (Task 7).

**Out-of-Scope einhalten**
- [x] Kein Engine-A-Code-Change.
- [x] Kein Stage-1-Override.
- [x] Kein N-D Cell-Override.
- [x] Kein Override-History/Undo.
- [x] Kein Multi-User-Approval.
- [x] Kein Stage-3-AuditFooter (Badge im Result reicht für AC).
</success_criteria>
