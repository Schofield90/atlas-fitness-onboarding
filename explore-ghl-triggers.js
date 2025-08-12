const { chromium } = require('@playwright/test');
const fs = require('fs').promises;
const path = require('path');

console.log('🚀 GoHighLevel Trigger Explorer\n');

const dataDir = '/Users/samschofield/atlas-fitness-onboarding/data/ghl_automation';

async function exploreTriggers() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100,
  });
  
  const context = await browser.newContext({
    storageState: 'leaddec-session.json',
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  // Go directly to triggers page
  console.log('📍 Loading triggers page...');
  await page.goto('https://login.leaddec.com/v2/location/0JDEcweQeuHSXBKrdgb0/automation/triggers', {
    waitUntil: 'domcontentloaded'
  });
  
  await page.waitForTimeout(5000);
  
  // Click Add Trigger button
  console.log('🎯 Looking for Add Trigger button...');
  
  try {
    // Try multiple selectors
    const addTriggerSelectors = [
      'button:has-text("Add Trigger")',
      'a:has-text("Add Trigger")',
      '.btn:has-text("Add Trigger")',
      '[class*="add-trigger"]'
    ];
    
    let clicked = false;
    for (const selector of addTriggerSelectors) {
      try {
        const button = page.locator(selector).first();
        if (await button.isVisible({ timeout: 2000 })) {
          console.log(`✅ Found Add Trigger button with selector: ${selector}`);
          await button.click();
          clicked = true;
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!clicked) {
      throw new Error('Add Trigger button not found');
    }
    
    console.log('⏳ Waiting for trigger selection page...');
    await page.waitForTimeout(3000);
    
    // Take screenshot of trigger selection
    await page.screenshot({ 
      path: path.join(dataDir, 'screenshots', 'add-trigger-page.png'),
      fullPage: true 
    });
    
    // Extract all trigger options
    console.log('📋 Extracting trigger options...');
    
    const triggerOptions = await page.evaluate(() => {
      const triggers = [];
      
      // Look for trigger cards/options
      const selectors = [
        '.trigger-option',
        '[class*="trigger-card"]',
        '.card',
        '[class*="option"]',
        '.list-group-item'
      ];
      
      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          const text = el.textContent?.trim();
          if (text && text.length > 5 && text.length < 300) {
            const icon = el.querySelector('i, svg, [class*="icon"]');
            
            triggers.push({
              text,
              hasIcon: !!icon,
              iconClass: icon?.className || '',
              elementClass: el.className,
              innerHTML: el.innerHTML.substring(0, 200)
            });
          }
        });
      });
      
      // Also look for any headings that might indicate categories
      const categories = [];
      document.querySelectorAll('h3, h4, h5, .category-title').forEach(heading => {
        const text = heading.textContent?.trim();
        if (text && text.length < 100) {
          categories.push(text);
        }
      });
      
      return { triggers, categories };
    });
    
    console.log(`\n✅ Found ${triggerOptions.triggers.length} trigger options`);
    
    if (triggerOptions.categories.length > 0) {
      console.log('\n📁 Categories:');
      triggerOptions.categories.forEach(cat => console.log(`  - ${cat}`));
    }
    
    if (triggerOptions.triggers.length > 0) {
      console.log('\n🎯 Trigger Options:');
      
      // Group and display triggers
      const uniqueTriggers = [];
      const seen = new Set();
      
      triggerOptions.triggers.forEach(trigger => {
        const cleanText = trigger.text.replace(/\s+/g, ' ').trim();
        if (!seen.has(cleanText)) {
          seen.add(cleanText);
          uniqueTriggers.push(trigger);
        }
      });
      
      uniqueTriggers.forEach((trigger, index) => {
        console.log(`\n${index + 1}. ${trigger.text}`);
        if (trigger.hasIcon) {
          console.log(`   Icon: ${trigger.iconClass}`);
        }
      });
      
      // Save trigger data
      await fs.writeFile(
        path.join(dataDir, 'triggers', 'available-triggers.json'),
        JSON.stringify(uniqueTriggers, null, 2)
      );
    }
    
    // Try to click on a trigger to see its configuration
    if (triggerOptions.triggers.length > 0) {
      console.log('\n🔍 Clicking first trigger to see configuration...');
      
      try {
        const firstTrigger = page.locator('.trigger-option, [class*="trigger-card"], .card').first();
        await firstTrigger.click();
        await page.waitForTimeout(3000);
        
        await page.screenshot({ 
          path: path.join(dataDir, 'screenshots', 'trigger-configuration.png'),
          fullPage: true 
        });
        
        // Extract configuration options
        const configData = await page.evaluate(() => {
          const config = {
            fields: [],
            buttons: [],
            dropdowns: []
          };
          
          // Find form fields
          document.querySelectorAll('input, textarea').forEach(field => {
            config.fields.push({
              type: field.type || field.tagName.toLowerCase(),
              name: field.name || field.id,
              placeholder: field.placeholder,
              label: field.getAttribute('aria-label') || ''
            });
          });
          
          // Find dropdowns
          document.querySelectorAll('select, [role="combobox"]').forEach(dropdown => {
            const options = [];
            dropdown.querySelectorAll('option').forEach(opt => {
              if (opt.value) {
                options.push({
                  value: opt.value,
                  text: opt.textContent?.trim()
                });
              }
            });
            
            config.dropdowns.push({
              name: dropdown.name || dropdown.id,
              options
            });
          });
          
          // Find buttons
          document.querySelectorAll('button').forEach(btn => {
            const text = btn.textContent?.trim();
            if (text && text.length < 50) {
              config.buttons.push(text);
            }
          });
          
          return config;
        });
        
        console.log('\n📝 Configuration Options:');
        console.log(`Fields: ${configData.fields.length}`);
        console.log(`Dropdowns: ${configData.dropdowns.length}`);
        console.log(`Buttons: ${configData.buttons.length}`);
        
        if (configData.fields.length > 0) {
          console.log('\nFields:');
          configData.fields.forEach(field => {
            console.log(`  - ${field.type}: ${field.placeholder || field.name || field.label}`);
          });
        }
        
        if (configData.dropdowns.length > 0) {
          console.log('\nDropdowns:');
          configData.dropdowns.forEach(dropdown => {
            console.log(`  - ${dropdown.name}: ${dropdown.options.length} options`);
          });
        }
        
        await fs.writeFile(
          path.join(dataDir, 'triggers', 'trigger-configuration.json'),
          JSON.stringify(configData, null, 2)
        );
        
      } catch (e) {
        console.log('Could not click trigger:', e.message);
      }
    }
    
  } catch (e) {
    console.log('❌ Error exploring triggers:', e.message);
    
    // Take screenshot to debug
    await page.screenshot({ 
      path: path.join(dataDir, 'screenshots', 'trigger-error.png'),
      fullPage: true 
    });
  }
  
  console.log('\n⏳ Keeping browser open for 20 seconds...');
  await page.waitForTimeout(20000);
  
  await browser.close();
  console.log('✅ Done!');
}

exploreTriggers().catch(console.error);