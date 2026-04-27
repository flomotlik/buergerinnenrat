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
