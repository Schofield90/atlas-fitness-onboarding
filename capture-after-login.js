const { chromium } = require('@playwright/test');
const fs = require('fs');

console.log(`
🚀 POST-LOGIN SESSION CAPTURE
============================

Instructions:
1. Browser will open to login page
2. Log in manually
3. Navigate to the AUTOMATIONS/WORKFLOWS page
4. Once you're on the automations page, the script will automatically capture everything

The script will wait up to 5 minutes for you to reach the automations page.
`);

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 50,
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  console.log('📍 Opening GoHighLevel...');
  await page.goto('https://login.leaddec.com');
  
  console.log('✅ Browser opened');
  console.log('👤 Please log in and navigate to the Automations/Workflows page');
  console.log('🔍 Looking for automation page...\n');
  
  // Check every 2 seconds for automation page
  let foundAutomations = false;
  let attempts = 0;
  const maxAttempts = 150; // 5 minutes
  
  while (!foundAutomations && attempts < maxAttempts) {
    await page.waitForTimeout(2000);
    attempts++;
    
    const currentUrl = page.url();
    const pageContent = await page.content();
    
    // Check if we're on an automation-related page
    if (currentUrl.includes('automation') || 
        currentUrl.includes('workflow') ||
        pageContent.includes('Automations') ||
        pageContent.includes('Workflows') ||
        pageContent.includes('Create Workflow')) {
      
      foundAutomations = true;
      console.log(`\n✅ Automation page detected!`);
      console.log(`📍 URL: ${currentUrl}`);
      
    } else if (attempts % 5 === 0) {
      // Show progress every 10 seconds
      process.stdout.write(`\r⏳ Waiting for automations page... ${attempts * 2} seconds elapsed`);
    }
  }
  
  if (!foundAutomations) {
    console.log('\n⚠️  Timeout - capturing session anyway');
  }
  
  console.log('\n\n📸 Capturing session and analyzing page...');
  
  // Wait for page to stabilize
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2000);
  
  const finalUrl = page.url();
  const pageTitle = await page.title();
  
  console.log(`\n📌 Current URL: ${finalUrl}`);
  console.log(`📄 Page title: ${pageTitle}`);
  
  // Save screenshot
  await page.screenshot({ 
    path: 'ghl-automations-page.png', 
    fullPage: true 
  });
  console.log('📸 Screenshot saved as ghl-automations-page.png');
  
  // Save HTML snapshot
  const html = await page.content();
  fs.writeFileSync('ghl-automations-page.html', html);
  console.log('📄 HTML saved as ghl-automations-page.html');
  
  // Save session
  await context.storageState({ path: 'leaddec-session.json' });
  console.log('🔐 Session saved to leaddec-session.json');
  
  // Extract automation-specific elements
  console.log('\n🔍 Analyzing automations page...');
  
  const automationData = await page.evaluate(() => {
    const data = {
      workflows: [],
      buttons: [],
      triggers: [],
      actions: [],
      navigationLinks: []
    };
    
    // Look for workflow items
    const workflowSelectors = [
      '[data-testid*="workflow"]',
      '.workflow-item',
      '[class*="workflow"]',
      'div[role="listitem"]',
      'tr[class*="workflow"]'
    ];
    
    workflowSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        const text = el.textContent?.trim();
        if (text && text.length < 200) {
          data.workflows.push(text);
        }
      });
    });
    
    // Look for buttons
    document.querySelectorAll('button').forEach(btn => {
      const text = btn.textContent?.trim();
      if (text && (
        text.toLowerCase().includes('create') ||
        text.toLowerCase().includes('add') ||
        text.toLowerCase().includes('new') ||
        text.toLowerCase().includes('workflow') ||
        text.toLowerCase().includes('trigger') ||
        text.toLowerCase().includes('action')
      )) {
        data.buttons.push(text);
      }
    });
    
    // Look for navigation
    document.querySelectorAll('a').forEach(link => {
      const text = link.textContent?.trim();
      const href = link.getAttribute('href');
      if (text && href && (
        text.toLowerCase().includes('automation') ||
        text.toLowerCase().includes('workflow') ||
        href.includes('automation') ||
        href.includes('workflow')
      )) {
        data.navigationLinks.push({ text, href });
      }
    });
    
    return data;
  });
  
  console.log('\n📊 Found on page:');
  console.log(`  - Workflows: ${automationData.workflows.length}`);
  console.log(`  - Action buttons: ${automationData.buttons.length}`);
  console.log(`  - Navigation links: ${automationData.navigationLinks.length}`);
  
  if (automationData.buttons.length > 0) {
    console.log('\n🔘 Buttons found:');
    automationData.buttons.forEach(btn => console.log(`  - ${btn}`));
  }
  
  if (automationData.workflows.length > 0) {
    console.log('\n📋 Workflows found:');
    automationData.workflows.slice(0, 5).forEach(wf => {
      console.log(`  - ${wf.substring(0, 100)}...`);
    });
  }
  
  // Update the explorer with the correct base URL
  const baseUrl = finalUrl.match(/https:\/\/[^\/]+/)?.[0];
  if (baseUrl) {
    console.log(`\n🔗 Base URL detected: ${baseUrl}`);
    
    // Update explorer script
    const explorerPath = 'ghl-automation-explorer.js';
    if (fs.existsSync(explorerPath)) {
      let explorerContent = fs.readFileSync(explorerPath, 'utf8');
      
      // Update base URL
      explorerContent = explorerContent.replace(
        /baseUrl: '[^']+'/,
        `baseUrl: '${baseUrl}'`
      );
      
      // If we're on automations page, add the direct URL
      if (foundAutomations) {
        explorerContent = explorerContent.replace(
          /\/ai-employee-promo\/automations/g,
          finalUrl.replace(baseUrl, '')
        );
      }
      
      fs.writeFileSync(explorerPath, explorerContent);
      console.log('✅ Updated explorer script with correct URLs');
    }
  }
  
  // Save automation data
  fs.writeFileSync('ghl-automation-data.json', JSON.stringify(automationData, null, 2));
  console.log('\n📁 Automation data saved to ghl-automation-data.json');
  
  console.log('\n✅ Session capture complete!');
  console.log('\nNext steps:');
  console.log('1. Run: node ghl-automation-explorer.js');
  console.log('2. The explorer should now work with your authenticated session');
  
  console.log('\n⏳ Keeping browser open for 10 seconds...');
  await page.waitForTimeout(10000);
  
  await browser.close();
  console.log('👋 Done!');
})();