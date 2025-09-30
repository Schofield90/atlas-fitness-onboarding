import { defineConfig, devices } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

// Load production test environment manually (without dotenv dependency)
const envPath = path.join(__dirname, '.env.test.production')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=')
      if (key && valueParts.length > 0) {
        process.env[key] = valueParts.join('=')
      }
    }
  })
}

/**
 * Production E2E Test Configuration
 *
 * This config is specifically for running tests against the production environment
 * at https://login.gymleadhub.co.uk
 */
export default defineConfig({
  testDir: './__tests__/e2e',
  testMatch: '**/member-management-production.spec.ts',

  /* Run tests in files in parallel */
  fullyParallel: false, // Run sequentially for production

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 1, // Allow 1 retry for production tests

  /* Opt out of parallel tests on CI. */
  workers: 1, // Run one test at a time for production

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'test-results/production-html-report' }],
    ['json', { outputFile: 'test-results/production-results.json' }],
    ['junit', { outputFile: 'test-results/production-results.xml' }],
    ['list']
  ],

  /* Shared settings for all the projects below. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://login.gymleadhub.co.uk',

    /* Collect trace when retrying the failed test. */
    trace: 'retain-on-failure',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video recording on failure */
    video: 'retain-on-failure',

    /* Global timeout for actions */
    actionTimeout: parseInt(process.env.TEST_ACTION_TIMEOUT || '10000'),

    /* Global timeout for navigation */
    navigationTimeout: parseInt(process.env.TEST_NAVIGATION_TIMEOUT || '30000'),

    /* Ignore HTTPS errors (for self-signed certs in testing) */
    ignoreHTTPSErrors: false,

    /* Extra HTTP headers */
    extraHTTPHeaders: {
      'Accept': 'application/json, text/plain, */*',
    },
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
    },

    // Uncomment to test on other browsers
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  /* Output directory for test artifacts */
  outputDir: 'test-results/production-artifacts/',

  /* Maximum time one test can run for */
  timeout: 120000, // 2 minutes per test

  /* Expect timeout */
  expect: {
    timeout: parseInt(process.env.TEST_ASSERTION_TIMEOUT || '5000'),
  },

  /* Global setup - not needed for production tests */
  // globalSetup: undefined,
  // globalTeardown: undefined,
})