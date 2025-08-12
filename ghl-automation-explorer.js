const { chromium } = require('@playwright/test');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
  dataDir: '/Users/samschofield/atlas-fitness-onboarding/data/ghl_automation',
  sessionFile: 'leaddec-session.json',
  baseUrl: 'https://login.leaddec.com',
  screenshots: true,
  htmlSnapshots: true,
  headless: false, // Set to true for CI/CD
  slowMo: 100, // Milliseconds between actions
};

// Utility functions
async function ensureDirectories() {
  const dirs = ['workflows', 'triggers', 'actions', 'screenshots', 'html_snapshots', 'reports'];
  for (const dir of dirs) {
    await fs.mkdir(path.join(CONFIG.dataDir, dir), { recursive: true });
  }
}

async function saveScreenshot(page, name) {
  if (!CONFIG.screenshots) return;
  const screenshotPath = path.join(CONFIG.dataDir, 'screenshots', `${name}-${Date.now()}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`📸 Screenshot saved: ${screenshotPath}`);
  return screenshotPath;
}

async function saveHtmlSnapshot(page, name) {
  if (!CONFIG.htmlSnapshots) return;
  const html = await page.content();
  const htmlPath = path.join(CONFIG.dataDir, 'html_snapshots', `${name}-${Date.now()}.html`);
  await fs.writeFile(htmlPath, html);
  console.log(`📄 HTML snapshot saved: ${htmlPath}`);
  return htmlPath;
}

async function extractElementInfo(page, selector) {
  try {
    return await page.evaluate((sel) => {
      const elements = Array.from(document.querySelectorAll(sel));
      return elements.map(el => ({
        text: el.textContent?.trim(),
        value: el.value || el.getAttribute('value'),
        id: el.id,
        className: el.className,
        dataAttributes: Object.fromEntries(
          Array.from(el.attributes)
            .filter(attr => attr.name.startsWith('data-'))
            .map(attr => [attr.name, attr.value])
        ),
        href: el.href || el.getAttribute('href'),
        isVisible: el.offsetParent !== null,
      }));
    }, selector);
  } catch (e) {
    return [];
  }
}

// Main exploration functions
async function navigateToAutomations(page) {
  console.log('🔄 Checking if already on automation workflows page...');
  
  // Check if we're already on automations page
  const currentUrl = page.url();
  if (currentUrl.includes('automation') || currentUrl.includes('workflow')) {
    console.log('✅ Already on automations page');
    return true;
  }
  
  // Try multiple possible navigation paths
  const navigationAttempts = [
    // Method 1: Direct URL if known
    async () => {
      await page.goto(`${CONFIG.baseUrl}/v2/location/0JDEcweQeuHSXBKrdgb0/automation/workflows?listTab=all`);
      await page.waitForTimeout(2000);
    },
    // Method 2: Look for sidebar menu
    async () => {
      const automationLink = await page.locator('a:has-text("Automation"), a:has-text("Workflows"), a:has-text("Automations")').first();
      if (await automationLink.isVisible()) {
        await automationLink.click();
        await page.waitForTimeout(2000);
      }
    },
    // Method 3: Look for main menu
    async () => {
      const menuButton = await page.locator('[data-testid="main-menu"], [aria-label="Menu"], button:has-text("Menu")').first();
      if (await menuButton.isVisible()) {
        await menuButton.click();
        await page.waitForTimeout(500);
        const automationLink = await page.locator('a:has-text("Automation"), a:has-text("Workflows")').first();
        await automationLink.click();
        await page.waitForTimeout(2000);
      }
    },
  ];

  for (const attempt of navigationAttempts) {
    try {
      await attempt();
      // Check if we're on the automations page
      const url = page.url();
      if (url.includes('automation') || url.includes('workflow')) {
        console.log('✅ Successfully navigated to automations');
        return true;
      }
    } catch (e) {
      console.log('⚠️ Navigation attempt failed, trying next method...');
    }
  }

  // Take screenshot to help debug
  await saveScreenshot(page, 'navigation-failed');
  throw new Error('Could not navigate to automations page');
}

async function extractExistingWorkflows(page) {
  console.log('📋 Extracting existing workflows...');
  
  const workflows = [];
  
  // Wait for workflows to load
  await page.waitForTimeout(3000);
  
  // Capture workflow list
  await saveScreenshot(page, 'workflow-list');
  await saveHtmlSnapshot(page, 'workflow-list');
  
  // Find workflow items - adjust selectors based on actual DOM
  const workflowSelectors = [
    '[data-testid="workflow-item"]',
    '.workflow-item',
    '[class*="workflow"]',
    'div[role="listitem"]',
    'tr[data-workflow-id]',
  ];
  
  let workflowElements = [];
  for (const selector of workflowSelectors) {
    const elements = await page.locator(selector).all();
    if (elements.length > 0) {
      workflowElements = elements;
      console.log(`Found ${elements.length} workflows using selector: ${selector}`);
      break;
    }
  }
  
  // Extract workflow details
  for (let i = 0; i < workflowElements.length; i++) {
    const element = workflowElements[i];
    
    try {
      const workflowData = await element.evaluate(el => {
        return {
          name: el.textContent?.trim() || '',
          id: el.getAttribute('data-workflow-id') || el.getAttribute('data-id') || `workflow-${Date.now()}`,
          status: el.querySelector('[class*="status"]')?.textContent || 'unknown',
          lastModified: el.querySelector('[class*="date"], [class*="time"]')?.textContent || '',
          description: el.querySelector('[class*="description"]')?.textContent || '',
        };
      });
      
      workflows.push(workflowData);
      
      // Click into workflow to get details
      await element.click();
      await page.waitForTimeout(2000);
      
      // Extract workflow nodes
      const nodes = await extractWorkflowNodes(page);
      workflowData.nodes = nodes;
      
      // Take screenshots
      await saveScreenshot(page, `workflow-${workflowData.id}`);
      await saveHtmlSnapshot(page, `workflow-${workflowData.id}`);
      
      // Go back to workflow list
      const backButton = await page.locator('button:has-text("Back"), a:has-text("Back"), [aria-label="Back"]').first();
      if (await backButton.isVisible()) {
        await backButton.click();
        await page.waitForTimeout(2000);
      } else {
        await page.goBack();
        await page.waitForTimeout(2000);
      }
      
    } catch (e) {
      console.log(`⚠️ Error processing workflow ${i + 1}: ${e.message}`);
    }
  }
  
  // Save workflows data
  await fs.writeFile(
    path.join(CONFIG.dataDir, 'workflows', 'existing-workflows.json'),
    JSON.stringify(workflows, null, 2)
  );
  
  console.log(`✅ Extracted ${workflows.length} workflows`);
  return workflows;
}

async function extractWorkflowNodes(page) {
  console.log('🔍 Extracting workflow nodes...');
  
  const nodes = [];
  
  // Look for workflow canvas or node containers
  const nodeSelectors = [
    '[data-testid="workflow-node"]',
    '.workflow-node',
    '[class*="node-"]',
    '.react-flow__node',
    '[data-nodeid]',
  ];
  
  for (const selector of nodeSelectors) {
    const nodeElements = await page.locator(selector).all();
    if (nodeElements.length > 0) {
      console.log(`Found ${nodeElements.length} nodes using selector: ${selector}`);
      
      for (const node of nodeElements) {
        try {
          const nodeData = await node.evaluate(el => {
            return {
              id: el.getAttribute('data-nodeid') || el.getAttribute('data-id') || '',
              type: el.getAttribute('data-type') || el.className.match(/node-type-(\w+)/)?.[1] || '',
              label: el.querySelector('[class*="label"], [class*="title"]')?.textContent || '',
              position: {
                x: parseInt(el.style.left) || 0,
                y: parseInt(el.style.top) || 0,
              },
              config: {}, // Will be populated by clicking into node
            };
          });
          
          // Click node to open configuration
          await node.click();
          await page.waitForTimeout(1000);
          
          // Extract node configuration
          const configData = await extractNodeConfiguration(page);
          nodeData.config = configData;
          
          // Close configuration
          const closeButton = await page.locator('[aria-label="Close"], button:has-text("Close"), button:has-text("X")').first();
          if (await closeButton.isVisible()) {
            await closeButton.click();
            await page.waitForTimeout(500);
          }
          
          nodes.push(nodeData);
        } catch (e) {
          console.log(`⚠️ Error extracting node: ${e.message}`);
        }
      }
      break;
    }
  }
  
  return nodes;
}

async function extractNodeConfiguration(page) {
  const config = {};
  
  // Extract form fields
  const inputs = await page.locator('input, textarea, select').all();
  for (const input of inputs) {
    try {
      const name = await input.getAttribute('name') || await input.getAttribute('id') || '';
      const value = await input.inputValue();
      const type = await input.getAttribute('type') || 'text';
      
      if (name) {
        config[name] = { value, type };
      }
    } catch (e) {
      // Input might not be visible or accessible
    }
  }
  
  // Extract dropdown values
  const dropdowns = await extractElementInfo(page, '[role="combobox"], [role="listbox"]');
  config.dropdowns = dropdowns;
  
  // Extract toggle/switch states
  const toggles = await page.locator('[role="switch"], input[type="checkbox"]').all();
  for (const toggle of toggles) {
    try {
      const name = await toggle.getAttribute('name') || await toggle.getAttribute('id') || '';
      const checked = await toggle.isChecked();
      if (name) {
        config[`${name}_enabled`] = checked;
      }
    } catch (e) {
      // Toggle might not be accessible
    }
  }
  
  return config;
}

async function createTestWorkflow(page) {
  console.log('🆕 Creating test workflow to discover triggers...');
  
  // Find and click create workflow button
  const createButtons = [
    'button:has-text("Create Workflow")',
    'button:has-text("New Workflow")',
    'button:has-text("Add Workflow")',
    '[data-testid="create-workflow"]',
    'button[aria-label*="Create"]',
  ];
  
  let clicked = false;
  for (const selector of createButtons) {
    const button = await page.locator(selector).first();
    if (await button.isVisible()) {
      await button.click();
      clicked = true;
      await page.waitForTimeout(2000);
      break;
    }
  }
  
  if (!clicked) {
    console.log('⚠️ Could not find create workflow button');
    return null;
  }
  
  // Enter workflow name
  const nameInput = await page.locator('input[placeholder*="name"], input[name="name"], input#name').first();
  if (await nameInput.isVisible()) {
    await nameInput.fill('Test Automation Discovery - DELETE ME');
    await page.waitForTimeout(500);
  }
  
  // Submit form
  const submitButton = await page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")').first();
  if (await submitButton.isVisible()) {
    await submitButton.click();
    await page.waitForTimeout(3000);
  }
  
  await saveScreenshot(page, 'test-workflow-created');
  
  return true;
}

async function discoverAllTriggers(page) {
  console.log('🎯 Discovering all available triggers...');
  
  const triggers = [];
  
  // Look for add trigger button
  const addTriggerButtons = [
    'button:has-text("Add Trigger")',
    'button:has-text("New Trigger")',
    '[data-testid="add-trigger"]',
    'button[aria-label*="trigger"]',
    '.add-trigger-button',
  ];
  
  for (const selector of addTriggerButtons) {
    const button = await page.locator(selector).first();
    if (await button.isVisible()) {
      await button.click();
      await page.waitForTimeout(2000);
      break;
    }
  }
  
  // Capture trigger selection modal
  await saveScreenshot(page, 'trigger-selection');
  await saveHtmlSnapshot(page, 'trigger-selection');
  
  // Extract trigger categories
  const categories = await extractElementInfo(page, '[role="tab"], .category-tab, [data-category]');
  
  for (const category of categories) {
    if (category.text) {
      console.log(`📁 Exploring trigger category: ${category.text}`);
      
      // Click category if it's a tab
      const categoryElement = await page.locator(`[role="tab"]:has-text("${category.text}")`).first();
      if (await categoryElement.isVisible()) {
        await categoryElement.click();
        await page.waitForTimeout(1000);
      }
      
      // Extract triggers in this category
      const triggerItems = await extractElementInfo(page, '[data-trigger-type], .trigger-item, [role="option"]');
      
      for (const trigger of triggerItems) {
        if (trigger.text) {
          triggers.push({
            category: category.text,
            name: trigger.text,
            type: trigger.dataAttributes['trigger-type'] || trigger.value || '',
            description: '', // Will be populated if we click into it
          });
        }
      }
    }
  }
  
  // Try to extract all triggers at once if no categories
  if (triggers.length === 0) {
    const allTriggers = await extractElementInfo(page, '[data-trigger], .trigger-option, [class*="trigger-item"]');
    triggers.push(...allTriggers.map(t => ({
      category: 'General',
      name: t.text || '',
      type: t.dataAttributes['trigger'] || '',
      description: '',
    })));
  }
  
  // Save triggers data
  await fs.writeFile(
    path.join(CONFIG.dataDir, 'triggers', 'all-triggers.json'),
    JSON.stringify(triggers, null, 2)
  );
  
  console.log(`✅ Discovered ${triggers.length} triggers`);
  
  // Close trigger modal
  const closeButton = await page.locator('[aria-label="Close"], button:has-text("Cancel"), .close-button').first();
  if (await closeButton.isVisible()) {
    await closeButton.click();
    await page.waitForTimeout(1000);
  }
  
  return triggers;
}

async function discoverAllActions(page) {
  console.log('🎬 Discovering all available actions...');
  
  const actions = [];
  
  // First, we need a trigger to add actions to
  // Look for existing trigger or add a simple one
  const existingTrigger = await page.locator('[data-node-type="trigger"], .trigger-node').first();
  if (!await existingTrigger.isVisible()) {
    console.log('Adding a trigger first to explore actions...');
    await discoverAllTriggers(page);
    // Add the first available trigger
    // This is simplified - in reality you'd add logic to select and add a trigger
  }
  
  // Look for add action button
  const addActionButtons = [
    'button:has-text("Add Action")',
    'button:has-text("+")',
    '[data-testid="add-action"]',
    '.add-action-button',
    'button[aria-label*="Add step"]',
  ];
  
  for (const selector of addActionButtons) {
    const button = await page.locator(selector).first();
    if (await button.isVisible()) {
      await button.click();
      await page.waitForTimeout(2000);
      break;
    }
  }
  
  // Capture action selection modal
  await saveScreenshot(page, 'action-selection');
  await saveHtmlSnapshot(page, 'action-selection');
  
  // Extract action categories
  const categories = await extractElementInfo(page, '[role="tab"], .action-category, [data-action-category]');
  
  for (const category of categories) {
    if (category.text) {
      console.log(`📁 Exploring action category: ${category.text}`);
      
      // Click category
      const categoryElement = await page.locator(`[role="tab"]:has-text("${category.text}")`).first();
      if (await categoryElement.isVisible()) {
        await categoryElement.click();
        await page.waitForTimeout(1000);
      }
      
      // Extract actions in this category
      const actionItems = await extractElementInfo(page, '[data-action-type], .action-item, [class*="action-option"]');
      
      for (const action of actionItems) {
        if (action.text) {
          const actionData = {
            category: category.text,
            name: action.text,
            type: action.dataAttributes['action-type'] || action.value || '',
            description: '',
            fields: [],
          };
          
          // Try to click into action to get configuration fields
          const actionElement = await page.locator(`[data-action-type="${actionData.type}"], :has-text("${actionData.name}")`).first();
          if (await actionElement.isVisible()) {
            await actionElement.click();
            await page.waitForTimeout(1500);
            
            // Extract configuration fields
            const fields = await extractActionFields(page);
            actionData.fields = fields;
            
            // Go back
            const backButton = await page.locator('button:has-text("Back"), [aria-label="Back"]').first();
            if (await backButton.isVisible()) {
              await backButton.click();
              await page.waitForTimeout(1000);
            }
          }
          
          actions.push(actionData);
        }
      }
    }
  }
  
  // Save actions data
  await fs.writeFile(
    path.join(CONFIG.dataDir, 'actions', 'all-actions.json'),
    JSON.stringify(actions, null, 2)
  );
  
  console.log(`✅ Discovered ${actions.length} actions`);
  
  // Close action modal
  const closeButton = await page.locator('[aria-label="Close"], button:has-text("Cancel")').first();
  if (await closeButton.isVisible()) {
    await closeButton.click();
    await page.waitForTimeout(1000);
  }
  
  return actions;
}

async function extractActionFields(page) {
  const fields = [];
  
  // Look for form fields in the action configuration
  const fieldContainers = await page.locator('.form-field, .field-container, [class*="field-wrapper"]').all();
  
  for (const container of fieldContainers) {
    try {
      const fieldData = await container.evaluate(el => {
        const label = el.querySelector('label')?.textContent || '';
        const input = el.querySelector('input, textarea, select');
        const helpText = el.querySelector('.help-text, .field-description, small')?.textContent || '';
        
        return {
          label: label.trim(),
          type: input?.type || input?.tagName?.toLowerCase() || 'unknown',
          name: input?.name || input?.id || '',
          required: input?.required || el.className.includes('required'),
          helpText: helpText.trim(),
          placeholder: input?.placeholder || '',
        };
      });
      
      if (fieldData.label || fieldData.name) {
        fields.push(fieldData);
      }
    } catch (e) {
      // Field might not be structured as expected
    }
  }
  
  return fields;
}

async function generateComprehensiveReport(data) {
  console.log('📊 Generating comprehensive report...');
  
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalWorkflows: data.workflows.length,
      totalTriggers: data.triggers.length,
      totalActions: data.actions.length,
      triggerCategories: [...new Set(data.triggers.map(t => t.category))],
      actionCategories: [...new Set(data.actions.map(a => a.category))],
    },
    workflows: data.workflows,
    triggers: data.triggers,
    actions: data.actions,
    insights: generateInsights(data),
    recommendations: generateRecommendations(data),
  };
  
  // Save detailed JSON report
  await fs.writeFile(
    path.join(CONFIG.dataDir, 'reports', 'automation-analysis.json'),
    JSON.stringify(report, null, 2)
  );
  
  // Generate markdown report
  const markdownReport = generateMarkdownReport(report);
  await fs.writeFile(
    path.join(CONFIG.dataDir, 'reports', 'automation-analysis.md'),
    markdownReport
  );
  
  console.log('✅ Reports generated successfully');
  return report;
}

function generateInsights(data) {
  const insights = [];
  
  // Trigger insights
  const triggerTypes = [...new Set(data.triggers.map(t => t.type))];
  insights.push({
    category: 'Triggers',
    finding: `GoHighLevel offers ${data.triggers.length} different triggers across ${triggerTypes.length} types`,
    details: `Most common categories: ${data.triggers.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + 1;
      return acc;
    }, {})}`,
  });
  
  // Action insights
  const actionTypes = [...new Set(data.actions.map(a => a.type))];
  insights.push({
    category: 'Actions',
    finding: `${data.actions.length} actions available for workflow automation`,
    details: `Key categories include: ${[...new Set(data.actions.map(a => a.category))].join(', ')}`,
  });
  
  // Workflow complexity
  const avgNodesPerWorkflow = data.workflows.reduce((sum, w) => sum + (w.nodes?.length || 0), 0) / (data.workflows.length || 1);
  insights.push({
    category: 'Workflow Complexity',
    finding: `Average workflow contains ${avgNodesPerWorkflow.toFixed(1)} nodes`,
    details: 'This indicates the typical complexity level of automations in the system',
  });
  
  return insights;
}

function generateRecommendations(data) {
  const recommendations = [];
  
  // Trigger recommendations
  recommendations.push({
    area: 'Trigger Enhancement',
    suggestion: 'Implement webhook triggers for real-time external system integration',
    priority: 'High',
    reasoning: 'Webhook triggers enable instant responses to external events',
  });
  
  // Action recommendations
  recommendations.push({
    area: 'Action Library',
    suggestion: 'Add conditional logic actions (if/then/else) for complex workflows',
    priority: 'High',
    reasoning: 'Conditional logic greatly increases automation flexibility',
  });
  
  // UI/UX recommendations
  recommendations.push({
    area: 'Workflow Builder UI',
    suggestion: 'Implement workflow templates for common automation patterns',
    priority: 'Medium',
    reasoning: 'Templates reduce setup time and ensure best practices',
  });
  
  // Integration recommendations
  recommendations.push({
    area: 'Third-party Integrations',
    suggestion: 'Add native integrations with popular fitness/gym management tools',
    priority: 'High',
    reasoning: 'Direct integrations reduce friction and increase adoption',
  });
  
  return recommendations;
}

function generateMarkdownReport(report) {
  let markdown = `# GoHighLevel Automation Analysis Report\n\n`;
  markdown += `Generated: ${new Date(report.generatedAt).toLocaleString()}\n\n`;
  
  markdown += `## Executive Summary\n\n`;
  markdown += `- **Total Workflows Analyzed**: ${report.summary.totalWorkflows}\n`;
  markdown += `- **Available Triggers**: ${report.summary.totalTriggers}\n`;
  markdown += `- **Available Actions**: ${report.summary.totalActions}\n`;
  markdown += `- **Trigger Categories**: ${report.summary.triggerCategories.join(', ')}\n`;
  markdown += `- **Action Categories**: ${report.summary.actionCategories.join(', ')}\n\n`;
  
  markdown += `## Detailed Findings\n\n`;
  
  markdown += `### Triggers\n\n`;
  const triggersByCategory = report.triggers.reduce((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {});
  
  for (const [category, triggers] of Object.entries(triggersByCategory)) {
    markdown += `#### ${category}\n`;
    triggers.forEach(t => {
      markdown += `- **${t.name}** (${t.type})\n`;
    });
    markdown += `\n`;
  }
  
  markdown += `### Actions\n\n`;
  const actionsByCategory = report.actions.reduce((acc, a) => {
    if (!acc[a.category]) acc[a.category] = [];
    acc[a.category].push(a);
    return acc;
  }, {});
  
  for (const [category, actions] of Object.entries(actionsByCategory)) {
    markdown += `#### ${category}\n`;
    actions.forEach(a => {
      markdown += `- **${a.name}** (${a.type})\n`;
      if (a.fields && a.fields.length > 0) {
        markdown += `  - Fields: ${a.fields.map(f => f.label || f.name).join(', ')}\n`;
      }
    });
    markdown += `\n`;
  }
  
  markdown += `## Insights\n\n`;
  report.insights.forEach(insight => {
    markdown += `### ${insight.category}\n`;
    markdown += `${insight.finding}\n\n`;
    if (insight.details) {
      markdown += `*Details*: ${insight.details}\n\n`;
    }
  });
  
  markdown += `## Recommendations for Atlas Fitness CRM\n\n`;
  report.recommendations.forEach((rec, index) => {
    markdown += `### ${index + 1}. ${rec.area}\n`;
    markdown += `**Suggestion**: ${rec.suggestion}\n\n`;
    markdown += `**Priority**: ${rec.priority}\n\n`;
    markdown += `**Reasoning**: ${rec.reasoning}\n\n`;
  });
  
  markdown += `## Implementation Roadmap\n\n`;
  markdown += `1. **Phase 1 - Core Triggers** (Week 1-2)\n`;
  markdown += `   - Implement webhook receiver system\n`;
  markdown += `   - Add form submission triggers\n`;
  markdown += `   - Create appointment-based triggers\n\n`;
  
  markdown += `2. **Phase 2 - Essential Actions** (Week 3-4)\n`;
  markdown += `   - SMS/Email sending actions\n`;
  markdown += `   - CRM update actions\n`;
  markdown += `   - Task creation actions\n\n`;
  
  markdown += `3. **Phase 3 - Advanced Features** (Week 5-6)\n`;
  markdown += `   - Conditional logic implementation\n`;
  markdown += `   - Workflow templates\n`;
  markdown += `   - Performance optimizations\n\n`;
  
  return markdown;
}

// Main execution
async function main() {
  console.log('🚀 Starting GoHighLevel Automation Explorer\n');
  
  try {
    await ensureDirectories();
    
    const browser = await chromium.launch({
      headless: CONFIG.headless,
      slowMo: CONFIG.slowMo,
    });
    
    const context = await browser.newContext({
      storageState: CONFIG.sessionFile,
      viewport: { width: 1920, height: 1080 },
    });
    
    const page = await context.newPage();
    
    // Navigate to the main page
    console.log('🌐 Loading GoHighLevel with saved session...');
    // Try to go directly to workflows page
    await page.goto(`${CONFIG.baseUrl}/v2/location/0JDEcweQeuHSXBKrdgb0/automation/workflows`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await page.waitForTimeout(3000);
    
    // Verify we're logged in
    const currentUrl = page.url();
    if (currentUrl.includes('/login') && !currentUrl.includes('/automation')) {
      throw new Error('Session expired. Please run manual-login-capture.js again.');
    }
    
    console.log('✅ Successfully loaded with authenticated session');
    await saveScreenshot(page, 'dashboard');
    
    // Navigate to automations
    await navigateToAutomations(page);
    
    // Extract existing workflows
    const workflows = await extractExistingWorkflows(page);
    
    // Create test workflow
    await createTestWorkflow(page);
    
    // Discover all triggers
    const triggers = await discoverAllTriggers(page);
    
    // Discover all actions
    const actions = await discoverAllActions(page);
    
    // Generate comprehensive report
    const report = await generateComprehensiveReport({
      workflows,
      triggers,
      actions,
    });
    
    console.log('\n📊 Analysis Complete!');
    console.log(`Reports saved to: ${CONFIG.dataDir}/reports/`);
    
    // Keep browser open for manual inspection
    console.log('\n⏳ Keeping browser open for 30 seconds for inspection...');
    await page.waitForTimeout(30000);
    
    await browser.close();
    console.log('✅ Exploration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during exploration:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the explorer
main();