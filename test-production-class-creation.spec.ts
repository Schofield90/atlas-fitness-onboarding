import { test, expect } from '@playwright/test';

test('Production - Create class session', async ({ page }) => {
  console.log('🧪 Starting production class session creation test...');

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

  // Step 2: Create a class TYPE first (required before creating sessions)
  console.log('Step 2: Navigating to class types page...');
  await page.goto('https://login.gymleadhub.co.uk/classes');
  await page.waitForTimeout(2000);

  // Check if there are existing class types or create one
  const addClassTypeButton = page.locator('button:has-text("Add Class Type")').first();

  if (await addClassTypeButton.isVisible({ timeout: 5000 })) {
    await addClassTypeButton.click();
    await page.waitForTimeout(1000);

    console.log('Step 3: Creating class type...');

    // Fill class type name - use getByLabel which is more reliable
    await page.getByLabel('Name:').fill(`E2E Test Class ${Date.now()}`);

    // Select category
    const categorySelect = page.getByLabel('Category:');
    if (await categorySelect.isVisible({ timeout: 2000 })) {
      await categorySelect.selectOption('Strength');
    }

    // Click Create Class Type
    const createTypeButton = page.locator('button:has-text("Create Class Type")');
    await createTypeButton.click();

    await page.waitForTimeout(2000);

    console.log('✅ Class type created successfully');
    await page.screenshot({ path: 'production-class-type-create-success.png', fullPage: true });
  } else {
    console.log('⚠️ No "Add Class Type" button found');
    await page.screenshot({ path: 'production-class-types-page.png', fullPage: true });
  }
});
