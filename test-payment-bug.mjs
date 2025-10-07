import { chromium } from 'playwright';

const LOGIN_URL = 'https://login.gymleadhub.co.uk/signin';
const MEMBER_URL = 'https://login.gymleadhub.co.uk/members/88aa70f1-13b8-4e6d-bac8-d81775abdf3c';
const EMAIL = 'sam@atlas-gyms.co.uk';
const PASSWORD = '@Aa80236661';

async function testPaymentBug() {
  console.log('Starting payment bug investigation...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console messages
  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
  });

  // Capture network requests
  const networkRequests = [];
  page.on('request', request => {
    if (request.url().includes('api') || request.url().includes('payments')) {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers()
      });
      console.log(`[NETWORK] ${request.method()} ${request.url()}`);
    }
  });

  page.on('response', async response => {
    if (response.url().includes('api') || response.url().includes('payments')) {
      try {
        const body = await response.text();
        console.log(`[NETWORK RESPONSE] ${response.status()} ${response.url()}`);
        console.log(`[RESPONSE BODY] ${body.substring(0, 500)}${body.length > 500 ? '...' : ''}\n`);
      } catch (err) {
        console.log(`[NETWORK RESPONSE] ${response.status()} ${response.url()} (could not read body)\n`);
      }
    }
  });

  try {
    // Step 1: Login
    console.log('Step 1: Navigating to login page...');
    await page.goto(LOGIN_URL);
    await page.waitForLoadState('networkidle');

    console.log('Step 2: Entering credentials...');
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);

    console.log('Step 3: Clicking sign in button...');
    await page.locator('button[type="submit"]').click();

    // Wait for successful redirect to dashboard
    console.log('Step 3b: Waiting for redirect to dashboard...');
    await page.waitForURL('**/dashboard**', { timeout: 30000 }).catch(() => {
      console.log('Not redirected to dashboard, checking current URL...');
    });
    await page.waitForTimeout(3000);
    console.log('Current URL after login:', page.url());

    console.log('Step 4: Navigating to Rich Young\'s member profile...');
    await page.goto(MEMBER_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    console.log('Current URL:', page.url());

    console.log('Step 5: Waiting for page to load...');
    // Wait for the profile content to load
    await page.waitForSelector('h1', { timeout: 10000 }).catch(() => {
      console.log('Could not find h1 element');
    });

    console.log('Step 6: Looking for Payments tab...');
    // Try multiple selectors for the Payments tab
    const paymentsTab = await page.locator('button:has-text("Payments")').first();
    const isVisible = await paymentsTab.isVisible().catch(() => false);
    console.log('Payments tab visible:', isVisible);

    if (isVisible) {
      await paymentsTab.click();
      await page.waitForTimeout(3000); // Wait for any API calls
    } else {
      console.log('❌ Payments tab not found on page');
      const pageText = await page.textContent('body');
      console.log('Page content preview:', pageText.substring(0, 500));
    }

    console.log('Step 7: Checking payment display...');
    const pageContent = await page.content();

    // Check for "No payments recorded yet" message
    const hasNoPaymentsMessage = await page.getByText('No payments recorded yet').isVisible().catch(() => false);

    if (hasNoPaymentsMessage) {
      console.log('\n❌ BUG CONFIRMED: "No payments recorded yet" is showing');
    } else {
      console.log('\n✅ Payments are displaying correctly');
    }

    // Check if payment elements exist
    const paymentElements = await page.locator('.bg-gray-700').count();
    console.log(`Payment elements found: ${paymentElements}`);

    // Take a screenshot
    await page.screenshot({ path: '/Users/samschofield/atlas-fitness-onboarding/payment-bug-screenshot.png', fullPage: true });
    console.log('Screenshot saved to: payment-bug-screenshot.png');

    // Check for API errors in network requests
    console.log('\n--- Network Request Summary ---');
    console.log(`Total API requests captured: ${networkRequests.length}`);

    // Wait a bit more to see if any delayed console errors appear
    await page.waitForTimeout(2000);

  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await browser.close();
  }
}

testPaymentBug().catch(console.error);
