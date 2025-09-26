import { defineConfig, devices } from '@playwright/test'

/**
 * Configuration specifically for class calendar authentication tests
 */
export default defineConfig({
  testDir: './__tests__/e2e',
  testMatch: '**/class-calendar-auth.spec.ts',

  /* Run tests in files in parallel */
  fullyParallel: false, // Keep authentication tests sequential for clarity

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI. */
  workers: 1, // Single worker for authentication tests

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'playwright-report/auth' }],
    ['json', { outputFile: 'test-results/auth-results.json' }],
    ['list'],
  ],

  /* Shared settings for all the projects below. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3003',

    /* Collect trace when retrying the failed test. */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video recording on failure */
    video: 'retain-on-failure',

    /* Global timeout for actions */
    actionTimeout: 30000,

    /* Global timeout for navigation */
    navigationTimeout: 60000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium-auth',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3003',
    reuseExistingServer: true,
    timeout: 120000,
  },

  /* No global setup/teardown for auth tests - keep it simple */

  /* Output directory for test artifacts */
  outputDir: 'test-results/auth/',

  /* Maximum time one test can run for */
  timeout: 120000,

  /* Expect timeout */
  expect: {
    timeout: 15000,
  },
})