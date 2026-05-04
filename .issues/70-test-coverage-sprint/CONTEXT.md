# CONTEXT — 70-test-coverage-sprint

User instruction: "make sure that test coverage has all the features well covered" → bundle all P0+P1 items from #68 into one focused sprint. Defaults locked from ISSUE.md body (which IS the prescriptive spec).

## Decisions (locked)

- **Single PR for all 7 sub-items.** Orthogonal test-surfaces, no merge-conflict risk, Reviewer can assess holistic coverage line. Items committed individually (one commit per #68 sub-item) so revert-per-item stays possible.
- **Tests as regression-detectors, not bug-finders.** Each new test must be GREEN against current `main`. If a test reveals an actual bug, document in EXECUTION.md and DON'T fix it inline (split to separate issue) — keeps this PR's scope clean. Exception: trivial a11y violations (missing `aria-label` on a single button etc.) may be fixed inline.
- **No source-code changes.** Only `apps/web/tests/`, `packages/core/tests/`, `.github/workflows/`, `apps/web/playwright.config.ts` (if needed for axe-core), `package.json` (axe dep), `.issues/68-...` (status updates).
- **Per-area commits, conventional format**:
  - `test(audit-sign): round-trip verification (#68 P0 #2)` (or split Stage1 vs Stage3)
  - `test(shell): sidebar/overview/routing e2e coverage (#68 P1 #3)`
  - `test(audit-footer): assert all schema-0.4 fields render (#68 P1 #4)`
  - `test(stage3): runpanel + run-audit contract coverage (#68 P1 #5)`
  - `ci(parity): cross-runtime TS↔Python parity job (#68 P1 #6)` (only if `stage1_cross_validate.sh` works)
  - `test(mulberry32): known-vector + edge cases (#68 P1 #7)`
  - `test(a11y): axe-core integration (#68 P1 #8)`
  - `test(mobile): touch-targets sidebar + overview (#68 P1 #9)`
- **Self-review at end** via `issue-cli review-exec --review-type issue --review-mode implementation` over the diff. Address Critical/High; Medium/Low documented.
- **Update #68 status** for every shipped sub-item.
- **#67 future-polish remains untouched.**
- **Drawer (Phase 4 from #65) remains deferred.**

## Per-item caveat strategy (locked)

- **P1 #6 cross-runtime parity:** if `scripts/stage1_cross_validate.sh` doesn't run cleanly out-of-box (Python ref might need extra setup), document as known-followup and ship the rest. Don't block the sprint.
- **P1 #8 axe-core:** likely reveals existing a11y violations. Trivial ones (missing aria-label, missing form label `for`) fix inline; non-trivial (color-contrast on the new sidebar) document as new sub-issue.
- **ECDSA fallback test (P2 #10) piggybacks** under P0 #2 if quick — same file, ~30 LOC extra. Otherwise defer.

## Claude's Discretion

- Test file naming (e.g. `audit-sign-verify.test.ts` vs `audit-sign.verify.test.ts`)
- Whether AuditFooter parity is in extended `stage1.spec.ts` or new `audit-footer-parity.spec.ts` (recommend new file — separation of concern)
- Specific axe-core matcher API (the package exports either a custom expect matcher or a violations-array assertion — pick what compiles)
- Whether to use existing fixtures or generate inline for Stage 3 e2e

## Deferred (out of scope)

- P2 items from #68 (separate sprint)
- Python verifier extension for Stage 1 (`scripts/verify_stage1_audit.py`) — separate issue
- A11y full audit (BITV 2.0 / WCAG AA) — separate workstream
- Component-test layer foundation (#68 P2 #15) — touched by P1 #4 if e2e parity insufficient, otherwise deferred
- Visual regression snapshots — #67

## References

- Spec: `.issues/70-test-coverage-sprint/ISSUE.md` (this issue's body has the per-item details)
- Backlog: `.issues/68-test-coverage-gap-backlog/ISSUE.md`
- Reviews: `.issues/test-coverage-gap-audit/reviews/` (Claude/Codex/Gemini all FAIL)
- Trigger: live-smoke fail post-#65 (commit `cb9d6e1`)
- Predecessor: #69 (e2e CI gate, PR #2 merged)
