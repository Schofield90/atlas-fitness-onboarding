import { test, expect } from '@playwright/test';

test.describe('Stripe Integration Page', () => {
  test('should load settings page and test-data endpoint', async ({ page }) => {
    // Login
    await page.goto('https://login.gymleadhub.co.uk/signin');
    await page.fill('input[type="email"]', 'sam@atlas-gyms.co.uk');
    await page.fill('input[type="password"]', '@Aa80236661');
    await page.click('button[type="submit"]');

    // Wait for redirect after login (could be dashboard or any authenticated page)
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    console.log('After login, current URL:', currentUrl);

    // Navigate to Stripe settings
    await page.goto('https://login.gymleadhub.co.uk/settings/integrations/payments');

    // Check if page loads (no 404)
    await page.waitForLoadState('networkidle');
    const title = await page.title();
    console.log('Page title:', title);

    // Check if settings page content is visible
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 5000 });
    const headingText = await heading.textContent();
    console.log('Page heading:', headingText);

    // Check for 404 error
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('404');
    expect(bodyText).not.toContain('Page not found');

    // Try to access test-data endpoint
    const response = await page.request.get('https://login.gymleadhub.co.uk/api/gym/stripe-connect/test-data');
    console.log('Test-data endpoint status:', response.status());
    console.log('Test-data endpoint response:', await response.text());

    // Screenshot for debugging
    await page.screenshot({ path: 'stripe-integration-page.png', fullPage: true });
  });
});
