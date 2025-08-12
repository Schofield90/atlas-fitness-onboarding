const { chromium } = require('@playwright/test');
const fs = require('fs');

console.log(`
🚀 GHL SESSION CAPTURE (No Input Required)
=========================================

This will:
1. Open browser
2. Go to login page
3. Wait 2 minutes for you to log in
4. Auto-capture session when ready
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
  
  console.log('✅ Browser opened - Please log in now!');
  console.log('⏱️  You have 2 minutes to log in and navigate to any page\n');
  
  // Wait 2 minutes
  for (let i = 120; i > 0; i--) {
    process.stdout.write(`\r⏳ Time remaining: ${Math.floor(i/60)}:${(i%60).toString().padStart(2, '0')}`);
    await page.waitForTimeout(1000);
  }
  
  console.log('\n\n📸 Capturing session now...');
  
  const currentUrl = page.url();
  const pageTitle = await page.title();
  
  console.log(`📍 Current URL: ${currentUrl}`);
  console.log(`📄 Page title: ${pageTitle}`);
  
  // Check if logged in
  if (currentUrl.includes('login') || currentUrl.includes('auth')) {
    console.log('\n❌ Still on login page. Login may have failed.');
  } else {
    console.log('\n✅ Appears to be logged in!');
  }
  
  // Save screenshot
  await page.screenshot({ 
    path: 'ghl-session-capture.png', 
    fullPage: true 
  });
  console.log('📸 Screenshot saved');
  
  // Save session
  await context.storageState({ path: 'leaddec-session.json' });
  console.log('🔐 Session saved to leaddec-session.json');
  
  // Try to find automation URLs
  const links = await page.evaluate(() => {
    const automationLinks = [];
    document.querySelectorAll('a').forEach(a => {
      const text = a.textContent?.trim() || '';
      const href = a.getAttribute('href') || '';
      
      if ((text.toLowerCase().includes('automation') || 
           text.toLowerCase().includes('workflow') ||
           href.includes('automation') ||
           href.includes('workflow')) && href) {
        automationLinks.push({
          text,
          href: href.startsWith('http') ? href : window.location.origin + href
        });
      }
    });
    return automationLinks;
  });
  
  if (links.length > 0) {
    console.log('\n🎯 Found automation links:');
    links.forEach(link => {
      console.log(`  - ${link.text}: ${link.href}`);
    });
  }
  
  // Save a simple test file
  const testCode = `
const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ storageState: 'leaddec-session.json' });
  const page = await context.newPage();
  
  await page.goto('${currentUrl}');
  console.log('Loaded:', page.url());
  
  await page.waitForTimeout(30000);
  await browser.close();
})();`;
  
  fs.writeFileSync('test-ghl-session.js', testCode);
  
  console.log('\n✅ Done! Files created:');
  console.log('  - leaddec-session.json (session data)');
  console.log('  - ghl-session-capture.png (screenshot)');
  console.log('  - test-ghl-session.js (test script)');
  
  await browser.close();
})();