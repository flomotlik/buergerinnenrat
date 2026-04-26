/**
 * Visual iteration spec — produces vorher/nachher PNGs per redesign step
 * for multimodal review. Underscore prefix in the filename signals this is
 * not a contract test; it is regenerated each run.
 *
 * Usage:
 *   pnpm exec playwright test _visual-iteration --grep "01-header-before"
 *
 * Output:
 *   .issues/56-ui-visual-redesign/iteration/<step>-<state>-<viewport>.png
 *
 * Steps cover the five iteration points from PLAN.md:
 *   01-header        Branding + logo + tagline (Stage 1)
 *   02-tabs          Pill-button navigation (Stage 1)
 *   03-trust-strip   Stage-1 trust cards under header (with CSV loaded)
 *   04-stage1-form   CSV upload + N/seed inputs + run button + result cards
 *   05-docs-hub      Documentation hub tile cards
 *
 * Each step has 4 cases: {before|after} × {desktop|mobile}.
 */
import { test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(
  HERE,
  '../../../../tests/fixtures/synthetic-pools/kleinstadt-bezirkshauptort-n500-s42-t070.csv',
);
const ITER_DIR = resolve(HERE, '../../../../.issues/56-ui-visual-redesign/iteration');

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 375, height: 812 },
] as const;

type StepName =
  | '01-header'
  | '02-tabs'
  | '03-trust-strip'
  | '04-stage1-form'
  | '05-docs-hub';

type State = 'before' | 'after';

interface StepDef {
  name: StepName;
  /** Hash route to navigate to (without leading `#`). */
  hash: string;
  /** Test-ID anchor to wait for before screenshot. */
  anchorTestId: string;
  /** If true, upload the synthetic CSV and run to get the result view. */
  runStage1?: boolean;
}

const STEPS: StepDef[] = [
  { name: '01-header', hash: '#/stage1', anchorTestId: 'stage1-panel' },
  { name: '02-tabs', hash: '#/stage1', anchorTestId: 'main-nav' },
  // Trust strip: lives at the top of Stage 1 BEFORE upload (under step header)
  { name: '03-trust-strip', hash: '#/stage1', anchorTestId: 'stage1-trust-strip' },
  // Stage-1 form view with CSV loaded so inputs and dropzone are visible.
  // Anchor is the panel itself (always rendered); the runStage1 hook then
  // uploads + waits for pool-summary before screenshotting.
  {
    name: '04-stage1-form',
    hash: '#/stage1',
    anchorTestId: 'stage1-panel',
    runStage1: true,
  },
  { name: '05-docs-hub', hash: '#/docs', anchorTestId: 'docs-hub' },
];

for (const step of STEPS) {
  for (const state of (['before', 'after'] as const satisfies readonly State[])) {
    for (const vp of VIEWPORTS) {
      const tag = `${step.name}-${state}-${vp.name}`;
      test(tag, async ({ browser }) => {
        const ctx = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: 2,
        });
        const page = await ctx.newPage();
        await page.goto(step.hash || '/');
        // Always make sure the network and the anchor are settled.
        await page.waitForLoadState('networkidle');
        await page.getByTestId(step.anchorTestId).waitFor({ state: 'visible', timeout: 10_000 });

        if (step.runStage1) {
          // Upload synthetic CSV so dropzone + inputs + preview render.
          await page.locator('[data-testid="stage1-csv-upload"]').setInputFiles({
            name: 'pool.csv',
            mimeType: 'text/csv',
            buffer: readFileSync(FIXTURE),
          });
          await page.getByTestId('stage1-pool-summary').waitFor({ state: 'visible' });
          await page.getByTestId('stage1-target-n').fill('50');
          await page.getByTestId('stage1-seed-confirm').click();
          // Give preview a beat to render.
          await page.waitForTimeout(200);
        }

        // Final paint settle.
        await page.waitForTimeout(150);
        await page.screenshot({
          path: resolve(ITER_DIR, `${step.name}-${state}-${vp.name}.png`),
          fullPage: true,
        });
        await ctx.close();
      });
    }
  }
}
