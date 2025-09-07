import { defineConfig, devices } from '@playwright/test'

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: 'tests',
  testMatch: [
    'tests/e2e/**/*.spec.ts',
    'tests/comprehensive-verification.spec.ts',
    'tests/backend-fixes.spec.ts'
  ],
  testIgnore: [
    'tests/unit/**',
    'tests/api/**',
    'tests/integration/**',
    'tests/database/**',
    'tests/security/**',
    'tests/admin-hq/**'
  ],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm start',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy',
      SUPABASE_PROJECT_ID: process.env.SUPABASE_PROJECT_ID || 'dummy',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'dummy'
    }
  }
})