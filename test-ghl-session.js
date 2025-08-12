
const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ storageState: 'leaddec-session.json' });
  const page = await context.newPage();
  
  await page.goto('https://login.leaddec.com/');
  console.log('Loaded:', page.url());
  
  await page.waitForTimeout(30000);
  await browser.close();
})();