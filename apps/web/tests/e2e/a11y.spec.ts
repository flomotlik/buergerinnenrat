/**
 * a11y — axe-core integration (#68 P1 #8). Replaces the previous skin-check
 * with WCAG 2.1 AA-conformance scans on the four primary routes plus the
 * docs/algorithmus subpage. Uses @axe-core/playwright. The skin checks
 * (h1 unique, button accessible names) are kept as a cheap safety net so
 * any future axe-core upgrade that silently relaxes a rule still trips on
 * the most basic regressions.
 *
 * Baseline strategy: each route asserts an exact violation count. Increases
 * fail; decreases (e.g. after a fix) require updating the baseline. Initial
 * baselines were captured during the #70 implementation run and documented
 * in EXECUTION.md.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

interface RouteCfg {
  hash: string;
  /**
   * Expected violation rule-ids at WCAG 2.1 AA. The set (not just the
   * count) is asserted so a regression that swaps one violation for an
   * unrelated other one still fails the test.
   */
  expectedViolationIds: string[];
}

// Baselines captured during #70. Documented in EXECUTION.md:
//   #/overview — 1 violation: color-contrast on .status-pill-ok and
//     .status-pill-warn. Status-pill design tokens fail 4.5:1 at 9pt.
//     Follow-up: design ticket to bump contrast on the 'verfügbar' /
//     'Konzept' pill foreground colors.
//   #/docs/algorithmus — 1 violation: scrollable-region-focusable on
//     hamilton-svg-container. The overflow-x-auto wrapper is not
//     keyboard-focusable. Follow-up: add tabindex="0" to the wrapper or
//     refactor the SVG to fit without horizontal scroll.
const ROUTES: RouteCfg[] = [
  { hash: '#/stage1', expectedViolationIds: [] },
  { hash: '#/stage3', expectedViolationIds: [] },
  { hash: '#/overview', expectedViolationIds: ['color-contrast'] },
  { hash: '#/docs', expectedViolationIds: [] },
  { hash: '#/docs/algorithmus', expectedViolationIds: ['scrollable-region-focusable'] },
];

for (const { hash, expectedViolationIds } of ROUTES) {
  const baselineLabel =
    expectedViolationIds.length === 0
      ? 'no violations'
      : `expected violations: ${expectedViolationIds.join(', ')}`;
  test(`a11y: ${hash} — ${baselineLabel}`, async ({ page }) => {
    await page.goto('/');
    await page.evaluate((h) => {
      window.location.hash = h;
    }, hash);
    // Solid renders synchronously, but lazy chunks (Overview, DocsHub)
    // arrive on the next microtask. A short settle window catches them
    // without inflating the test runtime.
    await page.waitForTimeout(500);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // Assert the SET of violation ids matches the baseline — not just the
    // count. This catches the failure mode where an existing baseline
    // violation gets fixed but a new unrelated one is introduced (the
    // count is unchanged but the regression is real).
    const actualIds = results.violations.map((v) => v.id).sort();
    const expectedIds = [...expectedViolationIds].sort();
    const summary = results.violations.map((v) => ({ id: v.id, nodes: v.nodes.length }));
    expect(actualIds, JSON.stringify(summary, null, 2)).toEqual(expectedIds);
  });
}

// ----- Skin-check safety net -----

test('skin: exactly one h1 on landing route', async ({ page }) => {
  await page.goto('/');
  // Landing route is Stage 3; it owns its own sr-only h1 (App.tsx:240-242).
  const h1Count = await page.locator('h1').count();
  expect(h1Count).toBe(1);
});

test('skin: every button on landing has a text or aria-label', async ({ page }) => {
  await page.goto('/');
  const buttons = await page.locator('button').all();
  for (const btn of buttons) {
    const text = (await btn.textContent())?.trim() ?? '';
    const ariaLabel = (await btn.getAttribute('aria-label')) ?? '';
    expect(text.length > 0 || ariaLabel.length > 0, 'button has neither text nor aria-label').toBe(
      true,
    );
  }
});

test('skin: disabled sidebar nav-stage2 / nav-stage4 carry aria-disabled="true"', async ({
  page,
}) => {
  await page.goto('/');
  for (const tid of ['nav-stage2', 'nav-stage4']) {
    await expect(page.getByTestId(tid)).toHaveAttribute('aria-disabled', 'true');
  }
});
