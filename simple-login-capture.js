const { chromium } = require('@playwright/test');
const fs = require('fs');

console.log(`
🚀 SIMPLE LOGIN CAPTURE
======================

Instructions:
1. A browser window will open
2. Log in to GoHighLevel manually
3. Once logged in, navigate to any page inside the app
4. Press ENTER in this terminal when you're ready
5. The session will be captured

Starting...
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
  
  console.log('📍 Opening login page...');
  await page.goto('https://login.leaddec.com');
  
  console.log('✅ Browser opened');
  console.log('\n👤 Please log in manually in the browser window');
  console.log('📍 Navigate to any page inside GoHighLevel after logging in');
  console.log('\n⌨️  Press ENTER here when you are logged in and ready...\n');
  
  // Wait for user input
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });
  
  console.log('✅ Capturing session...\n');
  
  // Wait for any pending requests
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2000);
  
  const currentUrl = page.url();
  const pageTitle = await page.title();
  
  console.log(`📍 Current URL: ${currentUrl}`);
  console.log(`📄 Page title: ${pageTitle}`);
  
  // Save screenshot
  await page.screenshot({ 
    path: 'ghl-logged-in.png', 
    fullPage: true 
  });
  console.log('📸 Screenshot saved as ghl-logged-in.png');
  
  // Save session
  await context.storageState({ path: 'leaddec-session.json' });
  console.log('🔐 Session saved to leaddec-session.json');
  
  // Look for navigation elements
  console.log('\n🔍 Analyzing page for automation links...');
  
  const analysis = await page.evaluate(() => {
    const result = {
      links: [],
      navigationItems: [],
      currentLocation: window.location.href,
      hasAutomationLink: false
    };
    
    // Get all links
    document.querySelectorAll('a').forEach(a => {
      const text = a.textContent?.trim() || '';
      const href = a.getAttribute('href') || '';
      
      if (text && href) {
        result.links.push({ text, href });
        
        // Check for automation/workflow links
        if (text.toLowerCase().includes('automation') || 
            text.toLowerCase().includes('workflow') ||
            href.includes('automation') ||
            href.includes('workflow')) {
          result.navigationItems.push({ 
            text, 
            href, 
            fullUrl: href.startsWith('http') ? href : window.location.origin + href 
          });
          result.hasAutomationLink = true;
        }
      }
    });
    
    // Check for menu buttons
    document.querySelectorAll('[role="button"], button').forEach(btn => {
      const text = btn.textContent?.trim() || '';
      if (text.toLowerCase().includes('menu') || 
          text.toLowerCase().includes('automation') ||
          text.toLowerCase().includes('workflow')) {
        result.navigationItems.push({ 
          text, 
          type: 'button',
          clickable: true 
        });
      }
    });
    
    return result;
  });
  
  if (analysis.hasAutomationLink) {
    console.log('\n✅ Found automation/workflow links:');
    analysis.navigationItems.forEach(item => {
      if (item.href) {
        console.log(`  - "${item.text}": ${item.fullUrl || item.href}`);
      } else {
        console.log(`  - [Button] "${item.text}"`);
      }
    });
  } else {
    console.log('⚠️  No direct automation links found. You may need to:');
    console.log('  1. Click on a menu button first');
    console.log('  2. Navigate to the dashboard');
    console.log('  3. Look in the sidebar menu');
  }
  
  // Create automation URL if we can detect the pattern
  const baseUrl = currentUrl.match(/https:\/\/[^\/]+/)?.[0];
  if (baseUrl) {
    console.log(`\n💡 Possible automation URLs to try:`);
    console.log(`  - ${baseUrl}/automation`);
    console.log(`  - ${baseUrl}/workflows`);
    console.log(`  - ${baseUrl}/automations`);
  }
  
  // Update the explorer script with detected base URL
  if (baseUrl && baseUrl !== 'https://login.leaddec.com') {
    const explorerPath = 'ghl-automation-explorer.js';
    if (fs.existsSync(explorerPath)) {
      let explorerContent = fs.readFileSync(explorerPath, 'utf8');
      explorerContent = explorerContent.replace(
        /baseUrl: 'https:\/\/login\.leaddec\.com'/,
        `baseUrl: '${baseUrl}'`
      );
      fs.writeFileSync(explorerPath, explorerContent);
      console.log(`\n✅ Updated explorer script with base URL: ${baseUrl}`);
    }
  }
  
  console.log('\n✅ Session capture complete!');
  console.log('\nNext steps:');
  console.log('1. Run: node ghl-automation-explorer.js');
  console.log('2. If it fails, try navigating to automations manually first');
  
  console.log('\n⏳ Keeping browser open for 15 seconds...');
  await page.waitForTimeout(15000);
  
  await browser.close();
  console.log('👋 Done!');
  process.exit(0);
})();