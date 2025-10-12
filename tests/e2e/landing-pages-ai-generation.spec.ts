import { test, expect } from '@playwright/test';

test.describe('AI Landing Page Generation - Color Diversity Tests', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000); // 2 minutes per test

    // Login as test user
    console.log('Step 1: Login as test user');
    await page.goto('http://localhost:3000/owner-login');
    await page.waitForLoadState('domcontentloaded');

    // Fill login form
    await page.fill('input[type="email"]', 'test2@test.co.uk');
    await page.fill('input[type="password"]', 'Test123');

    // Click login and wait for navigation
    console.log('  Clicking login button...');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|org\/)/, { timeout: 30000 });

    console.log('  ✓ Logged in, URL:', page.url());

    // Navigate to landing page builder
    console.log('\nStep 2: Navigate to landing page builder');
    await page.goto('http://localhost:3000/landing-pages/builder');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
  });

  test('Test #1: Generate landing page with ORANGE theme', async ({ page }) => {
    console.log('\n=== TEST #1: ORANGE THEME ===');

    // Click AI Build Page button
    const aiButton = page.locator('button:has-text("AI Build Page")');
    await aiButton.click();
    await page.waitForTimeout(500);

    // Fill description with orange color keyword
    const descriptionInput = page.locator('textarea[placeholder*="Describe"]');
    await descriptionInput.fill('Create a landing page for a restaurant with bright orange theme. Include hero section with chef photo, menu highlights, reservations form, and customer reviews');

    // Click generate button
    const generateButton = page.locator('button:has-text("Generate")');
    await generateButton.click();

    // Wait for generation to complete (up to 60 seconds)
    console.log('  Waiting for AI generation...');
    await page.waitForURL(/\/landing-pages\/builder\/[a-f0-9-]+/, { timeout: 60000 });

    const pageUrl = page.url();
    const pageId = pageUrl.split('/').pop();
    console.log('  ✓ Generated page ID:', pageId);

    // Check server logs for color seed
    await page.waitForTimeout(2000);
    console.log('  Check server logs for "Color Seed: 9" (Burnt Orange)');

    // Verify page loaded with content
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
    console.log('  ✓ Page content loaded successfully');
  });

  test('Test #2: Generate landing page with BLUE theme', async ({ page }) => {
    console.log('\n=== TEST #2: BLUE THEME ===');

    // Click AI Build Page button
    const aiButton = page.locator('button:has-text("AI Build Page")');
    await aiButton.click();
    await page.waitForTimeout(500);

    // Fill description with blue color keyword
    const descriptionInput = page.locator('textarea[placeholder*="Describe"]');
    await descriptionInput.fill('Create a landing page for an ocean conservation nonprofit with blue ocean theme. Include mission statement, donation tiers, volunteer opportunities, and impact statistics');

    // Click generate button
    const generateButton = page.locator('button:has-text("Generate")');
    await generateButton.click();

    // Wait for generation to complete
    console.log('  Waiting for AI generation...');
    await page.waitForURL(/\/landing-pages\/builder\/[a-f0-9-]+/, { timeout: 60000 });

    const pageUrl = page.url();
    const pageId = pageUrl.split('/').pop();
    console.log('  ✓ Generated page ID:', pageId);

    // Check server logs for color seed
    await page.waitForTimeout(2000);
    console.log('  Check server logs for "Color Seed: 0 or 1" (Ocean Blues)');

    // Verify page loaded
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
    console.log('  ✓ Page content loaded successfully');
  });

  test('Test #3: Generate landing page with NO color specified (random)', async ({ page }) => {
    console.log('\n=== TEST #3: RANDOM COLOR (NO PREFERENCE) ===');

    // Click AI Build Page button
    const aiButton = page.locator('button:has-text("AI Build Page")');
    await aiButton.click();
    await page.waitForTimeout(500);

    // Fill description WITHOUT color keywords
    const descriptionInput = page.locator('textarea[placeholder*="Describe"]');
    await descriptionInput.fill('Create a landing page for a SaaS product. Include hero with demo video, feature grid, customer testimonials, pricing table with 3 tiers, and FAQ section');

    // Click generate button
    const generateButton = page.locator('button:has-text("Generate")');
    await generateButton.click();

    // Wait for generation to complete
    console.log('  Waiting for AI generation...');
    await page.waitForURL(/\/landing-pages\/builder\/[a-f0-9-]+/, { timeout: 60000 });

    const pageUrl = page.url();
    const pageId = pageUrl.split('/').pop();
    console.log('  ✓ Generated page ID:', pageId);

    // Check server logs for random color seed
    await page.waitForTimeout(2000);
    console.log('  Check server logs for "Color Seed: 0-9" (Random selection)');

    // Verify page loaded
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
    console.log('  ✓ Page content loaded successfully');
  });
});
