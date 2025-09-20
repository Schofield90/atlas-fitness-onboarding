import { defineConfig, devices } from '@playwright/test'
import * as path from 'path'

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: '.',
  testMatch: [
    'tests/e2e/**/*.spec.ts',
    'tests/comprehensive-verification.spec.ts',
    'tests/backend-fixes.spec.ts',
    'e2e/**/*.test.ts',
    'e2e/**/*.spec.ts'
  ],
  testIgnore: [
    'tests/unit/**',
    'tests/api/**',
    'tests/integration/**',
    'tests/database/**',
    'tests/security/**',
    'tests/admin-hq/**',
    'e2e/auth-setup.spec.ts'
  ],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    trace: 'on-first-retry',
  },
  
  projects: [
    // Setup project - runs first to create auth states
    {
      name: 'setup',
      testMatch: '**/auth-setup.spec.ts',
      testDir: '.',
      testIgnore: [], // Override global testIgnore for setup project
    },
    
    // Admin portal tests
    {
      name: 'admin',
      use: { 
        ...devices['Desktop Chrome'],
        baseURL: 'http://admin.localhost:3000',
        storageState: path.join(process.cwd(), '.playwright', 'state.admin.json'),
      },
      dependencies: ['setup'],
      testIgnore: ['e2e/auth-setup.spec.ts'],
    },
    
    // Owner/Coach portal tests
    {
      name: 'owner',
      use: { 
        ...devices['Desktop Chrome'],
        baseURL: 'http://login.localhost:3000',
        storageState: path.join(process.cwd(), '.playwright', 'state.owner.json'),
      },
      dependencies: ['setup'],
      testIgnore: ['e2e/auth-setup.spec.ts'],
    },
    
    // Member portal tests
    {
      name: 'member',
      use: { 
        ...devices['Desktop Chrome'],
        baseURL: 'http://members.localhost:3000',
        storageState: path.join(process.cwd(), '.playwright', 'state.member.json'),
      },
      dependencies: ['setup'],
      testIgnore: ['e2e/auth-setup.spec.ts'],
    },
    
    // Default chromium project for non-authenticated tests
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        baseURL: process.env.BASE_URL || 'http://localhost:3000',
      },
      testIgnore: ['e2e/auth-setup.spec.ts'],
    },
  ],
  
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy',
      SUPABASE_PROJECT_ID: process.env.SUPABASE_PROJECT_ID || 'dummy',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'dummy',
      ALLOW_TEST_LOGIN: 'true',
    }
  }
})