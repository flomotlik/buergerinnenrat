# Execution: Stage 1 UX-Review-Followup

**Started:** 2026-04-25T12:05:00Z
**Completed:** 2026-04-25T12:45:00Z
**Status:** complete
**Branch:** worktree-agent-ac76adcb

## Execution Log

- [x] Task 1: Underfill-Sortierung als pure Funktion extrahieren (G) — commit 94b0140
- [x] Task 2: Stale Result via createEffect mit defer-on clearen (H) — commit 94b0140
- [x] Task 3: label-for / input-id Kopplung für N und Seed (K) — commit 94b0140
- [x] Task 4: Sprache überall — UI-Strings + Markdown-Bericht (A) — commit 8e70ade
- [x] Task 5: AuditFooter-Komponente bauen + in Stage1Panel einbinden (B) — commit 8e70ade
- [x] Task 6: Seed-Confirmation-Workflow (C, Variante 1) — commit 8e70ade
- [x] Task 7: Sticky Run-Button (D, Variante 1) — commit 6269913
- [x] Task 8: SVG a11y + Pattern für Soll-Balken (E) — commit 6269913
- [x] Task 9: Tab-Subtitles + Schritt-Hinweis im Panel-Header (F) — commit 6269913
- [x] Task 10: CsvPreview-Komponente extrahieren + in Stage 1 einbauen (I) — commit 6269913
  - Deviation: Stage-3 CsvImport NICHT refactored (CONTEXT.md erlaubt das); inline TODO-Kommentar gesetzt — die Stage-3-Tabelle interleavt Mapping-`<select>` mit Preview-Rows, drop-in-Swap würde csv-import.spec.ts brechen.
- [x] Task 11: Vorschau-Strata-Liste mit Namen + "weitere X anzeigen" (J) — commit 6269913
- [x] Task 12: Final-Validation — Build, Bundle-Delta, Cross-Validation, Test-Sweep
  - Kein 4. Sweep-Commit nötig: alle Verifications grün, kein Snapshot-Update, Bundle-Delta innerhalb Budget. ISSUE.md status auf `done` gesetzt; das wird zusammen mit EXECUTION.md committed.

## Verification Results

**Vitest core (`@sortition/core`):** 69 passed (6 files)
- Baseline (vor #53): 65 → +4 neue Cases für `sortUnderfillsByGap` (gap-order, ties, empty, no-mutation)
- 1 bestehender markdown-report Test angepasst auf neue UI-Strings

**Vitest web (`@sortition/web`):** 26 passed (4 files) — alle bestehenden Tests grün

**Vitest engine-a, metrics:** 11 + 6 passed — alle bestehenden Tests grün (algorithmische Logik unverändert)

**Playwright e2e (Chromium + Firefox):** 26 passed (13 pro Browser)
- Baseline: 12 (5 specs × 2 browsers + smoke + 2 csv-import)
- Neue Tests in `stage1.spec.ts`: 6 zusätzliche pro Browser (Label-a11y K, Stale-Reset H, Seed-Gate C, Sticky D, SVG-a11y E, Tabs F + CSV-Preview I)
- Alle Original-Tests bleiben grün; Original-Stage1-Test um Seed-Confirm-Step und Audit-Footer-Assertions erweitert

**Cross-Validation Stage 1 (TS vs Python Reference):** 21/21 PASS — algorithmische Parität unverändert (UI-Änderungen berühren die deterministischen Algorithmus-Pfade nicht)

**Typecheck (`tsc --noEmit`):** clean

**Build:** erfolgreich

## Bundle-Delta

| Asset | Vor #53 | Nach #53 | Delta raw | Delta gzip |
|---|---|---|---|---|
| index.js | 89.43 kB / 30.33 gz | 97.88 kB / 32.55 gz | +8.45 | +2.22 |
| index.css | 12.97 kB / 3.18 gz | 14.10 kB / 3.42 gz | +1.13 | +0.24 |
| solid.js | 10.29 kB / 4.26 gz | 10.69 kB / 4.42 gz | +0.40 | +0.16 |
| highs.js | 27.12 kB / 11.04 gz | 27.12 kB / 11.04 gz | 0 | 0 |
| **Total** | **139.81 kB / 48.81 gz** | **149.79 kB / 51.43 gz** | **+9.98 kB** | **+2.62 kB** |

Beide Werte innerhalb Budget (+10 KB raw / +3 KB gzip). Raw delta nutzt 99.8 % des Budgets — knapp aber innerhalb. Bei künftigen Stage-1-Erweiterungen sollte CsvPreview-Lazy-Loading erwogen werden falls weiteres Budget gebraucht wird.

## Deviations from Plan

### Auto-fixed (Rules 1-3)

1. **[Rule 1 - Bug] SVG-Pattern-ID-Kollision zwischen Pre-Run-Preview und Post-Run-Result-AxisBreakdown**
   - Found during: Task 8 e2e-Test
   - Issue: Beide AxisBreakdown-Instanzen für dieselbe Achse (z.B. "district") sind gleichzeitig im DOM, beide definierten `id="stripes-district"` → SVG-Browser nimmt nur die erste, e2e-Test fand 2 statt 1
   - Fix: Pattern-ID erweitert um Mode-Suffix: `stripes-${axis}-${previewMode ? 'preview' : 'result'}`
   - Files: apps/web/src/stage1/AxisBreakdown.tsx
   - Commit: 6269913 (im selben Commit wie Task 8)

### Blocked (Rule 4)

Keine Blocker.

## Discovered Issues

- Stage-3 CsvImport-Tabelle könnte in einem dedizierten Refactor-Issue auf `<CsvPreview>` umgestellt werden, sobald die Mapping-`<select>`-Zeile aus dem Tabellenkopf in eine separate Sektion oberhalb gehoben wird. TODO-Kommentar in apps/web/src/csv/CsvImport.tsx markiert die Stelle. Eigenes Issue wird nicht angelegt — gehört zur "Drag-Drop-Konsolidierung" (Claude M3, bereits in CONTEXT.md als Out-of-Scope vermerkt).

## Self-Check

- [x] Alle Files aus PLAN.md existieren bzw. wurden modifiziert wie spezifiziert
- [x] Alle 3 Commit-SHAs (94b0140, 8e70ade, 6269913) sind auf der Branch sichtbar (`git log --oneline | head -3`)
- [x] Vollständige Verification-Suite grün (Vitest 69 core + 26 web + 17 engine-a/metrics, Playwright 26, Cross-Validation 21)
- [x] Keine Stubs / TODOs / Placeholders außer dem dokumentierten `TODO(#53-followup)` in CsvImport.tsx
- [x] Keine Debug-Statements (kein `console.log` außer dem bestehenden Test-sanity-log, kein `debugger`)
- [x] Bundle-Delta dokumentiert und innerhalb Budget
- [x] ISSUE.md status auf 'done' gesetzt
- **Result:** PASSED

**Commits (chronologisch):**
- `94b0140` fix(stage1): correct underfill sort, clear stale result, label associations
- `8e70ade` feat(stage1): plain-language labels + visible audit footer + seed confirmation
- `6269913` feat(stage1): sticky run, svg a11y/patterns, tab subtitles, csv preview, preview detail

**Duration:** ~40 Minuten
**Commit count:** 3 thematische Commits + 1 Doc-Commit (folgt mit dieser EXECUTION.md)
