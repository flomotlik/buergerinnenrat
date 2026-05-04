# PLAN — 70-test-coverage-sprint

## Objective

Close all P0 + P1 test-coverage gaps from #68 in a single focused PR. 7 sub-items, per-area commits, no source-code changes.

## Skills

<skills>
  <!-- No workspace skills tagged. Conventions inlined per CONTEXT.md. -->
</skills>

## Interfaces (verbatim from RESEARCH.md)

<interfaces>
// === apps/web/src/stage1/audit-sign.ts ===
//   signStage1Audit(doc) → Promise<{ doc, bodyJson }>
//   exportRawPublicKey / exportSpkiPublicKey
//   Verify path: crypto.subtle.importKey(format, …, alg, false, ['verify'])
//                + crypto.subtle.verify(alg, pub, sig, encoded(bodyJson))

// === apps/web/src/run/audit.ts ===
//   buildAudit(args), inputSha256(s), canonicalQuotas(q), selectedToCsv, signAudit(audit)

// === apps/web/src/Overview.tsx + apps/web/src/shell/Sidebar.tsx ===
//   New post-#65. Read first to find ACTUAL testids.

// === apps/web/src/stage1/AuditFooter.tsx ===
//   Renders 21+4+3 schema-0.4 fields. Existing testids: audit-footer-{hash, sig, sig-algo, derived, sample-size, forced-zero}

// === packages/core/src/pool/mulberry32.ts ===
//   Mulberry32(seed).nextFloat() — currently no direct test
</interfaces>

## Constraints (verbatim summary from CONTEXT.md)

- Single PR. Per-area commits (one per #68 sub-item) for revert-per-item.
- Tests are regression-detectors (current behavior). Bugs found → split to follow-up.
- No source-code changes (only tests + workflow + axe dep + #68 status).
- Per-task commit messages: `test(area): description (#68 P? #?)` or `ci(area): description (#68 P? #?)`.
- Self-review via `issue-cli review-exec` at the end. Critical/High addressed, Medium/Low documented.
- Update #68 status for every shipped sub-item.
- No drawer (#65 deferred), no #67 polish, no Stage 3 visual rework.

## Tasks

<task id="1">
  <title>P0 #2 — Audit-signing round-trip verification (Stage 1 + Stage 3)</title>
  <action>
    Read `apps/web/src/stage1/audit-sign.ts` to find exact export names + algorithm wiring.

    Create `apps/web/tests/unit/stage1-audit-sign-verify.test.ts`:
    - Build a minimal valid `Stage1AuditDoc` fixture (use existing audit-builder if convenient, else inline a minimal object matching schema 0.4)
    - Call `signStage1Audit(doc)` → assert `signature_algo` is Ed25519 OR ECDSA-P256-SHA256
    - Import the public key via `crypto.subtle.importKey` (raw for Ed25519, spki for ECDSA)
    - Call `crypto.subtle.verify(...)` over the signed `bodyJson` → expect `true`
    - Negative test: flip one byte of `bodyJson` (or signature) → `crypto.subtle.verify(...)` → expect `false`

    Create `apps/web/tests/unit/run-audit-sign-verify.test.ts` analogously for Stage 3.

    **Optional (recommended if budget allows)** — ECDSA fallback test in same file or separate `audit-sign-ecdsa-fallback.test.ts`:
    - `vi.spyOn(crypto.subtle, 'generateKey').mockImplementationOnce(async (alg, ...) => { if (alg.name === 'Ed25519') throw new DOMException('NotSupportedError'); return /* call original */ })`
    - Call signing → assert `signature_algo === 'ECDSA-P256-SHA256'` + verify round-trip

    **Pitfall:** Vitest jsdom may lack Ed25519 — try jsdom first; if fails, switch to `// @vitest-environment node` per-file directive (Node 20 has full Ed25519 in WebCrypto).
  </action>
  <verify>
    ```bash
    cd /root/workspace
    pnpm --filter @sortition/web test -- stage1-audit-sign-verify
    pnpm --filter @sortition/web test -- run-audit-sign-verify
    ```
    Both must pass. Negative cases must produce `false` (not throw).
  </verify>
  <done>
    2 new test files (Stage 1 + Stage 3). Round-trip verification + negative case green. ECDSA fallback covered or noted as deferred in EXECUTION.md.
  </done>
</task>

<task id="2">
  <title>P1 #3 — Sidebar / Overview / Routing e2e</title>
  <action>
    Read `apps/web/src/shell/Sidebar.tsx` + `apps/web/src/Overview.tsx` first to find exact testids.

    Create `apps/web/tests/e2e/sidebar-nav.spec.ts`:
    - Default viewport (desktop ≥md so sidebar visible)
    - For each nav-item testid found in Sidebar.tsx (overview/stage1/stage3/docs/beispiele):
      - click → assert `window.location.hash` flips to expected route
      - assert `aria-current="page"` lands on the active item
    - For each disabled item (stage2/stage4 — confirm exact testids):
      - assert `aria-disabled="true"`
      - assert `title` attribute present (tooltip)
    - At <md viewport (375): sidebar must NOT be visible (md:hidden); pill-tabs must be visible (compatibility shim)

    Create `apps/web/tests/e2e/overview.spec.ts`:
    - Visit `#/overview`. Assert hero `<h1>` exists with brand text. Assert 2 workflow cards (use actual Overview.tsx testids). Assert 3 principles cards. Assert Stage-2/4 outside-tool banner text contains "außerhalb" or similar (read Overview.tsx for exact wording).
    - Click each workflow card → URL flips to `#/stage1` / `#/stage3`.

    Create `apps/web/tests/e2e/routing.spec.ts`:
    - For each test-route, set `window.location.hash` then assert `mode` (via visible elements):
      - `''`, `'#'`, `'#/'` → default landing `#/stage3` (assert Stage 3 heading visible: "Pool importieren")
      - `'#/foobar'` → catch-all to stage3
      - `'#/docs/notARoute'` → falls back to docs/hub (assert `docs-hub` testid visible)
      - `'#/docs/glossar/sortition'` → docs page-glossar visible AND `dt#sortition` is the visible/scrolled element (Glossar.tsx:26-36 deep-link logic)
  </action>
  <verify>
    ```bash
    cd apps/web
    pnpm exec playwright test --project=chromium tests/e2e/sidebar-nav.spec.ts tests/e2e/overview.spec.ts tests/e2e/routing.spec.ts
    ```
    All new tests pass on chromium. (Firefox covered via CI matrix.)
  </verify>
  <done>
    3 new spec files green. Sidebar + Overview + routing edge cases covered.
  </done>
</task>

<task id="3">
  <title>P1 #4 — AuditFooter schema-0.4 field-rendering parity</title>
  <action>
    Read `apps/web/src/stage1/AuditFooter.tsx` to map every dt label rendered.

    Create `apps/web/tests/e2e/audit-footer-parity.spec.ts`:
    - Run a full Stage-1 draw (upload fixture CSV → axes → params → draw — copy the setup pattern from `stage1.spec.ts`)
    - Wait for `stage1-result` visible, then `stage1-audit-footer` visible
    - Click the audit-JSON download → wait for the download → save to a buffer
    - Parse the JSON
    - For each mandatory field in the audit object, assert that the rendered AuditFooter (`page.getByTestId('stage1-audit-footer')`) contains the value in some form (use `getByText(String(value))` scoped to the footer locator)
    - Specifically iterate: `algorithm_version`, `tie_break_rule`, `key_encoding`, `stratum_sort`, `seed`, `seed_source`, `input_csv_filename`, `input_csv_size_bytes`, `input_csv_sha256` (full or first-12-chars), `pool_size`, `target_n`, `actual_n`, `stratification_axes` (joined), `strata.length`, `warnings.length`, `duration_ms`, `timestamp_iso`
    - For `selected_indices`: open the `<details>` element and assert summary count text matches `actual_n`
    - For optional fields when present (`derived_columns`, `forced_zero_strata`, `sample_size_proposal`): assert their respective testids visible

    **Pitfall:** scope every assertion to the footer locator to avoid false-positive text matches elsewhere on the page (page title, sidebar, etc.).
  </action>
  <verify>
    ```bash
    cd apps/web
    pnpm exec playwright test --project=chromium tests/e2e/audit-footer-parity.spec.ts
    ```
    All field parity assertions pass.
  </verify>
  <done>
    1 new spec, every mandatory schema-0.4 field checked for footer rendering.
  </done>
</task>

<task id="4">
  <title>P1 #5 — Stage 3 RunPanel + run-audit unit coverage</title>
  <action>
    Create `apps/web/tests/e2e/stage3.spec.ts`:
    - Inline a minimal CSV string (n=20 persons, ~3 columns: person_id, district, age_band) to keep test self-contained
    - Upload via Stage 3 file input
    - Configure quotas: panel_size=6, one category (e.g. district) with min/max bounds that are obviously satisfiable
    - Click `run-start` → wait for `run-result` (timeout 60s, single test serial)
    - Click `run-export-audit` → wait for download → parse JSON
    - Assert: `schema_version`, `engine.id`, `algorithm`, `selected.length === 6`, every `quota_fulfillment.ok === true`, `selected[]` is sorted ascending
    - Optional cancel test (separate `test()` block in same file): start → click `run-cancel` immediately → assert `run-error` text contains some abort marker

    Create `apps/web/tests/unit/run-audit.test.ts`:
    - `inputSha256` of `'abc'` → known SHA-256 hex `'ba7816bf...'` (FIPS-180-4 worked example)
    - `canonicalQuotas` with same categories in different order → same string output (order-independence)
    - `buildAudit` populates every documented field (schema-version, engine, algorithm, panel_size, pool_size, etc.)

    Note: `selectedToCsv` is also worth testing if quick (1 fixture, 1 expected output).
  </action>
  <verify>
    ```bash
    cd apps/web
    pnpm exec playwright test --project=chromium tests/e2e/stage3.spec.ts
    pnpm test -- run-audit
    ```
  </verify>
  <done>
    Stage 3 e2e + run-audit unit green.
  </done>
</task>

<task id="5">
  <title>P1 #7 — Mulberry32 known-vector + edge cases (cheaper than P1 #6, do first)</title>
  <action>
    Read `packages/core/src/pool/mulberry32.ts` to confirm export name and signature.

    Generate the known-vector fixture in dev:
    ```ts
    // run once locally to get the values, paste into test
    import { Mulberry32 } from '../src/pool/mulberry32';
    const r = Mulberry32(42);
    console.log(Array.from({ length: 5 }, () => r.nextFloat()));
    ```

    Create `packages/core/tests/mulberry32.test.ts`:
    - **Known-vector**: `Mulberry32(42)` first 5 floats → frozen literal array. Test asserts equality.
    - **Determinism**: two instances with same seed produce same sequence (10 floats).
    - **Edge case seed=0**: `Mulberry32(0).nextFloat()` doesn't return NaN; first 5 floats are well-formed (0 ≤ x < 1).
    - **Period sanity**: 10000 draws, no early repeat of the first value.
    - **uint32 normalization**: if the function uses `seed | 0` or similar, `Mulberry32(2**32)` should equal `Mulberry32(0)` — verify or document the actual behavior.
    - **Range invariant**: every nextFloat() returns x where 0 ≤ x < 1.

    Don't include cross-runtime parity vector here unless `scripts/stage1_reference.py` Mulberry32 is trivially callable from a Node test (probably not).
  </action>
  <verify>
    ```bash
    pnpm --filter @sortition/core test -- mulberry32
    ```
  </verify>
  <done>
    1 new test file, ≥5 test cases, all green.
  </done>
</task>

<task id="6">
  <title>P1 #8 — A11y axe-core integration</title>
  <action>
    Add dev dep:
    ```bash
    cd apps/web
    pnpm add -D @axe-core/playwright
    ```

    Replace `apps/web/tests/e2e/a11y.spec.ts` content:
    ```ts
    import { test, expect } from '@playwright/test';
    import AxeBuilder from '@axe-core/playwright';

    const ROUTES = ['#/stage1', '#/stage3', '#/overview', '#/docs', '#/docs/algorithmus'];

    for (const hash of ROUTES) {
      test(`a11y: ${hash} has no axe violations`, async ({ page }) => {
        await page.goto('./');
        await page.evaluate((h) => { window.location.hash = h; }, hash);
        await page.waitForTimeout(500); // Solid render settle
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();
        // Snapshot baseline: assert violations count is exactly N (current count).
        // If violations is 0, expect.toEqual(0). If >0, document in EXECUTION.md
        // and snapshot the count as the regression baseline. Future PRs that
        // increase violations fail; future PRs that decrease should adjust the
        // baseline.
        expect(results.violations.length, JSON.stringify(results.violations.map(v => ({ id: v.id, nodes: v.nodes.length })), null, 2)).toBe(/* baseline */ 0);
      });
    }

    // Keep skin-check safety net for cheap signals
    test('exactly one h1 on home', async ({ page }) => {
      await page.goto('./');
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBe(1);
    });

    test('icon-only buttons have aria-label', async ({ page }) => {
      await page.goto('./');
      const buttons = await page.locator('button').all();
      for (const btn of buttons) {
        const text = (await btn.textContent())?.trim() ?? '';
        const ariaLabel = await btn.getAttribute('aria-label');
        expect(text || ariaLabel, `button has neither text nor aria-label`).toBeTruthy();
      }
    });
    ```

    **Run locally** to discover the actual violation count per route. If any route has >0 violations:
    - Trivial fixes (missing `aria-label` on a button, missing `for` on a label) — fix inline in the source. Document in EXECUTION.md.
    - Non-trivial (color-contrast on the new sidebar tokens, complex landmark structure) — set the baseline to current count + document in EXECUTION.md as known follow-up issue.

    Add `aria-disabled="true"` assertions for nav-stage2/4 if they exist as separate test in the same file.
  </action>
  <verify>
    ```bash
    cd apps/web
    pnpm exec playwright test --project=chromium tests/e2e/a11y.spec.ts
    ```
    All baseline-asserted counts pass.
  </verify>
  <done>
    a11y.spec.ts replaced with axe-core baseline. Any non-trivial violations documented in EXECUTION.md.
  </done>
</task>

<task id="7">
  <title>P1 #9 — Mobile touch-targets sidebar + overview coverage</title>
  <action>
    Modify `apps/web/tests/e2e/mobile-touch-targets.spec.ts`:

    Add at end of file:
    ```ts
    test('overview workflow cards have ≥44px touch targets at 375px', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('./');
      await page.evaluate(() => { window.location.hash = '#/overview'; });
      await page.waitForTimeout(300);
      // Assert workflow cards (use actual testids from Overview.tsx)
      for (const tid of ['overview-card-stage1', 'overview-card-stage3']) {
        const card = page.getByTestId(tid);
        await expect(card).toBeVisible();
        const box = await card.boundingBox();
        expect(box, tid).not.toBeNull();
        expect(box!.width, `${tid} width`).toBeGreaterThanOrEqual(44);
        expect(box!.height, `${tid} height`).toBeGreaterThanOrEqual(44);
      }
    });

    test('sidebar nav-* items have ≥44px touch targets at 1280px', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto('./');
      // Read the actual nav-* testids from Sidebar.tsx
      for (const tid of ['nav-overview', 'nav-stage1', 'nav-stage3', 'nav-docs']) {
        const navItem = page.getByTestId(tid);
        await expect(navItem).toBeVisible();
        const box = await navItem.boundingBox();
        expect(box, tid).not.toBeNull();
        expect(box!.width, `${tid} width`).toBeGreaterThanOrEqual(44);
        expect(box!.height, `${tid} height`).toBeGreaterThanOrEqual(44);
      }
    });
    ```

    Replace the example testids with the ACTUAL ones from reading the source files.
  </action>
  <verify>
    ```bash
    cd apps/web
    pnpm exec playwright test --project=chromium tests/e2e/mobile-touch-targets.spec.ts
    ```
  </verify>
  <done>
    Sidebar and Overview touch-targets asserted; spec stays green.
  </done>
</task>

<task id="8">
  <title>P1 #6 — TS↔Python cross-runtime parity in CI (do LAST — most likely to need follow-up)</title>
  <action>
    Inspect `scripts/stage1_cross_validate.sh` and `scripts/stage1_reference.py` first.
    - If the script + reference work out-of-the-box: add CI job
    - If they need non-trivial setup: document as known-followup in EXECUTION.md, mark this sub-task `[~] partial — see EXECUTION` and SKIP

    If proceeding with CI job:

    Add to `.github/workflows/deploy.yml` (after the `e2e` job):
    ```yaml
    cross-runtime-parity:
      needs: build
      runs-on: ubuntu-latest
      timeout-minutes: 10
      steps:
        - uses: actions/checkout@v4
        - uses: pnpm/action-setup@v4
        - uses: actions/setup-node@v4
          with: { node-version: 20, cache: pnpm }
        - uses: actions/setup-python@v5
          with: { python-version: '3.12' }
        - name: Install pnpm deps
          run: pnpm install --frozen-lockfile
        - name: Install Python ref deps
          run: |
            if [ -f scripts/requirements.txt ]; then
              pip install -r scripts/requirements.txt
            else
              # Inline deps if no requirements.txt — adjust based on what stage1_reference.py imports
              pip install pyyaml
            fi
        - name: Run cross-runtime parity
          run: bash scripts/stage1_cross_validate.sh
    ```

    Update `deploy: needs: [build, e2e, cross-runtime-parity]` if you add this job.
  </action>
  <verify>
    Locally: `bash scripts/stage1_cross_validate.sh` (after pip install). If green: ship.
    Workflow YAML valid: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy.yml'))"`
  </verify>
  <done>
    Either CI job added + locally green OR documented as known-followup with reason.
  </done>
</task>

<task id="9">
  <title>Update #68 backlog status for every shipped sub-item</title>
  <action>
    For every shipped task above, edit `.issues/68-test-coverage-gap-backlog/ISSUE.md`:
    - Find the corresponding `### N. <title>` section
    - Insert `**STATUS:** Implementiert via #70 (commit-range siehe dort).` as the first line under the heading.

    Sub-items shipped: P0 #2, P1 #3, P1 #4, P1 #5, P1 #7, P1 #8, P1 #9. P1 #6 only if task 8 succeeded.

    Don't touch P2 items.
  </action>
  <verify>
    ```bash
    grep -c 'STATUS.*Implementiert via #70' .issues/68-test-coverage-gap-backlog/ISSUE.md
    # Expected: 6-7 hits (one per shipped sub-item)
    ```
  </verify>
  <done>
    Status lines in #68 reflect every shipped item.
  </done>
</task>

<task id="10">
  <title>Self-review via issue-cli review-exec + finalize</title>
  <action>
    From the worktree root, write a review prompt to `/tmp/review-70.md` (use `/issue:review` skill format from earlier sessions — guide reviewers on which test files are new, what schema-0.4 fields are asserted, axe-core baseline rationale, etc.).

    Run:
    ```bash
    issue-cli review-exec \
      --prompt /tmp/review-70.md \
      --name 70-test-coverage-sprint \
      --review-type issue \
      --review-mode implementation \
      --output-dir .issues/70-test-coverage-sprint/reviews
    ```

    Address Critical/High findings inline; document Medium/Low in EXECUTION.md.

    Mark issue done:
    ```bash
    issue-cli store update-status 70-test-coverage-sprint in_progress --worktree "$(pwd)"
    issue-cli store update-status 70-test-coverage-sprint done --worktree "$(pwd)"
    ```

    Commit ISSUE.md + EXECUTION.md + reviews:
    ```bash
    git add .issues/70-test-coverage-sprint/ISSUE.md .issues/70-test-coverage-sprint/EXECUTION.md .issues/70-test-coverage-sprint/reviews/
    git commit -m "70: docs(issues): execution log run-1 + reviews + mark done"
    ```
  </action>
  <verify>
    ```bash
    issue-cli store load 70-test-coverage-sprint --worktree "$(pwd)" --json | python3 -c "import json,sys;d=json.load(sys.stdin);print(d['status'])"
    # Expected: done
    ls .issues/70-test-coverage-sprint/reviews/
    # Expected: 1+ review files
    ```
  </verify>
  <done>
    Review run, findings addressed, EXECUTION.md committed, status done.
  </done>
</task>

## Verification Strategy (overall)

- Per-task: vitest or playwright targeting the new spec
- End: full local `pnpm test` + `pnpm exec playwright test --project=chromium` must stay green (no regression)
- Bundle: no source changes → no bundle delta expected
- Workflow: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy.yml'))"` if task 8 ships

## Rollback

Per-task commits → `git revert <task-N-commit>` reverts that sub-item only. PR can be split if reviewer wants finer granularity.

## Estimated Scope

**Medium-Large.** ~600-1000 LOC of test code + ~30 LOC workflow + 1 dev dep. Should complete in one executor run if no rate limit hits. If rate limit: same auto-resume pattern as #65.
