/**
 * Stage 3 RunPanel e2e (#68 P1 #5). Inlines a small CSV (n=20) so the test
 * is self-contained, configures a panel-size=6 quota with a satisfiable
 * gender bound, runs Engine A, and asserts the audit-JSON download contains
 * the expected schema-0.1 fields.
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Synthetic n=20 pool: 10 m / 10 f. panel_size=10 satisfies the >=10
// minimum from quotas/model.ts:69; gender bounds 4..6 sum to [8..12]
// which covers panel_size=10 cleanly. person_id is zero-padded so the
// sorted-ascending assertion on selected[] is deterministic.
function makeCsv(): string {
  const header = 'person_id,gender,district\n';
  const rows: string[] = [];
  for (let i = 1; i <= 20; i++) {
    const id = `p${String(i).padStart(3, '0')}`;
    const gender = i <= 10 ? 'm' : 'f';
    const district = i % 2 === 0 ? 'd1' : 'd2';
    rows.push(`${id},${gender},${district}`);
  }
  return header + rows.join('\n') + '\n';
}

test.describe.configure({ mode: 'serial' });

test('stage 3: upload n=20 → quotas → run → audit JSON parses', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/');
  // Default landing is Stage 3 already, but be explicit so the test is
  // robust against a future default-route change.
  await page.evaluate(() => {
    window.location.hash = '#/stage3';
  });

  // Step 1: upload the inline CSV.
  await page.locator('input[type="file"]').first().setInputFiles({
    name: 'pool.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(makeCsv(), 'utf8'),
  });
  await page.getByTestId('csv-commit').click();
  await expect(page.getByTestId('pool-summary')).toContainText('20 Personen');

  // Step 2: panel size + quota category. Default category bounds (min=0,
  // max=panel_size) are valid by construction, so just adding gender is
  // enough — but we explicitly tighten gender to 2..4 per category-value
  // to exercise non-trivial quota assertions in the audit.
  await page.getByTestId('quota-panel-size').fill('10');
  await page.getByTestId('quota-add-category').selectOption('gender');
  await expect(page.getByTestId('quota-cat-gender')).toBeVisible();

  // Tighten gender bounds: m and f each 4..6 (sum range 8..12 covers
  // panel_size=10 cleanly without over-constraining).
  await page.getByTestId('quota-gender-m-min').fill('4');
  await page.getByTestId('quota-gender-m-max').fill('6');
  await page.getByTestId('quota-gender-f-min').fill('4');
  await page.getByTestId('quota-gender-f-max').fill('6');

  // Step 3: run.
  await expect(page.getByTestId('run-panel')).toBeVisible();
  await page.getByTestId('run-seed').fill('42');
  await page.getByTestId('run-start').click();
  await expect(page.getByTestId('run-result')).toBeVisible({ timeout: 45_000 });

  // Both export buttons are visible after the run completes.
  await expect(page.getByTestId('run-export-csv')).toBeVisible();
  await expect(page.getByTestId('run-export-audit')).toBeVisible();

  // Download the audit and parse.
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('run-export-audit').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^audit-.*\.json$/);
  const path = await download.path();
  expect(path).not.toBeNull();
  const audit = JSON.parse(readFileSync(path!, 'utf8')) as {
    schema_version: string;
    engine: { id: string; version: string };
    algorithm: string;
    seed: number;
    panel_size: number;
    pool_size: number;
    selected: string[];
    quota_fulfillment: Array<{ ok: boolean }>;
    public_key?: string;
    signature?: string;
    signature_algo?: string;
  };

  // Required schema-0.1 fields.
  expect(audit.schema_version).toBe('0.1');
  expect(audit.engine.id).toMatch(/engine-a/);
  expect(audit.algorithm).toBe('maximin');
  expect(audit.seed).toBe(42);
  expect(audit.panel_size).toBe(10);
  expect(audit.pool_size).toBe(20);

  // Selected panel: exactly panel_size members, sorted ascending,
  // uniquely-valued, and every id maps to a real pool row (p001..p020).
  expect(audit.selected).toHaveLength(10);
  const sorted = [...audit.selected].sort();
  expect(audit.selected).toEqual(sorted);
  // Uniqueness — engine must not return the same person twice.
  expect(new Set(audit.selected).size).toBe(audit.selected.length);
  // Every id is one of the 20 pool ids (guards against an off-by-one or
  // ghost-id regression that would slip past length+sort+ok-only checks).
  const validIds = new Set(Array.from({ length: 20 }, (_, i) => `p${String(i + 1).padStart(3, '0')}`));
  for (const id of audit.selected) {
    expect(validIds.has(id), `selected id ${id} not in pool`).toBe(true);
  }

  // Every quota_fulfillment row passes (we set bounds that are obviously
  // satisfiable; if any row fails this is a real regression).
  for (const row of audit.quota_fulfillment) {
    expect(row.ok).toBe(true);
  }

  // Signature fields are populated by signAudit.
  expect(['Ed25519', 'ECDSA-P256-SHA256']).toContain(audit.signature_algo);
  expect(typeof audit.public_key).toBe('string');
  expect(typeof audit.signature).toBe('string');
  expect(audit.public_key!.length).toBeGreaterThan(0);
  expect(audit.signature!.length).toBeGreaterThan(0);
});
