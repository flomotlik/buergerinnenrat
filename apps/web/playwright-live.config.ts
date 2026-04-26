import { defineConfig, devices } from '@playwright/test';

// Live-site smoke tests run against a deployed URL (default: GitHub Pages
// production). Override via LIVE_BASE_URL env to point at a staging deploy
// or PR-preview without changing source.
const BASE_URL =
  process.env.LIVE_BASE_URL ?? 'https://flomotlik.github.io/buergerinnenrat/';

export default defineConfig({
  testDir: './tests/smoke-live',
  timeout: 60_000,
  // GH Pages cold-cache + first-byte latency can spike to 30s on the first
  // hit after a fresh deploy. Two retries soak that without masking real
  // failures.
  retries: 2,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // No webServer block — these tests assume the target URL is already
  // reachable. The CI workflow ensures the deploy job completes before this
  // config runs.
});
