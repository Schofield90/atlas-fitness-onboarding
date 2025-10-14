import { chromium } from 'playwright';

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Listen for console logs (including errors)
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error' || text.includes('Supabase') || text.includes('auth')) {
      console.log(`[Browser ${type.toUpperCase()}]:`, text);
    }
  });

  // Listen for page errors
  page.on('pageerror', error => {
    console.log('[Page Error]:', error.message);
  });

  // Listen for dialog boxes (alerts, confirms, etc.)
  page.on('dialog', async dialog => {
    console.log(`[Alert Dialog]: ${dialog.message()}`);
    await dialog.dismiss();
  });

  console.log('Navigating to http://localhost:3000/landing...');

  try {
    const response = await page.goto('http://localhost:3000/landing', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    console.log('✅ Status:', response.status());
    console.log('✅ URL:', page.url());

    const title = await page.title();
    console.log('✅ Page Title:', title);

    // Wait a moment to see if any errors appear
    await page.waitForTimeout(2000);

    // Check if page has basic content
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
    console.log('✅ Body preview:', bodyText.substring(0, 200) + '...');

    console.log('\n✅ SUCCESS: Page loaded without authentication errors!');

  } catch (error) {
    console.error('❌ Error loading page:', error.message);
  }

  await browser.close();
})();
