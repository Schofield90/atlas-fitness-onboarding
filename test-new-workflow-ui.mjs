import { chromium } from 'playwright';

console.log('Testing new workflow builder UI...\n');

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();

try {
  // Login first
  console.log('1. Logging in...');
  await page.goto('http://localhost:3000/owner-login');
  await page.fill('input[type="email"]', 'test2@test.co.uk');
  await page.fill('input[type="password"]', 'Test123');
  await page.click('button[type="submit"]');

  // Wait for redirect
  await page.waitForURL('**/dashboard**', { timeout: 10000 });
  console.log('✅ Logged in successfully\n');

  // Navigate to new workflow
  console.log('2. Navigating to new workflow...');
  await page.goto('http://localhost:3000/automations/builder/new');
  await page.waitForTimeout(3000);

  // Check for the new "Select Trigger Event" button
  console.log('3. Checking for new UI elements...\n');

  const selectTriggerButton = await page.locator('text=Select Trigger Event').count();

  if (selectTriggerButton > 0) {
    console.log('✅ SUCCESS: "Select Trigger Event" button found!');
    console.log('   New UI is working correctly.\n');

    // Click it to test the modal
    console.log('4. Testing trigger selection modal...');
    await page.click('text=Select Trigger Event');
    await page.waitForTimeout(1000);

    const modalTitle = await page.locator('text=Select Trigger Event').nth(1).count();
    if (modalTitle > 0) {
      console.log('✅ Modal opened successfully\n');

      // Check for trigger options
      const callBooking = await page.locator('text=Call Booking').count();
      const facebookLead = await page.locator('text=Facebook Lead Form').count();

      console.log(`   Found ${callBooking + facebookLead} trigger options`);
      console.log('   - Call Booking:', callBooking > 0 ? '✅' : '❌');
      console.log('   - Facebook Lead Form:', facebookLead > 0 ? '✅' : '❌');
    } else {
      console.log('❌ Modal did not open');
    }
  } else {
    console.log('❌ FAILED: "Select Trigger Event" button NOT found');
    console.log('   The old UI is still showing.\n');

    // Check what's actually on the page
    console.log('Debugging: Checking for old UI elements...');
    const addTrigger = await page.locator('text=Add Trigger').count();
    const workflowNodes = await page.locator('text=Workflow Nodes').count();

    console.log('   - "Add Trigger" button:', addTrigger > 0 ? 'Found' : 'Not found');
    console.log('   - "Workflow Nodes" sidebar:', workflowNodes > 0 ? 'Found' : 'Not found');
  }

  // Keep browser open for 10 seconds so you can see
  await page.waitForTimeout(10000);

} catch (error) {
  console.error('Error:', error.message);
} finally {
  await browser.close();
}
