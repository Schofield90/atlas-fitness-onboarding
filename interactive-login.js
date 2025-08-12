const { chromium } = require('@playwright/test');

(async () => {
  console.log('🚀 Launching browser in interactive mode...');
  
  // Launch browser in headed mode (visible)
  const browser = await chromium.launch({ 
    headless: false, // This makes the browser visible
    slowMo: 100, // Slow down actions by 100ms for better visibility
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();
  
  console.log('📍 Navigating to login.leaddec.com...');
  await page.goto('https://login.leaddec.com', {
    waitUntil: 'networkidle',
    timeout: 30000
  });
  
  console.log('✅ Page loaded successfully!');
  console.log('\n' + '='.repeat(60));
  console.log('🔐 MANUAL LOGIN REQUIRED');
  console.log('='.repeat(60));
  console.log('Please log in manually in the browser window.');
  console.log('After you successfully log in, press Enter here to continue...');
  console.log('='.repeat(60) + '\n');
  
  // Wait for user to press Enter
  await new Promise((resolve) => {
    process.stdin.once('data', resolve);
  });
  
  console.log('👍 Continuing after login...');
  
  // Check current URL to see where we landed after login
  const currentUrl = page.url();
  console.log('📍 Current URL:', currentUrl);
  console.log('📄 Page title:', await page.title());
  
  // Take a screenshot of the logged-in state
  await page.screenshot({ 
    path: 'after-login-screenshot.png',
    fullPage: true 
  });
  console.log('📸 Screenshot saved as after-login-screenshot.png');
  
  // Get some information about the logged-in page
  const pageInfo = await page.evaluate(() => {
    return {
      url: window.location.href,
      title: document.title,
      // Look for common dashboard/home elements
      hasNavigation: !!document.querySelector('nav'),
      hasSidebar: !!document.querySelector('[class*="sidebar"]'),
      hasHeader: !!document.querySelector('header'),
      // Get any visible text that might indicate user is logged in
      bodyText: document.body.innerText.substring(0, 500), // First 500 chars
      // Look for logout/signout links
      hasLogout: !!document.querySelector('[href*="logout"], [href*="signout"], button:has-text("logout"), button:has-text("sign out")'),
    };
  });
  
  console.log('\n📊 Page Analysis:');
  console.log('- Has navigation:', pageInfo.hasNavigation);
  console.log('- Has sidebar:', pageInfo.hasSidebar);
  console.log('- Has header:', pageInfo.hasHeader);
  console.log('- Has logout option:', pageInfo.hasLogout);
  console.log('\n📝 Page preview (first 500 chars):');
  console.log(pageInfo.bodyText);
  
  console.log('\n' + '='.repeat(60));
  console.log('🎯 What would you like to do next?');
  console.log('='.repeat(60));
  console.log('1. Keep browser open for more manual interaction');
  console.log('2. Save cookies/session for future automated use');
  console.log('3. Navigate to a specific page');
  console.log('4. Close browser and exit');
  console.log('\nPress Enter to keep browser open, or Ctrl+C to exit...');
  
  // Save the authentication state (cookies, localStorage, etc.)
  await context.storageState({ path: 'auth-state.json' });
  console.log('💾 Authentication state saved to auth-state.json');
  
  // Keep the browser open
  await new Promise((resolve) => {
    process.stdin.once('data', resolve);
  });
  
  console.log('👋 Closing browser...');
  await browser.close();
  console.log('✅ Done!');
})();