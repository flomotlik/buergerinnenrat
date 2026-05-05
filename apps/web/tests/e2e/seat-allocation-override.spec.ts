/**
 * Stage 3 seat-allocation override e2e (#71). Drives a full Stage-3 flow
 * with an active 1-D axis override on `gender`, asserts the inline UI
 * indicators (badge + drift display) appear, exports the audit JSON,
 * verifies it via scripts/verify_audit.py (Round-Trip), then mutates
 * the rationale and asserts the verifier rejects the tampered manifest.
 *
 * The axis-picker exposes every CSV column except person_id; we use
 * `gender` (m/f) here because it is well-known by the other Stage-3
 * specs and gives a deterministic baseline (5,5 for panel=10 + balanced
 * synthetic pool below).
 */
import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Resolve scripts/verify_audit.py via this spec's own location so the test
// is robust against cwd. Spec path is .../apps/web/tests/e2e/...; the
// verifier lives at the repo root in scripts/.
const HERE = dirname(fileURLToPath(import.meta.url));
const VERIFIER = resolve(HERE, '../../../../scripts/verify_audit.py');

interface OverrideAudit {
  schema_version: string;
  seed: number;
  panel_size: number;
  pool_size: number;
  selected: string[];
  signature?: string;
  signature_algo?: string;
  public_key?: string;
  seat_allocation?: {
    baseline: Record<string, Record<string, number>>;
    override: {
      axis: string;
      seats: Record<string, number>;
      rationale: string;
      timestamp_iso: string;
    } | null;
    deviation: Record<string, { delta_seats: number; delta_percent: number }> | null;
  };
}

// Same-shape pool as stage3.spec.ts: 20 people, balanced gender 10/10
// so baseline allocation for panel_size=10 is exactly {m:5, f:5}.
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

test('seat-allocation override: full flow toggle → edit → rationale gate → run → export → re-verify → tamper', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto('/#/stage3');
  // Stage 3 is the default landing route — wait for the file input that the
  // CsvImport component renders so the test does not race the JS bundle.
  await page.locator('input[type="file"]').first().waitFor({ state: 'attached', timeout: 30_000 });

  // Upload CSV.
  await page.locator('input[type="file"]').first().setInputFiles({
    name: 'pool.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(makeCsv(), 'utf8'),
  });
  await page.getByTestId('file-commit').click();
  await expect(page.getByTestId('pool-summary')).toContainText('20 Personen');

  // Configure quota: panel=10, gender 4..6 each (matches stage3.spec.ts
  // pattern; bounds are wide enough for an override of {m:6, f:4}).
  await page.getByTestId('quota-panel-size').fill('10');
  await page.getByTestId('quota-add-category').selectOption('gender');
  await expect(page.getByTestId('quota-cat-gender')).toBeVisible();
  await page.getByTestId('quota-gender-m-min').fill('4');
  await page.getByTestId('quota-gender-m-max').fill('6');
  await page.getByTestId('quota-gender-f-min').fill('4');
  await page.getByTestId('quota-gender-f-max').fill('6');

  // RunPanel + SeatAllocationPanel are now mounted.
  await expect(page.getByTestId('run-panel')).toBeVisible();
  await expect(page.getByTestId('seat-allocation-panel')).toBeVisible();
  await expect(page.getByTestId('seat-allocation-baseline')).toBeVisible();

  // Step 1: pick gender axis. Editor must mount.
  await page.getByTestId('seat-allocation-axis-picker').selectOption('gender');
  await expect(page.getByTestId('seat-allocation-override-editor')).toBeVisible();
  await expect(page.getByTestId('seat-allocation-override-warning')).toBeVisible();

  // Step 2: edit override seats. Pre-filled with baseline {m:5, f:5}.
  // Push to {m:6, f:4} → l1_drift = 2, l1_drift_pct = 0.2.
  await page.getByTestId('override-input-gender-m').fill('6');
  await page.getByTestId('override-input-gender-f').fill('4');

  // Sum-validator must be at zero delta.
  await expect(page.getByTestId('seat-allocation-sum-validator')).toContainText('Σ Override = 10');

  // Step 3: rationale too short → counter is red, run-button stays
  // effectively unusable because the override commit gate emits null.
  // (Note: button enable logic in App.tsx currently doesn't disable on
  // override-invalid; we assert via the visible counter color + commit
  // status pill instead.)
  await page.getByTestId('seat-allocation-rationale').fill('zu kurz');
  // nonWhitespaceLength('zu kurz') == 6; "zu kurz" has 7 characters total
  // but the space is stripped, so the visible counter shows 6/20.
  await expect(page.getByTestId('seat-allocation-rationale-counter')).toHaveText(
    /6\/20 Zeichen/,
  );
  await expect(page.getByTestId('seat-allocation-commit-status')).toContainText(
    'noch nicht bereit',
  );

  // Step 4: rationale long enough → commit-status flips to ready.
  const rationale =
    'Politische Vorgabe für leichte Männer-Mehrheit zur Demonstration des Override-Flows';
  await page.getByTestId('seat-allocation-rationale').fill(rationale);
  await expect(page.getByTestId('seat-allocation-rationale-counter')).toContainText('Zeichen');
  await expect(page.getByTestId('seat-allocation-commit-status')).toContainText(
    'bereit zum Speichern',
  );

  // Step 5: run engine. Result block must show the override badge AND
  // the drift display.
  await page.getByTestId('run-seed').fill('42');
  await page.getByTestId('run-start').click();
  await expect(page.getByTestId('run-result')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('seat-allocation-active-badge')).toBeVisible();
  await expect(page.getByTestId('seat-allocation-drift-display')).toBeVisible();
  await expect(page.getByTestId('seat-allocation-drift-display')).toContainText(
    /von 10 Sitzen umgeschichtet/,
  );

  // Step 6: download the audit JSON.
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('run-export-audit').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^audit-.*\.json$/);
  const downloadedPath = await download.path();
  expect(downloadedPath).not.toBeNull();
  const auditRaw = readFileSync(downloadedPath!, 'utf8');
  const audit = JSON.parse(auditRaw) as OverrideAudit;

  // Schema-0.2 + seat_allocation contract assertions.
  expect(audit.schema_version).toBe('0.2');
  expect(audit.seat_allocation).toBeDefined();
  expect(audit.seat_allocation!.override).not.toBeNull();
  expect(audit.seat_allocation!.override!.axis).toBe('gender');
  expect(audit.seat_allocation!.override!.seats).toEqual({ m: 6, f: 4 });
  expect(audit.seat_allocation!.override!.rationale).toBe(rationale);
  expect(audit.seat_allocation!.override!.rationale.length).toBeGreaterThanOrEqual(20);
  // Deviation: m delta +1, f delta -1 (baseline {m:5, f:5}).
  expect(audit.seat_allocation!.deviation).not.toBeNull();
  expect(audit.seat_allocation!.deviation!.m.delta_seats).toBe(1);
  expect(audit.seat_allocation!.deviation!.f.delta_seats).toBe(-1);
  // Signature fields populated.
  expect(audit.signature).toBeDefined();
  expect(audit.public_key).toBeDefined();
  expect(['Ed25519', 'ECDSA-P256-SHA256']).toContain(audit.signature_algo);

  // Step 7: write the audit to a temp file and run scripts/verify_audit.py
  // against it. Exit 0 = pass.
  const tmpDir = mkdtempSync(join(tmpdir(), 'override-audit-'));
  const auditFile = join(tmpDir, 'audit.json');
  writeFileSync(auditFile, auditRaw, 'utf8');
  const verifyOk = spawnSync('python3', [VERIFIER, auditFile], {
    encoding: 'utf8',
  });
  // If python3 or cryptography is missing, exit code is 4 — surface that
  // explicitly so CI gives a useful error rather than a confusing 0/1.
  expect(
    verifyOk.status,
    `verify_audit.py stdout=${verifyOk.stdout} stderr=${verifyOk.stderr}`,
  ).toBe(0);

  // Step 8: tamper with the rationale and re-verify. Verifier must reject.
  const tampered = JSON.parse(auditRaw) as OverrideAudit;
  tampered.seat_allocation!.override!.rationale = rationale + ' — tampered';
  const tamperedFile = join(tmpDir, 'audit-tampered.json');
  writeFileSync(tamperedFile, JSON.stringify(tampered, null, 2), 'utf8');
  const verifyTamper = spawnSync('python3', [VERIFIER, tamperedFile], {
    encoding: 'utf8',
  });
  expect(verifyTamper.status).not.toBe(0);

  // Step 9: reset path. Click reset → editor disappears, badge/drift gone
  // on the next run. We don't re-run the engine here (slow); just verify
  // the editor and badge state flip back.
  await page.getByTestId('seat-allocation-reset').click();
  await expect(page.getByTestId('seat-allocation-override-editor')).toBeHidden();
  // Badge persists on the existing result until the next run is started,
  // because the badge reflects the override that PRODUCED the result, not
  // the override currently being edited. So we don't assert on the badge
  // disappearance here — that would be a UX nit better tested in a unit
  // test rather than a slow e2e.
});
