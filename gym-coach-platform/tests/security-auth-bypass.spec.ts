import { test, expect, Page } from '@playwright/test';

// Configuration
const BASE_URL = 'http://localhost:3001';
const TEST_TIMEOUT = 30000;

// SQL Injection payloads
const SQL_INJECTION_PAYLOADS = [
  "' OR '1'='1",
  "' OR '1'='1' --",
  "' OR '1'='1' /*",
  "admin' --",
  "admin' #",
  "admin'/*",
  "' or 1=1--",
  "' or 1=1#",
  "' or 1=1/*",
  "') or '1'='1--",
  "') or ('1'='1--",
  "' OR 'x'='x",
  "\" OR \"1\"=\"1",
  "' OR ''='",
  "1' OR '1' = '1",
  "' UNION SELECT NULL--",
  "' UNION SELECT 1,2,3--",
  "admin'--",
  "admin' OR '1'='1",
  "' OR 1=1 LIMIT 1--",
  "' OR '1'='1' AND ''='",
  "1' AND 1=1--",
  "1' AND '1'='1"
];

// XSS payloads for testing input sanitization
const XSS_PAYLOADS = [
  "<script>alert('XSS')</script>",
  "javascript:alert('XSS')",
  "<img src=x onerror=alert('XSS')>",
  "<svg/onload=alert('XSS')>",
  "'><script>alert(String.fromCharCode(88,83,83))</script>",
  "<iframe src=javascript:alert('XSS')>",
  "<body onload=alert('XSS')>",
  "';alert(String.fromCharCode(88,83,83))//';alert(String.fromCharCode(88,83,83))//",
  "<IMG SRC=\"javascript:alert('XSS');\">",
  "<IMG SRC=JaVaScRiPt:alert('XSS')>"
];

// Authentication bypass payloads
const AUTH_BYPASS_PAYLOADS = [
  { email: "admin@admin.com", password: "" },
  { email: "", password: "password" },
  { email: "' OR '1'='1", password: "' OR '1'='1" },
  { email: "admin' --", password: "anything" },
  { email: "admin@test.com' --", password: "x" },
  { email: "test@test.com", password: "' OR '1'='1" },
  { email: "1' OR '1' = '1", password: "1' OR '1' = '1" },
  { email: "admin", password: "admin" },
  { email: "root", password: "root" },
  { email: "test", password: "test" }
];

// JWT manipulation attempts
const MALFORMED_TOKENS = [
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
  "invalid_token",
  "null",
  "undefined",
  "",
  "admin",
  "Bearer admin",
  "Bearer null"
];

// Test results storage
const vulnerabilities: Array<{
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  type: string;
  endpoint: string;
  payload: string;
  description: string;
  evidence: string;
  recommendation: string;
}> = [];

test.describe('🔴 SECURITY: Authentication Bypass Testing', () => {
  test.setTimeout(TEST_TIMEOUT);

  test('SQL Injection - Login Forms', async ({ page }) => {
    console.log('\n🔍 Testing SQL Injection on login forms...\n');

    const loginEndpoints = [
      '/signin',
      '/simple-login',
      '/owner-login',
      '/auth/login',
      '/client/auth/login',
      '/client-portal/login'
    ];

    for (const endpoint of loginEndpoints) {
      console.log(`Testing endpoint: ${endpoint}`);

      for (const payload of SQL_INJECTION_PAYLOADS) {
        try {
          await page.goto(`${BASE_URL}${endpoint}`, { waitUntil: 'networkidle' });

          // Try to find email and password fields
          const emailField = await page.locator('input[type="email"], input[name="email"], input[id="email"], input[placeholder*="email" i]').first();
          const passwordField = await page.locator('input[type="password"], input[name="password"], input[id="password"]').first();

          if (await emailField.isVisible() && await passwordField.isVisible()) {
            // Test SQL injection in email field
            await emailField.fill(payload);
            await passwordField.fill('test123');

            // Look for submit button
            const submitButton = await page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in"), button:has-text("Login")').first();

            if (await submitButton.isVisible()) {
              // Intercept network requests
              const responsePromise = page.waitForResponse(response =>
                response.url().includes('/api/') ||
                response.url().includes('/auth/') ||
                response.url().includes('supabase'),
                { timeout: 5000 }
              ).catch(() => null);

              await submitButton.click();
              const response = await responsePromise;

              // Check if we bypassed authentication
              if (response) {
                const status = response.status();
                const body = await response.text().catch(() => '');

                // Check for successful bypass indicators
                if (status === 200 || status === 201) {
                  if (body.includes('token') || body.includes('session') || body.includes('user')) {
                    vulnerabilities.push({
                      severity: 'CRITICAL',
                      type: 'SQL Injection',
                      endpoint: endpoint,
                      payload: payload,
                      description: `SQL injection vulnerability found. Authentication bypassed using payload: ${payload}`,
                      evidence: `Response status: ${status}, Body contains authentication tokens`,
                      recommendation: 'Use parameterized queries and input validation. Never concatenate user input directly into SQL queries.'
                    });
                    console.log(`🚨 CRITICAL: SQL Injection vulnerability found at ${endpoint} with payload: ${payload}`);
                  }
                }

                // Check for SQL error messages (information disclosure)
                if (body.includes('SQL') || body.includes('syntax error') || body.includes('PostgreSQL') || body.includes('MySQL')) {
                  vulnerabilities.push({
                    severity: 'HIGH',
                    type: 'SQL Error Disclosure',
                    endpoint: endpoint,
                    payload: payload,
                    description: `SQL error message exposed, revealing database information`,
                    evidence: `Error message in response: ${body.substring(0, 200)}`,
                    recommendation: 'Implement proper error handling. Never expose database errors to users.'
                  });
                  console.log(`⚠️ HIGH: SQL error disclosure at ${endpoint}`);
                }
              }

              // Check if we're redirected to dashboard (bypass successful)
              await page.waitForTimeout(2000);
              const currentUrl = page.url();
              if (currentUrl.includes('dashboard') || currentUrl.includes('admin') || currentUrl.includes('portal')) {
                vulnerabilities.push({
                  severity: 'CRITICAL',
                  type: 'Authentication Bypass',
                  endpoint: endpoint,
                  payload: payload,
                  description: `Authentication completely bypassed! Gained unauthorized access to: ${currentUrl}`,
                  evidence: `Redirected to protected area: ${currentUrl}`,
                  recommendation: 'Implement proper authentication checks and parameterized queries.'
                });
                console.log(`🚨 CRITICAL: Authentication bypassed! Now at: ${currentUrl}`);
              }
            }
          }
        } catch (error) {
          // Continue testing other payloads
        }
      }
    }
  });

  test('Direct API Access Without Authentication', async ({ page }) => {
    console.log('\n🔍 Testing direct API access without authentication...\n');

    const protectedEndpoints = [
      '/api/auth/me',
      '/api/auth/profile',
      '/api/dashboard/metrics',
      '/api/leads',
      '/api/clients',
      '/api/organizations',
      '/api/bookings',
      '/api/admin/sessions',
      '/api/settings/locations',
      '/api/membership-plans',
      '/api/conversations'
    ];

    for (const endpoint of protectedEndpoints) {
      try {
        // Try direct API access without any authentication
        const response = await page.request.get(`${BASE_URL}${endpoint}`, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const status = response.status();
        const body = await response.text();

        if (status === 200 || status === 201) {
          // Check if we actually got data (not just an empty success)
          const data = JSON.parse(body);
          if (data && (data.data || data.users || data.clients || data.leads)) {
            vulnerabilities.push({
              severity: 'CRITICAL',
              type: 'Missing Authentication',
              endpoint: endpoint,
              payload: 'No authentication header',
              description: `API endpoint accessible without authentication! Sensitive data exposed.`,
              evidence: `Response status: ${status}, Data received: ${JSON.stringify(data).substring(0, 200)}`,
              recommendation: 'Implement authentication middleware for all API endpoints.'
            });
            console.log(`🚨 CRITICAL: Unauthenticated access to ${endpoint} - Data exposed!`);
          }
        }

        // Try with malformed tokens
        for (const token of MALFORMED_TOKENS) {
          const malformedResponse = await page.request.get(`${BASE_URL}${endpoint}`, {
            headers: {
              'Authorization': token,
              'Content-Type': 'application/json'
            }
          });

          if (malformedResponse.status() === 200) {
            vulnerabilities.push({
              severity: 'CRITICAL',
              type: 'JWT Validation Bypass',
              endpoint: endpoint,
              payload: token,
              description: `JWT validation bypassed with malformed token`,
              evidence: `Malformed token accepted: ${token}`,
              recommendation: 'Implement proper JWT validation. Reject malformed tokens.'
            });
            console.log(`🚨 CRITICAL: JWT bypass at ${endpoint} with token: ${token}`);
          }
        }
      } catch (error) {
        // API might not exist or error, continue testing
      }
    }
  });

  test('Password Reset Vulnerability Testing', async ({ page }) => {
    console.log('\n🔍 Testing password reset vulnerabilities...\n');

    const resetEndpoints = [
      '/forgot-password',
      '/reset-password',
      '/auth/forgot',
      '/auth/reset'
    ];

    for (const endpoint of resetEndpoints) {
      try {
        await page.goto(`${BASE_URL}${endpoint}`, { waitUntil: 'networkidle' });

        const emailField = await page.locator('input[type="email"], input[name="email"]').first();
        if (await emailField.isVisible()) {
          // Test with SQL injection in reset
          await emailField.fill("admin@test.com' OR '1'='1");

          const submitButton = await page.locator('button[type="submit"], button:has-text("Reset")').first();
          if (await submitButton.isVisible()) {
            const responsePromise = page.waitForResponse(response =>
              response.url().includes('/api/'),
              { timeout: 5000 }
            ).catch(() => null);

            await submitButton.click();
            const response = await responsePromise;

            if (response) {
              const body = await response.text();
              // Check if multiple users were affected (mass password reset)
              if (body.includes('success') && !body.includes('error')) {
                vulnerabilities.push({
                  severity: 'HIGH',
                  type: 'Password Reset Injection',
                  endpoint: endpoint,
                  payload: "admin@test.com' OR '1'='1",
                  description: 'Potential mass password reset vulnerability',
                  evidence: `Response: ${body.substring(0, 200)}`,
                  recommendation: 'Validate email input and use parameterized queries in password reset.'
                });
                console.log(`⚠️ HIGH: Password reset injection vulnerability at ${endpoint}`);
              }
            }
          }
        }
      } catch (error) {
        // Continue testing
      }
    }
  });

  test('Session Hijacking and Cookie Manipulation', async ({ browser }) => {
    console.log('\n🔍 Testing session hijacking vulnerabilities...\n');

    const context = await browser.newContext();
    const page = await context.newPage();

    // Try to set admin cookies
    await context.addCookies([
      {
        name: 'session',
        value: 'admin',
        domain: 'localhost',
        path: '/'
      },
      {
        name: 'user_role',
        value: 'admin',
        domain: 'localhost',
        path: '/'
      },
      {
        name: 'authenticated',
        value: 'true',
        domain: 'localhost',
        path: '/'
      },
      {
        name: 'isAdmin',
        value: 'true',
        domain: 'localhost',
        path: '/'
      }
    ]);

    // Try accessing protected areas with fake cookies
    const protectedUrls = [
      '/dashboard',
      '/admin',
      '/settings',
      '/clients',
      '/leads'
    ];

    for (const url of protectedUrls) {
      await page.goto(`${BASE_URL}${url}`, { waitUntil: 'networkidle' });

      // Check if we gained access
      const currentUrl = page.url();
      if (!currentUrl.includes('login') && !currentUrl.includes('signin')) {
        // Check for actual content (not just error page)
        const content = await page.content();
        if (content.includes('dashboard') || content.includes('admin') || content.includes('client')) {
          vulnerabilities.push({
            severity: 'CRITICAL',
            type: 'Session Hijacking',
            endpoint: url,
            payload: 'Fake admin cookies',
            description: 'Session validation bypass using fake cookies',
            evidence: `Accessed ${currentUrl} with fake cookies`,
            recommendation: 'Implement proper session validation server-side. Never trust client-side cookies for authorization.'
          });
          console.log(`🚨 CRITICAL: Session hijacking successful at ${url}`);
        }
      }
    }

    await context.close();
  });

  test('OAuth Bypass Attempts', async ({ page }) => {
    console.log('\n🔍 Testing OAuth bypass vulnerabilities...\n');

    // Test OAuth redirect manipulation
    const oauthEndpoints = [
      '/api/auth/google/callback?code=fake_code&state=fake_state',
      '/api/auth/facebook/callback?code=fake_code&state=fake_state',
      '/auth/callback?provider=google&token=fake_token',
      '/oauth/callback?access_token=fake_token'
    ];

    for (const endpoint of oauthEndpoints) {
      try {
        const response = await page.request.get(`${BASE_URL}${endpoint}`);
        const status = response.status();

        if (status === 200 || status === 302) {
          const headers = response.headers();
          if (headers['set-cookie'] || headers['location']?.includes('dashboard')) {
            vulnerabilities.push({
              severity: 'CRITICAL',
              type: 'OAuth Bypass',
              endpoint: endpoint,
              payload: 'Fake OAuth tokens',
              description: 'OAuth validation bypass with fake tokens',
              evidence: `Status: ${status}, Headers: ${JSON.stringify(headers)}`,
              recommendation: 'Validate OAuth tokens with the provider. Never accept unverified tokens.'
            });
            console.log(`🚨 CRITICAL: OAuth bypass at ${endpoint}`);
          }
        }
      } catch (error) {
        // Continue testing
      }
    }
  });

  test('Privilege Escalation Testing', async ({ page }) => {
    console.log('\n🔍 Testing privilege escalation vulnerabilities...\n');

    // Test role manipulation in API calls
    const escalationTests = [
      {
        endpoint: '/api/auth/profile',
        method: 'PATCH',
        payload: { role: 'admin', isAdmin: true }
      },
      {
        endpoint: '/api/auth/me',
        method: 'PUT',
        payload: { user_role: 'super_admin', permissions: ['*'] }
      },
      {
        endpoint: '/api/users/update',
        method: 'POST',
        payload: { id: 1, role: 'admin' }
      }
    ];

    for (const test of escalationTests) {
      try {
        const response = await page.request.fetch(`${BASE_URL}${test.endpoint}`, {
          method: test.method,
          headers: {
            'Content-Type': 'application/json'
          },
          data: test.payload
        });

        const status = response.status();
        if (status === 200 || status === 201) {
          const body = await response.json();
          if (body.role === 'admin' || body.isAdmin || body.user_role === 'super_admin') {
            vulnerabilities.push({
              severity: 'CRITICAL',
              type: 'Privilege Escalation',
              endpoint: test.endpoint,
              payload: JSON.stringify(test.payload),
              description: 'User role can be escalated to admin without authorization',
              evidence: `Response: ${JSON.stringify(body)}`,
              recommendation: 'Implement server-side authorization checks. Never allow users to modify their own roles.'
            });
            console.log(`🚨 CRITICAL: Privilege escalation at ${test.endpoint}`);
          }
        }
      } catch (error) {
        // Continue testing
      }
    }
  });

  test('XSS in Authentication Forms', async ({ page }) => {
    console.log('\n🔍 Testing XSS vulnerabilities in auth forms...\n');

    const authPages = ['/signin', '/signup', '/auth/login'];

    for (const authPage of authPages) {
      try {
        await page.goto(`${BASE_URL}${authPage}`, { waitUntil: 'networkidle' });

        for (const payload of XSS_PAYLOADS) {
          const emailField = await page.locator('input[type="email"], input[name="email"]').first();
          if (await emailField.isVisible()) {
            await emailField.fill(payload);

            // Submit form to see if XSS executes
            const submitButton = await page.locator('button[type="submit"]').first();
            if (await submitButton.isVisible()) {
              // Set up alert detection
              page.on('dialog', async dialog => {
                vulnerabilities.push({
                  severity: 'HIGH',
                  type: 'XSS Vulnerability',
                  endpoint: authPage,
                  payload: payload,
                  description: 'XSS payload executed in authentication form',
                  evidence: `Alert triggered: ${dialog.message()}`,
                  recommendation: 'Sanitize all user inputs. Use Content Security Policy headers.'
                });
                console.log(`⚠️ HIGH: XSS vulnerability at ${authPage} with payload: ${payload}`);
                await dialog.accept();
              });

              await submitButton.click();
              await page.waitForTimeout(1000);
            }
          }
        }
      } catch (error) {
        // Continue testing
      }
    }
  });

  test('Rate Limiting and Brute Force', async ({ page }) => {
    console.log('\n🔍 Testing rate limiting on authentication...\n');

    const loginEndpoint = '/api/auth/login';
    let successCount = 0;
    const attempts = 20;

    for (let i = 0; i < attempts; i++) {
      try {
        const response = await page.request.post(`${BASE_URL}${loginEndpoint}`, {
          data: {
            email: `test${i}@test.com`,
            password: 'wrongpassword'
          }
        });

        if (response.status() !== 429) { // 429 = Too Many Requests
          successCount++;
        }
      } catch (error) {
        successCount++;
      }
    }

    if (successCount === attempts) {
      vulnerabilities.push({
        severity: 'HIGH',
        type: 'No Rate Limiting',
        endpoint: loginEndpoint,
        payload: `${attempts} rapid requests`,
        description: 'No rate limiting detected. Vulnerable to brute force attacks.',
        evidence: `All ${attempts} requests succeeded without rate limiting`,
        recommendation: 'Implement rate limiting (e.g., max 5 attempts per minute per IP).'
      });
      console.log(`⚠️ HIGH: No rate limiting detected at ${loginEndpoint}`);
    }
  });

  test.afterAll(async () => {
    console.log('\n' + '='.repeat(80));
    console.log('📊 SECURITY ASSESSMENT REPORT');
    console.log('='.repeat(80) + '\n');

    if (vulnerabilities.length === 0) {
      console.log('✅ No critical vulnerabilities found during this test run.');
      console.log('Note: This doesn\'t mean the system is secure. Continue testing with different approaches.');
    } else {
      console.log(`🚨 Found ${vulnerabilities.length} vulnerabilities:\n`);

      // Group by severity
      const critical = vulnerabilities.filter(v => v.severity === 'CRITICAL');
      const high = vulnerabilities.filter(v => v.severity === 'HIGH');
      const medium = vulnerabilities.filter(v => v.severity === 'MEDIUM');
      const low = vulnerabilities.filter(v => v.severity === 'LOW');

      if (critical.length > 0) {
        console.log(`\n🔴 CRITICAL (${critical.length}):`);
        critical.forEach(v => {
          console.log(`\n  ${v.type} at ${v.endpoint}`);
          console.log(`  Payload: ${v.payload}`);
          console.log(`  Impact: ${v.description}`);
          console.log(`  Fix: ${v.recommendation}`);
        });
      }

      if (high.length > 0) {
        console.log(`\n🟠 HIGH (${high.length}):`);
        high.forEach(v => {
          console.log(`\n  ${v.type} at ${v.endpoint}`);
          console.log(`  Payload: ${v.payload}`);
          console.log(`  Impact: ${v.description}`);
          console.log(`  Fix: ${v.recommendation}`);
        });
      }

      if (medium.length > 0) {
        console.log(`\n🟡 MEDIUM (${medium.length}):`);
        medium.forEach(v => {
          console.log(`\n  ${v.type} at ${v.endpoint}`);
          console.log(`  Impact: ${v.description}`);
        });
      }

      if (low.length > 0) {
        console.log(`\n🟢 LOW (${low.length}):`);
        low.forEach(v => {
          console.log(`  ${v.type} at ${v.endpoint}`);
        });
      }

      console.log('\n' + '='.repeat(80));
      console.log('📝 RECOMMENDATIONS:');
      console.log('='.repeat(80));
      console.log(`
1. Implement parameterized queries for all database operations
2. Add comprehensive input validation and sanitization
3. Implement proper JWT validation with signature verification
4. Add rate limiting to all authentication endpoints
5. Use Content Security Policy headers to prevent XSS
6. Implement proper session management with server-side validation
7. Add authentication middleware to all protected API endpoints
8. Validate OAuth tokens with the provider
9. Never expose database errors to users
10. Implement proper role-based access control (RBAC)
      `);
    }

    console.log('\n' + '='.repeat(80));
    console.log('⚠️  This is a security assessment for authorized testing only.');
    console.log('='.repeat(80) + '\n');
  });
});