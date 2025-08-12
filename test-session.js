const { chromium } = require('@playwright/test');

(async () => {
  console.log('🔍 Testing saved session...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 50
  });
  
  const context = await browser.newContext({
    storageState: 'leaddec-session.json'
  });
  
  const page = await context.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('Page error:', msg.text());
    }
  });
  
  console.log('📍 Navigating to GoHighLevel...');
  await page.goto('https://login.leaddec.com/ai-employee-promo', {
    waitUntil: 'networkidle',
    timeout: 30000
  });
  
  // Wait a bit for any redirects
  await page.waitForTimeout(3000);
  
  const currentUrl = page.url();
  const pageTitle = await page.title();
  
  console.log(`\n📌 Current URL: ${currentUrl}`);
  console.log(`📄 Page title: ${pageTitle}`);
  
  // Check if we're on login page
  if (currentUrl.includes('/login') || currentUrl.includes('auth')) {
    console.log('\n❌ Session appears to be invalid - redirected to login');
    
    // Try to find what's on the page
    const loginForm = await page.locator('#email, input[type="email"]').count();
    if (loginForm > 0) {
      console.log('🔐 Login form detected');
    }
  } else {
    console.log('\n✅ Session appears to be valid!');
    
    // Look for navigation elements
    const navItems = await page.evaluate(() => {
      const items = [];
      
      // Look for sidebar items
      document.querySelectorAll('a[href*="automation"], a[href*="workflow"], nav a, .sidebar a').forEach(link => {
        const text = link.textContent?.trim();
        const href = link.getAttribute('href');
        if (text && href) {
          items.push({ text, href });
        }
      });
      
      return items;
    });
    
    if (navItems.length > 0) {
      console.log('\n🔗 Found navigation items:');
      navItems.forEach(item => {
        console.log(`  - ${item.text}: ${item.href}`);
      });
    }
    
    // Look for any automation-related links
    const automationLinks = navItems.filter(item => 
      item.text.toLowerCase().includes('automation') ||
      item.text.toLowerCase().includes('workflow') ||
      item.href.includes('automation') ||
      item.href.includes('workflow')
    );
    
    if (automationLinks.length > 0) {
      console.log('\n🎯 Found automation-related links:');
      automationLinks.forEach(link => {
        console.log(`  - ${link.text}: ${link.href}`);
      });
    }
  }
  
  // Take a screenshot
  await page.screenshot({ 
    path: 'session-test-screenshot.png',
    fullPage: true 
  });
  console.log('\n📸 Screenshot saved as session-test-screenshot.png');
  
  // Extract page structure
  const pageStructure = await page.evaluate(() => {
    const structure = {
      headers: [],
      buttons: [],
      links: [],
      forms: []
    };
    
    // Headers
    document.querySelectorAll('h1, h2, h3').forEach(h => {
      const text = h.textContent?.trim();
      if (text) structure.headers.push(text);
    });
    
    // Buttons
    document.querySelectorAll('button').forEach(b => {
      const text = b.textContent?.trim();
      if (text && text.length < 50) structure.buttons.push(text);
    });
    
    // Links (first 20)
    document.querySelectorAll('a').forEach((a, i) => {
      if (i < 20) {
        const text = a.textContent?.trim();
        const href = a.getAttribute('href');
        if (text && href) {
          structure.links.push({ text, href });
        }
      }
    });
    
    // Forms
    document.querySelectorAll('form').forEach(f => {
      const id = f.id || 'unnamed';
      const action = f.action || 'none';
      structure.forms.push({ id, action });
    });
    
    return structure;
  });
  
  console.log('\n📋 Page Structure:');
  console.log('Headers:', pageStructure.headers.slice(0, 5));
  console.log('Buttons:', pageStructure.buttons.slice(0, 10));
  console.log('Forms:', pageStructure.forms);
  
  if (pageStructure.links.length > 0) {
    console.log('\nFirst few links:');
    pageStructure.links.slice(0, 5).forEach(link => {
      console.log(`  - ${link.text}: ${link.href}`);
    });
  }
  
  console.log('\n⏳ Keeping browser open for 30 seconds...');
  await page.waitForTimeout(30000);
  
  await browser.close();
  console.log('✅ Test complete!');
})();