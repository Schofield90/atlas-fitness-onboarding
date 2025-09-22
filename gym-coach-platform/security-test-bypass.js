const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:3001';

// SQL Injection payloads
const SQL_INJECTION_PAYLOADS = [
  "' OR '1'='1",
  "' OR '1'='1' --",
  "admin' --",
  "' or 1=1--",
  "') or '1'='1--",
  "' OR 'x'='x",
  "\" OR \"1\"=\"1",
  "' UNION SELECT NULL--",
  "admin' OR '1'='1"
];

// Test results
const vulnerabilities = [];

async function testSQLInjection(page) {
  console.log('\n🔍 Testing SQL Injection on login forms...\n');

  const loginEndpoints = [
    '/signin',
    '/auth/login',
    '/client/auth/login',
    '/client-portal/login'
  ];

  for (const endpoint of loginEndpoints) {
    console.log(`\nTesting endpoint: ${endpoint}`);

    for (const payload of SQL_INJECTION_PAYLOADS) {
      try {
        await page.goto(`${BASE_URL}${endpoint}`, { waitUntil: 'domcontentloaded', timeout: 10000 });

        // Try to find email and password fields
        const emailField = await page.locator('input[type="email"], input[name="email"], input[id="email"]').first();
        const passwordField = await page.locator('input[type="password"], input[name="password"], input[id="password"]').first();

        if (await emailField.count() > 0 && await passwordField.count() > 0) {
          // Test SQL injection
          await emailField.fill(payload);
          await passwordField.fill('test123');

          // Look for submit button
          const submitButton = await page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in")').first();

          if (await submitButton.count() > 0) {
            // Intercept response
            const responsePromise = page.waitForResponse(response =>
              response.url().includes('/api/') ||
              response.url().includes('/auth/') ||
              response.url().includes('supabase'),
              { timeout: 3000 }
            ).catch(() => null);

            await submitButton.click();
            const response = await responsePromise;

            if (response) {
              const status = response.status();
              const body = await response.text().catch(() => '');

              // Check for successful bypass
              if (status === 200 || status === 201) {
                if (body.includes('token') || body.includes('session') || body.includes('user')) {
                  vulnerabilities.push({
                    severity: 'CRITICAL',
                    type: 'SQL Injection',
                    endpoint: endpoint,
                    payload: payload,
                    description: `SQL injection vulnerability - authentication bypassed`,
                    evidence: `Response status: ${status}`
                  });
                  console.log(`🚨 CRITICAL: SQL Injection found at ${endpoint} with: ${payload}`);
                }
              }

              // Check for SQL errors
              if (body.includes('SQL') || body.includes('syntax') || body.includes('PostgreSQL')) {
                vulnerabilities.push({
                  severity: 'HIGH',
                  type: 'SQL Error Disclosure',
                  endpoint: endpoint,
                  payload: payload,
                  description: 'SQL error message exposed'
                });
                console.log(`⚠️ HIGH: SQL error disclosure at ${endpoint}`);
              }
            }

            // Check if redirected to dashboard
            await page.waitForTimeout(1500);
            const currentUrl = page.url();
            if (currentUrl.includes('dashboard') || currentUrl.includes('admin')) {
              vulnerabilities.push({
                severity: 'CRITICAL',
                type: 'Authentication Bypass',
                endpoint: endpoint,
                payload: payload,
                description: `Complete auth bypass - redirected to: ${currentUrl}`
              });
              console.log(`🚨 CRITICAL: Auth bypassed! Now at: ${currentUrl}`);
            }
          }
        }
      } catch (error) {
        // Continue testing
      }
    }
  }
}

async function testDirectAPIAccess(page) {
  console.log('\n🔍 Testing direct API access without authentication...\n');

  const protectedEndpoints = [
    '/api/auth/me',
    '/api/auth/profile',
    '/api/dashboard/metrics',
    '/api/leads',
    '/api/clients',
    '/api/organizations',
    '/api/bookings',
    '/api/admin/sessions'
  ];

  for (const endpoint of protectedEndpoints) {
    try {
      const response = await page.request.get(`${BASE_URL}${endpoint}`);
      const status = response.status();

      if (status === 200 || status === 201) {
        const body = await response.text();
        try {
          const data = JSON.parse(body);
          if (data && (data.data || data.users || data.clients)) {
            vulnerabilities.push({
              severity: 'CRITICAL',
              type: 'Missing Authentication',
              endpoint: endpoint,
              payload: 'No auth header',
              description: 'API endpoint accessible without authentication'
            });
            console.log(`🚨 CRITICAL: Unprotected API endpoint: ${endpoint}`);
          }
        } catch (e) {}
      }
    } catch (error) {
      // Continue
    }
  }
}

async function testSessionHijacking(browser) {
  console.log('\n🔍 Testing session hijacking...\n');

  const context = await browser.newContext();
  const page = await context.newPage();

  // Set fake admin cookies
  await context.addCookies([
    { name: 'session', value: 'admin', domain: 'localhost', path: '/' },
    { name: 'user_role', value: 'admin', domain: 'localhost', path: '/' },
    { name: 'authenticated', value: 'true', domain: 'localhost', path: '/' }
  ]);

  const protectedUrls = ['/dashboard', '/admin', '/settings'];

  for (const url of protectedUrls) {
    try {
      await page.goto(`${BASE_URL}${url}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
      const currentUrl = page.url();

      if (!currentUrl.includes('login') && !currentUrl.includes('signin')) {
        const content = await page.content();
        if (content.includes('dashboard') || content.includes('admin')) {
          vulnerabilities.push({
            severity: 'CRITICAL',
            type: 'Session Hijacking',
            endpoint: url,
            payload: 'Fake admin cookies',
            description: 'Session validation bypass with fake cookies'
          });
          console.log(`🚨 CRITICAL: Session hijacking at ${url}`);
        }
      }
    } catch (error) {
      // Continue
    }
  }

  await context.close();
}

async function testRateLimiting(page) {
  console.log('\n🔍 Testing rate limiting...\n');

  const endpoint = '/api/auth/login';
  let successCount = 0;

  for (let i = 0; i < 10; i++) {
    try {
      const response = await page.request.post(`${BASE_URL}${endpoint}`, {
        data: { email: `test${i}@test.com`, password: 'wrong' }
      });

      if (response.status() !== 429) {
        successCount++;
      }
    } catch (error) {
      successCount++;
    }
  }

  if (successCount === 10) {
    vulnerabilities.push({
      severity: 'HIGH',
      type: 'No Rate Limiting',
      endpoint: endpoint,
      payload: '10 rapid requests',
      description: 'No rate limiting - vulnerable to brute force'
    });
    console.log(`⚠️ HIGH: No rate limiting at ${endpoint}`);
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('🔴 SECURITY TESTING: Authentication Bypass Assessment');
  console.log('Target: ' + BASE_URL);
  console.log('='.repeat(80));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Run tests
  await testSQLInjection(page);
  await testDirectAPIAccess(page);
  await testSessionHijacking(browser);
  await testRateLimiting(page);

  await browser.close();

  // Report results
  console.log('\n' + '='.repeat(80));
  console.log('📊 SECURITY ASSESSMENT RESULTS');
  console.log('='.repeat(80) + '\n');

  if (vulnerabilities.length === 0) {
    console.log('✅ No critical vulnerabilities found in this test run.');
  } else {
    console.log(`🚨 Found ${vulnerabilities.length} vulnerabilities:\n`);

    const critical = vulnerabilities.filter(v => v.severity === 'CRITICAL');
    const high = vulnerabilities.filter(v => v.severity === 'HIGH');

    if (critical.length > 0) {
      console.log(`\n🔴 CRITICAL (${critical.length}):`);
      critical.forEach(v => {
        console.log(`  ${v.type} at ${v.endpoint}`);
        console.log(`  Payload: ${v.payload}`);
        console.log(`  Impact: ${v.description}\n`);
      });
    }

    if (high.length > 0) {
      console.log(`\n🟠 HIGH (${high.length}):`);
      high.forEach(v => {
        console.log(`  ${v.type} at ${v.endpoint}`);
        console.log(`  Impact: ${v.description}\n`);
      });
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('⚠️  Security test completed. Fix any vulnerabilities found.');
  console.log('='.repeat(80) + '\n');
}

main().catch(console.error);