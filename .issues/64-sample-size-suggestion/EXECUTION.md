# Execution: #64 Stichprobengröße-Vorschlag

**Status:** complete
**Branch:** sample-size-suggestion
**Worktree:** `.claude/worktrees/sample-size-suggestion/`

## Execution Log

- [x] Task 1: Pure-Funktion `suggestSampleSize` + Outreach-Modi
  - File: `packages/core/src/stage1/sample-size.ts` (new)
  - Re-exported from `packages/core/src/stage1/index.ts`
  - Vitest: `packages/core/tests/stage1-sample-size.test.ts` (19 tests, all green)
- [x] Task 2: SampleSizeCalculator UI-Komponente
  - File: `apps/web/src/stage1/SampleSizeCalculator.tsx` (new)
  - Props: `poolSize`, `onAccept`. Internal signals for panel/outreach/custom rates.
  - All test-IDs from plan present.
- [x] Task 3: Stage1Panel-Integration mit Schritt-Renumbering
  - File: `apps/web/src/stage1/Stage1Panel.tsx`
  - New section "2. Bemessung der Stichprobe" inserted between CSV-Upload and Stratifikation
  - Stratifikation → "3.", Stichprobengröße/Seed → "4.", Ergebnis → "5."
  - `sampleSizeProposal` + `sampleSizeManuallyOverridden` signals
  - `handleTargetNInput` detects override on user N changes
- [x] Task 4: Audit-Doc + Reporting + UI-Footer
  - `packages/core/src/stage1/types.ts`: schema_version `0.3` → `0.4`,
    algorithm_version `stage1@1.1.0` → `stage1@1.2.0`, new optional
    `Stage1SampleSizeProposalAudit` type and `sample_size_proposal` field
  - `packages/core/src/stage1/audit-builder.ts`: emits new field when arg present
  - `apps/web/src/stage1/runStage1.ts`: threads `sampleSizeProposal` through
  - `apps/web/src/stage1/AuditFooter.tsx`: new "Bemessung" row with
    `data-testid="audit-footer-sample-size"` showing "Vorschlag übernommen" or
    "manuell überschrieben — Vorschlag war X"
  - `packages/core/src/stage1/reporting.ts`: new `## Bemessung der Stichprobe`
    Markdown section
  - Vitest: 3 new tests in `stage1-audit.test.ts`, 3 new tests in
    `stage1-reporting.test.ts`
  - Updated existing schema-version assertions (0.3 → 0.4, 1.1.0 → 1.2.0) in:
    - `packages/core/tests/stage1-audit.test.ts`
    - `apps/web/tests/unit/stage1-audit-sign.test.ts`
    - `apps/web/tests/e2e/stage1-bands.spec.ts`
- [x] Task 5: Playwright e2e + Bestehende Tests
  - File: `apps/web/tests/e2e/stage1-sample-size.spec.ts` (new, 8 tests)
  - All bestehende Tests bleiben grün (calculator ist optional)

## Verification Results

| Check                                       | Result                                |
| ------------------------------------------- | ------------------------------------- |
| `pnpm --filter @sortition/core test`        | 108 tests passed (was 83 → +25)       |
| `pnpm --filter @sortition/web test`         | 145 tests passed                      |
| `pnpm typecheck`                            | clean                                 |
| `pnpm lint`                                 | clean                                 |
| Build (VITE_BASE_PATH=/) success            | yes                                   |
| Playwright Chromium full suite (sans visual) | 38 passed, 1 skipped (pre-existing)  |
| Playwright Firefox: stage1-sample-size      | 8 passed                              |

## Bundle Delta (gegen post-#62 Baseline)

| Asset                          | Baseline (KB) | After (KB) | Delta (KB) |
| ------------------------------ | ------------: | ---------: | ---------: |
| dist/assets/index-*.js (raw)   |        122.06 |     132.82 |     +10.76 |
| dist/assets/index-*.js (gzip)  |         40.50 |      43.39 |      +2.89 |

Within the +2–3 KB gzip envelope from the plan, well below the +10 KB stop
threshold. Documented in `BUNDLE_DELTA.md` (top section, prepended).

## Deviations from Plan

None — all tasks executed as specified.

Implementation notes:
- Used camelCase `SampleSizeProposal` in the in-memory type (returned by
  `suggestSampleSize`) and snake_case `Stage1SampleSizeProposalAudit` in the
  audit JSON schema. Stage1Panel composes the audit shape from the in-memory
  proposal at run-time; this matches the existing schema-conversion idiom
  (see `derivedColumns` handling).
- The SampleSizeCalculator does NOT auto-write to `targetN` on input — the
  user must explicitly click "Vorschlag übernehmen". This avoids a "magic
  value flipping while typing" surprise and keeps the manual-override path
  simple. Confirmed acceptable per the plan's "User kann immer manuell
  überschreiben" criterion.

## Self-Check

- [x] All files from plan exist
- [x] Full verification suite passes (vitest core + web, typecheck, lint, e2e
      chromium)
- [x] No stubs/TODOs/placeholders introduced
- [x] No leftover debug code
- [x] All bestehende Tests grün
- **Result:** PASSED

## Commit

Single commit `feat(stage1): sample size suggestion from panel size + outreach method (#64)`.
