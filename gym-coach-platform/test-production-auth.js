// Simple test script to check production authentication issues
const { chromium } = require('playwright');

async function testProductionAuth() {
  console.log('Testing production authentication...');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Enable console logging
    page.on('console', msg => console.log('BROWSER:', msg.text()));
    page.on('response', response => {
      if (response.status() >= 400) {
        console.log(`FAILED REQUEST: ${response.status()} ${response.url()}`);
      }
    });

    // Navigate to the production site
    console.log('1. Navigating to login.gymleadhub.co.uk...');
    await page.goto('https://login.gymleadhub.co.uk/auth/login');
    await page.waitForLoadState('networkidle');

    console.log('2. Current URL:', page.url());
    console.log('3. Page title:', await page.title());

    // Check if there are any redirects happening
    const content = await page.content();
    console.log('4. Page contains login form?', content.includes('email') && content.includes('password'));

    // Look for input fields
    const emailInput = await page.locator('input[type="email"], input[name="email"]').count();
    const passwordInput = await page.locator('input[type="password"], input[name="password"]').count();

    console.log('5. Email inputs found:', emailInput);
    console.log('6. Password inputs found:', passwordInput);

    if (emailInput > 0 && passwordInput > 0) {
      console.log('7. Login form found! Attempting login...');

      await page.fill('input[type="email"], input[name="email"]', 'sam@rebelbasemarketing.co.uk');
      await page.fill('input[type="password"], input[name="password"]', 'password123');

      // Take screenshot before login
      await page.screenshot({ path: 'before-login.png' });

      await page.click('button[type="submit"]');

      // Wait for redirect
      await page.waitForTimeout(3000);

      console.log('8. After login URL:', page.url());
      console.log('9. After login title:', await page.title());

      // Take screenshot after login
      await page.screenshot({ path: 'after-login.png' });

      // Test navigation to members
      console.log('10. Testing navigation to members...');
      await page.goto('https://login.gymleadhub.co.uk/members');
      await page.waitForTimeout(2000);

      console.log('11. Members page URL:', page.url());
      console.log('12. Members page title:', await page.title());

      // Test navigation to classes
      console.log('13. Testing navigation to classes...');
      await page.goto('https://login.gymleadhub.co.uk/class-calendar');
      await page.waitForTimeout(2000);

      console.log('14. Classes page URL:', page.url());
      console.log('15. Classes page title:', await page.title());

    } else {
      console.log('7. No login form found. Taking screenshot...');
      await page.screenshot({ path: 'no-login-form.png' });
    }

  } catch (error) {
    console.error('Error during test:', error);
    await page.screenshot({ path: 'error-screenshot.png' });
  } finally {
    await browser.close();
  }
}

testProductionAuth().catch(console.error);