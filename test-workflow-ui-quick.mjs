import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();

try {
  // Login
  await page.goto('http://localhost:3000/owner-login');
  await page.fill('input[type="email"]', 'test2@test.co.uk');
  await page.fill('input[type="password"]', 'Test123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 10000 });

  // Navigate to new workflow
  await page.goto('http://localhost:3000/automations/builder/new');
  await page.waitForTimeout(2000);

  // Take screenshot
  await page.screenshot({ path: '/tmp/workflow-ui-test.png', fullPage: true });
  console.log('Screenshot saved to /tmp/workflow-ui-test.png');

  // Check elements
  const selectTrigger = await page.locator('text=Select Trigger Event').first().isVisible().catch(() => false);
  const workflowNodes = await page.locator('text=Workflow Nodes').first().isVisible().catch(() => false);

  console.log('\nUI Elements Check:');
  console.log('  Select Trigger Event button:', selectTrigger ? '✅ VISIBLE' : '❌ NOT FOUND');
  console.log('  Workflow Nodes sidebar:', workflowNodes ? '✅ VISIBLE' : '❌ NOT FOUND');

  if (selectTrigger) {
    console.log('\n✅ NEW UI IS SHOWING');
  } else if (workflowNodes) {
    console.log('\n❌ OLD UI IS SHOWING (sidebar with "Workflow Nodes")');
  } else {
    console.log('\n⚠️  UNKNOWN STATE - check screenshot');
  }

} catch (error) {
  console.error('Error:', error.message);
} finally {
  await browser.close();
}
