import { test, expect } from '@playwright/test';

/**
 * Debug test to investigate why GoCardless payments are not showing
 * for Rich Young's profile, but Stripe payments are showing.
 *
 * Expected: 4 x £110 GoCardless payments + 1 x £1 Stripe test payment
 * Actual: Only Stripe payment showing
 */

test.describe('Payments Debug - Rich Young', () => {
  const CUSTOMER_ID = '88aa70f1-13b8-4e6d-bac8-d81775abdf3c';
  const BASE_URL = 'https://login.gymleadhub.co.uk';

  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto(`${BASE_URL}/signin`);

    // Login with staff credentials
    await page.fill('input[type="email"]', 'sam@atlas-gyms.co.uk');
    await page.fill('input[type="password"]', '@Aa80236661');

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for navigation to complete
    await page.waitForURL(/\/dashboard|\/members/, { timeout: 30000 });
    console.log('[Auth] Logged in successfully');
  });

  test('Intercept and log payments API response', async ({ page }) => {
    const apiResponses: any[] = [];

    // Intercept the payments API call
    await page.route(`**/api/customers/${CUSTOMER_ID}/payments`, async (route) => {
      const response = await route.fetch();
      const body = await response.json();

      // Log the full response
      console.log('[API Response] Full payments data:', JSON.stringify(body, null, 2));

      // Store for assertions
      apiResponses.push(body);

      // Continue with the original response
      await route.fulfill({
        response,
        json: body,
      });
    });

    // Navigate to Rich Young's profile
    await page.goto(`${BASE_URL}/members/${CUSTOMER_ID}`);
    console.log('[Navigation] Navigated to Rich Young profile');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Click on Payments tab
    const paymentsTab = page.locator('text=Payments').or(page.locator('[data-tab="payments"]'));
    await paymentsTab.click();
    console.log('[UI] Clicked Payments tab');

    // Wait for API call to complete
    await page.waitForTimeout(2000);

    // Check if we captured the API response
    expect(apiResponses.length).toBeGreaterThan(0);

    const paymentsData = apiResponses[0];
    console.log('\n=== PAYMENT ANALYSIS ===');
    console.log('Payment Transactions:', paymentsData.payments?.payment_transactions?.length || 0);
    console.log('Imported Payments:', paymentsData.payments?.imported_payments?.length || 0);
    console.log('Transactions:', paymentsData.payments?.transactions?.length || 0);

    // Log imported payments details
    if (paymentsData.payments?.imported_payments?.length > 0) {
      console.log('\n=== IMPORTED PAYMENTS BREAKDOWN ===');
      const stripePayments = paymentsData.payments.imported_payments.filter((p: any) =>
        p.payment_provider === 'stripe'
      );
      const gocardlessPayments = paymentsData.payments.imported_payments.filter((p: any) =>
        p.payment_provider === 'gocardless'
      );

      console.log('Stripe Payments:', stripePayments.length);
      console.log('GoCardless Payments:', gocardlessPayments.length);

      if (gocardlessPayments.length > 0) {
        console.log('\nGoCardless Payment Details:');
        gocardlessPayments.forEach((p: any, index: number) => {
          console.log(`  ${index + 1}. Amount: £${(p.amount / 100).toFixed(2)}, Date: ${p.payment_date}, Status: ${p.payment_status}`);
        });
      } else {
        console.log('\n⚠️ NO GOCARDLESS PAYMENTS FOUND IN API RESPONSE');
      }

      if (stripePayments.length > 0) {
        console.log('\nStripe Payment Details:');
        stripePayments.forEach((p: any, index: number) => {
          console.log(`  ${index + 1}. Amount: £${(p.amount / 100).toFixed(2)}, Date: ${p.payment_date}, Status: ${p.payment_status}`);
        });
      }
    } else {
      console.log('\n⚠️ NO IMPORTED PAYMENTS IN API RESPONSE');
    }

    // Check browser console for errors
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      consoleMessages.push(`[Console ${msg.type()}] ${msg.text()}`);
    });

    // Take screenshot for visual confirmation
    await page.screenshot({
      path: '/Users/samschofield/atlas-fitness-onboarding/apps/gym-dashboard/tests/e2e/payment-tab-screenshot.png',
      fullPage: true
    });
    console.log('\n[Screenshot] Saved to tests/e2e/payment-tab-screenshot.png');

    // Check if payments are rendered in the UI
    const paymentElements = await page.locator('[class*="payment"]').count();
    console.log(`\n[UI] Found ${paymentElements} payment-related elements in DOM`);

    // Log browser console messages
    if (consoleMessages.length > 0) {
      console.log('\n=== BROWSER CONSOLE ===');
      consoleMessages.forEach(msg => console.log(msg));
    }
  });

  test('Check database directly via API endpoint', async ({ page, request }) => {
    // First login to get session
    await page.goto(`${BASE_URL}/signin`);
    await page.fill('input[type="email"]', 'sam@atlas-gyms.co.uk');
    await page.fill('input[type="password"]', '@Aa80236661');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard|\/members/, { timeout: 30000 });

    // Get cookies from the page
    const cookies = await page.context().cookies();

    // Make direct API call with authenticated session
    const response = await page.request.get(`${BASE_URL}/api/customers/${CUSTOMER_ID}/payments`);
    const data = await response.json();

    console.log('\n=== DIRECT API CALL RESULT ===');
    console.log('Status:', response.status());
    console.log('Response:', JSON.stringify(data, null, 2));

    // Analyze the data
    if (data.payments) {
      const imported = data.payments.imported_payments || [];
      const gocardless = imported.filter((p: any) => p.payment_provider === 'gocardless');
      const stripe = imported.filter((p: any) => p.payment_provider === 'stripe');

      console.log('\n=== DATA SUMMARY ===');
      console.log(`Total Imported Payments: ${imported.length}`);
      console.log(`GoCardless: ${gocardless.length}`);
      console.log(`Stripe: ${stripe.length}`);

      if (gocardless.length === 0) {
        console.log('\n❌ ROOT CAUSE: GoCardless payments NOT in API response');
        console.log('This means either:');
        console.log('  1. Payments are not in the database');
        console.log('  2. Payments have wrong client_id');
        console.log('  3. Payments are filtered out by the query');
      } else {
        console.log('\n✅ GoCardless payments ARE in API response');
        console.log('Issue is likely in frontend rendering logic');
      }
    }
  });
});
