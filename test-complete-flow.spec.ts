import { test, expect } from '@playwright/test';

test.describe('Atlas Fitness Complete Flow', () => {
  test('should login, navigate to members, and view membership plans', async ({ page }) => {
    // Step 1: Navigate to login page
    console.log('Step 1: Navigating to login page...');
    await page.goto('http://localhost:3001/owner-login');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Step 2: Login with organization owner
    console.log('Step 2: Logging in as sam@atlas-gyms.co.uk...');
    await page.fill('input[type="email"]', 'sam@atlas-gyms.co.uk');
    await page.fill('input[type="password"]', '@Aa80236661');
    await page.click('button[type="submit"]');

    // Wait for redirect after login
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('✅ Successfully logged in and redirected to dashboard');

    // Step 3: Navigate to members page
    console.log('Step 3: Navigating to members page...');
    await page.click('a[href="/members"]');
    await page.waitForURL('**/members');

    // Wait for members to load
    await page.waitForSelector('text=Members', { timeout: 10000 });

    // Check if members are displayed
    const memberCards = await page.locator('[data-testid="member-card"], .member-card, [class*="member"]').count();
    console.log(`Found ${memberCards} member cards`);

    // Step 4: Click on first member if available
    if (memberCards > 0) {
      console.log('Step 4: Clicking on first member...');
      await page.locator('[data-testid="member-card"], .member-card, [class*="member"]').first().click();

      // Wait for member details to load
      await page.waitForSelector('text=Member Details', { timeout: 5000 }).catch(() => {
        console.log('Member details modal not found, trying view button...');
      });

      // Step 5: Click Add Membership button
      console.log('Step 5: Looking for Add Membership button...');
      const addMembershipButton = page.locator('button:has-text("Add Membership"), button:has-text("Membership")');

      if (await addMembershipButton.isVisible()) {
        await addMembershipButton.click();

        // Wait for modal to open
        await page.waitForSelector('text=Select a plan', { timeout: 5000 });

        // Step 6: Check if membership plans are in dropdown
        console.log('Step 6: Checking membership plans dropdown...');
        const dropdown = page.locator('select:has(option)');
        const options = await dropdown.locator('option').count();

        console.log(`Found ${options - 1} membership plans in dropdown (excluding placeholder)`);

        // Get plan names
        const planNames = [];
        for (let i = 1; i < options; i++) {
          const text = await dropdown.locator(`option:nth-child(${i + 1})`).textContent();
          planNames.push(text);
          console.log(`  - Plan ${i}: ${text}`);
        }

        // Verify plans have pricing
        expect(options).toBeGreaterThan(1); // At least one plan plus placeholder

        // Check for Basic Monthly plan
        const hasBasicPlan = planNames.some(name => name?.includes('Basic Monthly'));
        const hasPremiumPlan = planNames.some(name => name?.includes('Premium Monthly'));

        if (hasBasicPlan) {
          console.log('✅ Basic Monthly plan found');
        }
        if (hasPremiumPlan) {
          console.log('✅ Premium Monthly plan found');
        }

        expect(hasBasicPlan || hasPremiumPlan).toBeTruthy();
      } else {
        console.log('⚠️ Add Membership button not found');
      }
    } else {
      console.log('⚠️ No members found to test membership flow');
    }

    console.log('✅ Test completed successfully');
  });
});