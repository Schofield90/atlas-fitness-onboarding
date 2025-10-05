import { test, expect } from '@playwright/test';

test('Production - Create member after login', async ({ page }) => {
  console.log('🧪 Starting production member creation test...');

  // Step 1: Login
  console.log('Step 1: Logging in to production...');
  await page.goto('https://login.gymleadhub.co.uk/owner-login');
  await page.waitForLoadState('networkidle');

  await page.fill('input[type="email"]', 'sam@atlas-gyms.co.uk');
  await page.fill('input[type="password"]', '@Aa80236661');
  await page.click('button[type="submit"]');

  // Wait for redirect
  await page.waitForTimeout(3000);
  const afterLoginUrl = page.url();
  console.log('✅ Logged in, redirected to:', afterLoginUrl);

  // Step 2: Navigate to customers page
  console.log('Step 2: Navigating to customers page...');
  await page.goto('https://login.gymleadhub.co.uk/customers');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);

  // Step 3: Click "Add a Customer" to navigate to form
  console.log('Step 3: Clicking "Add a Customer"...');
  const addCustomerLink = page.locator('a:has-text("Add a Customer"), link:has-text("Add a Customer")');

  if (await addCustomerLink.isVisible({ timeout: 5000 })) {
    await addCustomerLink.click();
    await page.waitForURL('**/customers/new');
    console.log('✅ Navigated to new customer form');

    // Wait for form to load
    await page.waitForTimeout(1000);

    // Fill in customer details
    console.log('Step 4: Filling customer form...');
    await page.fill('input[name="name"]', 'E2E TestUser');
    await page.fill('input[name="email"]', `e2e-test-${Date.now()}@example.com`);
    await page.fill('input[name="phone"]', '07123456789');

    // Submit
    console.log('Step 5: Submitting form...');
    const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")').first();
    await submitButton.click();

    // Wait for response
    await page.waitForTimeout(3000);

    // Check for success or error
    const errorVisible = await page.locator('text=/error|failed|forbidden/i').isVisible({ timeout: 2000 }).catch(() => false);

    if (errorVisible) {
      console.log('❌ Error creating customer');
      await page.screenshot({ path: 'production-customer-create-error.png', fullPage: true });
      throw new Error('Customer creation failed with error');
    } else {
      console.log('✅ Customer created successfully');
      await page.screenshot({ path: 'production-customer-create-success.png', fullPage: true });
    }
  } else {
    console.log('⚠️ "Add a Customer" link not found, taking screenshot');
    await page.screenshot({ path: 'production-customers-page.png', fullPage: true });
    throw new Error('"Add a Customer" link not found');
  }
});
