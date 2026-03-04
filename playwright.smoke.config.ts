import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for post-deploy smoke tests.
 *
 * This config targets a LIVE deployed site — it does NOT start a local web server.
 * Pass the deployed URL via the BASE_URL environment variable:
 *
 *   BASE_URL=https://freeforcharity.github.io/FFC-IN-Footer_Only_Template npx playwright test --config=playwright.smoke.config.ts
 *
 * Defaults to http://localhost:3000 for local testing against `npm run preview`.
 */
export default defineConfig({
  testDir: './tests',
  testMatch: ['smoke.spec.ts'],

  // Smoke tests run sequentially — small suite, no need for parallelism
  fullyParallel: false,

  // Fail fast in CI if test.only is left in
  forbidOnly: !!process.env.CI,

  // Retry once on CI to handle transient network issues against live sites
  retries: process.env.CI ? 1 : 0,

  // Single worker — smoke tests are sequential and fast
  workers: 1,

  // Minimal reporter for CI; HTML for local debugging
  reporter: process.env.CI ? 'github' : 'html',

  use: {
    // BASE_URL env var targets the deployed site; fallback to localhost for local dev
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    // Collect trace on first retry for debugging flakes against live sites
    trace: 'on-first-retry',

    // Screenshot on failure for visual debugging
    screenshot: 'only-on-failure',
  },

  // Single browser project — chromium only for speed
  projects: [
    {
      name: 'smoke-chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],

  // NO webServer block — smoke tests hit an already-deployed site
})
