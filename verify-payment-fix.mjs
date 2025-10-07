import { chromium } from 'playwright';

const LOGIN_URL = 'https://login.gymleadhub.co.uk/signin';
const MEMBER_URL = 'https://login.gymleadhub.co.uk/members/88aa70f1-13b8-4e6d-bac8-d81775abdf3c';
const EMAIL = 'sam@atlas-gyms.co.uk';
const PASSWORD = '@Aa80236661';

async function verifyPaymentFix() {
  console.log('Verifying payment display fix...\n');

  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext();
  const page = await context.newPage();

  let paymentAPICallMade = false;

  // Capture console messages
  page.on('console', msg => {
    const text = msg.text();
    console.log(`[BROWSER CONSOLE] ${msg.type()}: ${text}`);

    // Check if loadPayments is being called
    if (text.includes('Loading payments for customerId')) {
      console.log('✅ loadPayments() function is being called!');
    }
  });

  // Capture network requests
  page.on('request', request => {
    const url = request.url();
    if (url.includes('/api/customers/') && url.includes('/payments')) {
      console.log(`✅ PAYMENTS API CALLED: ${request.method()} ${url}`);
      paymentAPICallMade = true;
    }
  });

  page.on('response', async response => {
    const url = response.url();
    if (url.includes('/api/customers/') && url.includes('/payments')) {
      try {
        const body = await response.json();
        console.log(`\n[API RESPONSE] Status: ${response.status()}`);
        console.log(`[API RESPONSE] Payments found:`, {
          payment_transactions: body.payments?.payment_transactions?.length || 0,
          imported_payments: body.payments?.imported_payments?.length || 0,
          transactions: body.payments?.transactions?.length || 0
        });
      } catch (err) {
        console.log(`[API RESPONSE] ${response.status()} (could not parse JSON)`);
      }
    }
  });

  try {
    // Step 1: Login
    console.log('Step 1: Navigating to login page...');
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });

    console.log('Step 2: Entering credentials and logging in...');
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();

    // Wait for redirect
    await page.waitForTimeout(5000);
    console.log('Current URL after login:', page.url());

    // If we're still on signin or redirected to owner-login, try direct navigation
    if (page.url().includes('signin') || page.url().includes('owner-login')) {
      console.log('Login redirect not working, navigating directly to member profile...');
    }

    console.log('\nStep 3: Navigating to Rich Young\'s member profile...');
    await page.goto(MEMBER_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    console.log('\nStep 4: Looking for Payments tab...');
    const tabsExist = await page.locator('button').count();
    console.log(`Found ${tabsExist} buttons on page`);

    // Try to find and click the Payments tab
    try {
      const paymentsButton = page.locator('button').filter({ hasText: 'Payments' });
      const count = await paymentsButton.count();
      console.log(`Found ${count} Payments button(s)`);

      if (count > 0) {
        console.log('\nStep 5: Clicking Payments tab...');
        await paymentsButton.first().click();
        await page.waitForTimeout(5000); // Wait for API call and rendering

        console.log('\nStep 6: Checking payment display...');

        // Check for "No payments recorded yet" message
        const noPaymentsMessage = page.getByText('No payments recorded yet');
        const hasNoPayments = await noPaymentsMessage.isVisible().catch(() => false);

        // Check for payment elements
        const paymentCards = await page.locator('.bg-gray-700').count();

        console.log('\n========== VERIFICATION RESULTS ==========');
        console.log(`Payment API called: ${paymentAPICallMade ? '✅ YES' : '❌ NO'}`);
        console.log(`"No payments" message showing: ${hasNoPayments ? '❌ YES (BUG)' : '✅ NO (GOOD)'}`);
        console.log(`Payment cards found: ${paymentCards}`);

        if (paymentAPICallMade && !hasNoPayments && paymentCards > 0) {
          console.log('\n✅✅✅ FIX VERIFIED: Payments are now loading and displaying correctly! ✅✅✅');
        } else if (!paymentAPICallMade) {
          console.log('\n❌ BUG STILL EXISTS: Payment API is not being called');
        } else if (hasNoPayments) {
          console.log('\n❌ BUG STILL EXISTS: "No payments recorded yet" message is showing');
        } else {
          console.log('\n⚠️ INCONCLUSIVE: Check screenshot and logs for details');
        }
        console.log('==========================================\n');

        // Take screenshot
        await page.screenshot({
          path: '/Users/samschofield/atlas-fitness-onboarding/payment-fix-verification.png',
          fullPage: true
        });
        console.log('Screenshot saved to: payment-fix-verification.png');

      } else {
        console.log('❌ Could not find Payments tab - might still be on login page');
        await page.screenshot({
          path: '/Users/samschofield/atlas-fitness-onboarding/payment-debug-no-tab.png',
          fullPage: true
        });
      }
    } catch (error) {
      console.error('Error finding/clicking Payments tab:', error.message);
    }

  } catch (error) {
    console.error('Error during verification:', error);
  } finally {
    await page.waitForTimeout(2000);
    await browser.close();
  }
}

verifyPaymentFix().catch(console.error);
