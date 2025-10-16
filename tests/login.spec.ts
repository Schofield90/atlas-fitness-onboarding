import { test, expect } from '@playwright/test';

test('admin login flow should work without redirect loop', async ({ page }) => {
  // Navigate to signin page
  await page.goto('http://localhost:3001/signin');

  // Fill in login credentials
  await page.fill('input[type="email"]', 'sam@gymleadhub.co.uk');
  await page.fill('input[type="password"]', '@Aa80236661');

  // Click sign in button and wait for navigation
  await Promise.all([
    page.waitForNavigation({ timeout: 10000 }),
    page.click('button[type="submit"]')
  ]);

  // Verify we're on the target page (not redirected back to signin)
  const currentUrl = page.url();
  expect(currentUrl).toContain('/saas-admin');
  expect(currentUrl).not.toContain('/signin');

  console.log('✅ Login successful! Current URL:', currentUrl);
  console.log('✅ No redirect loop - middleware fix working!');
});
