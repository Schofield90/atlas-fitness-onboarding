import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  // Only run critical auth tests
  testMatch: '**/auth-flow-critical.spec.ts',

  /* Run tests in files in parallel */
  fullyParallel: false, // Disable for auth tests to avoid conflicts

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 1,

  /* Opt out of parallel tests on CI. */
  workers: 1, // Single worker for auth tests

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'playwright-report-auth' }],
    ['json', { outputFile: 'test-results-auth/results.json' }]
  ],

  /* Shared settings for all the projects below. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://login.gymleadhub.co.uk',

    /* Collect trace when retrying the failed test. */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Record video on failure */
    video: 'retain-on-failure',

    /* Timeout for each action */
    actionTimeout: 30000,

    /* Timeout for navigation */
    navigationTimeout: 30000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'Chrome',
      use: {
        ...devices['Desktop Chrome'],
        // Accept insecure certificates for testing
        ignoreHTTPSErrors: true,
      },
    },

    {
      name: 'Firefox',
      use: {
        ...devices['Desktop Firefox'],
        ignoreHTTPSErrors: true,
      },
    },

    {
      name: 'Safari',
      use: {
        ...devices['Desktop Safari'],
        ignoreHTTPSErrors: true,
      },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        ignoreHTTPSErrors: true,
      },
    },
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 12'],
        ignoreHTTPSErrors: true,
      },
    },
  ],

  /* Global setup and teardown */
  timeout: 60000, // 1 minute per test

  /* Output directory for test artifacts */
  outputDir: 'test-results-auth/',
});