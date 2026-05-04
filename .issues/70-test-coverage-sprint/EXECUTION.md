# Execution: 70-test-coverage-sprint

**Started:** 2026-04-30
**Status:** in_progress
**Branch:** issue/70-test-coverage-sprint

## Execution Log

- [x] Task 1: P0 #2 — Audit-signing round-trip verification (Stage 1 + Stage 3) — commit `4beb30a`
- [x] Task 2: P1 #3 — Sidebar / Overview / Routing e2e — commit `4a8daad`
- [x] Task 3: P1 #4 — AuditFooter schema-0.4 field-rendering parity — commit `30c5fda`
- [x] Task 4: P1 #5 — Stage 3 RunPanel + run-audit unit coverage — commit `98ddc34`
- [x] Task 5: P1 #7 — Mulberry32 known-vector + edge cases — commit `7c5f860`
- [x] Task 6: P1 #8 — A11y axe-core integration — commit `38aa88d`
- [x] Task 7: P1 #9 — Mobile touch-targets sidebar + overview coverage — commit `71a6e61`
- [x] Task 8: P1 #6 — TS↔Python cross-runtime parity in CI — commit `294d811`
- [x] Task 9: Update #68 backlog status — commit `4b40037`
- [x] Task 10: Self-review + finalize (this commit)

## Verification Results

- **Web unit tests:** 165 passed (17 files), 0 failed
- **Package unit tests:** 117 passed (8 files in core), 11 in engine-a, 6 in metrics — 134 total, 0 failed
- **E2e (chromium):** 83 passed, 0 failed, 1 skipped (pre-existing high-cardinality axis test deferred to #63)
- **Lint:** clean
- **Typecheck:** clean
- **YAML (deploy.yml):** valid
- **Cross-runtime parity (locally):** 21 PASS / 0 FAIL

## Deviations from Plan

None substantive. Implementation followed the plan task ordering exactly.

Minor adjustments documented as they occurred:
- Stage 3 e2e: panel_size raised from 6 → 10 because `validateQuotas`
  enforces a minimum of 10 (`apps/web/src/quotas/model.ts:69`); plan
  spec'd 6 without checking. Bounds adjusted to 4..6 m / 4..6 f
  accordingly.
- Cross-runtime parity job: the script hard-codes
  `/opt/sortition-venv/bin/python`. Instead of editing the script (which
  would touch a non-test file), the CI job creates a symlink to the
  runner's `python3` after `actions/setup-python@v5` provisions it.

## Self-Review (Task 10) — review run-1

Three external LLMs reviewed the implementation:
- `claude-opus-4-7` → **PASS** (0 critical, 0 high, 3 medium, 11 low)
- `gpt-5.4 (codex)` → **WARN** (0 critical, 0 high, 3 medium, 1 low)
- `gemini-3.1-pro-preview` → **PASS** (0 critical, 0 high, 1 medium, 2 low)

Files: `.issues/70-test-coverage-sprint/reviews/`.

**Critical/High findings:** none.

**Medium findings addressed inline:**
1. Codex M1 — Signature-tamper test wraps verify in try/catch, so a
   verifier that throws on tampering would still pass. **FIXED:** split
   the signature-tamper test to be Ed25519-specific with a strict
   `expect(ok).toBe(false)` (no try/catch). Ed25519 verify is required
   to RESOLVE to false; ECDSA's parse-throw semantics are different and
   excluded from the strict assertion. Both `stage1-audit-sign-verify`
   and `run-audit-sign-verify`.
2. Codex M2 — Stage 3 e2e doesn't assert selection uniqueness or
   pool-membership, only length + sort + ok. **FIXED:** added
   `new Set(audit.selected).size === audit.selected.length` and
   `every id ∈ {p001..p020}` in `stage3.spec.ts`.
3. Codex M3 — axe baselines compare counts only, so swapping one
   violation for another false-passes. **FIXED:** baseline schema
   changed from `baseline: number` to
   `expectedViolationIds: string[]`; assertion compares the SET (sorted)
   of violation rule ids. Catches the swap regression.
4. Codex L1 — AuditFooter parity doesn't assert public_key rendering.
   **FIXED:** added assertion that the "PK:" abbreviated span is visible
   AND its title attribute equals the full public_key from the JSON.
5. Claude M1 — Principle-card `>=3` (mobile-touch-targets) vs `==3`
   (overview.spec) inconsistency. **FIXED:** loosened
   `overview.spec.ts` to `>=3` to match the iteration semantics of the
   mobile-touch-target spec; both files now agree.

**Medium findings deferred (with rationale):**
- Claude M2 — AuditFooter parity OR-check on `input_csv_size_bytes`
  proves *some* substring match in the footer HTML, not that the value
  renders in the right cell. The risk is small (the `<dt>Eingangs-Datei`
  / `<dd>` pair shows the size; per Claude the "raw form on a 500-row
  CSV is ~21000 — unlikely to numerically collide with a duration_ms
  value < 1000"). Acceptable given the test budget; tightening to
  per-cell scoping is a future refinement when AuditFooter gains
  per-row testids.
- Claude M3 — 36px sidebar baseline accepts a known a11y regression.
  Per CONTEXT.md regression-detector contract; documented as follow-up.
  The fix (NavLink padding bump) is one line in source — explicitly
  out-of-scope per the no-source-changes rule for this sprint.
- Gemini M1 — `scrollable-region-focusable` could be inline-fixed. Same
  rule (no source changes); will be a separate trivial PR.

**Low findings:** All documented as informational (cryptographic
single-bit-flip is sufficient by Ed25519 properties; period sanity test
covers catastrophic stuck-PRNG only; etc.). Captured in EXECUTION.md
context — no inline action.

**Verdicts:** 2× PASS, 1× WARN — no blockers. Codex's WARN is keyed on
the three Mediums above, which are now addressed.

## Discovered Issues

## Discovered Issues

### A11y baseline violations (axe-core, WCAG 2.1 AA)

Discovered during Task 6 (#68 P1 #8). Set as test baselines (≠0) and
flagged for follow-up issues. NOT fixed inline per CONTEXT.md (tests are
regression-detectors, not bug-fixers; non-trivial fixes split out).

1. **#/overview — color-contrast (serious, 2 nodes)**
   - `.status-pill-ok` ('verfügbar' pill): contrast 3.88, requires 4.5:1
     (fg `#38853e` on bg `#dbf3db`, 9pt)
   - `.status-pill-warn` ('Konzept' pill): contrast 3.59, requires 4.5:1
     (fg `#b16512` on bg `#ffe3c4`, 9pt)
   - Follow-up: design ticket to bump pill foreground darkness OR move to
     11pt+ (pseudo-element relaxes the contrast requirement to 3:1).
2. **#/docs/algorithmus — scrollable-region-focusable (serious, 1 node)**
   - `[data-testid="hamilton-svg-container"]` (overflow-x-auto wrapper)
     is not keyboard-focusable; Safari users cannot scroll the SVG.
   - Follow-up: add `tabindex="0"` + `role="region"` + `aria-label` to the
     wrapper, OR refactor the SVG to fit without horizontal scroll.

Both are documented as known follow-ups, NOT fixed in #70.

### Sidebar nav-* tap-area below 44px floor

Discovered during Task 7 (#68 P1 #9). Sidebar NavLink anchors render at
~231×37 at 1280px viewport. Apple-HIG / Material Design floor is 44px,
the existing `mobile-touch-targets.spec.ts` enforces 44×44 on every other
interactive surface (pill-tabs, docs tiles, trust cards, stage 1 inputs).

Per CONTEXT.md (regression-detector contract) the test was set to a
relaxed baseline (height ≥36, width ≥44) so the suite stays green and
will catch any further shrinkage. Follow-up: bump the NavLink padding
(likely `py-2` → `py-3`) so the items clear 44px without disturbing
sidebar density. NOT fixed in #70.
