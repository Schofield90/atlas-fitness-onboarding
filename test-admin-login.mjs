import { chromium } from 'playwright';

async function testAdminLogin() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error('Usage: node test-admin-login.mjs <email> <password>');
    process.exit(1);
  }

  console.log('🧪 Testing SaaS Admin login...\n');
  console.log(`Email: ${email}`);
  console.log('Password: [REDACTED]\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100 // Slow down just a bit to see what's happening
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Enable console logging
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[SaaS Admin]') || text.includes('[Client]')) {
      console.log('📋 Browser console:', text);
    }
  });

  try {
    console.log('1️⃣ Navigating to /saas-admin...');
    await page.goto('http://localhost:3001/saas-admin', { waitUntil: 'domcontentloaded' });

    // Wait for either "Login Required" or "SaaS Admin Dashboard" to appear
    await page.waitForSelector('text=Login Required, text=SaaS Admin Dashboard', { timeout: 10000 }).catch(() => {
      console.log('   ⚠️  Neither login nor dashboard screen appeared');
    });

    console.log('2️⃣ Looking for "Go to Login" button...');

    // Try multiple selectors
    let loginButton = null;
    try {
      loginButton = await page.waitForSelector('button:has-text("Go to Login")', { timeout: 3000 });
    } catch (e) {
      console.log('   ⚠️  Button with text "Go to Login" not found, trying other selectors...');
      try {
        loginButton = await page.waitForSelector('button:has-text("Go to")', { timeout: 3000 });
      } catch (e2) {
        console.log('   ⚠️  Checking page content...');
        const bodyText = await page.textContent('body');
        console.log(`   Page content includes: ${bodyText.substring(0, 200)}...`);
        throw new Error('Could not find login button');
      }
    }
    console.log('   ✓ Found login button');

    console.log('3️⃣ Clicking "Go to Login"...');
    await loginButton.click();

    console.log('4️⃣ Waiting for signin page...');
    await page.waitForURL('**/signin?redirect=/saas-admin', { timeout: 5000 });
    console.log('   ✓ On signin page');

    console.log('5️⃣ Filling in email...');
    await page.fill('input[type="email"]', email);
    console.log('   ✓ Email filled');

    console.log('6️⃣ Filling in password...');
    await page.fill('input[type="password"]', password);
    console.log('   ✓ Password filled');

    console.log('7️⃣ Clicking "Sign In"...');
    await page.click('button[type="submit"]');

    console.log('8️⃣ Waiting for redirect to /saas-admin...');

    // Wait for either success (dashboard) or failure (login page again)
    const result = await Promise.race([
      page.waitForSelector('text=SaaS Admin Dashboard', { timeout: 10000 })
        .then(() => 'success'),
      page.waitForSelector('text=Login Required', { timeout: 10000 })
        .then(() => 'login_required'),
      page.waitForSelector('text=Access Denied', { timeout: 10000 })
        .then(() => 'access_denied'),
    ]);

    if (result === 'success') {
      console.log('\n✅ Dashboard header appeared!');

      // Wait a bit more to see if it stays or switches back to login
      console.log('⏳ Waiting 3 seconds to verify dashboard stays loaded...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check if we're still on the dashboard or back to login
      const stillOnDashboard = await page.locator('text=SaaS Admin Dashboard').isVisible();
      const backToLogin = await page.locator('text=Login Required').isVisible();

      if (!stillOnDashboard || backToLogin) {
        console.log('\n❌ FAILED! Dashboard disappeared - switched back to login screen');
        console.log('🔄 This indicates the session is not persisting after redirect');

        await page.screenshot({ path: '/tmp/admin-dashboard-disappeared.png' });
        console.log('📸 Screenshot saved to /tmp/admin-dashboard-disappeared.png');

        await new Promise(resolve => setTimeout(resolve, 10000));
        return;
      }

      console.log('🎉 Dashboard still visible after 3 seconds');

      // Check for stats
      const hasOrgs = await page.locator('text=Total Organizations').isVisible();
      const hasUsers = await page.locator('text=Total Users').isVisible();
      const hasLeads = await page.locator('text=Total Leads').isVisible();

      console.log('\n📊 Dashboard elements visible:');
      console.log(`   Total Organizations: ${hasOrgs ? '✓' : '✗'}`);
      console.log(`   Total Users: ${hasUsers ? '✓' : '✗'}`);
      console.log(`   Total Leads: ${hasLeads ? '✓' : '✗'}`);

      if (!hasOrgs && !hasUsers && !hasLeads) {
        console.log('\n⚠️  WARNING: Dashboard rendered but no stats loaded');
        console.log('   This might indicate auth is still processing');
      }

      // Take screenshot
      await page.screenshot({ path: '/tmp/admin-dashboard-success.png' });
      console.log('\n📸 Screenshot saved to /tmp/admin-dashboard-success.png');

      // Keep browser open for 5 seconds to see the result
      console.log('\n⏳ Keeping browser open for 5 seconds...');
      await new Promise(resolve => setTimeout(resolve, 5000));

    } else if (result === 'login_required') {
      console.log('\n❌ FAILED! Redirected back to "Login Required" screen');
      console.log('🔄 Login loop detected');

      await page.screenshot({ path: '/tmp/admin-login-failed.png' });
      console.log('📸 Screenshot saved to /tmp/admin-login-failed.png');

      // Keep browser open to inspect
      console.log('\n⏳ Keeping browser open for 10 seconds to inspect...');
      await new Promise(resolve => setTimeout(resolve, 10000));

    } else if (result === 'access_denied') {
      console.log('\n❌ FAILED! Access Denied');

      const errorText = await page.locator('.text-gray-400').textContent();
      console.log(`Error: ${errorText}`);

      await page.screenshot({ path: '/tmp/admin-access-denied.png' });
      console.log('📸 Screenshot saved to /tmp/admin-access-denied.png');

      await new Promise(resolve => setTimeout(resolve, 10000));
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    await page.screenshot({ path: '/tmp/admin-login-error.png' });
    console.log('📸 Screenshot saved to /tmp/admin-login-error.png');

    // Keep browser open to inspect
    await new Promise(resolve => setTimeout(resolve, 10000));
  } finally {
    await browser.close();
    console.log('\n🔚 Browser closed');
  }
}

testAdminLogin().catch(console.error);
