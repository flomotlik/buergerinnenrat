# Bundle Delta — Issue #65 (Visual redesign + design handoff adoption)

**Build:** `VITE_BASE_PATH=/ pnpm --filter @sortition/web build` (Vite 6, sourcemaps enabled).
**Baseline:** post-#64 (`index-*.js` 132.82 KB raw / 43.39 KB gzip; `index-*.css` 44.47 KB raw / 7.41 KB gzip).
**Post:** commits 70735a5..d730d14 on `issue/65-visual-redesign-design-handoff` (Phases 1–3, 5–8).
**Date:** 2026-04-30.

| Asset                          | Baseline (KB) | After (KB) | Delta (KB) |
| ------------------------------ | ------------: | ---------: | ---------: |
| dist/assets/index-*.js (raw)   |        132.82 |     137.40 |      +4.58 |
| dist/assets/index-*.js (gzip)  |         43.39 |      44.84 |      +1.45 |
| dist/assets/index-*.css (raw)  |         44.47 |      45.00 |      +0.53 |
| dist/assets/index-*.css (gzip) |          7.41 |       8.83 |      +1.42 |
| **JS+CSS combined (raw)**      |        177.29 |     182.40 |     +5.11  |
| **JS+CSS combined (gzip)**     |         50.80 |      53.67 |     +2.87  |

**Budget:** +50 KB raw / +18 KB gzip (per CONTEXT.md L55). **Status: well within budget — used ~10 % of raw / ~16 % of gzip headroom.**

## Lazy chunks (separate from main-bundle budget)

| Chunk                    | Raw (KB) | Gzip (KB) |
| ------------------------ | -------: | --------: |
| `Overview-*.js` (new)    |     3.10 |      1.41 |
| `DocsHub-*.js`           |     7.69 |      3.09 |
| `Algorithmus-*.js`       |     7.93 |      3.36 |
| `Beispiele-*.js`         |     5.17 |      2.30 |
| `Bmg46-*.js`             |     2.47 |      1.33 |
| `Glossar-*.js`           |     2.27 |      1.20 |
| `Limitationen-*.js`      |     3.71 |      1.69 |
| `Technik-*.js`           |    12.04 |      3.82 |
| `Verifikation-*.js`      |     5.38 |      2.46 |
| `Term-*.js`              |     7.07 |      3.21 |
| `solid-*.js` (vendor)    |    19.11 |      7.66 |
| `highs-*.js` (vendor)    |    26.48 |     10.78 |

The Overview chunk is the only new lazy chunk; sub-2 KB gzip, fetched on
demand only when the user follows the sidebar `nav-overview` link.

## Self-hosted fonts (separate "fonts" line — NOT against the +50/+18 budget per CONTEXT.md decision)

| Family            | Files                                            | Raw total |
| ----------------- | ------------------------------------------------ | --------: |
| Inter v3.19       | Regular, Medium, SemiBold (3× woff2)             |  302.83 KB |
| Source Serif 4 v4 | Regular, Semibold (2× woff2)                     |  153.31 KB |
| JetBrains Mono v3 | Regular, Medium (2× woff2)                       |  181.63 KB |
| **Fonts total**   |                                                  |  638.27 KB raw |

OFL.txt × 3 ships alongside (4.4 KB each) for license attribution. Fonts
are self-hosted under `apps/web/public/fonts/` to avoid a third-party
dependency on `rsms.me` / Google Fonts — privacy + offline + CSP all
benefit. Two-weight Source Serif 4 + three-weight Inter is the
production minimum (h1/h2 serif uses Semibold; body Inter uses Regular
and Medium). The capital ẞ (U+1E9E) is present in both Source Serif 4
weights, so no Vollkorn fallback is needed.

## What changed

- **Phase 1:** OkLCH design tokens, civic-green accent, dark/density blocks, self-hosted fonts.
- **Phase 2:** Component primitives in `@layer components` (`.btn-*`, `.card`, `.banner`, `.step-rail`, `.audit`, `.sig-pill`, `.stats-grid`, `.chip`, `.tbl`, `.doc-grid`, `.sample-grid`/`.sample-card`).
- **Phase 3:** Sidebar shell at md+ (`apps/web/src/shell/{Brand,Sidebar,NavGroup}.tsx`); pill-tabs become `md:hidden` mobile-only.
- **Phase 5:** Stage 1 reskin (step rail, cards, banners, stats grid).
- **Phase 6:** Audit footer rebound to Stage1AuditDoc schema 0.4 (21 mandatory + 4 optional + 3 signature fields).
- **Phase 7:** DocsLayout sticky 220px TOC + 68ch body; Beispiele uses `.sample-grid`/`.sample-card`.
- **Phase 8:** New `#/overview` route (lazy `Overview-*.js`); Stage 2/4 outside-tool banner; principles row sourced from shared `TRUST_PRINCIPLES`.

No new runtime dependencies. The CSS delta is the largest contributor by
ratio (+1.42 KB gzip) — driven by the new `@layer components` primitives
and OkLCH token block. JS delta is from the Sidebar / Brand / NavGroup
shell, the new App `'overview'` mode, and the rewritten DocsLayout.

---

# Bundle Delta — Issue #64 (Sample-Size-Vorschlag aus Panelgröße + Outreach)

**Build:** `VITE_BASE_PATH=/ pnpm --filter @sortition/web build` (Vite 6, sourcemaps enabled).
**Baseline:** post-#62 (`index-*.js` 122.06 KB raw / 40.50 KB gzip).
**Post:** commit on `sample-size-suggestion`.

| Asset                          | Baseline (KB) | After (KB) | Delta (KB) |
| ------------------------------ | ------------: | ---------: | ---------: |
| dist/assets/index-*.js (raw)   |        122.06 |     132.82 |     +10.76 |
| dist/assets/index-*.js (gzip)  |         40.50 |      43.39 |      +2.89 |
| dist/assets/index-*.css (raw)  |         44.29 |      44.47 |      +0.18 |
| dist/assets/index-*.css (gzip) |          7.38 |       7.41 |      +0.03 |

Raw HiGHS WASM: unchanged — feature touches no solver code.

## Notes

The +2.89 KB gzip delta is within the planned envelope (~+2–3 KB) and well
below the +10 KB gzip stop threshold. Drivers:

1. `packages/core/src/stage1/sample-size.ts` (~1.4 KB raw) — pure-Funktion
   `suggestSampleSize`, OUTREACH_DEFAULTS table, type defs.
2. `apps/web/src/stage1/SampleSizeCalculator.tsx` (~6 KB raw) — controlled
   inputs, radio group, custom-mode reveal, suggestion box, pool-too-small
   warning, "Wie wird das berechnet?" details.
3. `apps/web/src/stage1/Stage1Panel.tsx` extensions — section header
   renumbering, sampleSizeProposal/manualOverride signals, audit-proposal
   composition, handleTargetNInput override-detection.
4. `apps/web/src/stage1/AuditFooter.tsx` — Bemessung row with conditional
   "Vorschlag übernommen" / "manuell überschrieben" rendering.
5. `packages/core/src/stage1/reporting.ts` — neue `## Bemessung der
   Stichprobe` Markdown-Sektion.

No new runtime dependencies. Schema bump 0.3 → 0.4, algorithm version
1.1.0 → 1.2.0 — both backwards-compatible (new field is optional).

---

# Bundle Delta — Issue #62 (Altersgruppe-Derivation + Bands-Editor + Display-Only)

**Build:** `pnpm --filter @sortition/web build` (Vite 6, sourcemaps enabled).
**Baseline:** commit `75c8365` (pre-#62, fix(stage1): remove seed-confirmation gate).
**Post:** commit on `altersgruppe-derived` after Tasks 1–4 land.

| Asset                          | Baseline (KB) | After (KB) | Delta (KB) |
| ------------------------------ | ------------: | ---------: | ---------: |
| dist/assets/index-*.js (raw)   |        105.08 |     122.06 |     +16.98 |
| dist/assets/index-*.js (gzip)  |         35.09 |      40.50 |      +5.41 |
| dist/assets/index-*.css (raw)  |         43.93 |      44.29 |      +0.36 |
| dist/assets/index-*.css (gzip) |          7.33 |       7.38 |      +0.05 |

Raw HiGHS WASM: unchanged (2.60 MB) — feature touches no solver code.

## Notes

The +5.4 KB gzip delta on the main bundle exceeds the `<2 KB` baseline guess in
the plan but stays well below the hard stop-and-ASK threshold of +20 KB gzip.
The drivers, ranked by code volume:

1. `apps/web/src/csv/derive.ts` (≈ 3.6 KB raw) — `deriveAltersgruppe`,
   `validateBands`, `recomputeAltersgruppe` plus the `DEFAULT_AGE_BANDS`
   constant. Pure logic, no Solid runtime overhead.
2. `apps/web/src/stage1/AgeBandsEditor.tsx` + `age-bands-helpers.ts` (≈ 4.8 KB
   raw) — the controlled editor with mode radios, validation block, and the
   add/remove/reset actions.
3. `apps/web/src/stage1/StratificationExplainer.tsx` (≈ 2.0 KB raw) —
   collapsible aside with the live cell-count memo.
4. `apps/web/src/stage1/Stage1Panel.tsx` extensions — bands signal, recompute
   effect, axis descriptions table, distinct-value memo, info-only-bands
   section in the result view.
5. `apps/web/src/stage1/AxisPicker.tsx` — derived-column badge, per-axis
   tooltip, distinct-value warning loop.
6. `apps/web/src/stage1/AuditFooter.tsx` — derived columns + forced-zero
   strata footer rows.
7. `packages/core/src/stage1/reporting.ts` — `infoOnlyBandsReport` helper +
   two new Markdown sections (`## Berechnete Spalten`, `## Nicht in Auswahl
   einbezogen`).

The largest single contributor is the editor TSX, which is unavoidable for
the feature's UI surface (5 inputs × 5 default bands plus controls). No
dependencies were added — the gzip delta is entirely application code.

For comparison, the `index-*.js` baseline of ~35 KB gzip already carries
the entire CSV parser, Stage 1 UI, audit footer, axis breakdowns, and the
Markdown report builder. The +15 % growth from #62 buys: derived column
pipeline, full editor, three new audit fields, two new Markdown sections,
and the explainer.

## Production-mode footnote

Sourcemaps are enabled in the production config (`vite.config.ts:47`). The
gzip numbers above include only the JS/CSS payload (gzip compares the
asset, not the `.map`). With sourcemaps stripped (e.g. for hosted PWA
deploy) the delta is unchanged in gzip terms.
