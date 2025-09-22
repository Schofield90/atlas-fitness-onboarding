const { chromium } = require('playwright');
const fs = require('fs').promises;

// Configuration
const BASE_URL = 'http://localhost:3001';

// Quick IDOR test focusing on most likely vulnerable endpoints
async function quickIDORTest() {
  console.log('🎯 Quick IDOR Vulnerability Test\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  const vulnerabilities = [];

  // Test 1: Direct API access without authentication
  console.log('Testing unauthenticated API access...');
  const criticalEndpoints = [
    '/api/clients',
    '/api/clients/1',
    '/api/clients/2',
    '/api/organizations',
    '/api/organizations/1',
    '/api/staff',
    '/api/staff/1',
    '/api/leads',
    '/api/leads/1',
    '/api/booking/1',
    '/api/forms/1',
    '/api/admin/users',
    '/api/admin/organizations',
    '/api/debug/clients',
    '/api/debug/database',
    '/api/export/clients',
    '/api/billing',
    '/api/reports/revenue',
    '/api/dashboard/stats',
    '/api/settings',
    '/api/email-templates'
  ];

  for (const endpoint of criticalEndpoints) {
    try {
      const response = await page.request.get(`${BASE_URL}${endpoint}`, {
        headers: { 'Accept': 'application/json' },
        timeout: 3000
      });

      if (response.ok()) {
        let data = null;
        try {
          data = await response.json();
        } catch {
          data = await response.text();
        }

        const dataStr = JSON.stringify(data).substring(0, 200);
        console.log(`✓ VULNERABLE: ${endpoint} (${response.status()})`);

        // Check for sensitive data
        if (dataStr.includes('email') || dataStr.includes('phone') ||
            dataStr.includes('password') || dataStr.includes('token')) {
          console.log(`  ⚠️ Contains sensitive data!`);
          vulnerabilities.push({
            severity: 'CRITICAL',
            endpoint,
            type: 'Unauthenticated API Access',
            data: dataStr
          });
        } else {
          vulnerabilities.push({
            severity: 'HIGH',
            endpoint,
            type: 'Unauthenticated API Access',
            data: dataStr
          });
        }
      }
    } catch (e) {
      // Silent fail - endpoint protected
    }
  }

  // Test 2: Parameter manipulation
  console.log('\nTesting parameter manipulation...');
  const paramTests = [
    '/api/clients?organization_id=1',
    '/api/clients?organization_id=2',
    '/api/clients?admin=true',
    '/api/clients?bypass=true',
    '/api/clients?limit=99999'
  ];

  for (const test of paramTests) {
    try {
      const response = await page.request.get(`${BASE_URL}${test}`, {
        headers: { 'Accept': 'application/json' },
        timeout: 3000
      });

      if (response.ok()) {
        console.log(`✓ VULNERABLE: ${test}`);
        vulnerabilities.push({
          severity: 'HIGH',
          endpoint: test,
          type: 'Parameter Manipulation'
        });
      }
    } catch (e) {
      // Protected
    }
  }

  // Test 3: File access
  console.log('\nTesting file access...');
  const files = ['/.env', '/.env.local', '/package.json', '/.git/config'];

  for (const file of files) {
    try {
      const response = await page.goto(`${BASE_URL}${file}`, {
        waitUntil: 'domcontentloaded',
        timeout: 3000
      });

      if (response && response.status() === 200) {
        console.log(`✓ EXPOSED FILE: ${file}`);
        vulnerabilities.push({
          severity: 'CRITICAL',
          endpoint: file,
          type: 'File Exposure'
        });
      }
    } catch (e) {
      // Protected
    }
  }

  // Test 4: Check for debug endpoints
  console.log('\nTesting debug endpoints...');
  const debugEndpoints = [
    '/api/debug',
    '/api/test',
    '/debug',
    '/phpinfo',
    '/api/_health'
  ];

  for (const endpoint of debugEndpoints) {
    try {
      const response = await page.goto(`${BASE_URL}${endpoint}`, {
        waitUntil: 'domcontentloaded',
        timeout: 3000
      });

      if (response && response.status() === 200) {
        console.log(`✓ DEBUG ENDPOINT: ${endpoint}`);
        vulnerabilities.push({
          severity: 'HIGH',
          endpoint,
          type: 'Debug Endpoint Exposed'
        });
      }
    } catch (e) {
      // Protected
    }
  }

  await browser.close();

  // Generate quick report
  console.log('\n' + '='.repeat(60));
  console.log('VULNERABILITY SUMMARY');
  console.log('='.repeat(60));

  if (vulnerabilities.length === 0) {
    console.log('✅ No vulnerabilities found!');
  } else {
    console.log(`\n🚨 FOUND ${vulnerabilities.length} VULNERABILITIES:\n`);

    const critical = vulnerabilities.filter(v => v.severity === 'CRITICAL');
    const high = vulnerabilities.filter(v => v.severity === 'HIGH');

    if (critical.length > 0) {
      console.log('CRITICAL VULNERABILITIES:');
      critical.forEach(v => {
        console.log(`  - ${v.type}: ${v.endpoint}`);
        if (v.data) console.log(`    Data exposed: ${v.data.substring(0, 100)}...`);
      });
    }

    if (high.length > 0) {
      console.log('\nHIGH VULNERABILITIES:');
      high.forEach(v => {
        console.log(`  - ${v.type}: ${v.endpoint}`);
        if (v.data) console.log(`    Data exposed: ${v.data.substring(0, 100)}...`);
      });
    }
  }

  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    vulnerabilities,
    summary: {
      total: vulnerabilities.length,
      critical: vulnerabilities.filter(v => v.severity === 'CRITICAL').length,
      high: vulnerabilities.filter(v => v.severity === 'HIGH').length
    }
  };

  await fs.writeFile('quick-idor-results.json', JSON.stringify(report, null, 2));
  console.log('\n📄 Full report saved to quick-idor-results.json');
}

// Run the test
quickIDORTest().catch(console.error);