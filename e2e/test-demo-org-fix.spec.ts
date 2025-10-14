import { test, expect } from '@playwright/test';

test('test2@test.co.uk should see Demo Fitness Studio organization', async ({ page }) => {
  // Go to login page
  await page.goto('https://login.gymleadhub.co.uk/owner-login', {
    waitUntil: 'load',
    timeout: 60000
  });

  // Fill in login credentials
  await page.fill('input[type="email"]', 'test2@test.co.uk');
  await page.fill('input[type="password"]', 'Test123');

  // Click sign in button
  await page.click('button[type="submit"]');

  // Wait for navigation to complete
  await page.waitForURL(/.*\/(dashboard|members)/, { timeout: 30000 });

  // Navigate to members page
  await page.goto('https://login.gymleadhub.co.uk/members');

  // Wait for page to load
  await page.waitForTimeout(3000);

  // Check the page content for organization name
  const pageContent = await page.content();

  // Look for Demo Fitness Studio or 50 members (demo data)
  const hasDemoData = pageContent.includes('Demo') ||
                      pageContent.includes('Emma Wilson') ||
                      pageContent.includes('James Brown');

  // Check for wrong organization (Test org)
  const hasWrongOrg = pageContent.includes('"Test"') &&
                      pageContent.includes('fdd9d5f6-f4e4-4e93-ab47-b808997cf5e3');

  console.log('Has demo data indicators:', hasDemoData);
  console.log('Has wrong org indicators:', hasWrongOrg);

  // Take screenshot for debugging
  await page.screenshot({ path: 'test-demo-org-result.png', fullPage: true });

  // Assertions
  expect(hasWrongOrg).toBe(false);

  // Check console logs for organization ID
  const logs: string[] = [];
  page.on('console', msg => logs.push(msg.text()));

  await page.reload();
  await page.waitForTimeout(2000);

  const orgLogs = logs.filter(log => log.includes('organizationId') || log.includes('Demo'));
  console.log('Organization logs:', orgLogs);

  // Should see Demo Fitness Studio org ID
  const hasCorrectOrgId = logs.some(log => log.includes('c762845b-34fc-41ea-9e01-f70b81c44ff7'));
  expect(hasCorrectOrgId).toBe(true);
});
