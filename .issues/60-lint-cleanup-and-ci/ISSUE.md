---
id: 60
slug: lint-cleanup-and-ci
title: Lint Cleanup + CI Lint-Step
track: Z
estimate_pt: 0.25
status: done
depends_on: [59]
priority: medium
priority_rationale: "17 vorbestehende ESLint-Errors blockieren saubere Codebase-Wahrnehmung; CI lief Lint nie"
---

# Lint Cleanup + CI

## Acceptance Criteria

- [x] 6× `consistent-type-imports` autoFix via `eslint --fix`
- [x] 7× `no-unused-vars` mit `_`-Prefix gefixt durch ESLint-Config-Erweiterung (`varsIgnorePattern`, `caughtErrorsIgnorePattern`, `destructuredArrayIgnorePattern` zu `argsIgnorePattern` hinzu)
- [x] 1× Parser-Error in `tests/smoke-live/site-smoke.spec.ts` gefixt durch ignore in eslint.config.mjs (Live-Smoke ist außerhalb tsconfig-include, lints sich nicht sinnvoll)
- [x] Prettier-Formatting via `prettier --write` über alle Touched-Files
- [x] `deploy.yml` lint-Step im build-Job
- [x] `deploy.yml` web-Unit-Tests-Step (war bisher nicht in CI)
- [x] Alle bestehenden Tests grün (208 unit, 12 e2e + 12 in firefox = 24)

## Files Changed

- `apps/web/eslint.config.mjs` — Regel-Erweiterung + `tests/smoke-live/**` ignore
- `apps/web/src/quotas/QuotaEditor.tsx`, `apps/web/src/run/RunPanel.tsx`, `apps/web/src/run/audit.ts`, `apps/web/src/stage1/AuditFooter.tsx`, `apps/web/src/stage1/AxisBreakdown.tsx`, `apps/web/src/stage1/AxisPicker.tsx`, `apps/web/src/stage1/Stage1Panel.tsx`, `apps/web/src/stage1/audit-sign.ts`, `apps/web/src/stage1/TrustStrip.tsx` (auto-fix + prettier)
- `.github/workflows/deploy.yml` — lint + web-unit-tests Steps
