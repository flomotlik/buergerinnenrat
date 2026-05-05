# Research: Manuell editierbare Gruppen-Sitz-Allokation (#71)

**Researched:** 2026-05-04
**Issue:** 71-editable-group-seat-allocation
**Confidence:** HIGH (codebase-only research; everything verified by file:line)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
1. **Scope**: nur Stage-3-Override für die bestehende Pipeline. Stage-1-Override und Parteitag-Workflow sind out-of-scope (#73 ist als superseded geschlossen).
2. **Override-Granularität**: 1-D Achsen-Override (pro Achse, nicht pro Stratum-Cell). N-D Cell-Override explizit out-of-scope.
3. **Override-Semantik**: Override ersetzt Bounds — pro Wert auf der overrideten Achse `min == max == override_value`. Bounds-Editor wird für die overridete Achse ausgeblendet.
4. **Override = harte LP-Constraint**, kein soft-prefer.
5. **Begründungs-Pflicht**: hart, min. **20 Zeichen non-whitespace**. Speichern + Sign blockiert solange leer/zu kurz.
6. **Audit-Manifest** erweitert um `seat_allocation.{baseline, override, override_rationale, override_timestamp, deviation}` — alle gemeinsam signiert (kein nachträgliches Editieren ohne neue Signatur).
7. **#71 ist generisch für alle Use Cases** (BR, Landeskonferenz, Parteitag) — kein BR-spezifisches Feature.

### Claude's Discretion
- UI-Pattern (Tab vs. Akkordeon vs. Modal) — Empfehlung folgt unten.
- Diff-Visualisierung (Tabelle vs. Bar-Chart vs. Slider) — Empfehlung folgt.
- Auto-Verteilung der nicht-overrideten Achsen — Solver-Verhalten dokumentieren.
- Optional: Dropdown-Hint mit Begründungs-Vorschlägen *zusätzlich* zum Free-Text.
- Reset-Button-Position und -Wording.
- Quality-Metric `seat_allocation_drift` — Berechnungs-Formel (L1 vs. L2 vs. max-deviation).

### Deferred (OUT OF SCOPE)
- Parteitag-Workflow / sequenzielle Auswahl (war fälschlich als #73 vorgeschlagen, korrigiert).
- Stage-1-Override (Versand-Sample-Verzerrung).
- N-D Cell-Override.
- Auto-Justierung (Optimization-as-a-service: "wieviel Sitze um 50% unter 50 zu erreichen").
- Override-History / Undo-Stack.
- Multi-User-Approval-Chain.
</user_constraints>

---

## Summary

Override ist im aktuellen Codepfad ein **vergleichsweise lokaler Eingriff**, weil die Engine-A-Constraints bereits beliebige `{min, max}`-Bounds pro Wert akzeptieren (`packages/engine-a/src/feasible-committee.ts:84-110`). Ein 1-D-Override wird auf LP-Ebene durch das Setzen von `min == max == override_value` modelliert — kein neuer Constraint-Typ, kein neuer LP-Pfad, kein Re-Tuning des Maximin-Solvers.

Der größte Aufwand liegt **in der UI-Schicht** (`QuotaEditor.tsx` muss um eine Override-Sektion pro Achse erweitert werden) und in der **Audit-Schema-Erweiterung** (`AuditDoc` in `apps/web/src/run/audit.ts:3-19` ist bei `schema_version: '0.1'` und braucht einen Bump auf `'0.2'`, plus zusätzliche Felder + Signatur-Coverage). Die Stage-3-Audit-Logik ist eigenständig vom Stage-1-Audit (`packages/core/src/stage1/audit-builder.ts:81`, schema 0.4) — wir müssen *nur* den Stage-3-Pfad anfassen, nicht beide.

**Primary recommendation:** Datenmodell separat von `QuotaConfig` halten (neues `SeatAllocation`-Objekt, das in `RunPanel`-Props/-State neben `Quotas` lebt), `QuotaEditor` durch eine neue `OverrideEditor.tsx`-Komponente ergänzen (nicht inline patchen), Engine-A unverändert lassen (Override wird vor dem `runEngineA`-Call in die `Quotas` einkomponiert), Stage-3-Audit-Schema auf 0.2 bumpen, Verifier (`scripts/verify_audit.py`) backwards-kompatibel erweitern.

---

## Codebase Analysis

### Relevant Files
| Datei | Zweck | Letzte signifikante Änderung | Relevanz |
|------|------|------|------|
| `apps/web/src/quotas/model.ts` | `QuotaConfig` + Validatoren | stabil | HIGH — neue Felder hier oder in eigenem Modul |
| `apps/web/src/quotas/QuotaEditor.tsx` | UI für Bounds (min/max-Inputs) | stabil | HIGH — wird durch `OverrideEditor` ergänzt |
| `apps/web/src/run/audit.ts` | Stage-3 Audit-Doc + Sign + Hash | stabil; schema `0.1` | HIGH — Schema-Bump + Felder + Signatur |
| `apps/web/src/run/runEngine.ts` | Bridge App → Engine A | stabil | MEDIUM — komponiert Override in Quotas vor `engine.run()` |
| `apps/web/src/run/RunPanel.tsx` | Stage-3-Lauf-UI | stabil | HIGH — Override-Section + Override-Indicator + buildAudit-Call |
| `apps/web/src/App.tsx` | Routing + State | stabil | LOW — kein neuer Route nötig (Override in Stage-3-Page inline) |
| `packages/engine-a/src/feasible-committee.ts` | LP-Constraints | stabil | HIGH — Constraint-Mapping verstehen, **nicht ändern** |
| `packages/engine-a/src/engine.ts` | Maximin Engine | stabil | LOW — keine Änderung wenn Override über Quotas-Komposition läuft |
| `packages/engine-contract/src/types.ts` | Shared Schemas (Zod) | stabil | MEDIUM — `RunResult.quota_fulfillment` evtl. erweitern für Override-Diff |
| `packages/metrics/src/index.ts` | Quality Metrics | stabil | MEDIUM — `seat_allocation_drift` ergänzen |
| `apps/web/src/stage1/AuditFooter.tsx` | Footer-Pattern für Stage-1 | stabil | LOW — als Referenz für Stage-3-Audit-Footer (Override-Badge) |
| `scripts/verify_audit.py` | Externer Verifier | stabil | HIGH — Schema-bewusst machen |

### Interfaces

<interfaces>
// From apps/web/src/quotas/model.ts
export interface QuotaBound { min: number; max: number; }
export interface CategoryQuota { column: string; bounds: Record<string, QuotaBound>; }
export interface QuotaConfig {
  panel_size: number;
  categories: CategoryQuota[];
}
export interface CategoryValidation {
  column: string;
  ok: boolean;
  errors: string[];
  warnings: string[];
}
export interface QuotaValidation {
  ok: boolean;
  panel_errors: string[];
  per_category: CategoryValidation[];
}
export function uniqueValues(rows: Record<string, string>[], column: string): string[]
export function emptyCategory(column: string, values: readonly string[], panelSize: number): CategoryQuota
export function valueCounts(rows: Record<string, string>[], column: string): Record<string, number>
export function validateQuotas(rows: Record<string, string>[], config: QuotaConfig): QuotaValidation
export function quotaConfigToJson(config: QuotaConfig): string
export function quotaConfigFromJson(text: string): QuotaConfig

// From packages/engine-contract/src/types.ts (Zod schemas → inferred TS types)
export type Person = { person_id: string } & Record<string, string>;
export type Pool = { id: string; people: Person[] };
export type QuotaBound = { min: number; max: number }; // .refine(max >= min)
export type CategoryQuota = { column: string; bounds: Record<string, QuotaBound> };
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
export interface SortitionEngine {
  readonly meta: Pick<EngineMeta, 'engine_id' | 'engine_version'>;
  run(args: { pool: Pool; quotas: Quotas; params: RunParams }): AsyncIterable<EngineEvent>;
}

// From apps/web/src/run/audit.ts — schema 0.1
export const AUDIT_SCHEMA_VERSION = '0.1'; // ← bump to '0.2' for #71
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
  // Filled by signAudit():
  public_key?: string;
  signature?: string;
  signature_algo?: 'Ed25519' | 'ECDSA-P256-SHA256';
}
export async function inputSha256(pool: Pool, quotas: Quotas): Promise<string>
export async function buildAudit(args: { pool, quotas, seed, result, duration_ms }): Promise<AuditDoc>
export interface SignedAudit { doc: AuditDoc; bodyJson: string; }
export async function signAudit(doc: AuditDoc): Promise<SignedAudit>
// canonicalQuotas: sortiert categories by column, sortiert bound-keys, fixed shape
// signAudit: stripSignature → JSON.stringify (NICHT canonicalStage1Json) → sign
//   bodyJson === JSON.stringify(stripSignature(doc))

// From packages/engine-a/src/feasible-committee.ts — LP-Constraint-Pfad
export interface FeasibleCommitteeArgs {
  pool: Pool; quotas: Quotas;
  objective: Record<string, number>;
  seed?: number; timeLimitSec?: number;
  forceIn?: Iterable<string>; forceOut?: Iterable<string>;
}
// Constraints emitted (lines 56-110):
//   panel_size:   Σ x_i = quotas.panel_size
//   force_in_*:   x_i = 1
//   force_out_*:  x_i = 0
//   {col}_{val}_min:  Σ x_i (i ∈ group) >= b.min
//   {col}_{val}_max:  Σ x_i (i ∈ group) <= b.max
// → Override per Achse = pro Wert: setzen von b.min = b.max = override_value
//   ist exakt was die LP-Constraints bereits unterstützen.

// From apps/web/src/run/RunPanel.tsx — relevante Test-IDs
// data-testid="run-panel"           — outer container
// data-testid="run-seed"            — seed input
// data-testid="run-start"           — start button
// data-testid="run-progress"        — progress text
// data-testid="run-result"          — result block
// data-testid="run-export-csv"      — CSV export
// data-testid="run-export-audit"    — audit JSON export

// From apps/web/src/quotas/QuotaEditor.tsx — relevante Test-IDs
// data-testid="quota-editor"
// data-testid="quota-panel-size"
// data-testid="quota-add-category"
// data-testid={`quota-cat-${cat.column}`}
// data-testid={`quota-${cat.column}-${val}-min`}
// data-testid={`quota-${cat.column}-${val}-max`}
// data-testid="quota-status"

// From scripts/verify_audit.py — REQUIRED_FIELDS gates schema validation
REQUIRED_FIELDS = (schema_version, engine, algorithm, seed, input_sha256,
                   panel_size, pool_size, selected, marginals,
                   quota_fulfillment, timing, public_key, signature)
// Verifier strips public_key/signature/signature_algo, signs raw JSON.stringify
// of remainder (matches signAudit behavior). For schema 0.2, REQUIRED_FIELDS
// can stay identical — seat_allocation is OPTIONAL (absent = no override + no
// baseline emitted, backward-compat with 0.1).
</interfaces>

### Reusable Components
- **Engine-A LP-Constraint-Pfad** (`feasible-committee.ts:84-110`) — bereits exakt das richtige Pattern. Override = Bounds-Manipulation, kein neuer LP-Code.
- **`signAudit` + `verify_audit.py`** — Sign-/Verify-Logik bleibt unverändert. Nur die `bodyJson`-Form ändert sich, weil das Doc neue Felder enthält.
- **`canonicalQuotas` in `apps/web/src/run/audit.ts:36-51`** — falls `seat_allocation` *innerhalb* der Quoten kanonisiert werden soll, hier erweitern. Empfehlung: `seat_allocation` als **Top-Level-Feld** im AuditDoc halten, NICHT in Quotas einbacken — das vermeidet `input_sha256`-Drift und macht Migrations-Pfad klarer.
- **`AuditFooter.tsx` (Stage-1)** — strukturelles Vorbild für ein Stage-3-Audit-Footer-Update (Badge "Manuelle Sitz-Allokation aktiv"). Stage-3 hat **noch keinen** sichtbaren Audit-Footer (`RunPanel.tsx:155-282` rendert nur Tabellen + Buttons), das könnte als Sub-Task behandelt werden oder Teil dieses Issues sein.
- **`emptyCategory(col, values, panelSize)`** — Pattern für Default-Werte; analog `defaultBaselineSeats(col, valueCounts, panelSize)` für proportionale Berechnung.

### Potential Conflicts
- **Stage-1 vs. Stage-3 Audit-Schemata sind getrennt versioniert** — Stage-1 ist bei `schema_version: '0.4'` (`packages/core/src/stage1/audit-builder.ts:81`), Stage-3 bei `'0.1'` (`apps/web/src/run/audit.ts:21`). Verwechslung der beiden vermeiden, der Verifier (`scripts/verify_audit.py`) verifiziert nur Stage-3-Audits.
- **`canonicalQuotas` ändert hash bei jedem neuen Bounds-Schema** — wenn Override `min == max == v` setzt, ändert sich `input_sha256` auch ohne separates `seat_allocation`-Feld. Das ist konsistent (gleiche Quoten = gleicher Hash), aber heißt: Audit ohne Override kann nicht mit Audit mit Override verglichen werden, selbst wenn alle anderen Daten gleich sind. Das ist gewollt.
- **#70 (Rebrand)** wird in `Stage1Panel.tsx` UI-Copy refactorieren und einen Use-Case-Hub einführen. Override muss dort dokumentiert werden — Cross-Reference in #70-Doku-Hub. Da #70 + #71 unterschiedliche Files berühren (Stage1Panel vs. RunPanel/QuotaEditor), Merge-Konflikt unwahrscheinlich.
- **#72 (Excel)** ändert `apps/web/src/csv/` → `apps/web/src/import/`. Override touchet diesen Pfad nicht — orthogonal.

### Code Patterns in Use
- **Solid.js mit `createSignal` + `createMemo`** für reaktiven State — Override-Editor folgt diesem Pattern.
- **`data-testid`** für jeden interaktiven Knoten — Pflicht für Playwright-Specs.
- **Validation-Ergebnis als strukturiertes Objekt** (`QuotaValidation`) statt Throw — Override-Validation soll dasselbe Schema verwenden.
- **Kommentare auf Englisch im Code, UI-Copy auf Deutsch** (laut CLAUDE.md).
- **JSON-Export pro Sub-Modul** (Quoten-JSON, Audit-JSON) — Override-Konfig sollte als Teil der Quoten-JSON oder Audit-JSON wandern, nicht als eigene Datei.

---

## Standard Stack

| Library | Version | Zweck | Warum Standard | Confidence |
|---------|---------|-------|----------------|------------|
| Solid.js | bestehend | UI-Komponenten | bereits in Quotas/RunPanel etabliert | HIGH |
| Tailwind v3 | bestehend | Styling | bereits projektweit | HIGH |
| Vitest | bestehend | Unit-Tests | bereits für quotas + audit verwendet | HIGH |
| Playwright | bestehend | e2e | bereits für Stage-1/Stage-3-Flows | HIGH |
| Web Crypto API (`crypto.subtle`) | Browser-nativ | SHA-256, Ed25519, ECDSA-P256 | bereits eingesetzt; keine Library nötig | HIGH |

**Nichts Neues** zu lernen oder zu installieren. Override ist ein reines Erweiterungs-Issue im bestehenden Stack.

### Alternatives Considered
| Anstatt | Möglich wäre | Tradeoff |
|---------|--------------|----------|
| Override in `QuotaConfig` einbauen | Separates `SeatAllocation`-Objekt neben `QuotaConfig` | **Empfehlung: separates Objekt.** Hält `QuotaConfig` minimal, vermeidet Migration-Pflicht für JSON-Export von Quoten, klare Trennung "deklarative Bounds" vs. "manuelle Override-Operation". |
| Override-Werte als Patch zur LP-Quota komponieren (zur Laufzeit) | Override permanent in Quotas einbacken | **Empfehlung: zur Laufzeit komponieren.** Die canonical Form von Quotas bleibt unverändert (gleiche Hash-Form), Override wird als separates Audit-Feld festgehalten. Falls User Override entfernt, sind Quoten unverändert. |
| Stage-3-Audit auf Schema 0.2 bumpen | Schema 0.1 unverändert lassen, Override als optionaler Block | **Empfehlung: Bump auf 0.2.** Jede Änderung am Schema-Set sollte versioniert werden — auch wenn das neue Feld optional ist. Verifier kann beide Versionen lesen. |
| Bounds-Editor-Inputs disablen wenn Override aktiv | Bounds-Editor komplett ausblenden | **Empfehlung: Sektion ausblenden mit Hinweis-Text.** "Override aktiv für diese Achse — Bounds werden ignoriert. Override-Editor unten." |

---

## Don't Hand-Roll

| Problem | Nicht selbst bauen | Stattdessen | Warum |
|---------|---------------------|-------------|-------|
| Hash-/Signatur-Logik | Eigenen SHA/Ed25519-Code | `crypto.subtle.digest` / `crypto.subtle.sign` (bereits in `audit.ts`) | NIST-approved, kein Drift |
| LP-Constraint-Generation | Eigene Math-Library | `feasible-committee.ts` mit `b.min = b.max = override_value` | LP-Pfad ist getestet, kein Tuning nötig |
| JSON-Round-Trip-Validierung | Manuelle Type-Guards | Bestehender `quotaConfigFromJson` als Pattern (für `seatAllocationFromJson`) | Konsistent mit existierendem Code |
| State-Management für Override-UI | Externe Bibliothek (Zustand, Redux) | Solid.js `createSignal`/`createMemo` | Konsistent mit Quotas/RunPanel |
| Begründungs-Validierung | Komplexer Validator | `text.replace(/\s+/g, '').length >= 20` | 20-Zeichen-Regel ist hart, simpel implementierbar |
| Diff-Visualisierung | Charting-Library | Reine Tailwind-CSS-Tabelle mit Vorzeichen + Farbe | passt zu bestehendem Design-System |

---

## Architecture Patterns

### Recommended Approach

**1. Datenmodell — separates `SeatAllocation` neben `QuotaConfig`** (in `apps/web/src/quotas/model.ts`):

```ts
// New types in apps/web/src/quotas/model.ts

/** Per-axis seat allocation: which axis is overridden, what values, and why. */
export interface SeatAllocationOverride {
  /** Axis (CSV column) being overridden. Exactly one axis per override at MVP. */
  axis: string;
  /** Per-value seat counts. Σ values == panel_size. */
  seats: Record<string, number>;
  /** German free-text rationale (≥ 20 non-whitespace chars). */
  rationale: string;
  /** ISO 8601 UTC; set at the moment the override was committed. */
  timestamp_iso: string;
}

/** Composite: baseline (always derivable) + optional override (user-set). */
export interface SeatAllocation {
  /** Proportional baseline derived from pool counts; Σ == panel_size. */
  baseline: Record<string, Record<string, number>>; // axis → value → seats
  /** Single override (1-D, MVP scope). null = no override active. */
  override: SeatAllocationOverride | null;
}

/** Pure: compute baseline by Hamilton/largest-remainder per axis. */
export function computeBaseline(
  rows: Record<string, string>[],
  panelSize: number,
  axes: string[],
): SeatAllocation['baseline']

/** Validate an override against pool + panel + 20-char rule. */
export interface OverrideValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
}
export function validateOverride(
  rows: Record<string, string>[],
  panelSize: number,
  override: SeatAllocationOverride,
): OverrideValidation
```

Begründung für getrenntes Objekt:
- `QuotaConfig` (mit `panel_size` + `categories[]` + `bounds`) bleibt schlank und JSON-Round-Trip-kompatibel.
- Override ist eine *Operation* auf dem Auswahl-Workflow, keine *Konfiguration*. Es lebt in Stage-3-State, nicht in Pool-Quoten.
- Backward-compat trivial: alte gespeicherte Quoten-JSON haben kein `seat_allocation`-Feld → wird beim Laden mit `{ baseline: computed, override: null }` initialisiert.

**2. Override → Engine-A — Komposition zur Laufzeit** (in `apps/web/src/run/runEngine.ts` oder neuer Helper):

```ts
// Pure helper: compose override into engine quotas right before engine.run().
export function applyOverrideToQuotas(
  quotas: Quotas,
  override: SeatAllocationOverride | null,
): Quotas {
  if (!override) return quotas;
  return {
    ...quotas,
    categories: quotas.categories.map((cat) =>
      cat.column !== override.axis
        ? cat
        : {
            column: cat.column,
            bounds: Object.fromEntries(
              Object.entries(override.seats).map(([val, n]) => [val, { min: n, max: n }]),
            ),
          },
    ),
  };
}
```

Engine-A bleibt unverändert. Der LP setzt automatisch `Σ x_i = n` und `Σ x_i ≤ n` für die Override-Werte → LP-äquivalent zu `x_i = n` exakt.

**3. UI — separate `OverrideEditor.tsx`-Komponente** (nicht inline in QuotaEditor):

```
RunPanel (apps/web/src/run/RunPanel.tsx)
├── Seed + Run-Button (existing)
├── (NEU) <SeatAllocationPanel pool={...} quotas={...} onChange={setSeatAllocation} />
│        ├── <BaselineSummary baseline={...} />        — read-only Tabelle
│        ├── <AxisPicker axes={candidateAxes} />       — Dropdown (max 1 aktiv)
│        ├── <Show when={selectedAxis}>
│        │     <OverrideEditor axis={...} baseline={...} onChange={...} />
│        │     ├── 3-Spalten-Tabelle: Baseline | Override | Diff
│        │     ├── Σ-Validation Warning (live)
│        │     ├── Begründungs-Textarea + Counter (n/20)
│        │     ├── Reset-Button "Zurück zur Baseline"
│        │     └── Override-Toggle (aktiviert/deaktiviert die ganze Sektion)
│        │   </Show>
└── Run-Result + Export-Buttons (existing, mit Override-Indicator-Badge)
```

**Sichtbarkeit:** Override-Status muss im Result + Export-Footer sichtbar sein (Badge). Empfehlung: zusätzlicher Banner über `<RunPanel>`-Ergebnis, wenn Override aktiv: *"Manuelle Sitz-Allokation aktiv — siehe Begründung"*.

**4. Audit — Schema-Bump auf 0.2 + neues optionales Top-Level-Feld**:

```ts
// apps/web/src/run/audit.ts
export const AUDIT_SCHEMA_VERSION = '0.2'; // bumped from '0.1'

export interface SeatAllocationAudit {
  baseline: Record<string, Record<string, number>>;
  override: {
    axis: string;
    seats: Record<string, number>;
    rationale: string;
    timestamp_iso: string;
  } | null;
  /** Pre-computed for verifier convenience; redundant with override - baseline. */
  deviation: Record<string, { delta_seats: number; delta_percent: number }> | null;
}

export interface AuditDoc {
  // ...existing fields...
  schema_version: string; // '0.2' for new, but verifier accepts '0.1' too
  // NEW (optional — absent = no seat-allocation tracking):
  seat_allocation?: SeatAllocationAudit;
}
```

**Backward-compat-Strategie:**
- `verify_audit.py` REQUIRED_FIELDS bleibt unverändert (Override ist optional).
- `signAudit` bleibt unverändert — `bodyJson === JSON.stringify(stripSignature(doc))` deckt das neue Feld automatisch ab, weil `JSON.stringify` alle eigenen Properties serialisiert.
- Ein 0.1-Doc verifiziert weiterhin sauber gegen den unveränderten Verifier; ein 0.2-Doc auch.
- **Wichtig:** Stage-3 verwendet *plain* `JSON.stringify` (NICHT `canonicalStage1Json`), siehe `apps/web/src/run/audit.ts:155` + `tests/unit/run-audit-sign-verify.test.ts:111`. Das heißt: die JSON-Key-Reihenfolge ist V8-/JS-Engine-bedingt, nicht alphabetisch sortiert. Solange wir nicht canonisieren, dürfen wir `seat_allocation` einfach an `AuditDoc` anhängen.

### Anti-Patterns to Avoid
- **N-D Cell-Override** ("Männer 20-30 in Bezirk X = 5 Sitze") — explizit out-of-scope. Wenn jemand das in der UI vermarkten will, harte Ablehnung.
- **Override + Bounds koexistierend für die overridete Achse** — Override ersetzt Bounds (locked decision). UI muss Bounds-Editor für die overridete Achse ausblenden, sonst Verwirrung.
- **Override silently auf Schema 0.1 schreiben** — Schema-Bump ist Pflicht; sonst können externe Verifier nicht zwischen "kein Override gesetzt" und "Override im Code aber Schema sagt nichts" unterscheiden.
- **Quoten-JSON-Export vermischen** mit Override — separat halten oder in eigenes Top-Level-Feld der Quoten-JSON. (Empfehlung: nur via Audit-JSON exportieren, nicht in Quoten-JSON.)
- **Override-Begründung in der UI persistent vorhalten** wenn Reset gedrückt wird — Reset löscht Begründung mit, sonst Risiko, dass verstauchte Begründung neu signiert wird.
- **Engine-A umbauen für Override** — LP-Constraints reichen aus, kein Solver-Eingriff. Wenn jemand das vorschlägt: ablehnen.

---

## Common Pitfalls

### Pitfall 1: Sum-Constraint nicht live validiert
**Was geht schief:** User editiert Override-Werte einzeln, am Ende ist `Σ override.seats != panel_size`. LP-Solver bekommt einen infeasible Input.
**Warum:** Override-Editor lässt freies Editieren ohne Sum-Lock.
**Wie vermeiden:** Live-Memo `sumDelta = Σ override - panel_size` mit farbigem Warning ("noch +3 zuteilen" / "zuviel verteilt: -2"). Speichern-Button blockieren wenn `sumDelta != 0`.
**Warning-Sign:** User klickt "Speichern" und bekommt LP-Error statt UI-Validation-Error.

### Pitfall 2: Override-Wert > Pool-Größe für die Gruppe
**Was geht schief:** User setzt `<50 = 50 Sitze`, im Pool gibt es nur 40 Personen <50 → LP-infeasible.
**Warum:** Engine A liefert nur `infeasible_quotas` ohne Hinweis, **welche** Constraint kaputt ist.
**Wie vermeiden:** Pre-flight-Validierung in `validateOverride` — `for (val, n) in seats: if n > poolCounts[val] then error("Override für ${val}: ${n} Sitze, aber nur ${poolCounts[val]} im Pool")`. Klare deutsche Fehlermeldung **vor** dem Solver-Lauf.
**Warning-Sign:** `engine.run()` returns `infeasible_quotas` mit nichtssagender Message.

### Pitfall 3: Begründungs-Counter validiert Whitespace mit
**Was geht schief:** User tippt 20 Spaces → Speichern frei. Audit hat leere Begründung.
**Warum:** Naiver `text.length >= 20`-Check.
**Wie vermeiden:** `text.replace(/\s+/g, '').length >= 20`. Test-Case: Eingabe `'                    '` muss blockieren.
**Warning-Sign:** Audit-Manifest hat `rationale: '                    '`.

### Pitfall 4: Override nicht in `input_sha256` reflektiert
**Was geht schief:** `inputSha256(pool, quotas)` wird über die Pre-Override-Quotas berechnet. Im Audit steht ein Hash, der nicht zur tatsächlich verwendeten LP-Konfig passt.
**Warum:** `runEngineA` bekommt Override-Quotas, aber `buildAudit` bekommt Original-Quotas.
**Wie vermeiden:** Eine von zwei Optionen:
  (a) `input_sha256` über die **Post-Override-Quotas** berechnen (semantisch sauber: Hash deckt das ab, was wirklich gerechnet wurde).
  (b) `input_sha256` weiter über Original-Quotas berechnen, aber `seat_allocation` als separat signiertes Feld führen.
**Empfehlung: (a)** — hat den Vorteil, dass externer Verifier mit identischen `pool + quotas`-Eingaben den gleichen Hash regeneriert. Heißt: vor `buildAudit` die Override-applizierten Quotas durchreichen.
**Warning-Sign:** Verifier meldet `input hash mismatch` obwohl alles "korrekt" aussieht.

### Pitfall 5: Schema-Bump bricht alte gespeicherte Audit-JSONs
**Was geht schief:** Nutzer:in hat 0.1-Audits exportiert. Verifier wirft "unknown schema_version".
**Warum:** Strikte Schema-Validation auf "0.2".
**Wie vermeiden:** Verifier akzeptiert beide Versionen. `seat_allocation` ist optional. REQUIRED_FIELDS ist unverändert.
**Warning-Sign:** Bestehende Test-Fixtures in `tests/fixtures/` werfen plötzlich "schema_version invalid".

### Pitfall 6: `signAudit` verwendet `JSON.stringify` ohne Canonicalisierung
**Was geht schief:** Wenn Felder via Spread-Operator in unterschiedlicher Reihenfolge landen, ändert sich `bodyJson` → andere Signatur → Re-Verify schlägt fehl, obwohl Daten gleich.
**Warum:** Stage-3-Audit verwendet plain `JSON.stringify` (anders als Stage-1, das `canonicalStage1Json` mit deep-key-sort verwendet — siehe `packages/core/src/stage1/audit-builder.ts:36-58`).
**Wie vermeiden:** Pattern in `buildAudit` strikt einhalten — alle Felder in fester Reihenfolge initialisieren. Kein Object-Spread für `AuditDoc`-Construktion.
**Warning-Sign:** `run-audit-sign-verify.test.ts` failt nach Refactor.
**Optional-Future:** Stage-3-Audit auf `canonicalStage1Json` migrieren — wäre eigenes Issue (Risk-Assessment für Verifier-Kompat nötig).

### Pitfall 7: `RunPanel` rerendert Override-State bei jedem Quotas-Edit
**Was geht schief:** User editiert Override → wechselt zu Stage-1 → kommt zurück → Override-State ist weg.
**Warum:** Solid.js-Signals werden bei Mode-Switch in `App.tsx` rerendered, weil `<Show when={mode() === 'stage3'}>` die ganze Sub-Tree neu mountet.
**Wie vermeiden:** SeatAllocation-State an `App.tsx`-Level halten (analog zu `pool` und `quotas`), nicht in `RunPanel` lokalisieren.
**Warning-Sign:** Nutzer beschwert sich, dass Override beim Tab-Wechsel verschwindet.

### Pitfall 8: e2e-Test verifiziert Round-Trip ohne Manipulation
**Was geht schief:** Test prüft "Override setzen → Sign → Re-Verify = ok". Verpasst: "manipuliertes Override → Re-Verify = fail".
**Warum:** Glücks-Pfad-Bias.
**Wie vermeiden:** Test-Suite erzwingt einen "tamper detection"-Test (analog zu `run-audit-sign-verify.test.ts:72-84` für `seed`).
**Warning-Sign:** Tampering-Test fehlt in PR.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Solid.js | UI | bestehend | aus package.json | n/a |
| Web Crypto API (Ed25519) | Audit-Sign | Browser >=Chrome 113 / FF 130 | nativ | ECDSA-P256-SHA256 (bereits implementiert) |
| Vitest | Unit-Tests | bestehend | n/a | n/a |
| Playwright | e2e | bestehend | n/a | n/a |
| HiGHS WASM | Engine A | bestehend | 1.8.0 (laut `engine.ts:38`) | n/a |
| `cryptography` (Python) | Verifier | bestehend (`scripts/verify_audit.py:52,67`) | n/a | n/a |

Keine neuen Dependencies. Override ist ein reines Feature-Issue im bestehenden Stack.

---

## Konkreter Daten-Modell-Diff

```ts
// apps/web/src/quotas/model.ts — ADD (don't modify existing types)
export interface SeatAllocationOverride {
  axis: string;
  seats: Record<string, number>;
  rationale: string;
  timestamp_iso: string;
}
export interface SeatAllocation {
  baseline: Record<string, Record<string, number>>;
  override: SeatAllocationOverride | null;
}
export function computeBaseline(rows, panelSize, axes): SeatAllocation['baseline'] { ... }
export function validateOverride(rows, panelSize, override): OverrideValidation { ... }
export function nonWhitespaceLength(s: string): number {
  return s.replace(/\s+/g, '').length;
}
```

## Konkreter Engine-Adapter-Diff

```ts
// apps/web/src/run/runEngine.ts — ADD helper, wire into runEngineA
import type { SeatAllocationOverride } from '../quotas/model';

export function applyOverrideToQuotas(
  quotas: Quotas,
  override: SeatAllocationOverride | null,
): Quotas {
  if (!override) return quotas;
  return {
    ...quotas,
    categories: quotas.categories.map((cat) =>
      cat.column !== override.axis
        ? cat
        : { column: cat.column, bounds: Object.fromEntries(
            Object.entries(override.seats).map(([val, n]) => [val, { min: n, max: n }])
          ) }
    ),
  };
}

// Modify signature of runEngineA to accept override; pre-compose into quotas
// before passing to EngineA. Engine-A itself unchanged.
```

## Konkreter Audit-Schema-Diff

```ts
// apps/web/src/run/audit.ts
export const AUDIT_SCHEMA_VERSION = '0.2'; // bumped

export interface SeatAllocationAudit {
  baseline: Record<string, Record<string, number>>;
  override: SeatAllocationOverride | null;
  deviation: Record<string, { delta_seats: number; delta_percent: number }> | null;
}

export interface AuditDoc {
  // ...existing...
  seat_allocation?: SeatAllocationAudit; // NEW, optional
}

// buildAudit() — wire seatAllocation through args:
export async function buildAudit(args: {
  pool: Pool;
  quotas: Quotas;          // POST-OVERRIDE quotas (so input_sha256 reflects actual LP)
  seed: number;
  result: RunResult;
  duration_ms: number;
  seatAllocation?: SeatAllocation; // NEW
}): Promise<AuditDoc> { ... }
```

`scripts/verify_audit.py` — `REQUIRED_FIELDS` unverändert, da `seat_allocation` optional. Optional: zusätzlicher CLI-Flag `--require-seat-allocation` für Verifier-Strictness.

---

## UI-Pattern-Empfehlung (strukturell, ohne Mockup)

**Komponenten-Layout** in `RunPanel.tsx`:

```
<RunPanel>
  ├── <SeedRow data-testid="run-seed-row">
  ├── <SeatAllocationPanel data-testid="seat-allocation-panel">
  │     ├── <BaselineSummary data-testid="seat-allocation-baseline">
  │     │     — read-only Tabelle: Achse → Werte → Sitze (Hamilton-Allokation)
  │     ├── <OverrideAxisPicker data-testid="seat-allocation-axis-picker">
  │     │     — Single-Select: "Override aktivieren für: [Achse wählen]"
  │     │     — Achse wählen scrollt OverrideEditor in den Viewport
  │     ├── <Show when={overrideAxis()}>
  │     │     <OverrideEditor data-testid="seat-allocation-override-editor"
  │     │                     axis={overrideAxis()} baseline={...} onChange={...}>
  │     │     ├── <Warning data-testid="seat-allocation-override-warning">
  │     │     │     "Du weichst von der proportionalen Bevölkerungs-Verteilung ab.
  │     │     │      Diese Entscheidung wird im Audit dokumentiert."
  │     │     ├── <table data-testid="seat-allocation-override-table">
  │     │     │     <thead> Wert | im Pool | Baseline | Override | Diff
  │     │     │     <tbody> for each value:
  │     │     │       <tr>
  │     │     │         <td>{value}</td>
  │     │     │         <td>{poolCounts[value]}</td>
  │     │     │         <td class="tabular-nums">{baseline[value]}</td>
  │     │     │         <td><input type=number data-testid={`override-${value}`}
  │     │     │                    value={override.seats[value]}
  │     │     │                    onInput={...}/></td>
  │     │     │         <td class="tabular-nums" classList={{ 'text-red-700': delta < 0,
  │     │     │              'text-emerald-700': delta > 0 }}>
  │     │     │              {delta > 0 ? '+' : ''}{delta}
  │     │     │         </td>
  │     │     │       </tr>
  │     │     ├── <SumValidator data-testid="seat-allocation-sum-validator">
  │     │     │     — live: Σ override = X / panel_size = Y → "noch ±N zuzuteilen"
  │     │     ├── <RationaleField data-testid="seat-allocation-rationale">
  │     │     │     <textarea> + <counter data-testid="seat-allocation-rationale-counter">
  │     │     │     "{n}/20 Zeichen — Pflicht-Begründung"
  │     │     │     (optional: Dropdown mit Vorschlägen "Geschlechter-Parität", ...)
  │     │     ├── <ResetButton data-testid="seat-allocation-reset"
  │     │     │                onClick={() => clearOverride()}>
  │     │     │     "Zurück zur statistischen Baseline"
  │     │   </Show>
  ├── <RunButton disabled={!quotaValid() || (overrideActive && !overrideValid)}>
  └── <RunResult>
        ├── <Show when={overrideActive}>
        │     <Badge data-testid="seat-allocation-active-badge"
        │            class="status-pill status-pill-warn">
        │            "Manuelle Sitz-Allokation aktiv — siehe Audit-Footer"
        │     </Badge>
        └── ... existing tables ...
```

**Routing:** Override lebt **inline in Stage-3 (`#/stage3`)**, kein neuer Route. Begründung: Override ist Teil des Setup-Flows direkt vor "Run starten", trennt sich nicht sinnvoll von QuotaEditor + RunPanel.

**Disclosure-Pattern:** `OverrideEditor` standardmäßig collapsed/hidden. Sichtbar erst nach Achsenwahl. Reset macht Achsenwahl wieder leer und alles unsichtbar.

**Diff-Visualisierung:** Empfehlung **Tabelle mit Vorzeichen + Farbe** (nicht Bar-Chart, nicht Slider) — passt zu existierenden Quota-Tabellen, erlaubt direkte Zahlen-Eingabe, screen-reader-freundlich, druckbar.

---

## Quality-Metric `seat_allocation_drift` — Formel-Empfehlung

In `packages/metrics/src/index.ts` ergänzen:

```ts
export interface SeatAllocationDrift {
  axis: string;
  l1_drift: number;      // Σ |override - baseline|, in Sitzen
  l1_drift_pct: number;  // l1_drift / panel_size
  max_value_drift: number;        // max |override[v] - baseline[v]|
  max_value_drift_pct: number;    // max_value_drift / panel_size
}

export function seatAllocationDrift(
  baseline: Record<string, number>,
  override: Record<string, number>,
): SeatAllocationDrift { ... }
```

**Begründung der Formel-Wahl:**
- **L1 (Σ |delta|)** ist die intuitive Metrik: "wieviel Sitze wurden insgesamt umgeschichtet". Halbiert für `l1_drift_pct` da jeder Sitz, der gewinnt, einem entspricht der verliert (Σ override == Σ baseline == panel_size). Tatsächlich wäre `l1_drift / 2` "Anzahl umgeschichteter Sitze". Empfehlung: beide Werte ausweisen, oder klare Doku.
- **L2** wäre statistisch präziser, aber unintuitiv für Nutzer:innen ("0.83 Quadrat-Sitze").
- **Max-deviation** zeigt den extremsten Einzeleingriff — nützlich, weil ein hohes Max bei niedrigem L1 auf eine *gezielte* Verschiebung hindeutet, was im Audit-Report unterschiedlich kommentiert werden kann.

**Empfehlung: L1 + Max-deviation** beide reporten. Im Audit erscheinen sie als Klartext: "5 von 30 Sitzen umgeschichtet (17 %), maximaler Eingriff: +3 Sitze für Wert <50".

---

## Tests-Strategie

### Existierende Test-Files (für Erweiterung)
| Datei | Was testen | Erweiterung für #71 |
|------|------------|---------------------|
| `apps/web/tests/unit/quota-model.test.ts` | QuotaConfig-Validatoren | + Tests für `computeBaseline`, `validateOverride`, `nonWhitespaceLength`, Σ-Check, Pool-Capacity-Check |
| `apps/web/tests/unit/run-audit.test.ts` | `buildAudit`, `inputSha256`, `selectedToCsv` | + `buildAudit` mit Override → schema_version='0.2', seat_allocation gesetzt; ohne Override → seat_allocation undefined |
| `apps/web/tests/unit/run-audit-sign-verify.test.ts` | Sign-/Verify-Round-Trip + Tampering | + `signAudit` mit Override → verify ok; Override-Manipulation (rationale ändern) → verify fail |
| `packages/engine-a/tests/engine.test.ts` | Engine-A Korrektheit + Bounds | + Test mit `min == max`-Bounds (simuliert Override) → Constraint hart respektiert |
| `apps/web/tests/e2e/stage3.spec.ts` | Stage-3 e2e | + neuer Test: Override-Toggle → 3-Spalten-Tabelle → Begründung tippen → Sign → Audit-JSON enthält seat_allocation |

### Neue Test-Files
| Datei | Zweck |
|------|-------|
| `apps/web/tests/unit/seat-allocation-model.test.ts` | Pure-Funktionen `computeBaseline`, `validateOverride`, `nonWhitespaceLength` |
| `apps/web/tests/unit/seat-allocation-engine-adapter.test.ts` | `applyOverrideToQuotas` — Pre/Post-Override-Quotas vergleichen |
| `apps/web/tests/unit/override-editor.test.ts` | Solid-Component-Tests für `OverrideEditor` (Counter-Update, Sum-Validation, Reset-Button) — falls solid-testing-library verwendet wird |
| `apps/web/tests/e2e/seat-allocation-override.spec.ts` | Vollständiger Flow: Toggle → Edit → Begründung (mit 20-char-block) → Sign → Export → Re-Verify mit `verify_audit.py` |
| `packages/metrics/tests/seat-allocation-drift.test.ts` | L1-/Max-Drift-Metric mit synthetischen Eingaben |

### Round-Trip-Test (CRITICAL)
Per AC: "Audit-Verifikations-Test: ein Override-Manifest verifiziert sauber, ein manipuliertes (Override geändert ohne neue Sig) failt". Pattern existiert bereits in `run-audit-sign-verify.test.ts:72-84` für `seed`. Spiegeln für:
- Override-Rationale-Änderung
- Override-Seats-Änderung
- Schema-Version-Downgrade ('0.2' → '0.1')

### Test-Strategie für `verify_audit.py`
Python-seitige Test-Fixture in `tests/fixtures/audits/`:
- `audit-0.1-no-override.json` (existing) → muss verify ok
- `audit-0.2-no-override.json` (neu) → muss verify ok (seat_allocation absent)
- `audit-0.2-with-override.json` (neu) → muss verify ok
- `audit-0.2-tampered-rationale.json` (neu, manuell gebrochen) → muss verify fail

---

## Risiken für den Planner

### R1: Schema-Migration
**Risiko:** Bestehende externe 0.1-Audit-JSONs (falls bei Pilot-Kommunen vorhanden) müssen lesbar bleiben.
**Mitigation:** `verify_audit.py` akzeptiert sowohl 0.1 als auch 0.2. `seat_allocation` ist *optional* im 0.2-Schema. Test-Fixtures für beide Versionen.
**Restrisiko:** LOW — niemand hat aktuell 0.1-Audits in Produktion (Tool ist Iteration 1).

### R2: Engine-Constraint-Stabilität / Quality-Metriken
**Risiko:** Wenn Override harte Vorgabe ist und die Bounds für die overridete Achse durch `min == max` ersetzt werden, schrumpft der Lösungsraum drastisch. min π wird *typisch* schlechter, weil weniger feasible Komitees existieren.
**Mitigation:**
- `seat_allocation_drift` als sichtbares Quality-Signal im Result-View (User soll sehen, dass starker Override = potenziell schlechtere min π).
- Engine-A-Test mit `min==max`-Bounds: muss weiterhin in akzeptabler Zeit (<60s für n=200) ein Komitee finden.
- Pre-flight-Check: `Σ override.seats == panel_size && ∀v: override.seats[v] <= poolCounts[v]` muss in UI vor Sign erzwungen werden, damit kein infeasible LP-Lauf passiert.
**Restrisiko:** MEDIUM — wenn User extreme Override-Werte setzt (z.B. eine Gruppe = 0), kann das in Kombination mit anderen Achsen-Bounds infeasible werden. Pre-flight kann nur 1-D-Infeasibility erkennen, nicht Cross-Achsen-Wechselwirkung. **Empfehlung Planner:** klare Fehlermeldung im UI bei `infeasible_quotas` mit Hinweis "Override und andere Bounds inkompatibel — Override reduzieren oder Bounds lockern".

### R3: UI-Komplexität
**Risiko:** 3-Spalten-Tabelle pro Achse mit Override-Toggle, Sum-Validator, Begründungs-Counter, Reset — nontrivialer Diff. `QuotaEditor.tsx` ist heute 215 Zeilen; ein Inline-Patch würde es auf ~400+ Zeilen blähen.
**Mitigation:** Eigene `OverrideEditor.tsx`-Komponente + `SeatAllocationPanel.tsx`-Wrapper. `QuotaEditor.tsx` bleibt fokussiert auf Bounds-Editing. Keine inline Änderung.
**Restrisiko:** LOW.

### R4: State-Lokalität
**Risiko:** Override-State in `RunPanel` lokalisiert → bei Tab-Wechsel verloren (siehe Pitfall 7).
**Mitigation:** State an `App.tsx`-Level halten, analog zu `pool` und `quotas`. Override-State als Top-Level `createSignal<SeatAllocation | null>(null)`.
**Restrisiko:** LOW.

### R5: Stage-3-Audit hat keinen sichtbaren Footer
**Risiko:** Stage-3-`RunPanel` hat heute keine `AuditFooter`-Komponente (nur Stage-1 hat das via `apps/web/src/stage1/AuditFooter.tsx`). AC verlangt aber Override-Indikator im Audit-Footer. Entweder neuen Stage-3-AuditFooter bauen oder Indikator inline im Result-View.
**Mitigation:** **Empfehlung:** kein vollwertiger Stage-3-AuditFooter im Scope von #71 — würde Issue aufblähen. Stattdessen: Override-Badge inline im RunPanel-Result + Override-Block im Audit-JSON-Export. Vollständiger Stage-3-AuditFooter ist eigenes Issue.
**Restrisiko:** LOW — AC sagt "visuelle Indikation, wenn Override aktiv" — Badge erfüllt das.

### R6: `RunResult.quota_fulfillment` zeigt Bounds, nicht Override-Werte
**Risiko:** Nach Override-Lauf zeigt die `quota_fulfillment`-Tabelle in RunPanel die Override-Bounds (`min == max == override`). Das ist technisch korrekt, aber irreführend: Nutzer sieht "min: 5, max: 5" und denkt es sei eine zufällige Bound-Konfig, nicht ein Override.
**Mitigation:** RunPanel-Result-Tabelle erweitern um optionale Spalte "Override?" oder Override-Werte separat zur Baseline anzeigen.
**Restrisiko:** LOW — UI-Detail.

### R7: Cross-Stage-Override-Verwechslung
**Risiko:** User wechselt nach Stage-1, ändert Quoten, kommt zurück, Override-State referenziert nicht mehr existierende Achsen-Werte.
**Mitigation:** `SeatAllocation` invalidieren wenn Pool oder Quotas-Achsen sich ändern. Pattern: `createEffect(on([pool, quotas], () => setSeatAllocation(null)))`.
**Restrisiko:** LOW.

### R8: Begründungs-Dropdown-Hint nicht bezeichnet als optional
**Risiko:** Wenn Dropdown mit Vorschlägen gebaut wird, könnte das wie eine Pflicht-Auswahl wirken.
**Mitigation:** Dropdown ist *zusätzlich* zum Free-Text, nicht statt. Klar als "Schnell-Auswahl" labeln. Gemäß CONTEXT.md `Discretion`: optional.
**Restrisiko:** LOW.

---

## Kombination mit #70 + #72

| Issue | Beziehung | Konflikt-Potenzial | Merge-Reihenfolge |
|-------|-----------|---------------------|---------------------|
| **#70** Rebrand zu Personenauswahl + Use-Case-Hub | Override muss in Use-Case-Hub dokumentiert werden | LOW — #70 berührt `Stage1Panel.tsx`, `App.tsx`-Copy, neue Hub-Route. Override lebt in `RunPanel.tsx`/`OverrideEditor.tsx`. Kein File-Konflikt. | #70 zuerst (UI-Copy), dann #71 (Override mit Use-Case-konformer Sprache "Personenauswahl-Override" statt "Bürgerinnenrat-Override") |
| **#72** Excel-Upload | Excel ist Input-Schicht; Override ist Output-/Allocation-Schicht | KEIN Konflikt — orthogonal. #72 refactoriert `apps/web/src/csv/` → `apps/web/src/import/`. Override touchet diesen Pfad nicht. | #72 zuerst oder parallel — egal. |

**Doku-Cross-Reference vorbereiten:** `apps/web/src/docs/`-Eintrag (z.B. `Override.tsx` oder als Sektion in `Algorithmus.tsx`) mit:
- Wann Override sinnvoll (Beispiel: Min-Quote unter 50)
- Wann problematisch (verzerrt Repräsentativität)
- Wie im Audit erscheint (Schema 0.2, seat_allocation-Block)
- Use-Case-Hub-Link (#70) referenzieren wenn vorhanden.

CLAUDE.md-Update:
- Neuer Eintrag im Section "Aktueller Stand": Override-Operation als generisches Auswahl-Tool-Primitive ergänzen (analog zu der Korrektur in CONTEXT.md L51-58: "drei Tool-Primitive: Auswahl, Override, Nachwahl").

---

## Project Constraints (from CLAUDE.md)

Aus `/root/workspace/CLAUDE.md` extrahiert:

- **Sprache der Dokumente: Deutsch.** Alle UI-Strings, Doku-Einträge, Fehler-Meldungen auf Deutsch.
- **Kommentare im Code: Englisch** (wie in adhocracy-plus).
- **Keine positive Affirmation** in Reviews; substantielle Probleme zuerst benennen.
- **Quellen-Pflicht:** Jede technische Behauptung mit URL/Paketversion/Datei:Zeile.
- **Bei Unsicherheit "unbestätigt" markieren** statt raten.
- **HiGHS via `highs-js`** ist die solver-Entscheidung — Override kommt über die LP-Constraints, nicht durch Solver-Wechsel.
- **Iteration-1-Scope:** keine fundamentale Architektur-Änderung. Override muss in den existierenden TS+highs-js-Pfad passen, nicht Pyodide/Engine-B voraussetzen.
- **Lizenz: GPL-3.0-or-later** — keine neuen Abhängigkeiten mit inkompatibler Lizenz. Web Crypto API + Solid.js + Tailwind decken alles ab.
- **Stage-3 ist die richtige Stelle für Override** (Maximin-Allokation auf Antwortenden) — CLAUDE.md `S-7` und ISSUE.md AC-Block stimmen überein.

Keine CLAUDE.md-Direktive widerspricht den geplanten Änderungen.

---

## Sources

### HIGH confidence
- `/root/workspace/.issues/71-editable-group-seat-allocation/ISSUE.md` (1-119) — issue body
- `/root/workspace/.issues/71-editable-group-seat-allocation/CONTEXT.md` (1-65) — locked decisions
- `/root/workspace/CLAUDE.md` — project conventions
- `/root/workspace/apps/web/src/quotas/model.ts` (1-122) — QuotaConfig
- `/root/workspace/apps/web/src/quotas/QuotaEditor.tsx` (1-215) — Bounds-Editor UI + test-IDs
- `/root/workspace/apps/web/src/run/audit.ts` (1-198) — AuditDoc schema 0.1, signAudit, canonicalQuotas
- `/root/workspace/apps/web/src/run/runEngine.ts` (1-57) — App→Engine bridge
- `/root/workspace/apps/web/src/run/RunPanel.tsx` (1-285) — Stage-3 UI + test-IDs
- `/root/workspace/apps/web/src/App.tsx` (110-309) — top-level state + routing
- `/root/workspace/packages/engine-a/src/feasible-committee.ts` (40-145) — LP-Constraint generation
- `/root/workspace/packages/engine-a/src/engine.ts` (70-275) — Engine A run loop
- `/root/workspace/packages/engine-contract/src/types.ts` (1-150) — shared Zod schemas
- `/root/workspace/packages/core/src/stage1/audit-builder.ts` (1-111) — Stage-1 audit builder (schema 0.4, separate Pfad)
- `/root/workspace/packages/core/src/stage1/types.ts` (98-200) — Stage1AuditDoc reference
- `/root/workspace/packages/metrics/src/index.ts` (1-125) — Quality-Metrics
- `/root/workspace/apps/web/src/stage1/AuditFooter.tsx` (1-235) — Stage-1 footer pattern
- `/root/workspace/apps/web/tests/unit/quota-model.test.ts` (1-139) — existing quota tests
- `/root/workspace/apps/web/tests/unit/run-audit.test.ts` (1-170) — existing audit tests
- `/root/workspace/apps/web/tests/unit/run-audit-sign-verify.test.ts` (1-141) — round-trip + tampering pattern
- `/root/workspace/scripts/verify_audit.py` (1-120) — external verifier required-fields list

### MEDIUM confidence
- LP-Verhalten bei `min == max`-Bounds — getestet in `engine.test.ts:47-52` (genericer Fall mit `bounds.female: {min: half, max: panel-half}`); Override = Spezialfall davon. Empfehlung: explizit testen.
- Solid.js-Reaktivitäts-Verhalten beim Tab-Switch — basierend auf `App.tsx:240-258` `<Show when={mode() === ...}>`-Mustern. Pattern ist standard in Solid.js.

### LOW confidence (needs validation)
- Tatsächliches Verhalten der Engine bei extremen Override-Werten (z.B. `<50 = 0`) — sollte mit Pre-Flight-Test gegen Pool-Capacity validiert werden. Empfehlung Planner: kleines Smoke-Test-Script bevor finale Engine-A-Tests.

---

## Metadata
- **Confidence breakdown:**
  - Codebase-Analyse: HIGH (alles in-Repo verifiziert, file:line referenziert)
  - Standard-Stack: HIGH (alles bestehend, keine neuen Dependencies)
  - UI-Pattern: MEDIUM (Empfehlung basiert auf existierenden Patterns; finale UX-Entscheidung beim User)
  - Audit-Schema-Bump: HIGH (Pfad ist klar, Verifier-Backward-Compat trivial)
  - Engine-Adapter: HIGH (LP-Constraints akzeptieren `min==max` ohne Sonderbehandlung)
  - Quality-Metric-Formel: MEDIUM (Empfehlung L1+Max; alternative Formeln möglich)
- **Research date:** 2026-05-04
- **Sub-agents used:** Inline-Recherche (3 parallele Lese-Phasen statt Agent-Spawn aufgrund SDK-Constraint — alle Themen abgedeckt)
- **Raw research files:** Recherche direkt in RESEARCH.md synthetisiert
