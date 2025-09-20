import { defineConfig, devices } from '@playwright/test'
import * as path from 'path'

/**
 * Specialized Playwright Configuration for Calendar E2E Testing
 * 
 * This configuration is optimized specifically for calendar functionality testing,
 * with settings that ensure reliable timezone handling, time display verification,
 * and navigation testing.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: [
    '**/calendar-time-display-comprehensive.spec.ts',
    '**/calendar-navigation-comprehensive.spec.ts', 
    '**/calendar-timezone-edge-cases.spec.ts',
    '**/calendar-database-consistency.spec.ts'
  ],
  
  // Calendar tests need more time due to extensive navigation and time verification
  timeout: 120000, // 2 minutes per test
  expect: {
    timeout: 10000 // 10 seconds for assertions
  },
  
  // Run calendar tests in sequence to avoid database conflicts
  fullyParallel: false,
  workers: 1,
  
  // Retry failed tests to handle timing-sensitive operations
  retries: process.env.CI ? 2 : 1,
  
  // Reporter configuration optimized for calendar testing
  reporter: [
    ['html', { 
      outputFolder: 'playwright-calendar-report',
      open: 'never'
    }],
    ['json', { outputFile: 'calendar-test-results.json' }],
    ['list'],
    // Custom reporter for calendar-specific metrics
    ['./e2e/calendar-test-reporter.js']
  ],
  
  use: {
    // Base URL for calendar testing
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    
    // Trace for all calendar tests due to complexity
    trace: 'on',
    
    // Screenshots for calendar verification
    screenshot: 'only-on-failure',
    
    // Video recording for debugging navigation issues
    video: 'retain-on-failure',
    
    // Extended action timeout for calendar operations
    actionTimeout: 15000,
    
    // Navigation timeout for calendar page loads
    navigationTimeout: 30000,
    
    // Locale settings for time format testing
    locale: 'en-US',
    
    // Timezone for consistent testing (can be overridden per test)
    timezoneId: 'America/New_York',
    
    // Viewport size optimized for calendar viewing
    viewport: { width: 1400, height: 900 },
    
    // Ignore HTTPS errors for local testing
    ignoreHTTPSErrors: true,
    
    // Extended timeout for calendar API calls
    extraHTTPHeaders: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  },
  
  projects: [
    // Setup project for calendar testing
    {
      name: 'calendar-setup',
      testMatch: '**/auth-setup.spec.ts',
      testDir: './e2e',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://login.localhost:3000'
      }
    },
    
    // Main calendar testing project
    {
      name: 'calendar-chrome',
      dependencies: ['calendar-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(process.cwd(), '.auth', 'owner.json'),
        
        // Chrome-specific settings for calendar testing
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection',
            '--no-sandbox',
            '--disable-setuid-sandbox'
          ]
        }
      }
    },
    
    // Firefox testing for cross-browser calendar verification
    {
      name: 'calendar-firefox',
      dependencies: ['calendar-setup'],
      use: {
        ...devices['Desktop Firefox'],
        storageState: path.join(process.cwd(), '.auth', 'owner.json'),
        
        // Firefox-specific settings
        launchOptions: {
          firefoxUserPrefs: {
            'dom.disable_beforeunload': true
          }
        }
      }
    },
    
    // Safari testing (macOS only)
    {
      name: 'calendar-safari',
      dependencies: ['calendar-setup'],
      use: {
        ...devices['Desktop Safari'],
        storageState: path.join(process.cwd(), '.auth', 'owner.json')
      }
    },
    
    // Mobile calendar testing
    {
      name: 'calendar-mobile',
      dependencies: ['calendar-setup'],
      use: {
        ...devices['iPhone 13'],
        storageState: path.join(process.cwd(), '.auth', 'owner.json')
      }
    },
    
    // Timezone-specific testing projects
    {
      name: 'calendar-utc',
      dependencies: ['calendar-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(process.cwd(), '.auth', 'owner.json'),
        timezoneId: 'UTC'
      }
    },
    
    {
      name: 'calendar-pacific',
      dependencies: ['calendar-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(process.cwd(), '.auth', 'owner.json'),
        timezoneId: 'America/Los_Angeles'
      }
    },
    
    {
      name: 'calendar-london',
      dependencies: ['calendar-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(process.cwd(), '.auth', 'owner.json'),
        timezoneId: 'Europe/London'
      }
    }
  ],
  
  // Web server configuration for calendar testing
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // Extended timeout for server startup
    
    env: {
      // Environment variables for calendar testing
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy',
      SUPABASE_PROJECT_ID: process.env.SUPABASE_PROJECT_ID || 'dummy',
      
      // Enable test-specific features
      ALLOW_TEST_LOGIN: 'true',
      ENABLE_CALENDAR_DEBUG: 'true',
      
      // Timezone configuration
      TZ: 'UTC',
      
      // Database configuration for testing
      DATABASE_MAX_CONNECTIONS: '20',
      
      // Disable rate limiting for tests
      DISABLE_RATE_LIMITING: 'true'
    }
  },
  
  // Global setup for calendar testing
  globalSetup: './e2e/calendar-global-setup.js',
  globalTeardown: './e2e/calendar-global-teardown.js',
  
  // Test metadata for calendar testing
  metadata: {
    testType: 'calendar-e2e',
    component: 'class-calendar',
    criticality: 'high',
    tags: ['calendar', 'timezone', 'navigation', 'time-display']
  }
});