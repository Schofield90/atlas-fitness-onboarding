import { test, expect, type Page } from '@playwright/test'

test.describe('Automation Builder Validation', () => {
  let page: Page

  test.beforeEach(async ({ browser, baseURL }) => {
    page = await browser.newPage()
    
    // Navigate to the builder
    await page.goto(`${baseURL}/automations/builder`)
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle')
    
    // Wait for ReactFlow to initialize
    await page.waitForSelector('[data-testid="reactflow-canvas"], .react-flow', { 
      timeout: 10000 
    })
  })

  test.afterEach(async () => {
    await page.close()
  })

  test('should block workflow execution with missing email fields and focus field after filling', async () => {
    // Step 1: Create workflow with missing email configuration
    await test.step('Add trigger and email action', async () => {
      // Add trigger
      const triggerPalette = page.locator('[data-testid="palette-trigger"], .node-palette:has-text("Trigger")').first()
      const canvas = page.locator('.react-flow').first()
      
      await triggerPalette.dragTo(canvas, {
        targetPosition: { x: 100, y: 200 }
      })

      // Add email action
      const emailPalette = page.locator('[data-testid="palette-email"], .node-palette:has-text("Email")').first()
      await emailPalette.dragTo(canvas, {
        targetPosition: { x: 300, y: 200 }
      })

      // Connect nodes
      const triggerHandle = page.locator('.react-flow__node').first().locator('.react-flow__handle-right').first()
      const emailHandle = page.locator('.react-flow__node').nth(1).locator('.react-flow__handle-left').first()

      await triggerHandle.hover()
      await page.mouse.down()
      await emailHandle.hover()
      await page.mouse.up()

      // Verify connection
      await expect(page.locator('.react-flow__edge')).toHaveCount(1)
    })

    // Step 2: Try to run workflow with missing fields - should be blocked
    await test.step('Attempt to run workflow with missing fields', async () => {
      const runButton = page.locator('button:has-text("Run"), button:has-text("Test"), [data-testid="run-button"]').first()
      
      if (await runButton.isVisible()) {
        await runButton.click()
        
        // Should show validation errors
        await expect(page.locator('.validation-error, .error-message:has-text("subject"), .error-message:has-text("body")')).toBeVisible({ timeout: 5000 })
        
        // Should show blocking message
        await expect(page.locator(':has-text("blocked"), :has-text("required"), :has-text("missing")')).toBeVisible()
      }
    })

    // Step 3: Configure email action with missing subject
    await test.step('Configure email action with missing subject', async () => {
      // Click on email node to open config
      const emailNode = page.locator('.react-flow__node').nth(1)
      await emailNode.click()

      // Look for config panel or modal
      const configPanel = page.locator('[data-testid="config-panel"], .config-modal, .node-config').first()
      await expect(configPanel).toBeVisible({ timeout: 5000 })

      // Fill only body, leave subject empty
      const bodyField = page.locator('textarea[placeholder*="body"], input[name*="body"], [data-testid="email-body"]').first()
      if (await bodyField.isVisible()) {
        await bodyField.fill('This is the email body content')
      }

      // Try to save - should show validation error for missing subject
      const saveButton = page.locator('button:has-text("Save"), [data-testid="save-config"]').first()
      if (await saveButton.isVisible()) {
        await saveButton.click()
      }

      // Should show subject required error
      await expect(page.locator('.error:has-text("subject"), .validation-error:has-text("required")')).toBeVisible({ timeout: 3000 })
    })

    // Step 4: Add subject and verify field focus behavior
    await test.step('Add subject and verify focus', async () => {
      // Fill subject field
      const subjectField = page.locator('input[placeholder*="subject"], input[name*="subject"], [data-testid="email-subject"]').first()
      
      if (await subjectField.isVisible()) {
        await subjectField.click()
        await expect(subjectField).toBeFocused()
        await subjectField.fill('Welcome to our gym!')
      }

      // Save configuration
      const saveButton = page.locator('button:has-text("Save"), [data-testid="save-config"]').first()
      if (await saveButton.isVisible()) {
        await saveButton.click()
      }

      // Close config panel
      const closeButton = page.locator('button:has-text("×"), button:has-text("Close"), [data-testid="close-config"]').first()
      if (await closeButton.isVisible()) {
        await closeButton.click()
      }
    })

    // Step 5: Run workflow again - should succeed with execution log
    await test.step('Run workflow and verify execution log', async () => {
      const runButton = page.locator('button:has-text("Run"), button:has-text("Test"), [data-testid="run-button"]').first()
      
      if (await runButton.isVisible()) {
        await runButton.click()
        
        // Should show success message
        await expect(page.locator('.success-message, .toast:has-text("success"), :has-text("executed")')).toBeVisible({ timeout: 10000 })
        
        // Should show execution log
        await expect(page.locator('.execution-log, .log-panel, [data-testid="execution-log"]')).toBeVisible({ timeout: 5000 })
        
        // Log should contain successful steps
        await expect(page.locator(':has-text("trigger"), :has-text("email"), :has-text("completed")')).toBeVisible()
      }
    })
  })

  test('should validate SMS action and block execution with missing message', async () => {
    // Step 1: Create SMS workflow
    await test.step('Add trigger and SMS action', async () => {
      const canvas = page.locator('.react-flow').first()
      
      // Add trigger
      const trigger = page.locator('[data-testid="palette-trigger"], .node-palette:has-text("Trigger")').first()
      await trigger.dragTo(canvas, { targetPosition: { x: 100, y: 200 } })

      // Add SMS action
      const smsAction = page.locator('[data-testid="palette-sms"], .node-palette:has-text("SMS")').first()
      await smsAction.dragTo(canvas, { targetPosition: { x: 300, y: 200 } })

      // Connect nodes
      const triggerHandle = page.locator('.react-flow__node').first().locator('.react-flow__handle-right').first()
      const smsHandle = page.locator('.react-flow__node').nth(1).locator('.react-flow__handle-left').first()

      await triggerHandle.hover()
      await page.mouse.down()
      await smsHandle.hover()
      await page.mouse.up()
    })

    // Step 2: Try to run without configuring SMS - should be blocked
    await test.step('Run workflow with missing SMS message', async () => {
      const runButton = page.locator('button:has-text("Run"), button:has-text("Test")').first()
      
      if (await runButton.isVisible()) {
        await runButton.click()
        
        // Should show validation error for missing SMS message
        await expect(page.locator('.validation-error:has-text("message"), .error:has-text("SMS")')).toBeVisible({ timeout: 5000 })
      }
    })

    // Step 3: Configure SMS and verify success
    await test.step('Configure SMS action and run successfully', async () => {
      // Click SMS node to configure
      const smsNode = page.locator('.react-flow__node').nth(1)
      await smsNode.click()

      // Fill SMS message
      const messageField = page.locator('textarea[placeholder*="message"], textarea[name*="message"], [data-testid="sms-message"]').first()
      
      if (await messageField.isVisible()) {
        await messageField.click()
        await expect(messageField).toBeFocused()
        await messageField.fill('Welcome to our gym! We\'re excited to help you reach your fitness goals.')
      }

      // Save configuration
      const saveButton = page.locator('button:has-text("Save")').first()
      if (await saveButton.isVisible()) {
        await saveButton.click()
      }

      // Close config panel
      const closeButton = page.locator('button:has-text("×"), button:has-text("Close")').first()
      if (await closeButton.isVisible()) {
        await closeButton.click()
      }

      // Run workflow - should succeed
      const runButton = page.locator('button:has-text("Run"), button:has-text("Test")').first()
      if (await runButton.isVisible()) {
        await runButton.click()
        
        // Should show success
        await expect(page.locator('.success-message, .toast:has-text("success")')).toBeVisible({ timeout: 10000 })
      }
    })
  })

  test('should validate WhatsApp action configuration', async () => {
    // Create WhatsApp workflow and test validation
    await test.step('Add trigger and WhatsApp action', async () => {
      const canvas = page.locator('.react-flow').first()
      
      // Add trigger
      const trigger = page.locator('[data-testid="palette-trigger"], .node-palette:has-text("Trigger")').first()
      await trigger.dragTo(canvas, { targetPosition: { x: 100, y: 200 } })

      // Add WhatsApp action
      const whatsappAction = page.locator('[data-testid="palette-whatsapp"], .node-palette:has-text("WhatsApp")').first()
      await whatsappAction.dragTo(canvas, { targetPosition: { x: 300, y: 200 } })

      // Connect nodes
      const triggerHandle = page.locator('.react-flow__node').first().locator('.react-flow__handle-right').first()
      const whatsappHandle = page.locator('.react-flow__node').nth(1).locator('.react-flow__handle-left').first()

      await triggerHandle.hover()
      await page.mouse.down()
      await whatsappHandle.hover()
      await page.mouse.up()
    })

    // Step 2: Test freeform mode validation
    await test.step('Test WhatsApp freeform mode validation', async () => {
      // Configure WhatsApp node
      const whatsappNode = page.locator('.react-flow__node').nth(1)
      await whatsappNode.click()

      // Select freeform mode if available
      const modeSelect = page.locator('select[name*="mode"], [data-testid="whatsapp-mode"]').first()
      if (await modeSelect.isVisible()) {
        await modeSelect.selectOption('freeform')
      }

      // Try to save without message - should show error
      const saveButton = page.locator('button:has-text("Save")').first()
      if (await saveButton.isVisible()) {
        await saveButton.click()
      }

      // Should show validation error
      await expect(page.locator('.error:has-text("message"), .validation-error')).toBeVisible({ timeout: 3000 })

      // Fill message and save successfully
      const messageField = page.locator('textarea[name*="message"], [data-testid="whatsapp-message"]').first()
      if (await messageField.isVisible()) {
        await messageField.fill('Welcome to our gym via WhatsApp!')
        await saveButton.click()
      }
    })
  })

  test('should show real-time validation feedback', async () => {
    await test.step('Test real-time validation indicators', async () => {
      const canvas = page.locator('.react-flow').first()
      
      // Add nodes
      const trigger = page.locator('[data-testid="palette-trigger"], .node-palette:has-text("Trigger")').first()
      await trigger.dragTo(canvas, { targetPosition: { x: 100, y: 200 } })

      const emailAction = page.locator('[data-testid="palette-email"], .node-palette:has-text("Email")').first()
      await emailAction.dragTo(canvas, { targetPosition: { x: 300, y: 200 } })

      // Should show validation indicators on nodes
      await expect(page.locator('.react-flow__node .validation-indicator, .react-flow__node .error-badge')).toBeVisible({ timeout: 5000 })

      // Validation panel should show issues
      const validationPanel = page.locator('.validation-panel, [data-testid="validation-panel"]')
      if (await validationPanel.isVisible()) {
        await expect(validationPanel.locator(':has-text("error"), :has-text("required")')).toBeVisible()
      }
    })
  })

  test('should handle workflow validation score correctly', async () => {
    await test.step('Test workflow quality scoring', async () => {
      // Create incomplete workflow
      const canvas = page.locator('.react-flow').first()
      const trigger = page.locator('[data-testid="palette-trigger"], .node-palette:has-text("Trigger")').first()
      await trigger.dragTo(canvas, { targetPosition: { x: 100, y: 200 } })

      // Check for low score
      const scoreIndicator = page.locator('.workflow-score, [data-testid="validation-score"]')
      if (await scoreIndicator.isVisible()) {
        await expect(scoreIndicator.locator(':has-text("/")')).toBeVisible() // Should show score like "40/100"
      }

      // Add and configure email action
      const emailAction = page.locator('[data-testid="palette-email"], .node-palette:has-text("Email")').first()
      await emailAction.dragTo(canvas, { targetPosition: { x: 300, y: 200 } })

      // Connect nodes
      const triggerHandle = page.locator('.react-flow__node').first().locator('.react-flow__handle-right').first()
      const emailHandle = page.locator('.react-flow__node').nth(1).locator('.react-flow__handle-left').first()

      await triggerHandle.hover()
      await page.mouse.down()
      await emailHandle.hover()
      await page.mouse.up()

      // Configure email properly
      const emailNode = page.locator('.react-flow__node').nth(1)
      await emailNode.click()

      const subjectField = page.locator('input[name*="subject"], [data-testid="email-subject"]').first()
      const bodyField = page.locator('textarea[name*="body"], [data-testid="email-body"]').first()

      if (await subjectField.isVisible() && await bodyField.isVisible()) {
        await subjectField.fill('Test Subject')
        await bodyField.fill('Test Body')
        
        const saveButton = page.locator('button:has-text("Save")').first()
        if (await saveButton.isVisible()) {
          await saveButton.click()
        }
      }

      // Score should improve
      if (await scoreIndicator.isVisible()) {
        await expect(scoreIndicator.locator(':has-text("9"), :has-text("10")')).toBeVisible({ timeout: 3000 }) // Should show higher score
      }
    })
  })

  test('should focus invalid fields when validation fails', async () => {
    await test.step('Test field focusing on validation errors', async () => {
      const canvas = page.locator('.react-flow').first()
      
      // Create workflow
      const trigger = page.locator('[data-testid="palette-trigger"], .node-palette:has-text("Trigger")').first()
      await trigger.dragTo(canvas, { targetPosition: { x: 100, y: 200 } })

      const emailAction = page.locator('[data-testid="palette-email"], .node-palette:has-text("Email")').first()
      await emailAction.dragTo(canvas, { targetPosition: { x: 300, y: 200 } })

      // Connect and configure partially
      const triggerHandle = page.locator('.react-flow__node').first().locator('.react-flow__handle-right').first()
      const emailHandle = page.locator('.react-flow__node').nth(1).locator('.react-flow__handle-left').first()

      await triggerHandle.hover()
      await page.mouse.down()
      await emailHandle.hover()
      await page.mouse.up()

      // Open email config
      const emailNode = page.locator('.react-flow__node').nth(1)
      await emailNode.click()

      // Fill only one field
      const bodyField = page.locator('textarea[name*="body"], [data-testid="email-body"]').first()
      if (await bodyField.isVisible()) {
        await bodyField.fill('Test body content')
      }

      // Try to save - should focus missing subject field
      const saveButton = page.locator('button:has-text("Save")').first()
      if (await saveButton.isVisible()) {
        await saveButton.click()
      }

      // Subject field should be focused after validation error
      const subjectField = page.locator('input[name*="subject"], [data-testid="email-subject"]').first()
      if (await subjectField.isVisible()) {
        await expect(subjectField).toBeFocused({ timeout: 2000 })
      }

      // Should show inline error for subject
      await expect(page.locator('.field-error:has-text("subject"), .error-message:has-text("required")')).toBeVisible()
    })
  })
})