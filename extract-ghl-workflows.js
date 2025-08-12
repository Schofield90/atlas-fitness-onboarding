const { chromium } = require('@playwright/test');
const fs = require('fs').promises;
const path = require('path');

console.log('🚀 GoHighLevel Workflow Extractor\n');

const CONFIG = {
  dataDir: '/Users/samschofield/atlas-fitness-onboarding/data/ghl_automation',
  sessionFile: 'leaddec-session.json',
  baseUrl: 'https://login.leaddec.com',
};

async function extractWorkflows() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100,
  });
  
  const context = await browser.newContext({
    storageState: CONFIG.sessionFile,
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  console.log('📍 Loading automations page...');
  await page.goto(`${CONFIG.baseUrl}/v2/location/0JDEcweQeuHSXBKrdgb0/automation/workflows`, {
    waitUntil: 'networkidle'
  });
  
  console.log('⏳ Waiting for workflows to load...');
  
  // Wait for the workflow list to appear
  try {
    await page.waitForSelector('[role="table"], .workflow-item, [class*="workflow"]', { 
      timeout: 10000 
    });
  } catch (e) {
    console.log('⚠️  No workflow selector found, proceeding anyway...');
  }
  
  await page.waitForTimeout(3000); // Extra wait for dynamic content
  
  // Take screenshot
  await page.screenshot({ 
    path: path.join(CONFIG.dataDir, 'screenshots', 'workflows-loaded.png'),
    fullPage: true 
  });
  
  console.log('📋 Extracting workflow data...');
  
  // Extract workflows from the table
  const workflows = await page.evaluate(() => {
    const workflowData = [];
    
    // Try different selectors
    const rows = document.querySelectorAll('tbody tr, [role="row"]:not(:first-child), .workflow-item');
    
    rows.forEach((row, index) => {
      const cells = row.querySelectorAll('td, [role="cell"]');
      
      if (cells.length >= 4) {
        const workflow = {
          index: index + 1,
          name: cells[1]?.textContent?.trim() || '',
          status: cells[2]?.textContent?.trim() || '',
          totalEnrolled: cells[3]?.textContent?.trim() || '',
          activeEnrolled: cells[4]?.textContent?.trim() || '',
          lastUpdated: cells[5]?.textContent?.trim() || '',
          createdOn: cells[6]?.textContent?.trim() || '',
        };
        
        if (workflow.name) {
          workflowData.push(workflow);
        }
      }
    });
    
    // If no data from table, try alternative extraction
    if (workflowData.length === 0) {
      // Look for any text that might be workflow names
      const possibleWorkflows = Array.from(document.querySelectorAll('a, span, div'))
        .filter(el => {
          const text = el.textContent?.trim() || '';
          return text.includes('Birthday') || 
                 text.includes('Client') || 
                 text.includes('Lead') ||
                 text.includes('WhatsApp') ||
                 text.includes('nurture');
        })
        .map(el => ({
          name: el.textContent?.trim() || '',
          element: el.tagName,
          className: el.className
        }));
      
      return { workflowData: [], alternativeData: possibleWorkflows };
    }
    
    return { workflowData, alternativeData: [] };
  });
  
  console.log(`\n✅ Found ${workflows.workflowData.length} workflows`);
  
  if (workflows.workflowData.length > 0) {
    console.log('\n📊 Workflows:');
    workflows.workflowData.forEach(wf => {
      console.log(`\n${wf.index}. ${wf.name}`);
      console.log(`   Status: ${wf.status}`);
      console.log(`   Total Enrolled: ${wf.totalEnrolled}`);
      console.log(`   Last Updated: ${wf.lastUpdated}`);
    });
  } else if (workflows.alternativeData.length > 0) {
    console.log('\n⚠️  Could not extract table data, but found possible workflows:');
    workflows.alternativeData.forEach(item => {
      console.log(`  - ${item.name} (${item.element})`);
    });
  }
  
  // Save workflow data
  await fs.writeFile(
    path.join(CONFIG.dataDir, 'workflows', 'extracted-workflows.json'),
    JSON.stringify(workflows, null, 2)
  );
  
  // Try to click "Create Workflow" button
  console.log('\n🔍 Looking for Create Workflow button...');
  
  const createButton = await page.locator('button:has-text("Create Workflow"), a:has-text("Create Workflow"), [class*="create"]').first();
  
  if (await createButton.isVisible()) {
    console.log('✅ Found Create Workflow button');
    await createButton.click();
    await page.waitForTimeout(2000);
    
    // Take screenshot of create workflow modal/page
    await page.screenshot({ 
      path: path.join(CONFIG.dataDir, 'screenshots', 'create-workflow-modal.png'),
      fullPage: true 
    });
    
    // Extract trigger options if visible
    const triggers = await page.evaluate(() => {
      const triggerElements = Array.from(document.querySelectorAll('[data-trigger], .trigger-option, [class*="trigger"]'));
      return triggerElements.map(el => ({
        text: el.textContent?.trim() || '',
        className: el.className
      }));
    });
    
    if (triggers.length > 0) {
      console.log(`\n📌 Found ${triggers.length} trigger options`);
      await fs.writeFile(
        path.join(CONFIG.dataDir, 'triggers', 'trigger-options.json'),
        JSON.stringify(triggers, null, 2)
      );
    }
  } else {
    console.log('❌ Create Workflow button not found');
  }
  
  console.log('\n⏳ Keeping browser open for 20 seconds...');
  await page.waitForTimeout(20000);
  
  await browser.close();
  console.log('✅ Done!');
}

// Run the extractor
extractWorkflows().catch(console.error);