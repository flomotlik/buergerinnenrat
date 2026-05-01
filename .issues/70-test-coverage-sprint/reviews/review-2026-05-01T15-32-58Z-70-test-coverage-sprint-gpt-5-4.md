---
review_of: 70-test-coverage-sprint
review_type: issue
review_mode: implementation
reviewed_at: 2026-05-01T15-32-58Z
tool: codex
model: gpt-5.4
duration_seconds: 284
---

<finding severity="Medium">
<title>Signature-tamper tests no longer enforce the documented `false, not throw` contract</title>
<evidence>
`apps/web/tests/unit/stage1-audit-sign-verify.test.ts:114`-`122` and `apps/web/tests/unit/run-audit-sign-verify.test.ts:97`-`103` catch any verification exception and normalize it to `false`. That means a regression where `crypto.subtle.verify(...)` starts throwing for tampered signatures would still pass, even though the review contract for these negatives is “result in `false`, not throw.” The body-tamper cases correctly assert a plain `false` result at `stage1-audit-sign-verify.test.ts:95`-`99` and `run-audit-sign-verify.test.ts:79`-`83`.
</evidence>
<impact>
These tests currently prove “tampering is detected somehow,” but not the stricter API behavior they were added to lock down. A verifier path that becomes exception-driven instead of boolean-returning could slip through.
</impact>
<recommendation>
Assert `await verify(...)` resolves to `false` directly for the signature-tamper path as well, or split algorithm-specific expectations if one runtime genuinely cannot satisfy that contract.
</recommendation>
</finding>

<finding severity="Medium">
<title>Stage 3 e2e can pass with an internally consistent but invalid selection</title>
<evidence>
`apps/web/tests/e2e/stage3.spec.ts:100`-`109` checks only `selected.length === 10`, lexicographic sort order, and `quota_fulfillment[].ok === true`. It never asserts that every selected id exists in the uploaded pool, that ids are unique, or that the exported panel/audit selection matches real pool rows. Because `buildAudit()` simply copies and sorts `result.selected` from the engine (`apps/web/src/run/audit.ts:90`-`94`) and `selectedToCsv()` de-duplicates implicitly by filtering pool rows (`apps/web/src/run/audit.ts:179`-`187`), a duplicate-id or out-of-pool-id regression could still leave this spec green if the engine also emits self-consistent `quota_fulfillment`.
</evidence>
<impact>
This weakens the main new Stage 3 contract test around the most important payload: who was actually selected.
</impact>
<recommendation>
Add assertions that `new Set(audit.selected).size === audit.selected.length`, every id is one of `p001`…`p020`, and ideally that the exported panel CSV contains the same 10 ids.
</recommendation>
</finding>

<finding severity="Medium">
<title>Axe baselines compare only violation counts, so different regressions can false-pass</title>
<evidence>
The route baselines are stored as a single numeric `baseline` in `apps/web/tests/e2e/a11y.spec.ts:17`-`21` and `:32`-`38`, and the assertion at `:57`-`58` checks only `results.violations.length === baseline`. If `#/overview` stops having `color-contrast` but picks up some unrelated single violation, or `#/docs/algorithmus` swaps `scrollable-region-focusable` for another one, the spec still passes.
</evidence>
<impact>
This is weaker than the documented rationale in `EXECUTION.md:30`-`49`, which names specific known violations. The current test guards the count, not the identity of the regression.
</impact>
<recommendation>
Assert the expected violation ids per route, optionally together with node counts, instead of only the total count.
</recommendation>
</finding>

<finding severity="Low">
<title>AuditFooter parity spec does not cover the full signed-footer triplet</title>
<evidence>
`apps/web/src/stage1/AuditFooter.tsx:209`-`225` renders signature algorithm, public key, and signature. `apps/web/tests/e2e/audit-footer-parity.spec.ts:131`-`133` asserts only `audit-footer-sig-algo` and `audit-footer-sig`; it never checks that the public-key snippet is rendered when `audit.public_key` is present.
</evidence>
<impact>
The new parity spec is otherwise thorough, but it leaves one visible signed-state field unchecked.
</impact>
<recommendation>
Assert that the footer contains the `PK:` abbreviated key span, or at minimum that the full `public_key` is exposed via the rendered `title` attribute.
</recommendation>
</finding>

<assessment>
1. Round-trip verification correctness: key import formats and verify argument shapes are correct in both test files (`stage1-audit-sign-verify.test.ts:46`-`64`, `run-audit-sign-verify.test.ts:34`-`52`) and match the signing implementations (`apps/web/src/stage1/audit-sign.ts:28`-`57`, `apps/web/src/run/audit.ts:114`-`148`). Stage 1 correctly checks `canonicalStage1Json` (`stage1-audit-sign-verify.test.ts:125`-`133`; `apps/web/src/stage1/audit-sign.ts:82`-`85`), and Stage 3 correctly checks plain `JSON.stringify` (`run-audit-sign-verify.test.ts:106`-`113`; `apps/web/src/run/audit.ts:155`). The forced-fallback spies delegate correctly to the real ECDSA branch (`stage1-audit-sign-verify.test.ts:141`-`151`, `run-audit-sign-verify.test.ts:118`-`127`). The one weakness is the signature-tamper throw-normalization finding above.

2. AuditFooter parity completeness: field assertions are footer-scoped correctly (`audit-footer-parity.spec.ts:78`-`124`), optional-field absence/presence logic is sensible, and the spec passed locally. The remaining gap is that the public-key rendering is not asserted.

3. Stage 3 e2e correctness: the inline fixture is deterministic enough because ids are zero-padded and gender distribution is fixed (`stage3.spec.ts:14`-`23`); the ascending-sort assertion is correct for the current `buildAudit()` implementation (`stage3.spec.ts:101`-`103`, `apps/web/src/run/audit.ts:92`); the 45s timeout is reasonable and the spec passed locally. Deferring cancel coverage is an acceptable budget trade-off. The main missing check is selection validity/uniqueness.

4. axe-core baseline rationale: the WCAG tag set is right (`a11y.spec.ts:51`-`53`), and the JSON violation summary is a useful failure message (`a11y.spec.ts:55`-`58`). Leaving the Overview contrast and Hamilton SVG issues for follow-up is defensible under `EXECUTION.md:30`-`49`. The weakness is count-only baselining.

5. Mulberry32 known-vector validity: I do not see a concrete correctness bug in `packages/core/tests/mulberry32.test.ts:12`-`90`. The vector is not a formal external oracle, but it is at least cross-checked against the Python twin, and the normalization/range tests match the implementation in `packages/core/src/pool/mulberry32.ts:10`-`24`.

6. Mobile touch-target assertions: the relaxed desktop sidebar baseline is acceptable as a documented regression detector given `EXECUTION.md:51`-`62`, though it should remain a short-lived compromise. The 375px Overview card assertions are correct (`mobile-touch-targets.spec.ts:208`-`239`). Using `>= 3` for principle cards is reasonable here because `overview.spec.ts:34`-`44` already locks the exact count.

7. CI workflow YAML validity: verified syntactically valid; `cross-runtime-parity` correctly `needs: build` and `deploy` correctly depends on it (`.github/workflows/deploy.yml:129`-`188`). The `/opt/sortition-venv/bin/python` symlink is robust enough in this job shape because it is created after `actions/setup-python@v5` and nothing reinstalls Python afterward (`deploy.yml:155`-`173`, `scripts/stage1_cross_validate.sh:9`). `timeout-minutes: 10` is reasonable for 21 cases.

8. No source-code changes: confirmed. `git diff --name-only main...HEAD -- apps/web/src packages/core/src packages/engine-a/src packages/engine-contract/src packages/metrics/src` returns nothing. The only non-test product changes are `.github/workflows/deploy.yml`, `apps/web/package.json`, `pnpm-lock.yaml`, and issue-doc updates, plus additional `.issues/70-test-coverage-sprint/*` planning docs not listed in the prompt.

9. Self-tests / tautologies / weak negatives: `run-audit.test.ts` is mostly contract-level rather than tautological; the biggest weak spots are the normalized signature-verify exceptions and the Stage 3 selection-validity gap.

10. Commit hygiene: the per-area implementation commits are clear and revertable (`git log --oneline issue/70-test-coverage-sprint ^main`). There are three earlier issue-bootstrap doc commits in the range in addition to the per-subitem work, but the actual test/CI changes are still sensibly split.
</assessment>

<verdict value="warn" critical="0" high="0" medium="3">
Strong test-coverage expansion with correct branch scope and a valid CI wiring update, but a few of the new tests still allow false-passes on the core contracts they are meant to lock down.
</verdict>
</issue:review>

