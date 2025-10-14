import { chromium } from 'playwright';

(async () => {
  console.log('🧪 Testing for alert dialogs on landing page...\n');

  const browser = await chromium.launch({ headless: false }); // Show browser
  const page = await browser.newPage();

  let alertDetected = false;
  let alertMessage = '';

  // Listen for dialog events (alerts, confirms, prompts)
  page.on('dialog', async dialog => {
    alertDetected = true;
    alertMessage = dialog.message();
    console.log('🚨 ALERT DETECTED!');
    console.log('Type:', dialog.type());
    console.log('Message:', alertMessage);
    await dialog.dismiss();
  });

  // Listen for console logs that indicate Supabase is suppressing alerts
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[Supabase] Suppressed alert')) {
      console.log('✅ Alert suppression working:', text);
    }
    if (text.includes('[Client]') || text.includes('Realtime')) {
      console.log('📝 Supabase log:', text);
    }
  });

  console.log('📱 Navigating to http://localhost:3000/landing...');

  try {
    await page.goto('http://localhost:3000/landing', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('✅ Page loaded');
    console.log('⏳ Waiting 5 seconds to see if any delayed alerts appear...');

    // Wait to see if any delayed alerts appear
    await page.waitForTimeout(5000);

    if (alertDetected) {
      console.log('\n❌ TEST FAILED: Alert dialog appeared!');
      console.log('Alert message:', alertMessage);
    } else {
      console.log('\n✅ TEST PASSED: No alert dialogs detected!');
    }

  } catch (error) {
    console.error('❌ Error during test:', error.message);
  }

  console.log('\n📊 Test complete. Press any key to close browser...');
  await page.waitForTimeout(30000); // Keep browser open for 30 seconds
  await browser.close();
})();
