const { chromium } = require('@playwright/test');
const fs = require('fs').promises;
const path = require('path');

console.log('🚀 GoHighLevel Workflow Creation & Discovery\n');

const dataDir = '/Users/samschofield/atlas-fitness-onboarding/data/ghl_automation';

async function createAndExploreWorkflow() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100,
  });
  
  const context = await browser.newContext({
    storageState: 'leaddec-session.json',
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  // Go to workflows page
  console.log('📍 Loading workflows page...');
  await page.goto('https://login.leaddec.com/v2/location/0JDEcweQeuHSXBKrdgb0/automation/workflows', {
    waitUntil: 'domcontentloaded'
  });
  
  await page.waitForTimeout(5000);
  
  // Look for Create Workflow button
  console.log('🔍 Looking for Create Workflow button...');
  
  // First, let's check what's visible on the page
  const pageElements = await page.evaluate(() => {
    const elements = {
      buttons: [],
      links: [],
      headings: []
    };
    
    // Get all buttons
    document.querySelectorAll('button').forEach(btn => {
      const text = btn.textContent?.trim();
      if (text && text.length < 50) {
        elements.buttons.push({
          text,
          className: btn.className,
          isVisible: btn.offsetParent !== null,
          ariaLabel: btn.getAttribute('aria-label')
        });
      }
    });
    
    // Get all links
    document.querySelectorAll('a').forEach(link => {
      const text = link.textContent?.trim();
      const href = link.getAttribute('href');
      if (text && text.length < 50) {
        elements.links.push({ text, href });
      }
    });
    
    // Get headings
    document.querySelectorAll('h1, h2, h3').forEach(h => {
      const text = h.textContent?.trim();
      if (text) {
        elements.headings.push(text);
      }
    });
    
    return elements;
  });
  
  console.log('\n📊 Page Analysis:');
  console.log(`Buttons: ${pageElements.buttons.length}`);
  console.log(`Links: ${pageElements.links.length}`);
  console.log(`Headings: ${pageElements.headings.length}`);
  
  // Show visible buttons
  console.log('\n🔘 Visible Buttons:');
  pageElements.buttons
    .filter(btn => btn.isVisible)
    .forEach(btn => {
      console.log(`  - "${btn.text}" (aria-label: ${btn.ariaLabel || 'none'})`);
    });
  
  // Try different approaches to find create workflow option
  console.log('\n🎯 Attempting to create workflow...');
  
  // Method 1: Look for + button or icon
  try {
    const plusButton = await page.locator('button:has(svg), button:has(i), [aria-label*="add"], [aria-label*="create"]').first();
    if (await plusButton.isVisible({ timeout: 2000 })) {
      console.log('Found + or icon button, clicking...');
      await plusButton.click();
      await page.waitForTimeout(2000);
      
      // Check if dropdown appeared
      const dropdownItems = await page.evaluate(() => {
        const items = [];
        document.querySelectorAll('[role="menu"] *, .dropdown-menu *, [class*="dropdown"] *').forEach(el => {
          const text = el.textContent?.trim();
          if (text && text.length > 3 && text.length < 50) {
            items.push(text);
          }
        });
        return [...new Set(items)];
      });
      
      if (dropdownItems.length > 0) {
        console.log('\n📋 Dropdown items:');
        dropdownItems.forEach(item => console.log(`  - ${item}`));
        
        // Try to click "Workflow" option
        try {
          await page.click('text=Workflow');
          await page.waitForTimeout(2000);
        } catch (e) {
          console.log('Could not click Workflow option');
        }
      }
    }
  } catch (e) {
    console.log('No + button found');
  }
  
  // Method 2: Look for any create-related element
  try {
    const createElements = await page.locator('*:has-text("Create"), *:has-text("New"), *:has-text("Add")').all();
    console.log(`\nFound ${createElements.length} create-related elements`);
    
    for (const element of createElements.slice(0, 5)) {
      const text = await element.textContent();
      const tagName = await element.evaluate(el => el.tagName);
      console.log(`  - ${tagName}: ${text?.trim().substring(0, 50)}`);
    }
  } catch (e) {
    console.log('Error finding create elements');
  }
  
  // Take screenshot of current state
  await page.screenshot({ 
    path: path.join(dataDir, 'screenshots', 'workflow-page-state.png'),
    fullPage: true 
  });
  
  // Method 3: Navigate directly to create workflow URL if it exists
  console.log('\n🔗 Trying direct navigation to create workflow...');
  try {
    await page.goto('https://login.leaddec.com/v2/location/0JDEcweQeuHSXBKrdgb0/automation/create', {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('create') || currentUrl.includes('new')) {
      console.log('✅ Navigated to create page');
      
      await page.screenshot({ 
        path: path.join(dataDir, 'screenshots', 'create-workflow-page.png'),
        fullPage: true 
      });
      
      // Extract trigger options from this page
      const createPageData = await page.evaluate(() => {
        const data = {
          title: document.title,
          headings: [],
          options: [],
          inputs: []
        };
        
        // Get headings
        document.querySelectorAll('h1, h2, h3').forEach(h => {
          const text = h.textContent?.trim();
          if (text) data.headings.push(text);
        });
        
        // Get option cards
        document.querySelectorAll('.card, [class*="option"], [class*="trigger"]').forEach(card => {
          const text = card.textContent?.trim();
          if (text && text.length < 300) {
            data.options.push({
              text,
              className: card.className
            });
          }
        });
        
        // Get inputs
        document.querySelectorAll('input, select').forEach(input => {
          data.inputs.push({
            type: input.type || input.tagName,
            name: input.name || input.id,
            placeholder: input.placeholder
          });
        });
        
        return data;
      });
      
      console.log('\n📋 Create Page Data:');
      console.log(`Headings: ${createPageData.headings.join(', ')}`);
      console.log(`Options: ${createPageData.options.length}`);
      console.log(`Inputs: ${createPageData.inputs.length}`);
      
      if (createPageData.options.length > 0) {
        console.log('\n🎯 Trigger/Action Options:');
        createPageData.options.forEach((opt, i) => {
          console.log(`${i + 1}. ${opt.text.substring(0, 100)}...`);
        });
      }
      
      await fs.writeFile(
        path.join(dataDir, 'workflows', 'create-page-data.json'),
        JSON.stringify(createPageData, null, 2)
      );
    }
  } catch (e) {
    console.log('Could not navigate to create URL:', e.message);
  }
  
  // Look for existing workflows to analyze
  console.log('\n📊 Looking for existing workflows to analyze...');
  
  const workflowList = await page.evaluate(() => {
    const workflows = [];
    
    // Try different selectors for workflow items
    const selectors = [
      'tbody tr',
      '[role="row"]',
      '.workflow-item',
      '[class*="workflow-row"]'
    ];
    
    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(row => {
        const cells = row.querySelectorAll('td, [role="cell"]');
        if (cells.length >= 3) {
          const name = cells[1]?.textContent?.trim() || '';
          const status = cells[2]?.textContent?.trim() || '';
          
          if (name && !name.includes('Name')) { // Skip header row
            workflows.push({
              name,
              status,
              rowText: row.textContent?.trim().substring(0, 200)
            });
          }
        }
      });
    });
    
    return workflows;
  });
  
  if (workflowList.length > 0) {
    console.log(`\n✅ Found ${workflowList.length} workflows:`);
    workflowList.forEach(wf => {
      console.log(`  - ${wf.name} (${wf.status})`);
    });
    
    // Try to click on first workflow to see its details
    if (workflowList.length > 0) {
      console.log('\n🔍 Clicking on first workflow to see details...');
      try {
        await page.click(`text="${workflowList[0].name}"`);
        await page.waitForTimeout(3000);
        
        await page.screenshot({ 
          path: path.join(dataDir, 'screenshots', 'workflow-details.png'),
          fullPage: true 
        });
        
        console.log('✅ Captured workflow details');
      } catch (e) {
        console.log('Could not click workflow:', e.message);
      }
    }
  } else {
    console.log('❌ No workflows found in the list');
  }
  
  console.log('\n⏳ Keeping browser open for 30 seconds for manual inspection...');
  await page.waitForTimeout(30000);
  
  await browser.close();
  console.log('✅ Done!');
}

createAndExploreWorkflow().catch(console.error);