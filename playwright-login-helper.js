const { chromium } = require('@playwright/test');
const fs = require('fs');

const command = process.argv[2] || 'open';

async function openBrowserForLogin() {
  console.log('🚀 Opening browser for login...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 50,
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto('https://login.leaddec.com');
  console.log('✅ Browser opened at login.leaddec.com');
  console.log('👤 Please log in manually');
  console.log('📌 Keep this terminal open');
  console.log('🔄 Run: node playwright-login-helper.js capture');
  console.log('   after you are logged in to save the session');
  
  // Save browser info for later
  global.browserProcess = browser;
  
  // Keep process alive
  setInterval(() => {}, 1000);
}

async function captureSession() {
  console.log('📸 Looking for open browser windows...');
  
  // Connect to existing browser
  const browser = await chromium.launch({ 
    headless: false,
  });
  
  const context = await browser.newContext();
  const pages = context.pages();
  
  if (pages.length === 0) {
    const page = await context.newPage();
    await page.goto('https://login.leaddec.com');
    
    console.log('⏳ Waiting 5 seconds for you to complete login...');
    await page.waitForTimeout(5000);
  }
  
  const page = pages[0] || await context.newPage();
  
  // Get current state
  const currentUrl = page.url();
  const pageTitle = await page.title();
  
  console.log(`\n✅ Current state captured!`);
  console.log(`📍 URL: ${currentUrl}`);
  console.log(`📄 Title: ${pageTitle}`);
  
  // Take screenshot
  await page.screenshot({ path: 'leaddec-session.png', fullPage: true });
  console.log('📸 Screenshot saved as leaddec-session.png');
  
  // Save auth state
  await context.storageState({ path: 'leaddec-auth.json' });
  console.log('🔐 Session saved to leaddec-auth.json');
  
  // Quick analysis
  const hasLoginForm = await page.locator('#email').count() > 0;
  if (hasLoginForm && currentUrl.includes('login')) {
    console.log('⚠️  Still on login page - please log in first');
  } else {
    console.log('✅ Appears to be logged in successfully!');
    
    // Get page info
    const links = await page.locator('a').evaluateAll(elements => 
      elements.map(a => ({ text: a.textContent?.trim(), href: a.href }))
        .filter(l => l.text && l.text.length > 0)
        .slice(0, 10)
    );
    
    console.log('\n🔗 Navigation links found:');
    links.forEach(link => {
      console.log(`  - ${link.text}`);
    });
  }
  
  await browser.close();
  console.log('\n✅ Done! Session saved.');
}

async function testWithAuth() {
  if (!fs.existsSync('leaddec-auth.json')) {
    console.log('❌ No saved session found. Run "open" and "capture" first.');
    return;
  }
  
  console.log('🔐 Loading saved session...');
  
  const browser = await chromium.launch({ 
    headless: false,
  });
  
  const context = await browser.newContext({
    storageState: 'leaddec-auth.json'
  });
  
  const page = await context.newPage();
  await page.goto('https://login.leaddec.com');
  
  console.log('✅ Loaded with saved session');
  console.log('⏳ Checking if still logged in...');
  
  await page.waitForTimeout(3000);
  
  const currentUrl = page.url();
  console.log(`📍 Current URL: ${currentUrl}`);
  
  if (currentUrl.includes('login')) {
    console.log('⚠️  Session expired - need to log in again');
  } else {
    console.log('✅ Still logged in!');
  }
  
  console.log('\n🔄 Browser remains open for inspection');
  console.log('Press Ctrl+C to close');
  
  // Keep alive
  setInterval(() => {}, 1000);
}

// Main execution
(async () => {
  try {
    switch(command) {
      case 'open':
        await openBrowserForLogin();
        break;
      case 'capture':
        await captureSession();
        break;
      case 'test':
        await testWithAuth();
        break;
      default:
        console.log('Usage:');
        console.log('  node playwright-login-helper.js open    - Open browser for login');
        console.log('  node playwright-login-helper.js capture - Capture logged in session');
        console.log('  node playwright-login-helper.js test    - Test with saved session');
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();