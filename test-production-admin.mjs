import { chromium } from 'playwright';

async function testProductionAdmin() {
  console.log('🧪 Testing production admin.gymleadhub.co.uk...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Step 1: Navigate to production admin portal
    console.log('1. Navigating to https://admin.gymleadhub.co.uk/saas-admin');
    await page.goto('https://admin.gymleadhub.co.uk/saas-admin');
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Step 2: Check current URL
    const currentUrl = page.url();
    console.log(`2. Current URL: ${currentUrl}\n`);

    // Step 3: Take screenshot of login page
    await page.screenshot({ path: '/tmp/production-admin-login.png', fullPage: true });
    console.log('📸 Screenshot saved to /tmp/production-admin-login.png\n');

    // Step 4: Try to fill in email to see if it autocompletes or shows any hints
    if (currentUrl.includes('login') || currentUrl.includes('signin') || currentUrl.includes('owner-login')) {
      console.log('3. On login page, checking email field...');

      const emailInput = await page.locator('input[type="email"]').first();
      await emailInput.fill('sam@gymleadhub.co.uk');

      console.log('   Email filled: sam@gymleadhub.co.uk');
      console.log('   👉 Please enter password manually to test if account exists\n');

      // Wait for manual password entry
      console.log('Waiting 30 seconds for manual password entry and login...\n');
      await page.waitForTimeout(30000);

      // Check URL after potential login
      const afterUrl = page.url();
      console.log(`4. URL after wait: ${afterUrl}\n`);

      if (afterUrl.includes('/saas-admin')) {
        console.log('✅ SUCCESS: Account exists and login worked!');
        console.log('   sam@gymleadhub.co.uk has access to production admin portal\n');
      } else if (afterUrl === currentUrl) {
        console.log('⚠️  Still on login page - either:');
        console.log('   - Password incorrect (account exists but wrong password)');
        console.log('   - No manual login attempted');
        console.log('   - Account does not exist\n');
      } else {
        console.log(`⚠️  Ended at: ${afterUrl}\n`);
      }

      await page.screenshot({ path: '/tmp/production-admin-after-login.png', fullPage: true });
      console.log('📸 Screenshot saved to /tmp/production-admin-after-login.png\n');
    }

    // Keep browser open for inspection
    console.log('Keeping browser open for 5 seconds...');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    await page.screenshot({ path: '/tmp/production-admin-error.png', fullPage: true });
    console.log('📸 Error screenshot saved to /tmp/production-admin-error.png\n');
  } finally {
    await browser.close();
  }
}

testProductionAdmin();
