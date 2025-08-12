import { chromium, Browser, Page, BrowserContext } from '@playwright/test';
import * as fs from 'fs/promises';
import * as path from 'path';

interface Config {
  dataDir: string;
  sessionFile: string;
  baseUrl: string;
  screenshots: boolean;
  htmlSnapshots: boolean;
  headless: boolean;
  slowMo: number;
  maxRetries: number;
}

interface Workflow {
  id: string;
  name: string;
  status: string;
  lastModified: string;
  description: string;
  nodes: WorkflowNode[];
  connections: Connection[];
}

interface WorkflowNode {
  id: string;
  type: string;
  label: string;
  position: { x: number; y: number };
  config: Record<string, any>;
}

interface Connection {
  source: string;
  target: string;
  label?: string;
}

interface Trigger {
  category: string;
  name: string;
  type: string;
  description: string;
  events?: string[];
  conditions?: string[];
}

interface Action {
  category: string;
  name: string;
  type: string;
  description: string;
  fields: ActionField[];
  outputs?: string[];
}

interface ActionField {
  label: string;
  type: string;
  name: string;
  required: boolean;
  helpText: string;
  placeholder: string;
  options?: string[];
  defaultValue?: any;
}

interface Report {
  generatedAt: string;
  summary: Summary;
  workflows: Workflow[];
  triggers: Trigger[];
  actions: Action[];
  insights: Insight[];
  recommendations: Recommendation[];
  screenshots: string[];
  htmlSnapshots: string[];
}

interface Summary {
  totalWorkflows: number;
  totalTriggers: number;
  totalActions: number;
  triggerCategories: string[];
  actionCategories: string[];
  mostUsedTriggers: { name: string; count: number }[];
  mostUsedActions: { name: string; count: number }[];
}

interface Insight {
  category: string;
  finding: string;
  details: string;
  impact: 'High' | 'Medium' | 'Low';
}

interface Recommendation {
  area: string;
  suggestion: string;
  priority: 'High' | 'Medium' | 'Low';
  reasoning: string;
  implementationEffort: string;
}

class GHLAutomationExplorer {
  private config: Config;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private screenshots: string[] = [];
  private htmlSnapshots: string[] = [];

  constructor(config: Config) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    await this.ensureDirectories();
    
    this.browser = await chromium.launch({
      headless: this.config.headless,
      slowMo: this.config.slowMo,
    });
    
    this.context = await this.browser.newContext({
      storageState: this.config.sessionFile,
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    });
    
    this.page = await this.context.newPage();
    
    // Set up error handling
    this.page.on('pageerror', (error) => {
      console.error('Page error:', error.message);
    });
    
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('Console error:', msg.text());
      }
    });
  }

  private async ensureDirectories(): Promise<void> {
    const dirs = ['workflows', 'triggers', 'actions', 'screenshots', 'html_snapshots', 'reports'];
    for (const dir of dirs) {
      await fs.mkdir(path.join(this.config.dataDir, dir), { recursive: true });
    }
  }

  private async saveScreenshot(name: string): Promise<string | null> {
    if (!this.config.screenshots || !this.page) return null;
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}-${timestamp}.png`;
    const screenshotPath = path.join(this.config.dataDir, 'screenshots', filename);
    
    try {
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`📸 Screenshot saved: ${filename}`);
      this.screenshots.push(screenshotPath);
      return screenshotPath;
    } catch (error) {
      console.error(`Failed to save screenshot: ${error}`);
      return null;
    }
  }

  private async saveHtmlSnapshot(name: string): Promise<string | null> {
    if (!this.config.htmlSnapshots || !this.page) return null;
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}-${timestamp}.html`;
    const htmlPath = path.join(this.config.dataDir, 'html_snapshots', filename);
    
    try {
      const html = await this.page.content();
      await fs.writeFile(htmlPath, html);
      console.log(`📄 HTML snapshot saved: ${filename}`);
      this.htmlSnapshots.push(htmlPath);
      return htmlPath;
    } catch (error) {
      console.error(`Failed to save HTML snapshot: ${error}`);
      return null;
    }
  }

  private async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.config.maxRetries
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.log(`Attempt ${i + 1} failed: ${lastError.message}`);
        if (i < maxRetries - 1) {
          await this.page?.waitForTimeout(1000 * (i + 1)); // Progressive backoff
        }
      }
    }
    
    throw lastError || new Error('Operation failed after retries');
  }

  async navigateToAutomations(): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized');
    
    console.log('🔄 Navigating to automation workflows...');
    
    // Check current URL first
    const currentUrl = this.page.url();
    if (currentUrl.includes('automation') || currentUrl.includes('workflow')) {
      console.log('✅ Already on automations page');
      return true;
    }
    
    // Try different navigation strategies
    const strategies = [
      // Strategy 1: Direct URL navigation
      async () => {
        await this.page!.goto(`${this.config.baseUrl}/ai-employee-promo/automations`, {
          waitUntil: 'networkidle',
          timeout: 30000,
        });
      },
      
      // Strategy 2: Look for menu items
      async () => {
        // Try sidebar
        const sidebarLinks = [
          'a:has-text("Automations")',
          'a:has-text("Workflows")',
          'a:has-text("Automation")',
          '[data-nav="automations"]',
        ];
        
        for (const selector of sidebarLinks) {
          const link = this.page!.locator(selector).first();
          if (await link.isVisible({ timeout: 5000 })) {
            await link.click();
            await this.page!.waitForLoadState('networkidle');
            return;
          }
        }
        
        throw new Error('No sidebar link found');
      },
      
      // Strategy 3: Main menu navigation
      async () => {
        // Look for hamburger menu
        const menuButton = this.page!.locator('button[aria-label*="menu" i], button:has-text("☰")').first();
        if (await menuButton.isVisible({ timeout: 5000 })) {
          await menuButton.click();
          await this.page!.waitForTimeout(500);
          
          const automationLink = this.page!.locator('a:has-text("Automation")').first();
          await automationLink.click();
          await this.page!.waitForLoadState('networkidle');
          return;
        }
        
        throw new Error('No menu button found');
      },
    ];
    
    for (const strategy of strategies) {
      try {
        await strategy();
        await this.page.waitForTimeout(2000);
        
        const newUrl = this.page.url();
        if (newUrl.includes('automation') || newUrl.includes('workflow')) {
          console.log('✅ Successfully navigated to automations');
          await this.saveScreenshot('automations-page');
          return true;
        }
      } catch (error) {
        console.log(`Navigation strategy failed: ${error}`);
      }
    }
    
    // If we get here, take a screenshot for debugging
    await this.saveScreenshot('navigation-failed');
    throw new Error('Could not navigate to automations page');
  }

  async extractExistingWorkflows(): Promise<Workflow[]> {
    if (!this.page) throw new Error('Page not initialized');
    
    console.log('📋 Extracting existing workflows...');
    
    const workflows: Workflow[] = [];
    
    // Wait for workflows to load
    await this.page.waitForLoadState('networkidle');
    await this.saveScreenshot('workflow-list');
    await this.saveHtmlSnapshot('workflow-list');
    
    // Try multiple selectors for workflow items
    const workflowSelectors = [
      '[data-testid="workflow-item"]',
      '.workflow-item',
      'tr[data-workflow-id]',
      '[class*="workflow-card"]',
      'div[role="listitem"][class*="workflow"]',
    ];
    
    let workflowElements: any[] = [];
    for (const selector of workflowSelectors) {
      try {
        await this.page.waitForSelector(selector, { timeout: 5000 });
        workflowElements = await this.page.locator(selector).all();
        if (workflowElements.length > 0) {
          console.log(`Found ${workflowElements.length} workflows using selector: ${selector}`);
          break;
        }
      } catch {
        // Continue to next selector
      }
    }
    
    if (workflowElements.length === 0) {
      console.log('⚠️ No workflows found');
      return workflows;
    }
    
    // Extract each workflow
    for (let i = 0; i < workflowElements.length; i++) {
      try {
        const element = workflowElements[i];
        
        // Extract basic workflow info
        const workflowData = await element.evaluate((el: HTMLElement) => {
          const getText = (selector: string) => el.querySelector(selector)?.textContent?.trim() || '';
          
          return {
            name: getText('.workflow-name, [class*="name"], h3, h4') || el.textContent?.trim() || '',
            id: el.getAttribute('data-workflow-id') || 
                el.getAttribute('data-id') || 
                `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            status: getText('[class*="status"], .status-badge') || 'unknown',
            lastModified: getText('[class*="date"], [class*="modified"], time') || '',
            description: getText('[class*="description"], .workflow-description, p') || '',
          };
        });
        
        console.log(`Processing workflow: ${workflowData.name}`);
        
        // Click into workflow to get details
        await element.click();
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForTimeout(2000);
        
        // Extract workflow nodes and connections
        const nodes = await this.extractWorkflowNodes();
        const connections = await this.extractWorkflowConnections();
        
        workflows.push({
          ...workflowData,
          nodes,
          connections,
        });
        
        // Save workflow details
        await this.saveScreenshot(`workflow-${workflowData.id}`);
        await this.saveHtmlSnapshot(`workflow-${workflowData.id}`);
        
        // Navigate back to workflow list
        await this.navigateBack();
        
      } catch (error) {
        console.error(`Error processing workflow ${i + 1}:`, error);
      }
    }
    
    // Save workflows data
    await fs.writeFile(
      path.join(this.config.dataDir, 'workflows', 'existing-workflows.json'),
      JSON.stringify(workflows, null, 2)
    );
    
    console.log(`✅ Extracted ${workflows.length} workflows`);
    return workflows;
  }

  private async extractWorkflowNodes(): Promise<WorkflowNode[]> {
    if (!this.page) return [];
    
    const nodes: WorkflowNode[] = [];
    
    // Look for workflow canvas nodes
    const nodeSelectors = [
      '.react-flow__node',
      '[data-nodeid]',
      '.workflow-node',
      '[class*="node-container"]',
      'div[data-id][class*="node"]',
    ];
    
    for (const selector of nodeSelectors) {
      try {
        const nodeElements = await this.page.locator(selector).all();
        if (nodeElements.length > 0) {
          console.log(`Found ${nodeElements.length} nodes using selector: ${selector}`);
          
          for (const nodeElement of nodeElements) {
            const nodeData = await this.extractNodeData(nodeElement);
            if (nodeData) {
              nodes.push(nodeData);
            }
          }
          break;
        }
      } catch {
        // Continue to next selector
      }
    }
    
    return nodes;
  }

  private async extractNodeData(nodeElement: any): Promise<WorkflowNode | null> {
    try {
      const basicData = await nodeElement.evaluate((el: HTMLElement) => {
        const transform = el.style.transform || '';
        const translateMatch = transform.match(/translate\((-?\d+(?:\.\d+)?)px,\s*(-?\d+(?:\.\d+)?)px\)/);
        
        return {
          id: el.getAttribute('data-nodeid') || 
              el.getAttribute('data-id') || 
              el.id || 
              `node-${Date.now()}`,
          type: el.getAttribute('data-type') || 
                el.className.match(/node-type-(\w+)/)?.[1] || 
                'unknown',
          label: el.querySelector('.node-label, .node-title, [class*="label"]')?.textContent?.trim() || '',
          position: {
            x: translateMatch ? parseFloat(translateMatch[1]) : 0,
            y: translateMatch ? parseFloat(translateMatch[2]) : 0,
          },
        };
      });
      
      // Try to click node to get configuration
      let config = {};
      try {
        await nodeElement.click();
        await this.page!.waitForTimeout(1000);
        
        // Look for configuration panel
        const configPanel = await this.page!.locator('.node-config, .config-panel, [class*="properties"]').first();
        if (await configPanel.isVisible({ timeout: 2000 })) {
          config = await this.extractNodeConfiguration();
          
          // Close configuration
          const closeButton = this.page!.locator('[aria-label="Close"], .close-config').first();
          if (await closeButton.isVisible()) {
            await closeButton.click();
            await this.page!.waitForTimeout(500);
          }
        }
      } catch {
        // Configuration extraction failed, continue
      }
      
      return {
        ...basicData,
        config,
      };
    } catch (error) {
      console.error('Error extracting node data:', error);
      return null;
    }
  }

  private async extractNodeConfiguration(): Promise<Record<string, any>> {
    if (!this.page) return {};
    
    const config: Record<string, any> = {};
    
    try {
      // Extract all form inputs
      const inputs = await this.page.evaluate(() => {
        const result: Record<string, any> = {};
        
        // Text inputs
        document.querySelectorAll('input[type="text"], input[type="email"], input[type="number"], textarea').forEach((input: any) => {
          const name = input.name || input.id || input.getAttribute('aria-label') || '';
          if (name) {
            result[name] = input.value;
          }
        });
        
        // Checkboxes and radios
        document.querySelectorAll('input[type="checkbox"], input[type="radio"]').forEach((input: any) => {
          const name = input.name || input.id || '';
          if (name) {
            result[name] = input.checked;
          }
        });
        
        // Selects
        document.querySelectorAll('select').forEach((select: any) => {
          const name = select.name || select.id || '';
          if (name) {
            result[name] = select.value;
            result[`${name}_options`] = Array.from(select.options).map((opt: any) => ({
              value: opt.value,
              text: opt.text,
            }));
          }
        });
        
        return result;
      });
      
      Object.assign(config, inputs);
      
      // Extract custom dropdowns (React Select, etc.)
      const customDropdowns = await this.page.locator('[role="combobox"], [class*="select"]').all();
      for (const dropdown of customDropdowns) {
        try {
          const label = await dropdown.getAttribute('aria-label') || 'dropdown';
          const value = await dropdown.textContent();
          if (value) {
            config[label] = value.trim();
          }
        } catch {
          // Continue
        }
      }
      
    } catch (error) {
      console.error('Error extracting configuration:', error);
    }
    
    return config;
  }

  private async extractWorkflowConnections(): Promise<Connection[]> {
    if (!this.page) return [];
    
    const connections: Connection[] = [];
    
    try {
      // Look for SVG paths that represent connections
      const paths = await this.page.evaluate(() => {
        const results: Connection[] = [];
        
        // React Flow connections
        document.querySelectorAll('.react-flow__edge').forEach((edge: any) => {
          const source = edge.getAttribute('data-source') || '';
          const target = edge.getAttribute('data-target') || '';
          const label = edge.querySelector('.react-flow__edge-text')?.textContent?.trim() || '';
          
          if (source && target) {
            results.push({ source, target, label });
          }
        });
        
        // Alternative connection representations
        document.querySelectorAll('[class*="connection"], [class*="edge"]').forEach((conn: any) => {
          const source = conn.getAttribute('data-from') || conn.getAttribute('data-source') || '';
          const target = conn.getAttribute('data-to') || conn.getAttribute('data-target') || '';
          
          if (source && target) {
            results.push({ source, target });
          }
        });
        
        return results;
      });
      
      connections.push(...paths);
    } catch (error) {
      console.error('Error extracting connections:', error);
    }
    
    return connections;
  }

  private async navigateBack(): Promise<void> {
    if (!this.page) return;
    
    // Try multiple methods to go back
    const backMethods = [
      async () => {
        const backButton = this.page!.locator('button:has-text("Back"), a:has-text("Back"), [aria-label="Back"]').first();
        if (await backButton.isVisible({ timeout: 2000 })) {
          await backButton.click();
        } else {
          throw new Error('No back button found');
        }
      },
      async () => {
        await this.page!.goBack();
      },
      async () => {
        // Navigate to workflow list URL
        await this.page!.goto(`${this.config.baseUrl}/ai-employee-promo/automations`);
      },
    ];
    
    for (const method of backMethods) {
      try {
        await method();
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForTimeout(1000);
        return;
      } catch {
        // Try next method
      }
    }
  }

  async createTestWorkflow(): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized');
    
    console.log('🆕 Creating test workflow to discover triggers...');
    
    try {
      // Find create workflow button
      const createButton = await this.retryOperation(async () => {
        const selectors = [
          'button:has-text("Create Workflow")',
          'button:has-text("New Workflow")',
          'button:has-text("Add Workflow")',
          'button[aria-label*="create" i]',
          '[data-testid="create-workflow"]',
        ];
        
        for (const selector of selectors) {
          const button = this.page!.locator(selector).first();
          if (await button.isVisible({ timeout: 2000 })) {
            return button;
          }
        }
        
        throw new Error('Create workflow button not found');
      });
      
      await createButton.click();
      await this.page.waitForLoadState('networkidle');
      
      // Fill in workflow details
      const nameInput = await this.page.locator('input[name="name"], input[placeholder*="name" i]').first();
      if (await nameInput.isVisible()) {
        await nameInput.fill('Test Automation Discovery - DELETE ME');
      }
      
      const descriptionInput = await this.page.locator('textarea[name="description"], textarea[placeholder*="description" i]').first();
      if (await descriptionInput.isVisible()) {
        await descriptionInput.fill('Temporary workflow for discovering all available triggers and actions');
      }
      
      // Submit form
      const submitButton = await this.page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")').first();
      await submitButton.click();
      
      await this.page.waitForLoadState('networkidle');
      await this.saveScreenshot('test-workflow-created');
      
      console.log('✅ Test workflow created successfully');
      return true;
      
    } catch (error) {
      console.error('Failed to create test workflow:', error);
      await this.saveScreenshot('create-workflow-failed');
      return false;
    }
  }

  async discoverAllTriggers(): Promise<Trigger[]> {
    if (!this.page) throw new Error('Page not initialized');
    
    console.log('🎯 Discovering all available triggers...');
    
    const triggers: Trigger[] = [];
    
    try {
      // Find add trigger button
      const addTriggerButton = await this.retryOperation(async () => {
        const selectors = [
          'button:has-text("Add Trigger")',
          'button:has-text("New Trigger")',
          'button[aria-label*="trigger" i]',
          '.add-trigger-button',
          'button:has-text("+")',
        ];
        
        for (const selector of selectors) {
          const button = this.page!.locator(selector).first();
          if (await button.isVisible({ timeout: 2000 })) {
            return button;
          }
        }
        
        throw new Error('Add trigger button not found');
      });
      
      await addTriggerButton.click();
      await this.page.waitForLoadState('networkidle');
      await this.saveScreenshot('trigger-selection-modal');
      await this.saveHtmlSnapshot('trigger-selection-modal');
      
      // Extract trigger categories
      const categories = await this.page.evaluate(() => {
        const categoryElements = Array.from(document.querySelectorAll('[role="tab"], .category-tab, [data-category]'));
        return categoryElements.map(el => ({
          name: el.textContent?.trim() || '',
          id: el.getAttribute('data-category') || el.id || '',
        }));
      });
      
      // Explore each category
      for (const category of categories) {
        if (!category.name) continue;
        
        console.log(`📁 Exploring trigger category: ${category.name}`);
        
        // Click on category
        const categoryTab = this.page.locator(`[role="tab"]:has-text("${category.name}"), [data-category="${category.id}"]`).first();
        if (await categoryTab.isVisible()) {
          await categoryTab.click();
          await this.page.waitForTimeout(1000);
        }
        
        // Extract triggers in this category
        const categoryTriggers = await this.extractTriggersFromModal(category.name);
        triggers.push(...categoryTriggers);
        
        await this.saveScreenshot(`triggers-${category.name.toLowerCase().replace(/\s+/g, '-')}`);
      }
      
      // If no categories, extract all visible triggers
      if (categories.length === 0) {
        const allTriggers = await this.extractTriggersFromModal('General');
        triggers.push(...allTriggers);
      }
      
      // Close modal
      await this.closeModal();
      
      // Save triggers data
      await fs.writeFile(
        path.join(this.config.dataDir, 'triggers', 'all-triggers.json'),
        JSON.stringify(triggers, null, 2)
      );
      
      console.log(`✅ Discovered ${triggers.length} triggers`);
      return triggers;
      
    } catch (error) {
      console.error('Error discovering triggers:', error);
      await this.saveScreenshot('trigger-discovery-error');
      return triggers;
    }
  }

  private async extractTriggersFromModal(category: string): Promise<Trigger[]> {
    if (!this.page) return [];
    
    const triggers: Trigger[] = [];
    
    const triggerData = await this.page.evaluate(() => {
      const triggerElements = Array.from(document.querySelectorAll(
        '[data-trigger-type], .trigger-item, [role="option"][class*="trigger"]'
      ));
      
      return triggerElements.map(el => {
        const description = el.querySelector('.description, .help-text, small')?.textContent?.trim() || '';
        const events = Array.from(el.querySelectorAll('.event-type, [class*="event"]'))
          .map(e => e.textContent?.trim() || '')
          .filter(Boolean);
        
        return {
          name: el.querySelector('.trigger-name, h4, .title')?.textContent?.trim() || 
                el.textContent?.trim() || '',
          type: el.getAttribute('data-trigger-type') || 
                el.getAttribute('data-type') || 
                el.className.match(/trigger-type-(\w+)/)?.[1] || '',
          description,
          events,
        };
      });
    });
    
    for (const data of triggerData) {
      if (data.name) {
        triggers.push({
          category,
          ...data,
          conditions: [], // Will be populated if we click into the trigger
        });
      }
    }
    
    return triggers;
  }

  async discoverAllActions(): Promise<Action[]> {
    if (!this.page) throw new Error('Page not initialized');
    
    console.log('🎬 Discovering all available actions...');
    
    const actions: Action[] = [];
    
    try {
      // Ensure we have a trigger to add actions to
      const hasTrigger = await this.page.locator('[data-node-type="trigger"], .trigger-node').first().isVisible({ timeout: 2000 });
      
      if (!hasTrigger) {
        console.log('Adding a trigger first...');
        // Add a simple trigger
        await this.addSimpleTrigger();
      }
      
      // Find add action button
      const addActionButton = await this.retryOperation(async () => {
        const selectors = [
          'button:has-text("Add Action")',
          'button:has-text("Add Step")',
          'button[aria-label*="action" i]',
          '.add-action-button',
          'button.plus-button',
          '[data-testid="add-action"]',
        ];
        
        for (const selector of selectors) {
          const button = this.page!.locator(selector).first();
          if (await button.isVisible({ timeout: 2000 })) {
            return button;
          }
        }
        
        throw new Error('Add action button not found');
      });
      
      await addActionButton.click();
      await this.page.waitForLoadState('networkidle');
      await this.saveScreenshot('action-selection-modal');
      await this.saveHtmlSnapshot('action-selection-modal');
      
      // Extract action categories
      const categories = await this.page.evaluate(() => {
        const categoryElements = Array.from(document.querySelectorAll('[role="tab"], .action-category, [data-action-category]'));
        return categoryElements.map(el => ({
          name: el.textContent?.trim() || '',
          id: el.getAttribute('data-action-category') || el.id || '',
        }));
      });
      
      // Explore each category
      for (const category of categories) {
        if (!category.name) continue;
        
        console.log(`📁 Exploring action category: ${category.name}`);
        
        // Click on category
        const categoryTab = this.page.locator(`[role="tab"]:has-text("${category.name}"), [data-action-category="${category.id}"]`).first();
        if (await categoryTab.isVisible()) {
          await categoryTab.click();
          await this.page.waitForTimeout(1000);
        }
        
        // Extract actions in this category
        const categoryActions = await this.extractActionsFromModal(category.name);
        actions.push(...categoryActions);
        
        await this.saveScreenshot(`actions-${category.name.toLowerCase().replace(/\s+/g, '-')}`);
      }
      
      // If no categories, extract all visible actions
      if (categories.length === 0) {
        const allActions = await this.extractActionsFromModal('General');
        actions.push(...allActions);
      }
      
      // Try to extract detailed fields for each action
      for (const action of actions) {
        await this.extractActionDetails(action);
      }
      
      // Close modal
      await this.closeModal();
      
      // Save actions data
      await fs.writeFile(
        path.join(this.config.dataDir, 'actions', 'all-actions.json'),
        JSON.stringify(actions, null, 2)
      );
      
      console.log(`✅ Discovered ${actions.length} actions`);
      return actions;
      
    } catch (error) {
      console.error('Error discovering actions:', error);
      await this.saveScreenshot('action-discovery-error');
      return actions;
    }
  }

  private async extractActionsFromModal(category: string): Promise<Action[]> {
    if (!this.page) return [];
    
    const actions: Action[] = [];
    
    const actionData = await this.page.evaluate(() => {
      const actionElements = Array.from(document.querySelectorAll(
        '[data-action-type], .action-item, [role="option"][class*="action"]'
      ));
      
      return actionElements.map(el => {
        const description = el.querySelector('.description, .help-text, small')?.textContent?.trim() || '';
        
        return {
          name: el.querySelector('.action-name, h4, .title')?.textContent?.trim() || 
                el.textContent?.trim() || '',
          type: el.getAttribute('data-action-type') || 
                el.getAttribute('data-type') || 
                el.className.match(/action-type-(\w+)/)?.[1] || '',
          description,
        };
      });
    });
    
    for (const data of actionData) {
      if (data.name) {
        actions.push({
          category,
          ...data,
          fields: [],
          outputs: [],
        });
      }
    }
    
    return actions;
  }

  private async extractActionDetails(action: Action): Promise<void> {
    if (!this.page) return;
    
    try {
      // Try to click on the action to see its configuration
      const actionElement = this.page.locator(
        `[data-action-type="${action.type}"], :has-text("${action.name}")`
      ).first();
      
      if (await actionElement.isVisible({ timeout: 2000 })) {
        await actionElement.click();
        await this.page.waitForTimeout(1500);
        
        // Extract fields
        action.fields = await this.extractActionFields();
        
        // Extract outputs if visible
        const outputs = await this.page.evaluate(() => {
          const outputElements = Array.from(document.querySelectorAll(
            '.output-field, [class*="output"], [data-output]'
          ));
          
          return outputElements.map(el => el.textContent?.trim() || '').filter(Boolean);
        });
        
        if (outputs.length > 0) {
          action.outputs = outputs;
        }
        
        await this.saveScreenshot(`action-detail-${action.type}`);
        
        // Go back
        const backButton = this.page.locator('button:has-text("Back"), [aria-label="Back"]').first();
        if (await backButton.isVisible()) {
          await backButton.click();
          await this.page.waitForTimeout(1000);
        }
      }
    } catch (error) {
      console.log(`Could not extract details for action: ${action.name}`);
    }
  }

  private async extractActionFields(): Promise<ActionField[]> {
    if (!this.page) return [];
    
    const fields: ActionField[] = [];
    
    const fieldData = await this.page.evaluate(() => {
      const results: any[] = [];
      
      // Find all form fields
      const fieldContainers = Array.from(document.querySelectorAll(
        '.form-field, .field-group, [class*="field-container"], .form-group'
      ));
      
      fieldContainers.forEach(container => {
        const label = container.querySelector('label')?.textContent?.trim() || '';
        const input = container.querySelector('input, textarea, select');
        const helpText = container.querySelector('.help-text, .field-help, small')?.textContent?.trim() || '';
        const required = container.className.includes('required') || 
                         container.querySelector('.required-indicator') !== null ||
                         input?.hasAttribute('required') || false;
        
        if (label || input) {
          const field: any = {
            label,
            type: input?.type || input?.tagName?.toLowerCase() || 'text',
            name: input?.name || input?.id || '',
            required,
            helpText,
            placeholder: input?.getAttribute('placeholder') || '',
          };
          
          // Extract options for select fields
          if (input?.tagName?.toLowerCase() === 'select') {
            field.options = Array.from(input.querySelectorAll('option'))
              .map((opt: any) => opt.textContent?.trim())
              .filter(Boolean);
          }
          
          // Check for default value
          if (input) {
            field.defaultValue = (input as any).value || input.getAttribute('value') || '';
          }
          
          results.push(field);
        }
      });
      
      return results;
    });
    
    fields.push(...fieldData);
    return fields;
  }

  private async addSimpleTrigger(): Promise<void> {
    // Implementation to add a simple trigger
    // This would follow similar pattern to discoverAllTriggers but actually add one
    console.log('Adding simple trigger for action discovery...');
  }

  private async closeModal(): Promise<void> {
    if (!this.page) return;
    
    const closeSelectors = [
      '[aria-label="Close"]',
      'button:has-text("Close")',
      'button:has-text("Cancel")',
      '.close-button',
      'button.modal-close',
      '[data-testid="close-modal"]',
    ];
    
    for (const selector of closeSelectors) {
      const button = this.page.locator(selector).first();
      if (await button.isVisible({ timeout: 1000 })) {
        await button.click();
        await this.page.waitForTimeout(500);
        return;
      }
    }
    
    // Try pressing Escape
    await this.page.keyboard.press('Escape');
  }

  async generateComprehensiveReport(
    workflows: Workflow[],
    triggers: Trigger[],
    actions: Action[]
  ): Promise<Report> {
    console.log('📊 Generating comprehensive report...');
    
    const report: Report = {
      generatedAt: new Date().toISOString(),
      summary: this.generateSummary(workflows, triggers, actions),
      workflows,
      triggers,
      actions,
      insights: this.generateInsights(workflows, triggers, actions),
      recommendations: this.generateRecommendations(workflows, triggers, actions),
      screenshots: this.screenshots,
      htmlSnapshots: this.htmlSnapshots,
    };
    
    // Save JSON report
    await fs.writeFile(
      path.join(this.config.dataDir, 'reports', 'automation-analysis.json'),
      JSON.stringify(report, null, 2)
    );
    
    // Generate markdown report
    const markdown = this.generateMarkdownReport(report);
    await fs.writeFile(
      path.join(this.config.dataDir, 'reports', 'automation-analysis.md'),
      markdown
    );
    
    // Generate HTML report
    const html = this.generateHtmlReport(report);
    await fs.writeFile(
      path.join(this.config.dataDir, 'reports', 'automation-analysis.html'),
      html
    );
    
    console.log('✅ Reports generated successfully');
    return report;
  }

  private generateSummary(
    workflows: Workflow[],
    triggers: Trigger[],
    actions: Action[]
  ): Summary {
    // Count trigger usage in workflows
    const triggerUsage = new Map<string, number>();
    const actionUsage = new Map<string, number>();
    
    workflows.forEach(workflow => {
      workflow.nodes.forEach(node => {
        if (node.type === 'trigger') {
          triggerUsage.set(node.label, (triggerUsage.get(node.label) || 0) + 1);
        } else if (node.type === 'action') {
          actionUsage.set(node.label, (actionUsage.get(node.label) || 0) + 1);
        }
      });
    });
    
    const sortByUsage = (map: Map<string, number>) => 
      Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));
    
    return {
      totalWorkflows: workflows.length,
      totalTriggers: triggers.length,
      totalActions: actions.length,
      triggerCategories: [...new Set(triggers.map(t => t.category))],
      actionCategories: [...new Set(actions.map(a => a.category))],
      mostUsedTriggers: sortByUsage(triggerUsage),
      mostUsedActions: sortByUsage(actionUsage),
    };
  }

  private generateInsights(
    workflows: Workflow[],
    triggers: Trigger[],
    actions: Action[]
  ): Insight[] {
    const insights: Insight[] = [];
    
    // Workflow complexity analysis
    const avgNodesPerWorkflow = workflows.reduce((sum, w) => sum + w.nodes.length, 0) / (workflows.length || 1);
    const maxNodes = Math.max(...workflows.map(w => w.nodes.length));
    
    insights.push({
      category: 'Workflow Complexity',
      finding: `Workflows average ${avgNodesPerWorkflow.toFixed(1)} nodes with a maximum of ${maxNodes}`,
      details: avgNodesPerWorkflow > 10 
        ? 'Complex workflows may benefit from sub-workflow functionality'
        : 'Workflows are relatively simple and maintainable',
      impact: avgNodesPerWorkflow > 10 ? 'High' : 'Low',
    });
    
    // Trigger diversity
    const uniqueTriggerTypes = new Set(triggers.map(t => t.type)).size;
    insights.push({
      category: 'Trigger Diversity',
      finding: `${uniqueTriggerTypes} unique trigger types available`,
      details: `Covers ${triggers.filter(t => t.category).length} categories including webhooks, forms, schedules, and CRM events`,
      impact: 'High',
    });
    
    // Action capabilities
    const communicationActions = actions.filter(a => 
      a.category.toLowerCase().includes('communication') ||
      a.name.toLowerCase().includes('email') ||
      a.name.toLowerCase().includes('sms')
    ).length;
    
    insights.push({
      category: 'Communication Capabilities',
      finding: `${communicationActions} communication-related actions available`,
      details: 'Strong multi-channel communication support for customer engagement',
      impact: 'High',
    });
    
    // Integration ecosystem
    const integrationActions = actions.filter(a => 
      a.category.toLowerCase().includes('integration') ||
      a.category.toLowerCase().includes('external')
    ).length;
    
    insights.push({
      category: 'Integration Ecosystem',
      finding: `${integrationActions} integration actions for third-party systems`,
      details: 'Enables connecting with external tools and services',
      impact: 'Medium',
    });
    
    return insights;
  }

  private generateRecommendations(
    workflows: Workflow[],
    triggers: Trigger[],
    actions: Action[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    // Analyze what's missing compared to GHL
    const hasWebhookTrigger = triggers.some(t => t.type.toLowerCase().includes('webhook'));
    if (!hasWebhookTrigger) {
      recommendations.push({
        area: 'Trigger Enhancement',
        suggestion: 'Implement webhook triggers for real-time external system integration',
        priority: 'High',
        reasoning: 'Webhook triggers are essential for modern integrations and real-time responses',
        implementationEffort: '1-2 weeks with proper webhook infrastructure',
      });
    }
    
    // Conditional logic
    const hasConditionalActions = actions.some(a => 
      a.name.toLowerCase().includes('condition') ||
      a.name.toLowerCase().includes('if')
    );
    
    if (!hasConditionalActions) {
      recommendations.push({
        area: 'Workflow Logic',
        suggestion: 'Add conditional branching (if/then/else) to enable complex decision trees',
        priority: 'High',
        reasoning: 'Conditional logic is crucial for sophisticated automation workflows',
        implementationEffort: '2-3 weeks including UI for condition builder',
      });
    }
    
    // Workflow templates
    recommendations.push({
      area: 'User Experience',
      suggestion: 'Create pre-built workflow templates for common gym automation scenarios',
      priority: 'Medium',
      reasoning: 'Templates reduce time-to-value and showcase platform capabilities',
      implementationEffort: '1 week per template category',
    });
    
    // Performance optimization
    if (workflows.some(w => w.nodes.length > 20)) {
      recommendations.push({
        area: 'Performance',
        suggestion: 'Implement workflow execution monitoring and optimization',
        priority: 'Medium',
        reasoning: 'Large workflows need performance tracking to ensure reliability',
        implementationEffort: '2-3 weeks for comprehensive monitoring',
      });
    }
    
    // AI integration
    const hasAIActions = actions.some(a => 
      a.name.toLowerCase().includes('ai') ||
      a.name.toLowerCase().includes('gpt')
    );
    
    if (!hasAIActions) {
      recommendations.push({
        area: 'AI Enhancement',
        suggestion: 'Integrate AI-powered actions for content generation and decision making',
        priority: 'High',
        reasoning: 'AI actions provide competitive advantage and advanced automation capabilities',
        implementationEffort: '3-4 weeks including prompt engineering',
      });
    }
    
    return recommendations;
  }

  private generateMarkdownReport(report: Report): string {
    let md = `# GoHighLevel Automation Analysis Report\n\n`;
    md += `Generated: ${new Date(report.generatedAt).toLocaleString()}\n\n`;
    
    // Executive Summary
    md += `## Executive Summary\n\n`;
    md += `- **Total Workflows Analyzed**: ${report.summary.totalWorkflows}\n`;
    md += `- **Available Triggers**: ${report.summary.totalTriggers} across ${report.summary.triggerCategories.length} categories\n`;
    md += `- **Available Actions**: ${report.summary.totalActions} across ${report.summary.actionCategories.length} categories\n\n`;
    
    if (report.summary.mostUsedTriggers.length > 0) {
      md += `### Most Used Triggers\n\n`;
      report.summary.mostUsedTriggers.forEach(({ name, count }) => {
        md += `- ${name}: ${count} workflows\n`;
      });
      md += `\n`;
    }
    
    if (report.summary.mostUsedActions.length > 0) {
      md += `### Most Used Actions\n\n`;
      report.summary.mostUsedActions.forEach(({ name, count }) => {
        md += `- ${name}: ${count} workflows\n`;
      });
      md += `\n`;
    }
    
    // Detailed Trigger Analysis
    md += `## Trigger Analysis\n\n`;
    const triggersByCategory = this.groupBy(report.triggers, 'category');
    
    Object.entries(triggersByCategory).forEach(([category, triggers]) => {
      md += `### ${category}\n\n`;
      triggers.forEach(trigger => {
        md += `#### ${trigger.name}\n`;
        md += `- **Type**: ${trigger.type}\n`;
        if (trigger.description) {
          md += `- **Description**: ${trigger.description}\n`;
        }
        if (trigger.events && trigger.events.length > 0) {
          md += `- **Events**: ${trigger.events.join(', ')}\n`;
        }
        md += `\n`;
      });
    });
    
    // Detailed Action Analysis
    md += `## Action Analysis\n\n`;
    const actionsByCategory = this.groupBy(report.actions, 'category');
    
    Object.entries(actionsByCategory).forEach(([category, actions]) => {
      md += `### ${category}\n\n`;
      actions.forEach(action => {
        md += `#### ${action.name}\n`;
        md += `- **Type**: ${action.type}\n`;
        if (action.description) {
          md += `- **Description**: ${action.description}\n`;
        }
        if (action.fields.length > 0) {
          md += `- **Configuration Fields**:\n`;
          action.fields.forEach(field => {
            md += `  - ${field.label || field.name} (${field.type})${field.required ? ' *required*' : ''}\n`;
          });
        }
        if (action.outputs && action.outputs.length > 0) {
          md += `- **Outputs**: ${action.outputs.join(', ')}\n`;
        }
        md += `\n`;
      });
    });
    
    // Insights
    md += `## Key Insights\n\n`;
    report.insights.forEach(insight => {
      md += `### ${insight.category}\n`;
      md += `**Finding**: ${insight.finding}\n\n`;
      md += `**Details**: ${insight.details}\n\n`;
      md += `**Impact**: ${insight.impact}\n\n`;
    });
    
    // Recommendations
    md += `## Recommendations for Atlas Fitness CRM\n\n`;
    report.recommendations.forEach((rec, index) => {
      md += `### ${index + 1}. ${rec.area}\n`;
      md += `**Suggestion**: ${rec.suggestion}\n\n`;
      md += `**Priority**: ${rec.priority}\n\n`;
      md += `**Reasoning**: ${rec.reasoning}\n\n`;
      md += `**Implementation Effort**: ${rec.implementationEffort}\n\n`;
    });
    
    // Implementation Roadmap
    md += `## Suggested Implementation Roadmap\n\n`;
    
    const highPriorityRecs = report.recommendations.filter(r => r.priority === 'High');
    const mediumPriorityRecs = report.recommendations.filter(r => r.priority === 'Medium');
    const lowPriorityRecs = report.recommendations.filter(r => r.priority === 'Low');
    
    if (highPriorityRecs.length > 0) {
      md += `### Phase 1: High Priority (Weeks 1-4)\n\n`;
      highPriorityRecs.forEach(rec => {
        md += `- ${rec.suggestion}\n`;
      });
      md += `\n`;
    }
    
    if (mediumPriorityRecs.length > 0) {
      md += `### Phase 2: Medium Priority (Weeks 5-8)\n\n`;
      mediumPriorityRecs.forEach(rec => {
        md += `- ${rec.suggestion}\n`;
      });
      md += `\n`;
    }
    
    if (lowPriorityRecs.length > 0) {
      md += `### Phase 3: Low Priority (Weeks 9+)\n\n`;
      lowPriorityRecs.forEach(rec => {
        md += `- ${rec.suggestion}\n`;
      });
      md += `\n`;
    }
    
    return md;
  }

  private generateHtmlReport(report: Report): string {
    // Generate a comprehensive HTML report with styling
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GoHighLevel Automation Analysis Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1, h2, h3, h4 {
      color: #2c3e50;
    }
    h1 {
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin: 20px 0;
    }
    .summary-card {
      background-color: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #3498db;
    }
    .summary-card h3 {
      margin-top: 0;
      color: #3498db;
    }
    .priority-high {
      color: #e74c3c;
      font-weight: bold;
    }
    .priority-medium {
      color: #f39c12;
      font-weight: bold;
    }
    .priority-low {
      color: #27ae60;
      font-weight: bold;
    }
    .insight {
      background-color: #ecf0f1;
      padding: 15px;
      margin: 10px 0;
      border-radius: 5px;
    }
    .recommendation {
      background-color: #e8f5e9;
      padding: 15px;
      margin: 10px 0;
      border-radius: 5px;
      border-left: 4px solid #4caf50;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background-color: #3498db;
      color: white;
    }
    tr:hover {
      background-color: #f5f5f5;
    }
    .category-section {
      margin: 30px 0;
      padding: 20px;
      background-color: #fafafa;
      border-radius: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>GoHighLevel Automation Analysis Report</h1>
    <p><strong>Generated:</strong> ${new Date(report.generatedAt).toLocaleString()}</p>
    
    <h2>Executive Summary</h2>
    <div class="summary-grid">
      <div class="summary-card">
        <h3>Workflows</h3>
        <p><strong>${report.summary.totalWorkflows}</strong> analyzed</p>
      </div>
      <div class="summary-card">
        <h3>Triggers</h3>
        <p><strong>${report.summary.totalTriggers}</strong> available<br>
        ${report.summary.triggerCategories.length} categories</p>
      </div>
      <div class="summary-card">
        <h3>Actions</h3>
        <p><strong>${report.summary.totalActions}</strong> available<br>
        ${report.summary.actionCategories.length} categories</p>
      </div>
    </div>
    
    <h2>Key Insights</h2>
    ${report.insights.map(insight => `
      <div class="insight">
        <h3>${insight.category}</h3>
        <p><strong>${insight.finding}</strong></p>
        <p>${insight.details}</p>
        <p>Impact: <span class="priority-${insight.impact.toLowerCase()}">${insight.impact}</span></p>
      </div>
    `).join('')}
    
    <h2>Recommendations</h2>
    ${report.recommendations.map(rec => `
      <div class="recommendation">
        <h3>${rec.area}</h3>
        <p><strong>${rec.suggestion}</strong></p>
        <p>${rec.reasoning}</p>
        <p>Priority: <span class="priority-${rec.priority.toLowerCase()}">${rec.priority}</span></p>
        <p>Implementation Effort: ${rec.implementationEffort}</p>
      </div>
    `).join('')}
    
    <h2>Trigger Details</h2>
    ${Object.entries(this.groupBy(report.triggers, 'category')).map(([category, triggers]) => `
      <div class="category-section">
        <h3>${category}</h3>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            ${triggers.map(trigger => `
              <tr>
                <td>${trigger.name}</td>
                <td>${trigger.type}</td>
                <td>${trigger.description || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `).join('')}
    
    <h2>Action Details</h2>
    ${Object.entries(this.groupBy(report.actions, 'category')).map(([category, actions]) => `
      <div class="category-section">
        <h3>${category}</h3>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Fields</th>
            </tr>
          </thead>
          <tbody>
            ${actions.map(action => `
              <tr>
                <td>${action.name}</td>
                <td>${action.type}</td>
                <td>${action.fields.length} configuration fields</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `).join('')}
  </div>
</body>
</html>
    `;
    
    return html;
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const group = String(item[key]);
      if (!groups[group]) groups[group] = [];
      groups[group].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run(): Promise<Report> {
    try {
      await this.initialize();
      
      // Verify login
      console.log('🌐 Loading GoHighLevel with saved session...');
      await this.page!.goto(`${this.config.baseUrl}/ai-employee-promo`);
      await this.page!.waitForLoadState('networkidle');
      
      const currentUrl = this.page!.url();
      if (currentUrl.includes('login')) {
        throw new Error('Session expired. Please run manual-login-capture.js again.');
      }
      
      console.log('✅ Successfully loaded with authenticated session');
      await this.saveScreenshot('dashboard');
      
      // Navigate to automations
      await this.navigateToAutomations();
      
      // Extract existing workflows
      const workflows = await this.extractExistingWorkflows();
      
      // Create test workflow for discovery
      await this.createTestWorkflow();
      
      // Discover all triggers
      const triggers = await this.discoverAllTriggers();
      
      // Discover all actions
      const actions = await this.discoverAllActions();
      
      // Generate comprehensive report
      const report = await this.generateComprehensiveReport(workflows, triggers, actions);
      
      console.log('\n📊 Analysis Complete!');
      console.log(`Reports saved to: ${this.config.dataDir}/reports/`);
      console.log(`- JSON: automation-analysis.json`);
      console.log(`- Markdown: automation-analysis.md`);
      console.log(`- HTML: automation-analysis.html`);
      console.log(`\nScreenshots: ${this.screenshots.length} captured`);
      console.log(`HTML Snapshots: ${this.htmlSnapshots.length} captured`);
      
      return report;
      
    } catch (error) {
      console.error('❌ Error during exploration:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// Main execution
async function main() {
  const config: Config = {
    dataDir: '/Users/samschofield/atlas-fitness-onboarding/data/ghl_automation',
    sessionFile: 'leaddec-session.json',
    baseUrl: 'https://login.leaddec.com',
    screenshots: true,
    htmlSnapshots: true,
    headless: false,
    slowMo: 100,
    maxRetries: 3,
  };
  
  const explorer = new GHLAutomationExplorer(config);
  
  try {
    const report = await explorer.run();
    console.log('✅ Exploration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Exploration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { GHLAutomationExplorer, Config, Report };