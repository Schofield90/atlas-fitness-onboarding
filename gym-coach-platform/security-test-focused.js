const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:3001';

// Test results
const vulnerabilities = [];

async function testAuthBypassVulnerabilities() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('='.repeat(80));
  console.log('🔴 SECURITY TESTING: Authentication Bypass Assessment');
  console.log('Target: ' + BASE_URL);
  console.log('='.repeat(80));

  // Test 1: Direct API Access Without Authentication
  console.log('\n🔍 Test 1: Testing direct API access without authentication...\n');

  const protectedEndpoints = [
    '/api/auth/me',
    '/api/auth/profile',
    '/api/dashboard/metrics',
    '/api/leads',
    '/api/clients',
    '/api/organizations',
    '/api/bookings',
    '/api/admin/sessions',
    '/api/membership-plans',
    '/api/conversations',
    '/api/settings/locations',
    '/api/facebook/pages',
    '/api/ai/insights'
  ];

  for (const endpoint of protectedEndpoints) {
    try {
      const response = await page.request.get(`${BASE_URL}${endpoint}`);
      const status = response.status();
      const body = await response.text();

      if (status === 200 || status === 201) {
        try {
          const data = JSON.parse(body);
          if (data && (data.data || data.users || data.clients || data.leads)) {
            vulnerabilities.push({
              severity: 'CRITICAL',
              type: 'Missing Authentication',
              endpoint: endpoint,
              description: 'API endpoint accessible without authentication - sensitive data exposed'
            });
            console.log(`🚨 CRITICAL: Unprotected endpoint ${endpoint} - Data exposed!`);
          }
        } catch (e) {}
      } else if (status === 404) {
        // Endpoint doesn't exist, skip
      } else if (status === 401 || status === 403) {
        console.log(`✅ Protected: ${endpoint} returns ${status}`);
      } else {
        console.log(`⚠️  Unexpected status ${status} for ${endpoint}`);
      }
    } catch (error) {
      console.log(`❌ Error testing ${endpoint}: ${error.message}`);
    }
  }

  // Test 2: JWT Token Manipulation
  console.log('\n🔍 Test 2: Testing JWT token manipulation...\n');

  const malformedTokens = [
    'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    'Bearer admin',
    'Bearer null',
    'invalid_token'
  ];

  for (const token of malformedTokens) {
    const response = await page.request.get(`${BASE_URL}/api/leads`, {
      headers: {
        'Authorization': token
      }
    });

    if (response.status() === 200) {
      vulnerabilities.push({
        severity: 'CRITICAL',
        type: 'JWT Bypass',
        endpoint: '/api/leads',
        description: `JWT validation bypassed with malformed token: ${token}`
      });
      console.log(`🚨 CRITICAL: JWT bypass with token: ${token}`);
    }
  }

  // Test 3: Session Cookie Manipulation
  console.log('\n🔍 Test 3: Testing session cookie manipulation...\n');

  await context.addCookies([
    { name: 'sb-access-token', value: 'fake-admin-token', domain: 'localhost', path: '/' },
    { name: 'sb-refresh-token', value: 'fake-refresh-token', domain: 'localhost', path: '/' },
    { name: 'user_role', value: 'admin', domain: 'localhost', path: '/' }
  ]);

  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 10000 });
  const dashboardUrl = page.url();

  if (!dashboardUrl.includes('login') && !dashboardUrl.includes('auth')) {
    const content = await page.content();
    if (content.includes('dashboard') || content.includes('Welcome')) {
      vulnerabilities.push({
        severity: 'CRITICAL',
        type: 'Session Hijacking',
        endpoint: '/dashboard',
        description: 'Session validation bypassed with fake cookies'
      });
      console.log(`🚨 CRITICAL: Session hijacking successful - accessed dashboard!`);
    }
  } else {
    console.log(`✅ Protected: Fake cookies rejected, redirected to ${dashboardUrl}`);
  }

  // Test 4: Rate Limiting on Auth Endpoints
  console.log('\n🔍 Test 4: Testing rate limiting...\n');

  let successCount = 0;
  const attempts = 15;

  for (let i = 0; i < attempts; i++) {
    const response = await page.request.post(`${BASE_URL}/api/auth/signup`, {
      data: {
        email: `test${i}@test.com`,
        password: 'wrong123',
        name: 'Test User',
        organizationName: 'Test Org'
      }
    });

    if (response.status() !== 429) {
      successCount++;
    }
  }

  if (successCount === attempts) {
    vulnerabilities.push({
      severity: 'HIGH',
      type: 'No Rate Limiting',
      endpoint: '/api/auth/signup',
      description: `No rate limiting detected - vulnerable to brute force (${attempts} requests succeeded)`
    });
    console.log(`⚠️ HIGH: No rate limiting - all ${attempts} requests succeeded`);
  } else {
    console.log(`✅ Rate limiting detected: ${attempts - successCount} requests were blocked`);
  }

  // Test 5: CORS Misconfiguration
  console.log('\n🔍 Test 5: Testing CORS configuration...\n');

  const corsResponse = await page.request.fetch(`${BASE_URL}/api/leads`, {
    headers: {
      'Origin': 'http://evil.com'
    }
  });

  const corsHeaders = corsResponse.headers();
  if (corsHeaders['access-control-allow-origin'] === '*' ||
      corsHeaders['access-control-allow-origin'] === 'http://evil.com') {
    vulnerabilities.push({
      severity: 'MEDIUM',
      type: 'CORS Misconfiguration',
      endpoint: '/api/leads',
      description: 'CORS allows requests from any origin'
    });
    console.log(`⚠️ MEDIUM: CORS misconfiguration detected`);
  } else {
    console.log(`✅ CORS properly configured`);
  }

  // Test 6: Information Disclosure in Errors
  console.log('\n🔍 Test 6: Testing for information disclosure...\n');

  const errorResponse = await page.request.post(`${BASE_URL}/api/auth/signup`, {
    data: {
      email: 'invalid-email',
      password: '123' // Too short
    }
  });

  const errorBody = await errorResponse.text();
  if (errorBody.includes('PostgreSQL') || errorBody.includes('Supabase') ||
      errorBody.includes('stack') || errorBody.includes('trace')) {
    vulnerabilities.push({
      severity: 'MEDIUM',
      type: 'Information Disclosure',
      endpoint: '/api/auth/signup',
      description: 'Sensitive error information exposed'
    });
    console.log(`⚠️ MEDIUM: Sensitive error information exposed`);
  }

  // Test 7: Check for default/test accounts
  console.log('\n🔍 Test 7: Testing for default accounts...\n');

  const defaultCredentials = [
    { email: 'admin@admin.com', password: 'admin' },
    { email: 'test@test.com', password: 'test' },
    { email: 'demo@demo.com', password: 'demo' }
  ];

  for (const creds of defaultCredentials) {
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle' });

    const emailField = await page.locator('input[type="email"]').first();
    const passwordField = await page.locator('input[type="password"]').first();

    if (await emailField.isVisible()) {
      await emailField.fill(creds.email);
      await passwordField.fill(creds.password);

      const submitButton = await page.locator('button[type="submit"]').first();
      await submitButton.click();

      await page.waitForTimeout(2000);

      if (page.url().includes('dashboard')) {
        vulnerabilities.push({
          severity: 'CRITICAL',
          type: 'Default Credentials',
          endpoint: '/auth/login',
          description: `Default account active: ${creds.email}/${creds.password}`
        });
        console.log(`🚨 CRITICAL: Default credentials work: ${creds.email}`);
      }
    }
  }

  await browser.close();

  // Generate Report
  console.log('\n' + '='.repeat(80));
  console.log('📊 SECURITY ASSESSMENT REPORT');
  console.log('='.repeat(80) + '\n');

  if (vulnerabilities.length === 0) {
    console.log('✅ No critical vulnerabilities found during this test.');
    console.log('\nAll tested endpoints appear to be properly protected:');
    console.log('- API endpoints require authentication');
    console.log('- JWT tokens are validated');
    console.log('- Session cookies are verified');
    console.log('- No default credentials found');
  } else {
    console.log(`🚨 Found ${vulnerabilities.length} vulnerabilities:\n`);

    const critical = vulnerabilities.filter(v => v.severity === 'CRITICAL');
    const high = vulnerabilities.filter(v => v.severity === 'HIGH');
    const medium = vulnerabilities.filter(v => v.severity === 'MEDIUM');

    if (critical.length > 0) {
      console.log(`🔴 CRITICAL (${critical.length}):`);
      critical.forEach(v => {
        console.log(`\n  Type: ${v.type}`);
        console.log(`  Endpoint: ${v.endpoint}`);
        console.log(`  Impact: ${v.description}`);
      });
    }

    if (high.length > 0) {
      console.log(`\n🟠 HIGH (${high.length}):`);
      high.forEach(v => {
        console.log(`\n  Type: ${v.type}`);
        console.log(`  Endpoint: ${v.endpoint}`);
        console.log(`  Impact: ${v.description}`);
      });
    }

    if (medium.length > 0) {
      console.log(`\n🟡 MEDIUM (${medium.length}):`);
      medium.forEach(v => {
        console.log(`\n  Type: ${v.type}`);
        console.log(`  Endpoint: ${v.endpoint}`);
        console.log(`  Impact: ${v.description}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('📝 RECOMMENDATIONS:');
    console.log('='.repeat(80));
    console.log(`
1. Implement authentication middleware for all API endpoints
2. Validate JWT tokens properly with signature verification
3. Implement rate limiting (5 attempts per minute per IP)
4. Configure CORS to only allow trusted origins
5. Sanitize error messages - never expose stack traces
6. Disable or remove all default/test accounts
7. Use secure session management with httpOnly cookies
8. Implement proper input validation and sanitization
9. Add security headers (CSP, X-Frame-Options, etc.)
10. Regular security audits and penetration testing
    `);
  }

  console.log('='.repeat(80));
  console.log('✅ Security test completed');
  console.log('='.repeat(80) + '\n');
}

testAuthBypassVulnerabilities().catch(console.error);