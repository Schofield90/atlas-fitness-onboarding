import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for recurring class creation tests
 * Tests against production environment: https://atlas-fitness-onboarding.vercel.app
 */
export default defineConfig({
  testDir: './__tests__/e2e',
  testMatch: '**/recurring-class-creation.spec.ts', // Only run recurring class tests
  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: 0,
  /* Opt out of parallel tests on CI. */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'playwright-report/recurring-classes' }],
    ['json', { outputFile: 'test-results/recurring-classes-results.json' }],
    ['list'], // Console output
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'https://atlas-fitness-onboarding.vercel.app',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video recording on failure */
    video: 'retain-on-failure',

    /* Global timeout for actions */
    actionTimeout: 60000,

    /* Global timeout for navigation */
    navigationTimeout: 60000,

    /* Ignore HTTPS errors */
    ignoreHTTPSErrors: true,

    /* Extra HTTP headers */
    extraHTTPHeaders: {
      'User-Agent': 'Playwright-RecurringClassTest/1.0'
    }
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Do not start web server - testing against production */
  // webServer: undefined,

  /* Output directory for test artifacts */
  outputDir: 'test-results/recurring-classes/',

  /* Maximum time one test can run for */
  timeout: 300000, // 5 minutes for production testing

  /* Expect timeout */
  expect: {
    timeout: 30000,
  },
})