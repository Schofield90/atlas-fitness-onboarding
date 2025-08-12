const { chromium } = require('@playwright/test');

console.log(`
🚀 PLAYWRIGHT LOGIN CAPTURE TOOL
================================

This script will:
1. Open a browser window
2. Navigate to login.leaddec.com
3. Wait for you to manually log in
4. Automatically detect when you've logged in (by URL change)
5. Capture the session for future use

Starting now...
`);

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 50,
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  console.log('📍 Navigating to login.leaddec.com...');
  await page.goto('https://login.leaddec.com');
  
  const loginUrl = page.url();
  console.log('✅ Login page loaded');
  console.log('👤 Please log in now...\n');
  
  // Monitor for URL change (indicating successful login)
  console.log('⏳ Waiting for login completion (monitoring for URL change)...');
  
  let isLoggedIn = false;
  let attempts = 0;
  const maxAttempts = 120; // 2 minutes max
  
  while (!isLoggedIn && attempts < maxAttempts) {
    await page.waitForTimeout(1000);
    attempts++;
    
    const currentUrl = page.url();
    
    // Check if URL changed from login page
    if (currentUrl !== loginUrl && !currentUrl.includes('/login')) {
      isLoggedIn = true;
      console.log(`\n✅ Login detected! Redirected to: ${currentUrl}`);
    } else {
      // Also check if login form disappeared
      const hasLoginForm = await page.locator('#email').count() > 0;
      if (!hasLoginForm && currentUrl === loginUrl) {
        // Might be loading, wait a bit more
        await page.waitForTimeout(2000);
        const newUrl = page.url();
        if (newUrl !== loginUrl) {
          isLoggedIn = true;
          console.log(`\n✅ Login successful! Redirected to: ${newUrl}`);
        }
      }
    }
    
    // Show progress
    if (attempts % 5 === 0) {
      process.stdout.write(`\r⏱️  Waiting... ${attempts} seconds elapsed`);
    }
  }
  
  if (!isLoggedIn) {
    console.log('\n⚠️  Timeout waiting for login. Capturing current state anyway...');
  }
  
  // Capture the session
  console.log('\n\n📸 Capturing authenticated session...');
  
  const finalUrl = page.url();
  const pageTitle = await page.title();
  
  console.log(`📍 Final URL: ${finalUrl}`);
  console.log(`📄 Page title: ${pageTitle}`);
  
  // Take screenshot
  await page.screenshot({ 
    path: 'leaddec-authenticated.png', 
    fullPage: true 
  });
  console.log('📸 Screenshot saved as leaddec-authenticated.png');
  
  // Save authentication state
  await context.storageState({ path: 'leaddec-session.json' });
  console.log('🔐 Session saved to leaddec-session.json');
  
  // Get page info
  const pageInfo = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'))
      .map(a => a.textContent?.trim())
      .filter(text => text && text.length > 0)
      .slice(0, 20);
    
    const buttons = Array.from(document.querySelectorAll('button'))
      .map(b => b.textContent?.trim())
      .filter(text => text && text.length > 0);
    
    const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
      .map(h => h.textContent?.trim())
      .filter(text => text && text.length > 0);
    
    return { links, buttons, headings };
  });
  
  console.log('\n📋 Page Analysis:');
  console.log('Headings:', pageInfo.headings);
  console.log('\nButtons:', pageInfo.buttons);
  console.log('\nLinks:', pageInfo.links);
  
  // Create reusable test file
  const reuseScript = `const { chromium } = require('@playwright/test');

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
  await page.goto('${finalUrl}'); // Go to where we were after login
  
  console.log('✅ Page loaded');
  console.log('Current URL:', page.url());
  console.log('Page title:', await page.title());
  
  // Add your automation code here
  
  // Keep browser open for 30 seconds to verify
  console.log('\\n⏳ Browser will close in 30 seconds...');
  await page.waitForTimeout(30000);
  
  await browser.close();
  console.log('✅ Done!');
})();`;
  
  require('fs').writeFileSync('use-saved-session.js', reuseScript);
  console.log('\n📝 Created use-saved-session.js for future automated access');
  
  console.log('\n✅ All done! Session captured successfully.');
  console.log('🌐 Keeping browser open for 30 more seconds...\n');
  
  // Keep open for verification
  for (let i = 30; i > 0; i--) {
    process.stdout.write(`\r⏱️  Closing in ${i} seconds...`);
    await page.waitForTimeout(1000);
  }
  
  await browser.close();
  console.log('\n\n👋 Browser closed. Session saved!');
})();