import { defineConfig, devices } from '@playwright/test'

/**
 * Quick test configuration for authentication verification
 */
export default defineConfig({
  testDir: './__tests__/e2e',
  testMatch: '**/quick-auth-test.spec.ts',

  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report/quick-auth' }],
  ],

  use: {
    baseURL: 'http://localhost:3003',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30000,
    navigationTimeout: 60000,
  },

  projects: [
    {
      name: 'chromium-quick',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // No web server setup - assume server is already running
  timeout: 60000,
  expect: { timeout: 15000 },
})