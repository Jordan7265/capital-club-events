import { defineConfig, devices } from '@playwright/test';

/**
 * Browser checks run against the static build served by `astro preview`.
 * Every request a page makes goes to this local server; tests never reach real third parties.
 *
 * Set PLAYWRIGHT_BASE_URL (e.g. https://www.capitalclubavlevents.com) to run the same suite
 * against a deployed site instead; no local server is started then.
 */
const PORT = 4321;
const LIVE_URL = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: LIVE_URL ?? `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: LIVE_URL ? undefined : {
    // --ignore-lock keeps `astro preview` in the foreground (Astro 7 otherwise auto-backgrounds it
    // under coding agents, which Playwright reads as the server exiting early).
    command: `npm run build && npx astro preview --port ${PORT} --ignore-lock`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
