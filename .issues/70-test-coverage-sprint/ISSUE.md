---
id: '70'
title: 'Test Coverage Sprint — close #68 P0 #2 + all P1 items'
status: open
priority: high
labels:
- testing
- quality
- from-#68
- sprint
---

## Kontext

Test-Coverage-Sprint, der die verbleibenden **P0 + alle P1-Items aus #68** in einer fokussierten Iteration schließt. Auslöser: nach #65-Merge brach die Live-Smoke (gefixt in `cb9d6e1`), dann hat ein 3-LLM-Review (Claude/Codex/Gemini, alle FAIL) systemische Test-Lücken aufgedeckt, die in #68 als Backlog getrackt sind. #69 hat bereits **P0 #1** (Playwright e2e in CI) gemerged — jetzt müssen die übrigen Critical/High-Lücken folgen, sonst hat das CI-Gate keine Test-Substanz, die es gaten kann.

**Diese Issue ist ein Implementierungs-Auftrag**, kein Tracker. Sie bündelt mehrere kleine Sub-Issues in eine fokussierte PR, weil:
- alle Items orthogonale Test-Surfaces betreffen → kein Merge-Konflikt-Risiko
- separate PRs würden 7× den Pipeline-Overhead erzeugen
- Reviewer kann zusammen besser bewerten ob die Coverage-Linie konsistent ist
- alle Items sind reine Test-Additionen — kein Source-Code-Risiko

Bei jedem Item: **Tests ergänzen + verifizieren dass sie gegen aktuellen Code grün sind** (sie sollen Regression-Detektoren sein, nicht Bug-Aufdecker — sonst werden es zu separaten Bug-Fix-Issues).

## Sub-Items aus #68 (in Implementierungs-Reihenfolge)

### P0 #2 — Audit-Signing Round-Trip-Verifikation (Stage 1 + Stage 3)

- **Konsens-Finding:** Claude C3, Codex H3, Gemini M1
- **Files to add:**
  - `apps/web/tests/unit/stage1-audit-sign-verify.test.ts` — happy path: signiere `Stage1AuditDoc`-Fixture → importiere Public Key via `crypto.subtle.importKey('raw', ..., 'Ed25519', false, ['verify'])` → `crypto.subtle.verify` → muss `true` sein. Negativ: ein Byte des Body kippen → `false`.
  - `apps/web/tests/unit/run-audit-sign-verify.test.ts` — analog für `apps/web/src/run/audit.ts:151-169` (Stage 3).
- **Optional:** ECDSA-fallback-forced test (P2 #10): `vi.spyOn(crypto.subtle, 'generateKey')` patcht für `name: 'Ed25519'` → throws → assert `signature_algo === 'ECDSA-P256-SHA256'` + Round-Trip.
- **Skip:** Python verifier extension (`scripts/verify_stage1_audit.py`) — separate Issue, nicht blocking.

### P1 #3 — Post-#65 Komponenten-Coverage (Overview, Sidebar, Brand, NavGroup)

- **Konsens-Finding:** Claude H1, Codex H1, Gemini H1
- **Files to add:**
  - `apps/web/tests/e2e/sidebar-nav.spec.ts` (≥md viewport, default Playwright):
    - Visit `/`. Click each NavLink (`nav-overview`, `nav-stage1`, `nav-stage3`, `nav-docs`, `nav-beispiele`). Assert URL hash flips correctly. Assert `aria-current="page"` lands on the active item.
    - Assert disabled items (`nav-stage2`, `nav-stage4` if those testids exist; otherwise grep Sidebar.tsx for actual testids) render with `aria-disabled="true"` and have a `title` attribute.
    - Assert sidebar visible at md+, hidden at <md (use `setViewportSize`).
  - `apps/web/tests/e2e/overview.spec.ts`:
    - Visit `#/overview`. Assert hero h1 exists. Assert 2 workflow cards (`overview-card-stage1`, `overview-card-stage3` — or actual testids in Overview.tsx). Assert 3 principles cards. Assert Stage-2/4 outside-tool banner text.
    - Click each workflow card → assert URL flips to `#/stage1` / `#/stage3`.
  - `apps/web/tests/e2e/routing.spec.ts`:
    - Visit `''`, `'#'`, `'#/'` → assert default landing is `#/stage3` (per CONTEXT.md decision in #65).
    - Visit `'#/foobar'` → catch-all to stage3.
    - Visit `'#/docs/notARoute'` → falls back to `#/docs/hub` (parseHash logic at App.tsx:88-93).
    - Visit `'#/docs/glossar/sortition'` → assert `#docs-page-glossar` visible AND `<dt id="sortition">` is scrolled into view (Glossar.tsx:26-36).
- **Coverage-Boost:** Brand component is rendered in Sidebar — testing Sidebar covers Brand transitively. NavGroup is tested via the disabled-Stage-2/4 assertions.

### P1 #4 — AuditFooter schema-0.4 Field-Rendering-Parity

- **Konsens-Finding:** Claude H2, Codex H2, Gemini H2
- **Approach:** e2e parity-test (Option A from review — cheaper than Solid-component test for first iteration; #15 P2 stays open as foundation for component layer).
- **Files to add/modify:**
  - Extend `apps/web/tests/e2e/stage1.spec.ts` (or new `audit-footer-parity.spec.ts`): after a Stage 1 draw, download the audit JSON via `page.waitForEvent('download')`, parse it, then walk every mandatory schema-0.4 field and assert the corresponding rendered DD cell contains `String(value)` or its localized form.
  - Specifically assert: `algorithm_version`, `tie_break_rule`, `key_encoding`, `stratum_sort`, `seed`, `seed_source`, `input_csv_filename`, `input_csv_size_bytes`, `input_csv_sha256`, `pool_size`, `target_n`, `actual_n`, `selected_indices` (collapsed `<details>` summary count = `actual_n`), `stratification_axes`, `strata.length`, `warnings.length`, `duration_ms`, `timestamp_iso`, signature triplet.

### P1 #5 — Stage 3 RunPanel Contract-Coverage

- **Konsens-Finding:** Claude H4, Codex H4
- **Files to add:**
  - `apps/web/tests/e2e/stage3.spec.ts`:
    - Upload n=20 fixture (use one of the existing `tests/fixtures/synthetic-pools/` files if small; else generate inline)
    - Configure quotas (panel_size=6, one category min/max)
    - Click run → wait for `run-result`
    - Download audit JSON → parse → assert `schema_version`, `engine.id`, `algorithm`, `selected.length === panel_size`, every `quota_fulfillment.ok === true`, `selected[]` sorted
    - Optional: cancel test (start → click `run-cancel` → assert `run-error` text contains "abgebrochen" or similar)
  - `apps/web/tests/unit/run-audit.test.ts`:
    - `inputSha256` on a known string → known hex (FIPS-180-4 worked example)
    - `canonicalQuotas` order-independence (swap categories array → same string)
    - `buildAudit` populates every mandatory field

### P1 #6 — TS↔Python Cross-Validation in CI

- **Finding:** Claude H7
- **Workflow change:** new `cross-runtime-parity` job in `.github/workflows/deploy.yml`:
  - Trigger: `pull_request` AND `push` to main
  - `actions/setup-python@v5` with `python-version: '3.12'`
  - Install ref-deps from wherever `scripts/stage1_reference.py` declares them (likely `scripts/requirements.txt` if it exists, else inline `pip install`)
  - Run `scripts/stage1_cross_validate.sh` against 3 fixture pools (smallest available + Umlaut-rich + medium)
  - Fail job if any selected[] array or canonical audit JSON diverges
- **Caveat:** if `scripts/stage1_cross_validate.sh` doesn't exist or fails out-of-the-box, this becomes a follow-up issue — don't block this Sprint on it. Document the situation in EXECUTION.md.

### P1 #7 — Mulberry32 Known-Vector + Cross-Runtime-Parity

- **Finding:** Claude H6
- **Files to add:**
  - `packages/core/tests/mulberry32.test.ts`:
    - Known-vector: `Mulberry32(42)` first 5 floats → frozen fixture (generate once in dev, paste into test as expected array)
    - Edge case: `Mulberry32(0)` doesn't return NaN/0/0/...
    - Period sanity: 10k draws, no early repeat of first value
    - uint32 normalization: `Mulberry32(2**32) === Mulberry32(0)` (verify documented behavior)
    - Cross-runtime parity: matched against `scripts/stage1_reference.py` Mulberry32 — if Python ref isn't easily callable from Vitest, document as known-followup

### P1 #8 — A11y mit axe-core

- **Konsens-Finding:** Claude H8, Gemini M2
- **Setup:** `pnpm add -D @axe-core/playwright` at the workspace root (or in `apps/web/`)
- **Files to add/modify:**
  - Replace `apps/web/tests/e2e/a11y.spec.ts` content with axe-core checks on:
    - `#/stage1` (default route)
    - `#/stage3`
    - `#/overview`
    - `#/docs` and one subpage (e.g. `#/docs/algorithmus`)
  - Each: `expect(await new AxeBuilder({ page }).analyze()).toHaveNoViolations()` (use `expect.extend` adapter from `axe-playwright` if needed; Playwright has built-in matchers for axe via `expect(violations).toHaveLength(0)`)
  - Add explicit assertion for `aria-disabled="true"` on `nav-stage2` + `nav-stage4` (cheap addition, complements P1 #3)
  - Keep the existing 4 skin-checks as a safety net (h1 unique, file input present, button-text, img-alt)
- **Caveat:** axe-core may surface real violations on the existing app. If so, document each in EXECUTION.md and either fix the trivial ones inline OR mark as known-followup. Don't block this Sprint on a non-trivial a11y rewrite.

### P1 #9 — Mobile Touch-Targets Sidebar Coverage

- **Finding:** Gemini M2
- **Modify:** `apps/web/tests/e2e/mobile-touch-targets.spec.ts`:
  - Add a section that visits `#/overview` at 375×812 viewport and asserts every visible interactive element has bounding box ≥44×44
  - Note: at <md the sidebar is hidden — this section verifies the pill-tab nav at <md AND the Overview workflow cards have correct hit boxes
  - At ≥md viewport: add a separate test that asserts every `data-testid="nav-*"` in the sidebar has a 44px minimum hit area (sidebar items are clickable rows)

## Acceptance Criteria

### Tests added
- [ ] P0 #2: 2 new unit-test files (Stage 1 + Stage 3 audit-sign verify); ECDSA fallback test optional but recommended
- [ ] P1 #3: 3 new e2e spec files (sidebar-nav, overview, routing)
- [ ] P1 #4: extended stage1.spec.ts OR new audit-footer-parity.spec.ts
- [ ] P1 #5: 1 new e2e spec (stage3) + 1 new unit (run-audit)
- [ ] P1 #6: new `cross-runtime-parity` workflow job — only if `scripts/stage1_cross_validate.sh` works out-of-box; else document
- [ ] P1 #7: new `packages/core/tests/mulberry32.test.ts`
- [ ] P1 #8: a11y.spec.ts rewritten with axe-core; @axe-core/playwright added as dev dep
- [ ] P1 #9: mobile-touch-targets.spec.ts extended with sidebar + overview coverage

### Tests must pass
- [ ] All new tests green locally (`pnpm test` + `pnpm exec playwright test`)
- [ ] All existing tests stay green (no regression introduced)
- [ ] Tests added are **regression-detectors** for current behavior — not bug-finders. If a test reveals a real bug, document in EXECUTION.md and decide: fix inline or split out to follow-up.

### Bundle / build
- [ ] No source-code changes (only test files + axe dep + workflow)
- [ ] `pnpm build` still succeeds
- [ ] Bundle size unchanged (only dev deps added)

### #68 backlog tracking
- [ ] Mark P0 #2, P1 #3-9 in `.issues/68-test-coverage-gap-backlog/ISSUE.md` as `[x]` with `→ #70` reference
- [ ] P2 items remain open

### Self-review
- [ ] Run `issue-cli review-exec` on the diff before marking done
- [ ] Address Critical/High findings; document Medium/Low in EXECUTION.md

### Process
- [ ] Per-area commits (one per #68 sub-item, conventional format)
- [ ] EXECUTION.md per-task logged with verify results
- [ ] Issue status flipped to `done` at end

## Out of Scope

- P2 items from #68 (separate sprint or individual issues)
- New features (this is purely test additions + workflow)
- Source-code refactoring even if a11y or test setup suggests it
- Mobile drawer (#67 future polish)
- Stage 3 visual redesign

## Verweise

- Tracking: #68 (test-coverage backlog)
- Vorgänger: #69 (e2e CI gate — gemerged via PR #2)
- Reviews: `.issues/test-coverage-gap-audit/reviews/`
- Auslöser: Live-smoke fail nach #65 → commit `cb9d6e1`
- CLAUDE.md "Sprache der Dokumente: Deutsch" + "Kommentare im Code: Englisch"
