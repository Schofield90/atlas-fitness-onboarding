const { chromium } = require('@playwright/test');
const fs = require('fs').promises;
const path = require('path');

console.log('🚀 GoHighLevel Automation Tab Explorer\n');

const dataDir = '/Users/samschofield/atlas-fitness-onboarding/data/ghl_automation';

async function exploreAutomationTabs() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100,
  });
  
  const context = await browser.newContext({
    storageState: 'leaddec-session.json',
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  console.log('📍 Loading workflows page...');
  await page.goto('https://login.leaddec.com/v2/location/0JDEcweQeuHSXBKrdgb0/automation/workflows', {
    waitUntil: 'domcontentloaded'
  });
  
  await page.waitForTimeout(5000);
  
  // Click on Triggers tab
  console.log('\n🎯 Clicking on Triggers tab...');
  try {
    await page.click('a:has-text("Triggers")');
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: path.join(dataDir, 'screenshots', 'triggers-tab.png'),
      fullPage: true 
    });
    
    // Extract trigger information
    const triggers = await page.evaluate(() => {
      const triggerData = [];
      
      // Look for trigger cards or list items
      document.querySelectorAll('[class*="trigger"], [data-trigger], .card').forEach(el => {
        const text = el.textContent?.trim();
        if (text && text.length < 500) {
          triggerData.push({
            text,
            className: el.className,
            innerHTML: el.innerHTML.substring(0, 200)
          });
        }
      });
      
      return triggerData;
    });
    
    console.log(`Found ${triggers.length} trigger elements`);
    
    if (triggers.length > 0) {
      await fs.writeFile(
        path.join(dataDir, 'triggers', 'triggers-tab-data.json'),
        JSON.stringify(triggers, null, 2)
      );
    }
    
  } catch (e) {
    console.log('❌ Could not click Triggers tab:', e.message);
  }
  
  // Go back to Workflows tab
  console.log('\n📋 Going back to Workflows tab...');
  try {
    await page.click('a:has-text("Workflows")');
    await page.waitForTimeout(3000);
  } catch (e) {
    console.log('Could not click Workflows tab');
  }
  
  // Try to create a new workflow
  console.log('\n🆕 Looking for Create Workflow button...');
  
  const createSelectors = [
    'button:has-text("Create Workflow")',
    'button:has-text("New Workflow")',
    'button:has-text("Create")',
    '.create-workflow-button',
    'button[class*="create"]',
    'a:has-text("Create")'
  ];
  
  let createButton = null;
  for (const selector of createSelectors) {
    const button = page.locator(selector).first();
    if (await button.isVisible({ timeout: 1000 })) {
      createButton = button;
      console.log(`✅ Found create button with selector: ${selector}`);
      break;
    }
  }
  
  if (!createButton) {
    // Look for any button in the header area
    const headerButtons = await page.evaluate(() => {
      const buttons = [];
      document.querySelectorAll('header button, .header button, [class*="header"] button').forEach(btn => {
        const text = btn.textContent?.trim();
        if (text) {
          buttons.push({
            text,
            className: btn.className,
            id: btn.id
          });
        }
      });
      return buttons;
    });
    
    console.log('\nHeader buttons found:');
    headerButtons.forEach(btn => {
      console.log(`  - "${btn.text}" (class: ${btn.className})`);
    });
  }
  
  if (createButton) {
    console.log('\n🎯 Clicking Create Workflow button...');
    await createButton.click();
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: path.join(dataDir, 'screenshots', 'create-workflow-modal.png'),
      fullPage: true 
    });
    
    // Extract options from the modal
    const modalData = await page.evaluate(() => {
      const data = {
        title: '',
        options: [],
        buttons: [],
        inputs: []
      };
      
      // Find modal title
      const titleEl = document.querySelector('[role="dialog"] h1, [role="dialog"] h2, .modal-title, [class*="modal"] h2');
      if (titleEl) {
        data.title = titleEl.textContent?.trim() || '';
      }
      
      // Find options/cards in modal
      document.querySelectorAll('[role="dialog"] [class*="card"], [role="dialog"] [class*="option"], .modal [class*="trigger"]').forEach(el => {
        const text = el.textContent?.trim();
        if (text && text.length < 200) {
          data.options.push({
            text,
            className: el.className
          });
        }
      });
      
      // Find buttons
      document.querySelectorAll('[role="dialog"] button, .modal button').forEach(btn => {
        const text = btn.textContent?.trim();
        if (text) {
          data.buttons.push(text);
        }
      });
      
      // Find inputs
      document.querySelectorAll('[role="dialog"] input, .modal input').forEach(input => {
        data.inputs.push({
          type: input.type,
          placeholder: input.placeholder,
          name: input.name || input.id
        });
      });
      
      return data;
    });
    
    console.log('\n📊 Modal Analysis:');
    console.log(`Title: ${modalData.title}`);
    console.log(`Options: ${modalData.options.length}`);
    console.log(`Buttons: ${modalData.buttons.length}`);
    console.log(`Inputs: ${modalData.inputs.length}`);
    
    if (modalData.options.length > 0) {
      console.log('\nOptions found:');
      modalData.options.forEach(opt => {
        console.log(`  - ${opt.text.substring(0, 100)}...`);
      });
    }
    
    if (modalData.inputs.length > 0) {
      console.log('\nInputs found:');
      modalData.inputs.forEach(input => {
        console.log(`  - ${input.type} (${input.placeholder || input.name})`);
      });
    }
    
    await fs.writeFile(
      path.join(dataDir, 'workflows', 'create-workflow-modal-data.json'),
      JSON.stringify(modalData, null, 2)
    );
    
    // If there are trigger options, try to click one
    if (modalData.options.length > 0) {
      console.log('\n🎯 Trying to select first trigger option...');
      try {
        const firstOption = page.locator('[role="dialog"] [class*="card"], [role="dialog"] [class*="option"]').first();
        await firstOption.click();
        await page.waitForTimeout(2000);
        
        await page.screenshot({ 
          path: path.join(dataDir, 'screenshots', 'after-trigger-selection.png'),
          fullPage: true 
        });
        
        // Check what appeared after selection
        const afterSelection = await page.evaluate(() => {
          const newElements = [];
          document.querySelectorAll('[role="dialog"] *, .modal *').forEach(el => {
            const text = el.textContent?.trim();
            if (text && text.length > 5 && text.length < 100 && !text.includes('\n')) {
              newElements.push(text);
            }
          });
          return [...new Set(newElements)];
        });
        
        console.log('\nElements after trigger selection:');
        afterSelection.slice(0, 20).forEach(el => {
          console.log(`  - ${el}`);
        });
        
      } catch (e) {
        console.log('Could not select trigger option:', e.message);
      }
    }
  } else {
    console.log('❌ Create Workflow button not found');
    
    // Take a screenshot to see what's on the page
    await page.screenshot({ 
      path: path.join(dataDir, 'screenshots', 'no-create-button-found.png'),
      fullPage: true 
    });
  }
  
  // Explore Campaign tab
  console.log('\n📢 Clicking on Campaign tab...');
  try {
    await page.click('a:has-text("Campaign")');
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: path.join(dataDir, 'screenshots', 'campaign-tab.png'),
      fullPage: true 
    });
    
    const campaignData = await page.evaluate(() => {
      return {
        url: window.location.href,
        content: document.body.innerText.substring(0, 500)
      };
    });
    
    console.log('Campaign tab loaded');
    console.log(`URL: ${campaignData.url}`);
    
  } catch (e) {
    console.log('Could not click Campaign tab:', e.message);
  }
  
  console.log('\n⏳ Keeping browser open for 20 seconds...');
  await page.waitForTimeout(20000);
  
  await browser.close();
  console.log('✅ Done!');
}

exploreAutomationTabs().catch(console.error);