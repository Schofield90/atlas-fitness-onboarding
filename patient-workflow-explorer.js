const { chromium } = require('@playwright/test');
const fs = require('fs').promises;
const path = require('path');

console.log('🚀 Patient GoHighLevel Workflow Explorer\n');

async function exploreWorkflows() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100,
  });
  
  const context = await browser.newContext({
    storageState: 'leaddec-session.json',
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  console.log('📍 Navigating to workflows page...');
  
  // Go to the page
  await page.goto('https://login.leaddec.com/v2/location/0JDEcweQeuHSXBKrdgb0/automation/workflows', {
    waitUntil: 'domcontentloaded'
  });
  
  console.log('⏳ Waiting for "Loading fresh data..." to disappear...');
  
  // Wait for loading indicator to disappear
  try {
    await page.waitForFunction(
      () => !document.body.textContent?.includes('Loading fresh data'),
      { timeout: 30000 }
    );
    console.log('✅ Loading complete');
  } catch (e) {
    console.log('⚠️  Loading indicator timeout, continuing anyway...');
  }
  
  // Additional wait for dynamic content
  await page.waitForTimeout(5000);
  
  // Take screenshot
  await page.screenshot({ 
    path: 'workflows-after-loading.png',
    fullPage: true 
  });
  
  console.log('📸 Screenshot saved\n');
  
  // Extract all visible text to understand what's on the page
  const pageContent = await page.evaluate(() => {
    const content = {
      title: document.title,
      url: window.location.href,
      bodyText: document.body.innerText.substring(0, 1000),
      buttons: [],
      links: [],
      workflows: []
    };
    
    // Get all buttons
    document.querySelectorAll('button').forEach(btn => {
      const text = btn.textContent?.trim();
      if (text && text.length > 0 && text.length < 50) {
        content.buttons.push({
          text,
          className: btn.className,
          isVisible: btn.offsetParent !== null
        });
      }
    });
    
    // Get all links
    document.querySelectorAll('a').forEach(link => {
      const text = link.textContent?.trim();
      const href = link.getAttribute('href');
      if (text && href) {
        content.links.push({ text, href });
      }
    });
    
    // Look for workflow-specific content
    const workflowPatterns = [
      'Birthday Automations',
      'Client 6 week nurture',
      'Lead nurture',
      'WhatsApp',
      'Active',
      'Inactive',
      'Draft'
    ];
    
    document.querySelectorAll('*').forEach(el => {
      const text = el.textContent?.trim();
      if (text && workflowPatterns.some(pattern => text.includes(pattern))) {
        const parent = el.parentElement;
        const grandParent = parent?.parentElement;
        
        content.workflows.push({
          text,
          tag: el.tagName,
          className: el.className,
          parentTag: parent?.tagName,
          grandParentTag: grandParent?.tagName,
          isTable: grandParent?.tagName === 'TABLE' || grandParent?.getAttribute('role') === 'table'
        });
      }
    });
    
    return content;
  });
  
  console.log('📋 Page Analysis:');
  console.log(`Title: ${pageContent.title}`);
  console.log(`URL: ${pageContent.url}`);
  console.log(`\nBody preview:\n${pageContent.bodyText.substring(0, 200)}...\n`);
  
  console.log(`Found ${pageContent.buttons.length} buttons`);
  console.log(`Found ${pageContent.links.length} links`);
  console.log(`Found ${pageContent.workflows.length} workflow-related elements`);
  
  // Show relevant buttons
  const relevantButtons = pageContent.buttons.filter(btn => 
    btn.text.toLowerCase().includes('create') ||
    btn.text.toLowerCase().includes('workflow') ||
    btn.text.toLowerCase().includes('new') ||
    btn.text.toLowerCase().includes('add')
  );
  
  if (relevantButtons.length > 0) {
    console.log('\n🔘 Relevant buttons:');
    relevantButtons.forEach(btn => {
      console.log(`  - "${btn.text}" (visible: ${btn.isVisible})`);
    });
  }
  
  // Show workflow elements
  if (pageContent.workflows.length > 0) {
    console.log('\n📊 Workflow elements:');
    const uniqueWorkflows = [...new Set(pageContent.workflows.map(w => w.text))];
    uniqueWorkflows.forEach(text => {
      console.log(`  - ${text}`);
    });
  }
  
  // Try to find and click the Create Workflow button
  console.log('\n🎯 Looking for Create Workflow button...');
  
  const createButtonSelectors = [
    'button:has-text("Create Workflow")',
    'button:has-text("New Workflow")',
    'button:has-text("+ Workflow")',
    'button[class*="create"]',
    'a:has-text("Create Workflow")'
  ];
  
  let foundButton = false;
  for (const selector of createButtonSelectors) {
    try {
      const button = page.locator(selector).first();
      if (await button.isVisible({ timeout: 2000 })) {
        console.log(`✅ Found button with selector: ${selector}`);
        await button.click();
        foundButton = true;
        break;
      }
    } catch (e) {
      // Continue to next selector
    }
  }
  
  if (foundButton) {
    console.log('⏳ Waiting for modal/new page...');
    await page.waitForTimeout(3000);
    
    // Take screenshot of what appears after clicking
    await page.screenshot({ 
      path: 'after-create-workflow-click.png',
      fullPage: true 
    });
    
    // Extract trigger/action options
    const modalContent = await page.evaluate(() => {
      const items = [];
      
      // Look for modal or new content
      document.querySelectorAll('[role="dialog"] *, .modal *, [class*="overlay"] *').forEach(el => {
        const text = el.textContent?.trim();
        if (text && text.length > 3 && text.length < 100 && !text.includes('\n')) {
          items.push({
            text,
            tag: el.tagName,
            className: el.className
          });
        }
      });
      
      return items;
    });
    
    if (modalContent.length > 0) {
      console.log(`\n📌 Found ${modalContent.length} items in modal/overlay`);
      
      // Save modal content
      await fs.writeFile(
        'modal-content.json',
        JSON.stringify(modalContent, null, 2)
      );
      
      // Show first 10 items
      console.log('\nFirst 10 items:');
      modalContent.slice(0, 10).forEach(item => {
        console.log(`  - ${item.text}`);
      });
    }
  } else {
    console.log('❌ Could not find Create Workflow button');
  }
  
  // Save all extracted data
  await fs.writeFile(
    'page-content-analysis.json',
    JSON.stringify(pageContent, null, 2)
  );
  
  console.log('\n📁 Data saved to:');
  console.log('  - workflows-after-loading.png');
  console.log('  - page-content-analysis.json');
  if (foundButton) {
    console.log('  - after-create-workflow-click.png');
    console.log('  - modal-content.json');
  }
  
  console.log('\n⏳ Keeping browser open for manual inspection (30 seconds)...');
  await page.waitForTimeout(30000);
  
  await browser.close();
  console.log('✅ Done!');
}

exploreWorkflows().catch(console.error);