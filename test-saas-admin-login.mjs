import { chromium } from 'playwright';

async function testSaaSAdminLogin() {
  console.log('🧪 Testing SaaS Admin login with sam@gymleadhub.co.uk...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Step 1: Navigate to SaaS admin page (should redirect to login if not authenticated)
    console.log('1. Navigating to http://localhost:3002/saas-admin');
    await page.goto('http://localhost:3002/saas-admin');
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Step 2: Check if we're on login page or admin page
    const currentUrl = page.url();
    console.log(`2. Current URL: ${currentUrl}\n`);

    // Step 3: If on login page, fill in credentials
    if (currentUrl.includes('/signin') || currentUrl.includes('/login')) {
      console.log('3. On login page, filling form (sam@gymleadhub.co.uk / [password needed])');
      console.log('   ⚠️  Note: Password not provided - manual entry required\n');

      // Keep browser open for manual login
      console.log('👉 Please log in manually with sam@gymleadhub.co.uk');
      console.log('   Waiting 60 seconds for manual login...\n');
      await page.waitForTimeout(60000);

      // Check URL after manual login
      const afterLoginUrl = page.url();
      console.log(`4. URL after login: ${afterLoginUrl}\n`);

      if (afterLoginUrl.includes('/saas-admin')) {
        console.log('✅ SUCCESS: Reached SaaS admin portal!');
        console.log('   sam@gymleadhub.co.uk account exists and has access\n');

        await page.screenshot({ path: '/tmp/saas-admin-success.png', fullPage: true });
        console.log('📸 Screenshot saved to /tmp/saas-admin-success.png\n');
      } else {
        console.log('❌ FAILED: Did not reach /saas-admin');
        console.log(`   Ended at: ${afterLoginUrl}\n`);

        await page.screenshot({ path: '/tmp/saas-admin-fail.png', fullPage: true });
        console.log('📸 Screenshot saved to /tmp/saas-admin-fail.png\n');
      }
    } else if (currentUrl.includes('/saas-admin')) {
      console.log('✅ ALREADY LOGGED IN: SaaS admin portal accessible!');
      console.log('   Session already exists for authorized user\n');

      await page.screenshot({ path: '/tmp/saas-admin-already-logged-in.png', fullPage: true });
      console.log('📸 Screenshot saved to /tmp/saas-admin-already-logged-in.png\n');
    } else {
      console.log(`⚠️  UNEXPECTED: Ended up at ${currentUrl}\n`);

      await page.screenshot({ path: '/tmp/saas-admin-unexpected.png', fullPage: true });
      console.log('📸 Screenshot saved to /tmp/saas-admin-unexpected.png\n');
    }

    // Keep browser open for 5 seconds so you can see the result
    console.log('Keeping browser open for 5 seconds...');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    await page.screenshot({ path: '/tmp/saas-admin-error.png', fullPage: true });
    console.log('📸 Error screenshot saved to /tmp/saas-admin-error.png\n');
  } finally {
    await browser.close();
  }
}

testSaaSAdminLogin();
