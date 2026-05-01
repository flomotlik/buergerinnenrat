/**
 * Visual smoke screenshots for #65 visual-redesign-design-handoff.
 * Underscore prefix signals "not a contract test" — regenerated each run.
 *
 * Output: .issues/65-visual-redesign-design-handoff/iteration/<step>-<viewport>.png
 *
 * 5 viewpoints × 2 viewports = 10 PNGs:
 *   01-sidebar     #/stage3 — sidebar at md+ / pill-tabs at <md
 *   02-stage1-card #/stage1 with synthetic CSV uploaded — step-rail + first card
 *   03-audit-panel #/stage1 with a draw run — audit footer (signed)
 *   04-doc-layout  #/docs/algorithmus — sticky TOC + 68ch body
 *   05-overview    #/overview — hero + workflow cards + principles
 *
 * Separate from _visual-iteration.spec.ts (which is anchored to the
 * archived #56 issue dir) so we never touch the historical artifacts.
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
const ITER_DIR = resolve(
  HERE,
  '../../../../.issues/65-visual-redesign-design-handoff/iteration',
);

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 375, height: 812 },
] as const;

interface Point {
  slug: string;
  hash: string;
  /** Test-ID anchor to wait for. */
  anchorTestId: string;
  /** Upload synthetic CSV before screenshot. */
  uploadCsv?: boolean;
  /** Upload + run a draw before screenshot (for audit-panel). */
  runStage1?: boolean;
}

const POINTS: Point[] = [
  { slug: '01-sidebar', hash: '#/stage3', anchorTestId: 'csv-dropzone' },
  {
    slug: '02-stage1-card',
    hash: '#/stage1',
    anchorTestId: 'stage1-panel',
    uploadCsv: true,
  },
  {
    slug: '03-audit-panel',
    hash: '#/stage1',
    anchorTestId: 'stage1-panel',
    runStage1: true,
  },
  { slug: '04-doc-layout', hash: '#/docs/algorithmus', anchorTestId: 'docs-page-algorithmus' },
  { slug: '05-overview', hash: '#/overview', anchorTestId: 'overview-page' },
];

for (const point of POINTS) {
  for (const vp of VIEWPORTS) {
    test(`#65-${point.slug}-${vp.name}`, async ({ browser }) => {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 2,
      });
      const page = await ctx.newPage();
      await page.goto(point.hash || '/');
      await page.waitForLoadState('networkidle');
      await page.getByTestId(point.anchorTestId).waitFor({ state: 'visible', timeout: 10_000 });

      if (point.uploadCsv || point.runStage1) {
        await page.locator('[data-testid="stage1-csv-upload"]').setInputFiles({
          name: 'pool.csv',
          mimeType: 'text/csv',
          buffer: readFileSync(FIXTURE),
        });
        await page.getByTestId('stage1-pool-summary').waitFor({ state: 'visible' });
        await page.getByTestId('stage1-target-n').fill('50');
        await page.waitForTimeout(150);
      }

      if (point.runStage1) {
        await page.getByTestId('stage1-run').click();
        await page.getByTestId('stage1-result').waitFor({ state: 'visible', timeout: 30_000 });
        await page.waitForTimeout(250);
      }

      await page.waitForTimeout(150);
      await page.screenshot({
        path: resolve(ITER_DIR, `${point.slug}-${vp.name}.png`),
        fullPage: true,
      });
      await ctx.close();
    });
  }
}
