const { chromium } = require('@playwright/test');
const fs = require('fs');

console.log(`
🚀 IMPROVED PLAYWRIGHT LOGIN CAPTURE
===================================

This script will:
1. Open a browser window
2. Navigate to login.leaddec.com  
3. Wait for you to manually log in
4. Detect successful login and navigate to dashboard
5. Capture the authenticated session
6. Test the session is working

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
  
  // Monitor console for errors
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('Firebase')) {
      console.log('Page error:', msg.text());
    }
  });
  
  console.log('📍 Navigating to login.leaddec.com...');
  await page.goto('https://login.leaddec.com');
  
  const loginUrl = page.url();
  console.log('✅ Login page loaded');
  console.log('👤 Please log in manually now...\n');
  
  // Monitor for successful login
  console.log('⏳ Waiting for login completion...');
  
  let isLoggedIn = false;
  let dashboardUrl = '';
  let attempts = 0;
  const maxAttempts = 180; // 3 minutes
  
  while (!isLoggedIn && attempts < maxAttempts) {
    await page.waitForTimeout(1000);
    attempts++;
    
    const currentUrl = page.url();
    
    // Check if URL changed from login page
    if (currentUrl !== loginUrl && !currentUrl.includes('/login')) {
      isLoggedIn = true;
      dashboardUrl = currentUrl;
      console.log(`\n✅ Login successful! Redirected to: ${currentUrl}`);
    }
    
    // Show progress every 10 seconds
    if (attempts % 10 === 0) {
      process.stdout.write(`\r⏱️  Waiting... ${attempts} seconds elapsed`);
    }
  }
  
  if (!isLoggedIn) {
    console.log('\n⚠️  Timeout waiting for login.');
    await browser.close();
    process.exit(1);
  }
  
  console.log('\n\n🔄 Waiting for page to fully load...');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000); // Extra wait for async content
  
  // Try to navigate to a stable page to ensure session is captured properly
  console.log('📍 Navigating to dashboard to ensure stable session...');
  
  // Try different dashboard URLs
  const dashboardUrls = [
    'https://app.leaddec.com/dashboard',
    'https://app.leaddec.com/locations',
    dashboardUrl, // Use where we were redirected
  ];
  
  for (const url of dashboardUrls) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      if (!currentUrl.includes('/login')) {
        console.log(`✅ Successfully loaded: ${currentUrl}`);
        break;
      }
    } catch (e) {
      console.log(`⚠️  Could not load ${url}, trying next...`);
    }
  }
  
  // Capture the session
  console.log('\n📸 Capturing authenticated session...');
  
  const finalUrl = page.url();
  const pageTitle = await page.title();
  
  console.log(`📍 Current URL: ${finalUrl}`);
  console.log(`📄 Page title: ${pageTitle}`);
  
  // Take screenshot
  await page.screenshot({ 
    path: 'leaddec-authenticated-improved.png', 
    fullPage: true 
  });
  console.log('📸 Screenshot saved');
  
  // Save authentication state
  await context.storageState({ path: 'leaddec-session.json' });
  console.log('🔐 Session saved to leaddec-session.json');
  
  // Extract navigation info for automation finding
  console.log('\n🔍 Looking for automation/workflow links...');
  
  const navigationInfo = await page.evaluate(() => {
    const nav = {
      links: [],
      buttons: [],
      menuItems: []
    };
    
    // Find all links
    document.querySelectorAll('a').forEach(a => {
      const text = a.textContent?.trim() || '';
      const href = a.getAttribute('href') || '';
      
      if (text && href) {
        nav.links.push({ text, href });
        
        // Specifically look for automation-related
        if (text.toLowerCase().includes('automation') || 
            text.toLowerCase().includes('workflow') ||
            href.includes('automation') ||
            href.includes('workflow')) {
          nav.menuItems.push({ text, href, type: 'automation' });
        }
      }
    });
    
    // Find buttons that might open menus
    document.querySelectorAll('button').forEach(b => {
      const text = b.textContent?.trim() || '';
      if (text && text.length < 50) {
        nav.buttons.push(text);
      }
    });
    
    return nav;
  });
  
  // Show automation links if found
  if (navigationInfo.menuItems.length > 0) {
    console.log('\n🎯 Found automation-related items:');
    navigationInfo.menuItems.forEach(item => {
      console.log(`  - ${item.text}: ${item.href}`);
    });
  } else {
    console.log('⚠️  No automation links found directly. May need to open menu first.');
  }
  
  // Create test script with correct dashboard URL
  const testScript = `const { chromium } = require('@playwright/test');

// Test script to verify session works
(async () => {
  console.log('🔐 Testing saved session...');
  
  const browser = await chromium.launch({ 
    headless: false
  });
  
  const context = await browser.newContext({
    storageState: 'leaddec-session.json'
  });
  
  const page = await context.newPage();
  
  console.log('📍 Navigating to dashboard...');
  await page.goto('${finalUrl}', { waitUntil: 'domcontentloaded' });
  
  console.log('✅ Page loaded');
  console.log('Current URL:', page.url());
  console.log('Page title:', await page.title());
  
  // Your automation code here
  
  console.log('\\n⏳ Browser will close in 10 seconds...');
  await page.waitForTimeout(10000);
  
  await browser.close();
  console.log('✅ Done!');
})();`;
  
  fs.writeFileSync('test-saved-session.js', testScript);
  console.log('\n📝 Created test-saved-session.js for testing');
  
  console.log('\n✅ Session capture complete!');
  console.log('\n🌐 Keeping browser open for 20 seconds to verify...\n');
  
  // Keep open for verification
  for (let i = 20; i > 0; i--) {
    process.stdout.write(`\r⏱️  Closing in ${i} seconds...`);
    await page.waitForTimeout(1000);
  }
  
  await browser.close();
  console.log('\n\n👋 Browser closed. Session saved successfully!');
  console.log('\nNext steps:');
  console.log('1. Run: node test-saved-session.js');
  console.log('2. Run: node ghl-automation-explorer.js');
})();