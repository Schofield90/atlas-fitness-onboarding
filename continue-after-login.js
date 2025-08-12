const { chromium } = require('@playwright/test');
const fs = require('fs');

(async () => {
  console.log('🔄 Continuing with saved browser session...');
  
  // Check if we have saved authentication state
  let authState = null;
  if (fs.existsSync('auth-state.json')) {
    console.log('✅ Found saved authentication state');
    authState = JSON.parse(fs.readFileSync('auth-state.json', 'utf8'));
  }
  
  // Launch browser
  const browser = await chromium.launch({ 
    headless: false, // Keep it visible
    slowMo: 100,
  });
  
  // Create context with saved auth state if available
  const context = authState 
    ? await browser.newContext({ storageState: 'auth-state.json' })
    : await browser.newContext();
  
  const page = await context.newPage();
  
  // Try to navigate to the dashboard or wherever login redirects to
  console.log('📍 Navigating to check logged in state...');
  await page.goto('https://login.leaddec.com', {
    waitUntil: 'networkidle',
    timeout: 30000
  });
  
  // Wait a bit to see if we get redirected
  await page.waitForTimeout(3000);
  
  const currentUrl = page.url();
  console.log('📍 Current URL:', currentUrl);
  console.log('📄 Page title:', await page.title());
  
  // Take screenshot
  await page.screenshot({ 
    path: 'logged-in-state.png',
    fullPage: true 
  });
  console.log('📸 Screenshot saved as logged-in-state.png');
  
  // Analyze the page
  const pageAnalysis = await page.evaluate(() => {
    // Look for common elements that indicate logged in state
    const selectors = {
      dashboard: document.querySelector('[href*="dashboard"], [class*="dashboard"]'),
      profile: document.querySelector('[href*="profile"], [class*="profile"]'),
      logout: document.querySelector('[href*="logout"], [href*="signout"], button:has-text("logout"), button:has-text("sign out")'),
      navigation: document.querySelector('nav, [role="navigation"]'),
      sidebar: document.querySelector('[class*="sidebar"], aside'),
      userName: document.querySelector('[class*="user-name"], [class*="username"]'),
    };
    
    // Get all links on the page
    const links = Array.from(document.querySelectorAll('a')).map(a => ({
      text: a.textContent.trim(),
      href: a.href
    })).filter(l => l.text && l.href && !l.href.includes('#'));
    
    // Get all buttons
    const buttons = Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).filter(t => t);
    
    return {
      hasElements: {
        dashboard: !!selectors.dashboard,
        profile: !!selectors.profile,
        logout: !!selectors.logout,
        navigation: !!selectors.navigation,
        sidebar: !!selectors.sidebar,
        userName: !!selectors.userName,
      },
      links: links.slice(0, 10), // First 10 links
      buttons: buttons.slice(0, 10), // First 10 buttons
      pageText: document.body.innerText.substring(0, 1000), // First 1000 chars
    };
  });
  
  console.log('\n📊 Page Analysis:');
  console.log('Has dashboard elements:', pageAnalysis.hasElements.dashboard);
  console.log('Has profile elements:', pageAnalysis.hasElements.profile);
  console.log('Has logout option:', pageAnalysis.hasElements.logout);
  console.log('Has navigation:', pageAnalysis.hasElements.navigation);
  console.log('Has sidebar:', pageAnalysis.hasElements.sidebar);
  console.log('Has username display:', pageAnalysis.hasElements.userName);
  
  console.log('\n🔗 Links found:');
  pageAnalysis.links.forEach(link => {
    console.log(`  - ${link.text}: ${link.href}`);
  });
  
  console.log('\n🔘 Buttons found:');
  pageAnalysis.buttons.forEach(button => {
    console.log(`  - ${button}`);
  });
  
  console.log('\n📝 Page content preview:');
  console.log(pageAnalysis.pageText.substring(0, 500) + '...');
  
  // Save the current state
  await context.storageState({ path: 'auth-state-current.json' });
  console.log('\n💾 Current authentication state saved to auth-state-current.json');
  
  console.log('\n🎯 Browser is still open. You can interact with it manually.');
  console.log('Press Ctrl+C when done to close the browser.');
  
  // Keep browser open indefinitely
  await new Promise(() => {});
})();