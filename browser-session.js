const { chromium } = require('@playwright/test');
const fs = require('fs');

console.log('🚀 Opening browser for LeadDec login...\n');
console.log('INSTRUCTIONS:');
console.log('1. This script will open a browser window');
console.log('2. Please log in manually');
console.log('3. After login, the script will wait 30 seconds then capture the session');
console.log('4. The browser will stay open for you to verify\n');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 50,
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  console.log('📍 Opening login.leaddec.com...');
  await page.goto('https://login.leaddec.com');
  
  console.log('✅ Browser opened!');
  console.log('⏳ Waiting 30 seconds for you to log in...\n');
  
  // Show countdown
  for (let i = 30; i > 0; i--) {
    process.stdout.write(`\r⏱️  ${i} seconds remaining...`);
    await page.waitForTimeout(1000);
  }
  
  console.log('\n\n📸 Capturing session...');
  
  const currentUrl = page.url();
  const pageTitle = await page.title();
  
  console.log(`📍 Current URL: ${currentUrl}`);
  console.log(`📄 Page title: ${pageTitle}`);
  
  // Take screenshot
  const screenshotPath = `leaddec-logged-${Date.now()}.png`;
  await page.screenshot({ 
    path: screenshotPath, 
    fullPage: true 
  });
  console.log(`📸 Screenshot saved as ${screenshotPath}`);
  
  // Save auth state
  await context.storageState({ path: 'leaddec-auth.json' });
  console.log('🔐 Session saved to leaddec-auth.json');
  
  // Check if still on login page
  const isLoginPage = currentUrl.includes('login') && await page.locator('#email').count() > 0;
  
  if (isLoginPage) {
    console.log('\n⚠️  Still on login page!');
    console.log('📝 Waiting another 20 seconds for you to complete login...');
    
    for (let i = 20; i > 0; i--) {
      process.stdout.write(`\r⏱️  ${i} seconds remaining...`);
      await page.waitForTimeout(1000);
    }
    
    // Capture again
    console.log('\n\n📸 Capturing session again...');
    const newUrl = page.url();
    await page.screenshot({ path: 'leaddec-retry.png', fullPage: true });
    await context.storageState({ path: 'leaddec-auth.json' });
    
    console.log(`📍 New URL: ${newUrl}`);
    
    if (newUrl.includes('login')) {
      console.log('⚠️  Still on login page');
    } else {
      console.log('✅ Login successful!');
    }
  } else {
    console.log('✅ Successfully logged in!');
  }
  
  // Analyze the page
  const pageInfo = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'))
      .map(a => ({ text: a.textContent?.trim(), href: a.href }))
      .filter(l => l.text && l.text.length > 0)
      .slice(0, 15);
    
    const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
      .map(h => h.textContent?.trim())
      .filter(text => text && text.length > 0);
    
    return { links, headings };
  });
  
  console.log('\n📋 Page content:');
  console.log('Headings:', pageInfo.headings);
  console.log('\n🔗 Links found:');
  pageInfo.links.forEach(link => {
    console.log(`  - ${link.text}`);
  });
  
  console.log('\n✅ Session captured!');
  console.log('🌐 Browser will remain open for 60 seconds...');
  console.log('💡 You can interact with the page or press Ctrl+C to exit\n');
  
  // Keep browser open for 60 seconds
  for (let i = 60; i > 0; i--) {
    process.stdout.write(`\r⏱️  Browser closing in ${i} seconds...`);
    await page.waitForTimeout(1000);
  }
  
  console.log('\n\n👋 Closing browser...');
  await browser.close();
  console.log('✅ Done!');
  
  // Create a test script to use the saved session
  const testScript = `const { chromium } = require('@playwright/test');

(async () => {
  console.log('🔐 Testing saved session...');
  
  const browser = await chromium.launch({ 
    headless: false 
  });
  
  const context = await browser.newContext({
    storageState: 'leaddec-auth.json'
  });
  
  const page = await context.newPage();
  await page.goto('https://login.leaddec.com');
  
  console.log('✅ Loaded with saved session');
  console.log('Current URL:', page.url());
  
  // Keep open for inspection
  await page.waitForTimeout(30000);
  await browser.close();
})();`;
  
  fs.writeFileSync('test-saved-session.js', testScript);
  console.log('\n📝 Created test-saved-session.js to test the saved session');
})();