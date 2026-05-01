# CONTEXT — 65-visual-redesign-design-handoff

User chose "good defaults, no discussion necessary" (consistent with #66 posture). Decisions locked from the issue body's "Strategische Leitplanken" section + sensible defaults for remaining gray areas. Research and planner must treat these as **non-negotiable**.

## Decisions (locked — research/planner must follow)

### Already locked by ISSUE.md (re-stated for executor convenience)

- **Stack: Solid.js + Tailwind v3.** No React port. Handoff JSX is wireframe + visual spec only.
- **Mobile-first.** `<meta viewport="width=device-width">` (NOT `1280`). Sidebar collapses to hamburger+drawer below `md` (768px). Touch targets ≥44×44.
- **Test-IDs are contract.** All ~70 existing `data-testid`s preserved at the same DOM-nesting level. Print-CSS selectors that target test-IDs continue to match.
- **Hash-routing preserved.** `#/stage1`, `#/stage3`, `#/docs`, `#/docs/<sub>` all stay; new routes `#/overview` added. Sidebar items write `window.location.hash`; existing hashchange listener at `App.tsx:141-144` stays the single source of truth.
- **Audit-Schema is truth.** `Stage1AuditDoc` schema_version 0.4 unchanged; visual audit panel renders all 21 mandatory fields via existing `AuditFooter.tsx` rebound, NOT via `audit.jsx` field labels.
- **DE only.** Handoff `i18n.jsx` EN strings are NOT imported. Asset preserved for future #67 work.
- **Civic-green brand stays** (`--accent: oklch(50% 0.14 145)`, equivalent to existing `#16a34a`). The `--hue` CSS variable indirection is preserved for future themability.
- **Stage-3 untouched in this issue.** #66 already corrected the handoff's Stage-3 copy; this issue does not visually rebuild Stage 3 (Stage 3 production UI is `RunPanel.tsx` + co. and stays as-is).
- **Future polish deferred to #67.** Dark theme TOKEN-block lands in `index.css` but no UI toggle. Density tokens land but no toggle. Accent-hue picker not built. Real Settings screen not built.

### Filled by Claude (gray areas the issue didn't pre-decide)

- **Default landing route stays `#/stage3`.** Rationale: changing the default would force operators with existing bookmarks into an unfamiliar surface. The new `#/overview` is reachable via the sidebar's first nav item but is not the auto-redirect target. Reconsider in a future issue once `#/overview` proves itself.

- **Phasing: ONE executor run, but PLAN.md uses ordered phases.** Phases:
  1. Token system + index.css base layer + tailwind.config extension + font self-hosting
  2. Component primitives in `@layer components` (banner, dropzone, card, btn, input, chip, sample-card, audit-mono, doc-grid, sig-pill, stats-grid, tbl, step-rail)
  3. Shell: sidebar component (≥md) + hamburger+drawer (<md) + Sidebar→hash wiring; preserve top pill-bar test-IDs as a hidden compatibility shim if needed
  4. Stage-1 page: 6-step rail wrapping existing sub-components (no logic changes; only visual nesting)
  5. Audit panel visual rebind in `AuditFooter.tsx`
  6. Docs layout (`DocsLayout.tsx`): sticky 220px TOC + 68ch body + callout + inline-code style — applied to all 8 existing subpages without content changes
  7. New `#/overview` route + `Overview.tsx` page (hero + 2 workflow cards + 3 principles + Stage-2/4 outside-tool note)
  8. Stage-2/4 disabled sidebar items + Stage-3 sidebar item (no Stage-3 visual rework — just nav link to existing `#/stage3` route)
  9. Bundle-delta measurement + `BUNDLE_DELTA.md` writeup
  Phases must commit one-at-a-time with descriptive messages so reverting a single phase is possible. The executor agent should aim to complete 1-3 in one run; phases 4-9 may need follow-up runs.

- **Compatibility shim for top pill-tabs:** ON. The existing top `<nav data-testid="main-nav">` with `tab-stage1 / tab-docs / tab-stage3` MUST remain in the DOM (display: none ≥md, visible <md as a fallback nav). This satisfies `mobile-touch-targets.spec.ts:50-60` and `_visual-iteration.spec.ts:60` without touching tests. The drawer is the PRIMARY <md nav; the pill-bar is a hidden test-contract surface OR the visible mobile drawer trigger row depending on what reads cleaner — executor's call.

- **CSS variable strategy:** keep `--hue`, `--accent*`, `--bg*`, `--ink*`, `--ok*`, `--warn*`, `--err*`, `--gap-*`, `--radius*`, `--row-h`, `--pad-card`, `--sidebar-w`, `--serif`, `--sans`, `--mono`, `--line*` as CSS variables in `index.css` `@layer base`. Tailwind theme.colors and theme.spacing extend block reads them via `'var(--accent)'`-style values where Tailwind needs to know the value (for autocomplete + IntelliSense). This is a hybrid: tokens are the source of truth, Tailwind utilities are a thin sugar layer.

- **OkLCH fallback strategy:** declare browserslist baseline `["chrome >= 111", "firefox >= 113", "safari >= 15.4", "edge >= 111"]` in `package.json` and document. **No PostCSS oklch fallback plugin** — the project's audience is municipalities running modern browsers; older Edge/Firefox-ESR users see a brief un-styled flash, that's acceptable. Reconsider if pilot-kommune feedback shows otherwise.

- **Font subset:** ship full Latin-Extended subsets (no aggressive subset). Three families × 4 weights × ~50KB each ≈ 600KB total raw, ~250KB after compression. Within bundle budget.

- **Font hosting source files:** download from upstream sources committed under `apps/web/public/fonts/` with SPDX-License-Identifier in a `LICENSE.txt` per family:
  - Source Serif 4: Adobe (SIL OFL 1.1) — https://github.com/adobe-fonts/source-serif
  - Inter: Rasmus Andersson (SIL OFL 1.1) — https://github.com/rsms/inter
  - JetBrains Mono: JetBrains (SIL OFL 1.1) — https://github.com/JetBrains/JetBrainsMono
  All three are SIL OFL — compatible with project's GPL-3.0-or-later (font OFL doesn't infect code).

- **Solid component file mapping:** prefer 1:1 reuse of existing Solid component files where possible (`App.tsx`, `Stage1Panel.tsx`, `DocsHub.tsx`, `DocsLayout.tsx`, `AuditFooter.tsx`, etc.). New files only for new screens (`Overview.tsx`, `Sidebar.tsx`, `MobileDrawer.tsx`). Don't mirror the handoff's filename structure 1:1 — it's not a Solid project.

- **Pulse animation keyframe** (`@keyframes pulse` at `styles.css:794`): keep. Battery cost is negligible, the visual cue is functional. If users complain on `prefers-reduced-motion`, that's a future polish item.

- **Print CSS:** preserve every existing `@media print` rule from `index.css:163-235`. The redesign may add new `@media print` rules for new components (e.g. sidebar `display: none`), but must NOT delete existing rules. Test-ID selectors in print rules continue to match because of the test-ID-preservation rule.

- **Bundle-delta budget:** `+50 KB raw / +18 KB gzip` post-redesign vs current main. Self-hosted-fonts dominate the budget (~30KB raw / ~12KB gzip just for the woff2 files referenced in CSS — the binary fonts themselves are payload-on-demand). If exceeded, executor reports — issue gets re-opened, not silently exceeded.

- **Visual smoke screenshots:** executor takes Playwright screenshots at 5 iteration points (Sidebar/Drawer, Stage-1-Card, Audit-Panel, Doc-Layout, Overview), Desktop+Mobile each → 10 total. Store under `.issues/65-visual-redesign-design-handoff/iteration/<step>-<viewport>.png`. Use the existing `_visual-iteration.spec.ts` machinery as the template.

- **Test gate:** all existing Vitest + Playwright e2e MUST stay green at end of execution. If any test breaks for non-test-id reasons (e.g. CSS class rename actually breaks a class-based selector), the executor may update the test selector to a `data-testid` equivalent — but only as a last resort, with EXECUTION.md noting the change.

## Claude's Discretion (research/planner can refine)

- Exact CSS class naming for the new `@layer components` (e.g. `.banner-info` vs `.banner.info` — handoff uses the latter; existing `.btn-primary` uses the former). Executor picks consistently.
- How `Sidebar.tsx` exposes nav state (props vs context vs Solid signal). Default: signal lifted to `App.tsx`, passed via props (matches existing pattern).
- Drawer animation: simple width/transform transition, no library. Opacity backdrop overlay.
- Whether `#/overview` content is server-rendered (static HTML in main.tsx) or client-rendered (lazy-loaded Solid component). Default: client-rendered, matches DocsHub pattern (`App.tsx:16`).
- Specific oklch values for `--hue=145` derivations — research can run a contrast checker and adjust by ±0.02 lightness if needed.
- File-naming for new Solid components (`Sidebar.tsx`, `Sidebar/`, `shell/Sidebar.tsx`?). Default: `apps/web/src/shell/{Sidebar,MobileDrawer,Brand,NavGroup}.tsx`.

## Deferred (out of scope for this issue)

- Dark-theme UI toggle (#67 item 1). Tokens land here, no UI control.
- Density UI toggle (#67 item 2). Tokens land, no UI control.
- Accent-hue picker (#67 item 3). `--hue` variable lands as `145`, no slider.
- Vollständige EN/DE i18n (#67 item 4). DE-only.
- Real Settings screen (#67 item 5). Sidebar item routes to a small gear-icon popover in iteration 1 OR is deferred entirely if popover is too much scope.
- Drag-and-drop CSV upload (#67 item 6). Drop zone is visually a drop target, click-to-pick is the only behavior.
- Tweaks-panel as dev-tool (#67 item 7). Not loaded.
- Visual-regression test suite with pixel-diff (#67 item 8). Iteration screenshots only, no pixel-diff.
- A11y full audit (#67 item 9). Smoke a11y from existing `a11y.spec.ts` is the gate.
- Brand-mark swap (#67 item 10). Existing Versammlung-icon stays.
- Stage-3 visual rework. Stays as-is on `RunPanel.tsx`. Sidebar links to existing `#/stage3` route.
- Engine B / Pyodide. Strategy decision S-2.

## References

- ISSUE.md "Strategische Leitplanken" section (9 explicit decisions)
- Reviews under `.issues/design-handoff-buergerinnenrat-redesign-review/reviews/` (Claude FAIL with 3 critical / 10 high / 6 medium / 5 low; Codex FAIL with 2 critical / 4 high / 3 medium)
- #56 (superseded), #66 (Stage-3 honest copy — done), #67 (future polish — tracking)
- Design handoff: `design_handoff_buergerinnenrat/` (now committed in this branch via #66 rebase)
- Prior screenshots from #56: `.issues/archived/56-ui-visual-redesign/{before,after}-screenshots/` for visual reference
- CLAUDE.md L37-44 (Zwei-Stufen-Workflow), L36-37 (Leximin-Gurobi-Pflicht), S-1..S-7 strategic decisions
