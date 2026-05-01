# RESEARCH — 70-test-coverage-sprint

Sprint synthesizes #68 backlog research; per-item details already enumerated in #68 (Claude/Codex/Gemini reviews under `.issues/test-coverage-gap-audit/reviews/`). This RESEARCH.md is a slim cross-reference + interface map for the executor.

## User Constraints (from CONTEXT.md, condensed)

- Single PR for 7 sub-items; per-area commits; revert-per-item possible
- Tests are regression-detectors; don't fix bugs inline (split to follow-up)
- No source-code changes
- Self-review at end
- Update #68 status per shipped item

## Summary

7 test-coverage gaps from #68 (1 P0 + 6 P1) bundled into one sprint. Each sub-item is independent — no shared state, no order dependency beyond commit narrative. Estimated ~600-1000 LOC of new test code + ~30 LOC workflow + ~50 LOC config across:
- `apps/web/tests/unit/` (audit-sign verify, run-audit unit)
- `apps/web/tests/e2e/` (sidebar-nav, overview, routing, audit-footer-parity, stage3, mobile-touch-targets-extended)
- `packages/core/tests/` (mulberry32)
- `.github/workflows/deploy.yml` (cross-runtime-parity job)
- `apps/web/playwright.config.ts` (potentially axe-core integration hooks)
- `apps/web/package.json` (axe-core dep)
- `apps/web/tests/e2e/a11y.spec.ts` (replace skin-check with axe)

## Codebase Analysis

### Interfaces

<interfaces>
// === apps/web/src/stage1/audit-sign.ts (Stage 1 signer) ===
//   tryGenerateEd25519KeyPair() → CryptoKeyPair | null
//   signWithEd25519(privateKey, bytes) → Uint8Array
//   tryGenerateEcdsaP256KeyPair() → CryptoKeyPair | null  (fallback)
//   signWithEcdsa(privateKey, bytes) → Uint8Array
//   exportSpkiPublicKey(publicKey) → string (base64)
//   exportRawPublicKey(publicKey) → string (base64)
//   signStage1Audit(doc: Stage1AuditDoc) → Promise<{
//     doc: Stage1AuditDoc, // with signature/public_key/signature_algo populated
//     bodyJson: string,    // canonical JSON of stripped doc that was signed
//   }>
//
// Verification path (currently absent in tests):
//   import the public_key (raw for Ed25519, spki for ECDSA)
//   crypto.subtle.verify(
//     { name: 'Ed25519' } | { name: 'ECDSA', hash: 'SHA-256' },
//     publicKey,
//     base64Decode(signature),
//     new TextEncoder().encode(bodyJson)
//   ) → boolean

// === apps/web/src/run/audit.ts (Stage 3 signer) ===
//   buildAudit(args: { engineId, algorithm, panelSize, pool, quotas, result, seed }) → AuditDoc
//   inputSha256(canonicalString: string) → Promise<string>
//   canonicalQuotas(quotas: QuotaConfig) → string  // order-independent
//   selectedToCsv(selected: string[], pool: Person[]) → string
//   signAudit(audit: AuditDoc) → Promise<SignedAudit>

// === apps/web/src/Overview.tsx (#65 new) ===
//   Default export: Overview component
//   Mounts: hero h1 "Bürger:innenrat", lede paragraph,
//     "Was dieses Werkzeug abdeckt" h2 (or similar),
//     2 workflow cards (Stage 1 verfügbar / Stage 3 Konzept) — testids likely
//       overview-card-stage1, overview-card-stage3 (verify by Read)
//     Stage 2/4 outside-tool banner — testid likely overview-stages-outside or similar
//     3 principle cards from TRUST_PRINCIPLES export of TrustStrip.tsx

// === apps/web/src/shell/Sidebar.tsx (#65 new) ===
//   Default export: Sidebar component
//   Renders nav-overview, nav-stage1, nav-stage3, nav-docs, nav-beispiele links
//     (clicks write window.location.hash via App.tsx pattern)
//   Renders disabled nav-stage2, nav-stage4 (or similar) with aria-disabled="true" + title
//   aria-current="page" on active item
//   md:hidden at <md (matches the App.tsx pill-tab compatibility shim — pill-tabs visible <md, sidebar visible ≥md)

// === apps/web/src/App.tsx (#65 routing) ===
//   parseHash(hash: string): { mode: AppMode, docsRoute: DocsRoute }
//   AppMode = 'overview' | 'stage1' | 'stage3' | 'docs'
//   Default landing: '#/stage3' (catch-all for empty/unknown hashes)

// === apps/web/src/stage1/AuditFooter.tsx (#65 expanded to schema 0.4) ===
//   Renders 21 mandatory + 4 optional + 3 signature fields per Stage1AuditDoc
//   testids: audit-footer-hash, audit-footer-sig, audit-footer-sig-algo,
//     audit-footer-derived, audit-footer-sample-size, audit-footer-forced-zero
//   The 17 mandatory dt/dd rows are NOT covered by per-row testids today
//     → e2e parity test downloads JSON, walks fields, asserts text presence

// === apps/web/src/run/RunPanel.tsx (Stage 3) ===
//   testids: run-panel, run-seed, run-start, run-cancel, run-progress,
//     run-error, run-result, run-export-csv, run-export-audit
//   Currently only run-result + run-export-* asserted in end-to-end.spec.ts

// === packages/core/src/pool/mulberry32.ts ===
//   Mulberry32(seed: number) → { nextFloat(): number }
//   Used by stratify (Stage 1) and synthetic generator
//   Currently no direct test (only transitive via stratify.test.ts)

// === scripts/stage1_reference.py + stage1_cross_validate.sh ===
//   Python reference impl of Mulberry32 + Hamilton + Fisher-Yates
//   Cross-validate script runs both, diffs outputs
//   NOT currently invoked in CI

// === apps/web/tests/e2e/a11y.spec.ts (current — 32 LOC skin) ===
//   Single test asserts: input[type=file] count > 0, every button has text/aria-label,
//     every img has alt, exactly one h1
//   To replace with @axe-core/playwright

// === apps/web/tests/e2e/mobile-touch-targets.spec.ts ===
//   Currently tests pill-tabs (tab-stage1/docs/stage3), docs-tile-*, trust-card-*,
//     stage1-* form controls, stage1-strata-table overflow-x, stage1-run sticky+safe-area
//   Need to add: nav-* sidebar items at ≥md, overview workflow cards at <md
</interfaces>

## Standard Stack

- Vitest 2.1.8 (jsdom) + Playwright 1.49.1 (chromium + firefox) — already configured
- `@axe-core/playwright` — to add as dev dep (pnpm `@axe-core/playwright`)
- Python 3.12 in CI for cross-runtime parity (actions/setup-python@v5)
- No new runtime deps needed

## Don't Hand-Roll

- Don't write your own crypto.subtle wrapper for verify — use the global directly
- Don't build a custom a11y rule set — axe-core has it
- Don't reimplement Mulberry32 in test code — import from `packages/core/src/pool/mulberry32.ts`
- Don't fork the Python ref — use `scripts/stage1_reference.py` as-is

## Architecture Patterns

- **Test placement:** unit tests under `apps/web/tests/unit/` or `packages/core/tests/`. e2e under `apps/web/tests/e2e/`. Smoke under `apps/web/tests/smoke-live/` (untouched).
- **Per-area commit:** one commit per #68 sub-item with subject `test(area): description (#68 P? #?)`. Allows revert-per-item.
- **Test naming:** match existing convention — `<feature>.test.ts` for unit, `<surface>.spec.ts` for e2e. New files at the same level as their peers.
- **Fixture sharing:** if a fixture works for multiple tests (e.g. signed Stage1AuditDoc for verify + parity), put it in a shared helper (e.g. `apps/web/tests/fixtures/stage1-audit-fixture.ts`).

## Common Pitfalls

1. **Ed25519 in jsdom:** Vitest jsdom may not have full WebCrypto Ed25519 support. Verify locally — if missing, gate the test on `if (typeof crypto.subtle.importKey === 'function' && /* probe */)` skip OR run via `vitest --environment=node` which has Node 20 WebCrypto.
2. **axe-core false-positive regressions:** the existing app likely has 5-15 axe violations (missing landmark, color-contrast on disabled items, etc.). Don't gate the sprint on fixing them — convert to `expect.toHaveLength(<currentCount>)` baseline + document each in EXECUTION.md.
3. **Cross-runtime parity Python deps:** `scripts/stage1_reference.py` likely needs `pip install ...`. If `scripts/requirements.txt` exists, use it; otherwise `pip install pyyaml` or whatever the script imports. If the script fails on Linux due to a Python 3.12 vs 3.11 incompat, document and skip.
4. **Mulberry32 known-vector generation:** generate the fixture in dev, paste into the test as a literal array. Don't re-generate at runtime (defeats the purpose).
5. **Stage 3 e2e fixture:** the existing `tests/fixtures/synthetic-pools/` files are large (200-2000 rows). For the n=20 test, either (a) inline a small CSV string OR (b) point to the smallest existing fixture and `slice(0, 20)`. Inline is simpler.
6. **AuditFooter parity assertion granularity:** asserting "the rendered DOM contains String(value)" can false-positive if a value happens to appear elsewhere on the page. Scope each assertion to `page.getByTestId('stage1-audit-footer').getByText(...)` so it's footer-local.
7. **Sidebar testids:** I haven't confirmed the exact `data-testid` strings on the new Sidebar. Executor must Read `apps/web/src/shell/Sidebar.tsx` first to find the actual testids — the names in this RESEARCH.md (`nav-overview`, `nav-stage1`, etc.) are educated guesses.
8. **AuditFooter mounted only after Stage-1 draw:** the e2e parity test must run a full Stage-1 flow (upload CSV → axes → params → draw) before asserting; can't test in isolation without Solid component layer (which is P2 #15).
9. **`fail-fast: false` for cross-runtime matrix:** so one OS failing doesn't kill the others (none yet, but defensive).
10. **Don't commit `.issues/70-...` artifacts mid-execution:** wait for end-of-task per CONTEXT.md.

## Environment Availability

- Node 20 + pnpm + Playwright + Vitest already in container
- `@axe-core/playwright` to add (1 dep, ~50 KB)
- Python 3.12 needs `actions/setup-python@v5` in workflow (not in dev container — but executor's local verify can skip the cross-runtime test if Python ref isn't trivially runnable)

## Project Constraints (from CLAUDE.md)

- "Sprache der Dokumente: Deutsch" — test names, comments in English (per existing convention); deutsch nur in `.issues/` und docs.
- "Keine positive Affirmation" — test descriptions stay factual (e.g. "draws are byte-identical for same seed", not "ensures the algorithm is correct")
- All ~70+ existing test-IDs preserved (non-negotiable, per #65 contract)

## Sources

- HIGH — `.issues/test-coverage-gap-audit/reviews/` (the 3-LLM review file:line evidence)
- HIGH — `.issues/68-test-coverage-gap-backlog/ISSUE.md` (per-item enumeration with Konsens-Findings)
- HIGH — `.issues/70-test-coverage-sprint/ISSUE.md` (this issue's body — the spec)
- HIGH — `apps/web/src/stage1/audit-sign.ts`, `apps/web/src/run/audit.ts` (signing surfaces — Read at executor time)
- HIGH — `apps/web/src/Overview.tsx`, `apps/web/src/shell/Sidebar.tsx` (#65 new — Read at executor time for actual testids)
- HIGH — `apps/web/tests/e2e/a11y.spec.ts`, `apps/web/tests/e2e/mobile-touch-targets.spec.ts` (current state to extend)
- HIGH — `apps/web/playwright.config.ts` (already has `testIgnore: ['**/_*.spec.ts']` from #69)
- MEDIUM — `scripts/stage1_cross_validate.sh`, `scripts/stage1_reference.py` (verify they run before relying)
- MEDIUM — Mulberry32 known-vector — generate in dev, freeze in test

## Open Questions for Planner

1. Confirm exact testids in Sidebar.tsx + Overview.tsx (Read these files first)
2. Confirm `scripts/stage1_cross_validate.sh` is invokable; if not, file as known-followup
3. Decide axe-core baseline strategy: zero-violations OR snapshot-current-violations (recommend snapshot for first iteration)
4. Confirm Vitest jsdom WebCrypto Ed25519 support; switch to node env if needed
