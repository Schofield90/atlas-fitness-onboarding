const { chromium } = require('@playwright/test');

(async () => {
  console.log('🚀 Opening new browser to capture logged-in state...');
  console.log('Please log in if not already logged in, then press Enter here...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 50,
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('📍 Navigating to login.leaddec.com...');
  await page.goto('https://login.leaddec.com');
  
  console.log('\n============================================================');
  console.log('👤 Please complete the login in the browser window');
  console.log('📌 After you are logged in and see the dashboard/home page,');
  console.log('   press Enter here to continue...');
  console.log('============================================================\n');
  
  // Wait for Enter key
  await new Promise((resolve) => {
    process.stdin.once('data', resolve);
  });
  
  console.log('📸 Capturing logged-in state...');
  
  // Get current state
  const currentUrl = page.url();
  const pageTitle = await page.title();
  
  console.log(`\n✅ Logged in successfully!`);
  console.log(`📍 Current URL: ${currentUrl}`);
  console.log(`📄 Page title: ${pageTitle}`);
  
  // Take screenshot
  await page.screenshot({ path: 'leaddec-logged-in.png', fullPage: true });
  console.log('📸 Screenshot saved as leaddec-logged-in.png');
  
  // Save authentication state
  await context.storageState({ path: 'leaddec-auth.json' });
  console.log('🔐 Authentication saved to leaddec-auth.json');
  
  // Analyze the page structure
  const pageInfo = await page.evaluate(() => {
    const getTexts = (selector) => {
      return Array.from(document.querySelectorAll(selector))
        .map(el => el.textContent.trim())
        .filter(text => text.length > 0)
        .slice(0, 5);
    };
    
    return {
      // Navigation items
      navItems: getTexts('nav a, nav button, [role="navigation"] a'),
      
      // Main headings
      headings: getTexts('h1, h2, h3'),
      
      // All links
      links: Array.from(document.querySelectorAll('a'))
        .map(a => ({ text: a.textContent.trim(), href: a.href }))
        .filter(l => l.text && !l.href.includes('#'))
        .slice(0, 20),
      
      // Forms on page
      forms: Array.from(document.querySelectorAll('form'))
        .map(f => ({ 
          action: f.action, 
          method: f.method,
          fields: Array.from(f.querySelectorAll('input, select, textarea'))
            .map(field => ({ 
              type: field.type || field.tagName.toLowerCase(), 
              name: field.name,
              id: field.id 
            }))
        })),
      
      // Tables
      tables: document.querySelectorAll('table').length,
      
      // Key elements
      hasLogoutButton: !!document.querySelector('a[href*="logout"], button:contains("logout"), button:contains("sign out")'),
    };
  });
  
  console.log('\n📊 Page Structure Analysis:');
  console.log('Navigation items:', pageInfo.navItems);
  console.log('Main headings:', pageInfo.headings);
  console.log('Number of tables:', pageInfo.tables);
  console.log('Has logout option:', pageInfo.hasLogoutButton);
  
  console.log('\n🔗 Key Links:');
  pageInfo.links.forEach(link => {
    console.log(`  - ${link.text}: ${link.href}`);
  });
  
  if (pageInfo.forms.length > 0) {
    console.log('\n📝 Forms found:');
    pageInfo.forms.forEach((form, i) => {
      console.log(`  Form ${i + 1}: ${form.method} to ${form.action}`);
      console.log(`    Fields: ${form.fields.map(f => f.name || f.id || f.type).join(', ')}`);
    });
  }
  
  console.log('\n✅ Session captured successfully!');
  console.log('You can now use leaddec-auth.json to restore this session in future tests.');
  console.log('\nPress Enter to close the browser...');
  
  await new Promise((resolve) => {
    process.stdin.once('data', resolve);
  });
  
  await browser.close();
  console.log('👋 Browser closed.');
})();