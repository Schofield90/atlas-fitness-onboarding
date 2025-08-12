const { chromium } = require('@playwright/test');

(async () => {
  console.log('📸 Capturing current browser state...');
  
  // Launch a new browser instance to capture
  const browser = await chromium.launch({ 
    headless: false,
    timeout: 5000
  });
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Navigate to the site (it should redirect if logged in)
    await page.goto('https://login.leaddec.com', {
      timeout: 10000
    });
    
    // Wait a moment for any redirects
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    const pageTitle = await page.title();
    
    console.log(`📍 Current URL: ${currentUrl}`);
    console.log(`📄 Page title: ${pageTitle}`);
    
    // Save screenshot
    await page.screenshot({ 
      path: 'leaddec-current-state.png', 
      fullPage: true 
    });
    console.log('📸 Screenshot saved as leaddec-current-state.png');
    
    // Save authentication state
    await context.storageState({ path: 'leaddec-auth-state.json' });
    console.log('🔐 Auth state saved to leaddec-auth-state.json');
    
    // Quick check if logged in
    const isLoginPage = currentUrl.includes('login') && await page.locator('#email').count() > 0;
    
    if (isLoginPage) {
      console.log('⚠️  Appears to still be on login page');
      console.log('📝 Note: You need to log in within THIS browser window');
      console.log('   The previously opened window is a separate session');
    } else {
      console.log('✅ Successfully captured logged-in state!');
      
      // Get some page details
      const pageDetails = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'))
          .map(a => a.textContent?.trim())
          .filter(text => text && text.length > 0)
          .slice(0, 15);
        
        const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
          .map(h => h.textContent?.trim())
          .filter(text => text && text.length > 0)
          .slice(0, 10);
        
        return { links, headings };
      });
      
      console.log('\n📋 Page content:');
      console.log('Headings:', pageDetails.headings);
      console.log('\nNavigation links:', pageDetails.links);
    }
    
    await browser.close();
    console.log('\n✅ Capture complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await browser.close();
  }
})();