import { defineConfig, devices } from '@playwright/test';

/**
 * Browser checks run against the static build served by `astro preview`.
 * Every request a page makes goes to this local server; tests never reach real third parties.
 */
const PORT = 4321;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // --ignore-lock keeps `astro preview` in the foreground (Astro 7 otherwise auto-backgrounds it
    // under coding agents, which Playwright reads as the server exiting early).
    command: `npm run build && npx astro preview --port ${PORT} --ignore-lock`,
    url: `http://localhost:${PORT}/mockups/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
