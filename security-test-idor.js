const { chromium } = require('playwright');
const fs = require('fs').promises;

// Configuration
const BASE_URL = 'http://localhost:3001';
const REPORT_FILE = 'security-report-idor.md';

// Vulnerability storage
const vulnerabilities = [];

// Log vulnerability
function logVulnerability(severity, title, details) {
  const vuln = {
    severity,
    title,
    timestamp: new Date().toISOString(),
    ...details
  };
  vulnerabilities.push(vuln);
  console.log(`🔴 ${severity}: ${title}`);
}

// Test IDOR on sequential IDs
async function testSequentialIDOR(page, endpoint, startId = 1, endId = 100) {
  console.log(`\n🔍 Testing Sequential IDOR on ${endpoint}`);
  const accessible = [];

  for (let id = startId; id <= endId; id++) {
    try {
      const response = await page.goto(`${BASE_URL}${endpoint}/${id}`, {
        waitUntil: 'networkidle',
        timeout: 5000
      });

      if (response && response.status() === 200) {
        const content = await page.content();
        accessible.push({
          id,
          url: `${BASE_URL}${endpoint}/${id}`,
          dataFound: content.includes('email') || content.includes('phone') || content.includes('name')
        });
        console.log(`✓ Accessible: ${endpoint}/${id}`);
      }
    } catch (e) {
      // Silent fail for non-existent IDs
    }
  }

  if (accessible.length > 0) {
    logVulnerability('HIGH', `Sequential IDOR on ${endpoint}`, {
      endpoint,
      accessibleIds: accessible,
      impact: 'Unauthorized access to user/organization data'
    });
  }

  return accessible;
}

// Test API endpoints directly
async function testAPIEndpoints(page) {
  console.log('\n🔍 Testing Direct API Access');

  const apiEndpoints = [
    '/api/clients',
    '/api/clients/1',
    '/api/clients/list',
    '/api/organizations',
    '/api/organizations/1',
    '/api/booking',
    '/api/booking/1',
    '/api/forms',
    '/api/forms/1',
    '/api/leads',
    '/api/leads/1',
    '/api/staff',
    '/api/staff/1',
    '/api/contacts',
    '/api/contacts/1',
    '/api/opportunities',
    '/api/opportunities/1',
    '/api/appointments',
    '/api/appointments/1',
    '/api/calendars',
    '/api/calendar/events',
    '/api/membership-plans',
    '/api/waivers',
    '/api/nutrition/clients',
    '/api/nutrition/meal-plans',
    '/api/admin/users',
    '/api/admin/organizations',
    '/api/admin/settings',
    '/api/reports/revenue',
    '/api/reports/clients',
    '/api/settings',
    '/api/billing',
    '/api/billing/invoices',
    '/api/dashboard/stats',
    '/api/dashboard/metrics',
    '/api/email-templates',
    '/api/workflows',
    '/api/automations',
    '/api/debug/clients',
    '/api/debug/database',
    '/api/debug/tokens',
    '/api/public-api/v1/clients',
    '/api/v2/clients',
    '/api/saas-admin/organizations',
    '/api/saas-admin/users'
  ];

  const exposedEndpoints = [];

  for (const endpoint of apiEndpoints) {
    try {
      // Test without authentication
      const response = await page.request.get(`${BASE_URL}${endpoint}`, {
        headers: {
          'Accept': 'application/json'
        },
        timeout: 5000
      });

      if (response.ok()) {
        const contentType = response.headers()['content-type'];
        let data = null;

        if (contentType && contentType.includes('application/json')) {
          try {
            data = await response.json();
          } catch (e) {
            data = await response.text();
          }
        } else {
          data = await response.text();
        }

        // Check for sensitive data
        const dataStr = JSON.stringify(data);
        const hasSensitiveData =
          dataStr.includes('email') ||
          dataStr.includes('phone') ||
          dataStr.includes('password') ||
          dataStr.includes('token') ||
          dataStr.includes('key') ||
          dataStr.includes('secret') ||
          dataStr.includes('ssn') ||
          dataStr.includes('credit');

        exposedEndpoints.push({
          endpoint,
          status: response.status(),
          hasSensitiveData,
          sampleData: dataStr.substring(0, 500)
        });

        console.log(`✓ Exposed: ${endpoint} (${response.status()})`);

        if (hasSensitiveData) {
          logVulnerability('CRITICAL', `Unauthenticated API Access with Sensitive Data`, {
            endpoint,
            status: response.status(),
            sampleData: dataStr.substring(0, 1000),
            impact: 'Direct access to sensitive user data without authentication'
          });
        }
      }
    } catch (e) {
      // Silent fail for protected endpoints
    }
  }

  return exposedEndpoints;
}

// Test parameter manipulation
async function testParameterManipulation(page) {
  console.log('\n🔍 Testing Parameter Manipulation');

  const manipulations = [
    { url: '/api/clients?organization_id=1', desc: 'Cross-org access via org_id' },
    { url: '/api/clients?organization_id=2', desc: 'Cross-org access via org_id' },
    { url: '/api/clients?admin=true', desc: 'Admin bypass' },
    { url: '/api/clients?role=admin', desc: 'Role elevation' },
    { url: '/api/clients?bypass=true', desc: 'Security bypass' },
    { url: '/api/clients?debug=true', desc: 'Debug mode' },
    { url: '/api/clients?limit=99999', desc: 'Mass data extraction' },
    { url: '/api/clients?include_deleted=true', desc: 'Access deleted records' },
    { url: '/api/clients?show_all=true', desc: 'Show all records' },
    { url: '/api/forms?public=true', desc: 'Access private forms' },
    { url: '/api/leads?status=all', desc: 'Access all leads' },
    { url: '/api/staff?include_inactive=true', desc: 'Access inactive staff' }
  ];

  const successfulManipulations = [];

  for (const manip of manipulations) {
    try {
      const response = await page.request.get(`${BASE_URL}${manip.url}`, {
        headers: {
          'Accept': 'application/json'
        },
        timeout: 5000
      });

      if (response.ok()) {
        let data = null;
        try {
          data = await response.json();
        } catch (e) {
          data = await response.text();
        }

        successfulManipulations.push({
          url: manip.url,
          description: manip.desc,
          status: response.status(),
          dataReceived: !!data
        });

        console.log(`✓ Manipulation worked: ${manip.desc}`);

        logVulnerability('HIGH', `Parameter Manipulation Vulnerability`, {
          url: manip.url,
          description: manip.desc,
          impact: 'Unauthorized data access through parameter manipulation'
        });
      }
    } catch (e) {
      // Silent fail
    }
  }

  return successfulManipulations;
}

// Test file access vulnerabilities
async function testFileAccess(page) {
  console.log('\n🔍 Testing File Access Vulnerabilities');

  const fileTests = [
    '/.env',
    '/.env.local',
    '/.env.production',
    '/config.json',
    '/package.json',
    '/.git/config',
    '/backup.sql',
    '/database.db',
    '/api/.env',
    '/../../../etc/passwd',
    '/../../.env',
    '/admin/.htpasswd',
    '/wp-config.php',
    '/.DS_Store',
    '/robots.txt',
    '/sitemap.xml',
    '/.well-known/security.txt',
    '/api/debug.log',
    '/logs/error.log',
    '/tmp/debug.log'
  ];

  const accessibleFiles = [];

  for (const file of fileTests) {
    try {
      const response = await page.goto(`${BASE_URL}${file}`, {
        waitUntil: 'networkidle',
        timeout: 5000
      });

      if (response && response.status() === 200) {
        const content = await page.content();

        // Check for sensitive content
        const hasSensitive =
          content.includes('DATABASE_URL') ||
          content.includes('API_KEY') ||
          content.includes('SECRET') ||
          content.includes('PASSWORD') ||
          content.includes('private_key');

        accessibleFiles.push({
          file,
          status: response.status(),
          hasSensitive,
          sampleContent: content.substring(0, 500)
        });

        console.log(`✓ Accessible file: ${file}`);

        if (hasSensitive) {
          logVulnerability('CRITICAL', `Sensitive File Exposure`, {
            file,
            impact: 'Exposed configuration files with sensitive credentials'
          });
        }
      }
    } catch (e) {
      // Silent fail
    }
  }

  return accessibleFiles;
}

// Test subdomain isolation
async function testSubdomainIsolation(page) {
  console.log('\n🔍 Testing Subdomain Isolation');

  const subdomains = [
    'members.localhost:3001',
    'admin.localhost:3001',
    'login.localhost:3001',
    'api.localhost:3001',
    'staging.localhost:3001',
    'dev.localhost:3001'
  ];

  const results = [];

  for (const subdomain of subdomains) {
    try {
      const response = await page.goto(`http://${subdomain}`, {
        waitUntil: 'networkidle',
        timeout: 5000
      });

      if (response && response.status() === 200) {
        results.push({
          subdomain,
          accessible: true,
          status: response.status()
        });
        console.log(`✓ Subdomain accessible: ${subdomain}`);
      }
    } catch (e) {
      // Silent fail
    }
  }

  return results;
}

// Test GraphQL introspection
async function testGraphQLIntrospection(page) {
  console.log('\n🔍 Testing GraphQL Introspection');

  const graphqlEndpoints = [
    '/graphql',
    '/api/graphql',
    '/gql',
    '/api/gql'
  ];

  const introspectionQuery = {
    query: `
      {
        __schema {
          types {
            name
            fields {
              name
              type {
                name
              }
            }
          }
        }
      }
    `
  };

  for (const endpoint of graphqlEndpoints) {
    try {
      const response = await page.request.post(`${BASE_URL}${endpoint}`, {
        data: introspectionQuery,
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      if (response.ok()) {
        const data = await response.json();

        if (data && data.data && data.data.__schema) {
          logVulnerability('HIGH', `GraphQL Introspection Enabled`, {
            endpoint,
            impact: 'Full schema exposed, revealing all queries and mutations',
            schemaTypes: data.data.__schema.types.map(t => t.name)
          });

          console.log(`✓ GraphQL introspection enabled at ${endpoint}`);
        }
      }
    } catch (e) {
      // Silent fail
    }
  }
}

// Test NoSQL injection
async function testNoSQLInjection(page) {
  console.log('\n🔍 Testing NoSQL Injection');

  const injectionPayloads = [
    { "$ne": null },
    { "$gt": "" },
    { "$regex": ".*" },
    { "email": { "$ne": "nonexistent@example.com" } },
    { "password": { "$ne": "wrongpassword" } },
    { "$or": [{ "role": "admin" }, { "role": "user" }] },
    { "role": { "$in": ["admin", "superadmin"] } }
  ];

  const endpoints = [
    '/api/auth/login',
    '/api/clients',
    '/api/users',
    '/api/search'
  ];

  for (const endpoint of endpoints) {
    for (const payload of injectionPayloads) {
      try {
        const response = await page.request.post(`${BASE_URL}${endpoint}`, {
          data: payload,
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });

        if (response.ok()) {
          const data = await response.json();

          if (data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)) {
            logVulnerability('CRITICAL', `NoSQL Injection Vulnerability`, {
              endpoint,
              payload: JSON.stringify(payload),
              impact: 'Database query manipulation allowing unauthorized data access'
            });

            console.log(`✓ NoSQL injection successful at ${endpoint}`);
          }
        }
      } catch (e) {
        // Silent fail
      }
    }
  }
}

// Test UUID prediction
async function testUUIDPrediction(page) {
  console.log('\n🔍 Testing UUID Prediction/Enumeration');

  // Common UUID formats to test
  const uuidPatterns = [
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '11111111-1111-1111-1111-111111111111',
    '12345678-1234-1234-1234-123456789012',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  ];

  const endpoints = [
    '/api/clients',
    '/api/organizations',
    '/api/bookings'
  ];

  for (const endpoint of endpoints) {
    for (const uuid of uuidPatterns) {
      try {
        const response = await page.request.get(`${BASE_URL}${endpoint}/${uuid}`, {
          headers: {
            'Accept': 'application/json'
          },
          timeout: 5000
        });

        if (response.ok()) {
          logVulnerability('MEDIUM', `Predictable UUID Access`, {
            endpoint: `${endpoint}/${uuid}`,
            impact: 'Predictable UUIDs allow unauthorized access'
          });

          console.log(`✓ Predictable UUID worked: ${endpoint}/${uuid}`);
        }
      } catch (e) {
        // Silent fail
      }
    }
  }
}

// Test mass assignment
async function testMassAssignment(page) {
  console.log('\n🔍 Testing Mass Assignment Vulnerabilities');

  const massAssignmentPayloads = [
    {
      role: 'admin',
      is_admin: true,
      admin: true,
      permissions: ['*'],
      organization_id: 1
    },
    {
      verified: true,
      email_verified: true,
      phone_verified: true,
      premium: true,
      subscription_level: 'enterprise'
    }
  ];

  const endpoints = [
    '/api/profile/update',
    '/api/user/settings',
    '/api/clients/update'
  ];

  for (const endpoint of endpoints) {
    for (const payload of massAssignmentPayloads) {
      try {
        const response = await page.request.post(`${BASE_URL}${endpoint}`, {
          data: payload,
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });

        if (response.ok()) {
          logVulnerability('HIGH', `Mass Assignment Vulnerability`, {
            endpoint,
            payload: JSON.stringify(payload),
            impact: 'Allows modification of protected attributes'
          });

          console.log(`✓ Mass assignment possible at ${endpoint}`);
        }
      } catch (e) {
        // Silent fail
      }
    }
  }
}

// Generate security report
async function generateReport() {
  let report = `# Atlas Fitness CRM - IDOR & Data Breach Security Report
Generated: ${new Date().toISOString()}

## Executive Summary
Total Vulnerabilities Found: ${vulnerabilities.length}
- Critical: ${vulnerabilities.filter(v => v.severity === 'CRITICAL').length}
- High: ${vulnerabilities.filter(v => v.severity === 'HIGH').length}
- Medium: ${vulnerabilities.filter(v => v.severity === 'MEDIUM').length}
- Low: ${vulnerabilities.filter(v => v.severity === 'LOW').length}

## Detailed Findings

`;

  // Group vulnerabilities by severity
  const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

  for (const severity of severityOrder) {
    const sevVulns = vulnerabilities.filter(v => v.severity === severity);
    if (sevVulns.length > 0) {
      report += `### ${severity} Severity Vulnerabilities\n\n`;

      sevVulns.forEach((vuln, index) => {
        report += `#### ${index + 1}. ${vuln.title}
**Severity:** ${vuln.severity}
**Timestamp:** ${vuln.timestamp}
**Impact:** ${vuln.impact || 'Not specified'}
`;

        // Add additional details
        Object.keys(vuln).forEach(key => {
          if (!['severity', 'title', 'timestamp', 'impact'].includes(key)) {
            if (typeof vuln[key] === 'object') {
              report += `**${key}:** ${JSON.stringify(vuln[key], null, 2)}\n`;
            } else {
              report += `**${key}:** ${vuln[key]}\n`;
            }
          }
        });

        report += '\n---\n\n';
      });
    }
  }

  report += `## Recommendations

1. **Implement Proper Authorization:** All API endpoints must verify that the requesting user has permission to access the requested resource.

2. **Use UUIDs Instead of Sequential IDs:** Replace numeric IDs with UUIDs to prevent enumeration attacks.

3. **Implement Rate Limiting:** Add rate limiting to prevent automated enumeration attempts.

4. **Secure File Access:** Ensure sensitive files are not publicly accessible.

5. **Disable Debug Endpoints:** Remove or protect all debug endpoints in production.

6. **Input Validation:** Implement strict input validation and sanitization.

7. **Parameterized Queries:** Use parameterized queries to prevent injection attacks.

8. **Security Headers:** Implement security headers like CORS, CSP, etc.

9. **Regular Security Audits:** Conduct regular security assessments.

10. **Logging and Monitoring:** Implement comprehensive logging for security events.

## Testing Methodology

This report was generated using automated security testing focused on:
- IDOR (Insecure Direct Object Reference) vulnerabilities
- Unauthenticated API access
- Parameter manipulation
- File access vulnerabilities
- NoSQL injection
- Mass assignment
- UUID prediction
- GraphQL introspection

---
End of Report
`;

  await fs.writeFile(REPORT_FILE, report);
  console.log(`\n📄 Report saved to ${REPORT_FILE}`);

  return report;
}

// Main test execution
async function runSecurityTests() {
  console.log('🚀 Starting Atlas Fitness CRM Security Assessment');
  console.log('================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-web-security', '--disable-features=IsolateOrigins,site-per-process']
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    bypassCSP: true
  });

  const page = await context.newPage();

  try {
    // Run all security tests
    await testAPIEndpoints(page);
    await testSequentialIDOR(page, '/api/clients', 1, 50);
    await testSequentialIDOR(page, '/api/organizations', 1, 20);
    await testSequentialIDOR(page, '/api/bookings', 1, 50);
    await testSequentialIDOR(page, '/api/forms', 1, 30);
    await testParameterManipulation(page);
    await testFileAccess(page);
    await testSubdomainIsolation(page);
    await testGraphQLIntrospection(page);
    await testNoSQLInjection(page);
    await testUUIDPrediction(page);
    await testMassAssignment(page);

    // Generate report
    await generateReport();

    console.log('\n✅ Security assessment completed');
    console.log(`Found ${vulnerabilities.length} vulnerabilities`);

  } catch (error) {
    console.error('❌ Error during security testing:', error);
  } finally {
    await browser.close();
  }
}

// Run the tests
runSecurityTests().catch(console.error);