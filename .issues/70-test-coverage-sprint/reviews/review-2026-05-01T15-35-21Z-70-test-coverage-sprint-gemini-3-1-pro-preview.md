---
review_of: 70-test-coverage-sprint
review_type: issue
review_mode: implementation
reviewed_at: 2026-05-01T15-35-21Z
tool: gemini
model: gemini-3.1-pro-preview
duration_seconds: 143
---

# Review — Issue #70 (Test Coverage Sprint)

## Findings

<finding severity="Medium" file="apps/web/tests/e2e/a11y.spec.ts" line="24">
  <description>The axe-core baseline for `#/docs/algorithmus` is set to 1 due to a trivial `scrollable-region-focusable` violation. A trivial fix (`tabindex="0"` on the SVG wrapper) should have been preferred over baselining a known accessibility violation, as fixing it inline improves the product rather than just acknowledging the defect.</description>
</finding>

<finding severity="Low" file="packages/core/tests/mulberry32.test.ts" line="6">
  <description>Mulberry32 known-vector tests cross-validate the TypeScript implementation against the Python twin `scripts/generate_pool.py`. While ensuring cross-runtime parity is valuable, this only proves both implementations are identical, not necessarily that either is a correct implementation of the canonical Mulberry32 algorithm. Using a third-party reference vector would strengthen the test.</description>
</finding>

<finding severity="Low" file="apps/web/tests/e2e/mobile-touch-targets.spec.ts" line="147">
  <description>The desktop sidebar touch-target test introduces relaxed baselines (`height &gt;= 36`, `width &gt;= 44`) instead of enforcing the strict 44x44 minimum. While acceptable as a regression-detector during a test-coverage sprint (with a documented follow-up), this codifies a known usability gap. Enforcing the fix would have been ideal.</description>
</finding>

## Answers to Review Questions

### 1. Round-trip verification correctness
- **WebCrypto key format:** Yes, the code correctly branches `format = algo === 'Ed25519' ? 'raw' : 'spki'` in both files.
- **Algorithm argument shape:** Yes, it correctly distinguishes between `'Ed25519'` and the ECDSA object `{ name: 'ECDSA', hash: 'SHA-256' }`.
- **Negative cases:** They are meaningful. Both body byte flips and signature bit flips result in `false`. The signature tamper test safely wraps the `verify` call in a try-catch to normalize ECDSA parse-throws to `false`.
- **bodyJson assertion:** Correct. Stage 1 properly uses `canonicalStage1Json` after stripping signature fields, while Stage 3 uses plain `JSON.stringify`.
- **Forced-ECDSA-fallback:** The mock on `crypto.subtle.generateKey` correctly delegates to the original implementation for ECDSA, selectively throwing only when `'Ed25519'` is requested.

### 2. AuditFooter parity completeness
- **Mandatory fields:** Every schema-0.4 field is present and asserted against the footer.
- **`input_csv_size_bytes` rendering:** The OR-check handles the locale correctly (`includes(sizeRaw) || includes(sizeDeLocale)`). While checking `innerHTML` is slightly looser than an exact text match, the test is sound.
- **Optional fields:** Handled correctly. It asserts `toBeVisible()` when present and `toHaveCount(0)` when absent.
- **Scoping:** Assertions are safely scoped to the `footer` locator (`page.getByTestId('stage1-audit-footer')`), preventing false positives.

### 3. Stage 3 e2e correctness
- **Inline n=20 fixture:** The fixture generation is fully deterministic and sets up valid quotas (gender bounds 4..6 covering a panel of 10 perfectly).
- **`selected[]` assertion:** Yes, `[...audit.selected].sort()` correctly validates the lexicographical ascending order contract.
- **Stability:** The 45-second timeout for the run, combined with a 60-second test timeout, is robust.
- **Deferred cancel test:** Acceptable trade-off for a coverage sprint.

### 4. axe-core baseline rationale
- **Defensible baselines:** Tracking known failures and failing on regressions is standard practice.
- **Inline fixes:** As noted in the findings, the `scrollable-region-focusable` violation for the SVG container should ideally have been fixed inline since adding `tabindex="0"` is trivial. The color-contrast issue involves design tokens and is rightfully deferred.
- **WCAG tag set:** Standard and correct (wcag2a + wcag2aa + wcag21a + wcag21aa).
- **Failure-message strategy:** Including `JSON.stringify(summary, null, 2)` in the `expect` message is excellent for CI diagnostics.

### 5. Mulberry32 known-vector validity
- **Vector source:** Cross-validating against the Python twin proves parity, but not absolute algorithmic correctness against a canonical Mulberry32 reference. (See findings).
- **uint32 normalization tests:** Correctly implemented. `2**32 >>> 0` evaluates to `0`, and `-1 >>> 0` evaluates to `0xFFFFFFFF`.
- **Period sanity & Range invariants:** Both tests are meaningful bounds checks, ensuring basic properties of the PRNG (no early cycle, and proper conversion to float bounds `[0, 1)`).

### 6. Mobile touch-target ≥44 assertions
- **Relaxed sidebar baseline:** Captured as a low-severity finding. It operates well as a regression detector but leaves a known usability gap open.
- **375px Overview card assertions:** The tests correctly scope bounding boxes to the `.getByTestId` elements on a 375px viewport.
- **Principle-card iteration:** Using `.toBeGreaterThanOrEqual(3)` is the correct approach to prevent silent false-positives if the underlying data structure grows.

### 7. CI workflow YAML validity (cross-runtime parity job)
- **YAML validity:** Syntactically valid.
- **Dependencies:** The deploy job accurately lists `needs: [build, e2e, cross-runtime-parity]`.
- **Symlink trick:** Symlinking `python3` to `/opt/sortition-venv/bin/python` is a pragmatic and functional workaround for the hardcoded path.
- **Timeout:** 10 minutes is highly reasonable and generous for the 21 test cases.

### 8. No source-code changes
- Confirmed. `git diff --name-only main...issue/70-test-coverage-sprint` shows changes restricted exclusively to test files, `.github/`, `.issues/`, and package management.

### 9. Test self-tests / tautologies / weak negatives
- **`run-audit.test.ts`:** Uses fixed inputs (`makePool()`, `makeQuotas()`) to assert specific literal outputs. It accurately tests the contract, not just the implementation dynamically.
- **Negative cases:** A single bit-flip is the standard test for tampering; cryptographic hashes/signatures guarantee any larger change will also be caught.
- **`stage3.spec.ts` validity:** The test enforces strict `length` and `.ok === true` constraints. If the engine returned garbage, it would fail the selection size or quota validation checks.

### 10. Commit hygiene
- **Commit messages:** Excellent. Granular, revert-friendly, and consistently conventional with issue tags.

<verdict value="pass" critical="0" high="0" medium="1">
The test coverage sprint successfully meets its objectives. The newly added tests comprehensively exercise round-trip verifications, accessibility, cross-runtime parity, and mobile touch-targets. No source code was modified, respecting the sprint boundaries. A minor recommendation is to implement trivial accessibility fixes inline rather than baselining them, but the overall quality and hygiene of the commits are excellent.
</verdict>
