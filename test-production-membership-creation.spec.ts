import { test, expect } from '@playwright/test';

test('Production - Create membership plan', async ({ page }) => {
  console.log('🧪 Starting production membership plan creation test...');

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

  // Step 2: Navigate to membership plans page
  console.log('Step 2: Navigating to membership plans page...');

  // Try multiple possible URLs
  const possibleUrls = [
    'https://login.gymleadhub.co.uk/memberships',
    'https://login.gymleadhub.co.uk/membership-plans',
    'https://login.gymleadhub.co.uk/settings/membership-plans'
  ];

  let found = false;
  for (const url of possibleUrls) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 5000 });
      const title = await page.title();
      if (title && !title.includes('404')) {
        console.log(`✅ Found membership page at: ${url}`);
        found = true;
        break;
      }
    } catch (e) {
      console.log(`⏭️ Skipping ${url}`);
    }
  }

  if (!found) {
    console.log('❌ Could not find membership plans page');
    await page.screenshot({ path: 'production-membership-page-not-found.png', fullPage: true });
    throw new Error('Could not find membership plans page');
  }

  await page.waitForTimeout(2000);

  // Step 3: Click "+ New Membership Plan" button
  console.log('Step 3: Opening membership plan form...');

  const newPlanButton = page.locator('button:has-text("+ New Membership Plan"), button:has-text("New Membership")').first();

  if (await newPlanButton.isVisible({ timeout: 5000 })) {
    await newPlanButton.click();
    await page.waitForTimeout(1000);

    console.log('Step 4: Filling membership plan form...');

    // Fill plan name (textbox with placeholder "e.g., Premium Monthly")
    await page.fill('input[placeholder*="Premium"]', `E2E Test Plan ${Date.now()}`);

    // Fill price (spinbutton)
    const priceField = page.locator('input[type="number"]').first();
    await priceField.fill('29.99');

    // Fill description
    await page.fill('textarea[placeholder*="Brief description"]', 'E2E test membership plan');

    // Submit
    console.log('Step 5: Submitting membership plan...');
    const createPlanButton = page.locator('button:has-text("Create Plan")').first();
    await createPlanButton.click();

    // Wait for response
    await page.waitForTimeout(3000);

    // Check for success or error
    const errorVisible = await page.locator('text=/error|failed|forbidden/i').isVisible({ timeout: 2000 }).catch(() => false);

    if (errorVisible) {
      console.log('❌ Error creating membership plan');
      await page.screenshot({ path: 'production-membership-create-error.png', fullPage: true });
      throw new Error('Membership plan creation failed with error');
    } else {
      console.log('✅ Membership plan created successfully');
      await page.screenshot({ path: 'production-membership-create-success.png', fullPage: true });
    }
  } else {
    console.log('⚠️ New Membership Plan button not found, taking screenshot');
    await page.screenshot({ path: 'production-membership-page.png', fullPage: true });
    throw new Error('New Membership Plan button not found');
  }
});
