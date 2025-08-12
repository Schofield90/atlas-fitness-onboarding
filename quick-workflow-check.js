const { chromium } = require('@playwright/test');

(async () => {
  console.log('🚀 Quick Workflow Check\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 50,
  });
  
  const context = await browser.newContext({
    storageState: 'leaddec-session.json',
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  console.log('📍 Going to workflows page...');
  
  try {
    await page.goto('https://login.leaddec.com/v2/location/0JDEcweQeuHSXBKrdgb0/automation/workflows', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
  } catch (e) {
    console.log('⚠️  Navigation timeout, but continuing...');
  }
  
  console.log('⏳ Waiting 5 seconds for content to load...');
  await page.waitForTimeout(5000);
  
  const url = page.url();
  console.log(`📌 Current URL: ${url}`);
  
  // Take screenshot
  await page.screenshot({ 
    path: 'current-workflows-page.png',
    fullPage: true 
  });
  console.log('📸 Screenshot saved');
  
  // Look for key elements
  console.log('\n🔍 Looking for page elements...');
  
  const elements = await page.evaluate(() => {
    const result = {
      buttons: [],
      workflows: [],
      links: [],
      tables: 0
    };
    
    // Find buttons
    document.querySelectorAll('button').forEach(btn => {
      const text = btn.textContent?.trim();
      if (text && (
        text.includes('Create') || 
        text.includes('Workflow') ||
        text.includes('New')
      )) {
        result.buttons.push(text);
      }
    });
    
    // Find workflow-related text
    document.querySelectorAll('td, div, span').forEach(el => {
      const text = el.textContent?.trim();
      if (text && (
        text === 'Birthday Automations' ||
        text === 'Client 6 week nurture process' ||
        text === 'Client check ins' ||
        text === 'Lead nurture York' ||
        text === 'WhatsApp Integration'
      )) {
        result.workflows.push({
          text,
          tag: el.tagName,
          parent: el.parentElement?.tagName
        });
      }
    });
    
    // Count tables
    result.tables = document.querySelectorAll('table, [role="table"]').length;
    
    // Find links in sidebar
    document.querySelectorAll('a').forEach(link => {
      const text = link.textContent?.trim();
      const href = link.getAttribute('href');
      if (text && href && (
        text.includes('Automation') ||
        text.includes('Workflow') ||
        href.includes('automation')
      )) {
        result.links.push({ text, href });
      }
    });
    
    return result;
  });
  
  console.log('\n📊 Found:');
  console.log(`- Tables: ${elements.tables}`);
  console.log(`- Relevant buttons: ${elements.buttons.length}`);
  console.log(`- Workflows: ${elements.workflows.length}`);
  console.log(`- Navigation links: ${elements.links.length}`);
  
  if (elements.buttons.length > 0) {
    console.log('\n🔘 Buttons:');
    elements.buttons.forEach(btn => console.log(`  - "${btn}"`));
  }
  
  if (elements.workflows.length > 0) {
    console.log('\n📋 Workflows found:');
    elements.workflows.forEach(wf => console.log(`  - ${wf.text} (${wf.tag} in ${wf.parent})`));
  }
  
  if (elements.links.length > 0) {
    console.log('\n🔗 Navigation:');
    elements.links.slice(0, 5).forEach(link => console.log(`  - ${link.text}: ${link.href}`));
  }
  
  // Try clicking Create Workflow if found
  if (elements.buttons.some(btn => btn.includes('Create Workflow'))) {
    console.log('\n🎯 Attempting to click Create Workflow...');
    
    try {
      const createBtn = await page.locator('button:has-text("Create Workflow")').first();
      await createBtn.click();
      await page.waitForTimeout(2000);
      
      await page.screenshot({ 
        path: 'create-workflow-clicked.png',
        fullPage: true 
      });
      console.log('✅ Clicked and captured screenshot');
      
      // Look for triggers in the modal
      const modalContent = await page.evaluate(() => {
        const triggers = [];
        document.querySelectorAll('[role="dialog"] *, .modal *, [class*="trigger"]').forEach(el => {
          const text = el.textContent?.trim();
          if (text && text.length < 50 && text.length > 3) {
            triggers.push(text);
          }
        });
        return [...new Set(triggers)]; // Remove duplicates
      });
      
      if (modalContent.length > 0) {
        console.log('\n📌 Modal content:');
        modalContent.slice(0, 20).forEach(item => console.log(`  - ${item}`));
      }
      
    } catch (e) {
      console.log('❌ Could not click Create Workflow button');
    }
  }
  
  console.log('\n⏳ Keeping browser open for 15 seconds...');
  await page.waitForTimeout(15000);
  
  await browser.close();
  console.log('✅ Done!');
})();