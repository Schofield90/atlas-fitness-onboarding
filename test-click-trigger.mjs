import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();

try {
  // Login
  console.log('1. Logging in...');
  await page.goto('http://localhost:3000/owner-login');
  await page.fill('input[type="email"]', 'test2@test.co.uk');
  await page.fill('input[type="password"]', 'Test123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 10000 });
  console.log('✅ Logged in\n');

  // Navigate to new workflow
  console.log('2. Going to new workflow...');
  await page.goto('http://localhost:3000/automations/builder/new');
  await page.waitForTimeout(3000);

  // Try to click the button
  console.log('3. Looking for Select Trigger Event button...');
  const button = page.locator('text=Select Trigger Event').first();
  const isVisible = await button.isVisible();

  console.log('   Button visible:', isVisible);

  if (isVisible) {
    console.log('4. Clicking the button...');
    await button.click();
    await page.waitForTimeout(2000);

    // Check if modal opened
    const modal = await page.locator('h2:has-text("Select Trigger Event")').count();
    console.log('   Modal opened:', modal > 0 ? 'YES' : 'NO');

    if (modal > 0) {
      console.log('\n✅ IT WORKS! Modal opened successfully');

      // List available triggers
      const triggers = await page.locator('button:has-text("Call Booking")').count();
      console.log('   Found triggers in modal:', triggers);
    } else {
      console.log('\n❌ BUTTON CLICKED BUT MODAL DID NOT OPEN');

      // Check console for errors
      page.on('console', msg => console.log('Browser console:', msg.text()));
    }
  } else {
    console.log('\n❌ BUTTON NOT VISIBLE');
  }

  // Keep browser open so you can see
  console.log('\nBrowser will stay open for 30 seconds so you can inspect...');
  await page.waitForTimeout(30000);

} catch (error) {
  console.error('ERROR:', error.message);
  await page.waitForTimeout(30000);
} finally {
  await browser.close();
}
