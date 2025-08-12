const { chromium } = require('@playwright/test');

// This script uses the saved session from manual-login-capture.js
(async () => {
  console.log('🔐 Loading saved session...');
  
  const browser = await chromium.launch({ 
    headless: false // Set to true for automated tests
  });
  
  const context = await browser.newContext({
    storageState: 'leaddec-session.json'
  });
  
  const page = await context.newPage();
  
  console.log('📍 Navigating with saved session...');
  await page.goto('https://login.leaddec.com/ai-employee-promo'); // Go to where we were after login
  
  console.log('✅ Page loaded');
  console.log('Current URL:', page.url());
  console.log('Page title:', await page.title());
  
  // Add your automation code here
  
  // Keep browser open for 30 seconds to verify
  console.log('\n⏳ Browser will close in 30 seconds...');
  await page.waitForTimeout(30000);
  
  await browser.close();
  console.log('✅ Done!');
})();