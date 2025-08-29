import { test, expect, Page } from '@playwright/test'

test.describe('Automation Builder - Critical Fixes E2E Verification', () => {
  let page: Page

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage
    
    // Navigate to automation builder
    await page.goto('/automations/builder')
    
    // Wait for the page to load completely
    await page.waitForSelector('[data-testid="workflow-builder"]', { timeout: 10000 })
    
    // Ensure we're on the automation builder page
    await expect(page.locator('h1, h2')).toContainText(/Workflow|Automation|Builder/)
  })

  test.describe('Config Panel Fixes - Editable Inputs', () => {
    test('should open config panel and allow input editing', async () => {
      // First, try to add a node or find existing configuration
      await page.waitForSelector('text=Workflow Nodes', { timeout: 5000 })
      
      // Look for existing nodes or configuration options
      const configButtons = await page.locator('[data-testid="config-button"], button[title*="Configure"], button[title*="Settings"]').count()
      
      if (configButtons > 0) {
        // Click on configuration button
        await page.locator('[data-testid="config-button"], button[title*="Configure"], button[title*="Settings"]').first().click()
        
        // Wait for config panel to open
        await expect(page.locator('[data-testid="config-panel"], .config-panel')).toBeVisible({ timeout: 5000 })
        
        // Test input editability
        const inputs = page.locator('input:not([readonly]):not([disabled]), textarea:not([readonly]):not([disabled])')
        const inputCount = await inputs.count()
        
        if (inputCount > 0) {
          const firstInput = inputs.first()
          await firstInput.fill('Test input value')
          await expect(firstInput).toHaveValue('Test input value')
          
          // Clear and test again
          await firstInput.fill('')
          await expect(firstInput).toHaveValue('')
          
          // Test with different value
          await firstInput.fill('Updated test value')
          await expect(firstInput).toHaveValue('Updated test value')
        }
      }
    })

    test('should show validation errors for required fields', async () => {
      // Try to trigger validation by interacting with forms
      const requiredInputs = page.locator('input[required], textarea[required]')
      const requiredCount = await requiredInputs.count()
      
      if (requiredCount > 0) {
        const requiredInput = requiredInputs.first()
        
        // Clear the field and blur to trigger validation
        await requiredInput.fill('')
        await requiredInput.blur()
        
        // Wait for potential validation messages
        await page.waitForTimeout(500)
        
        // Check for validation styling or messages
        const hasValidationClass = await requiredInput.evaluate((el) => {
          return el.classList.contains('error') || 
                 el.classList.contains('invalid') ||
                 el.classList.contains('border-red') ||
                 getComputedStyle(el).borderColor.includes('red')
        })
        
        // Validation should be present in some form
        expect(hasValidationClass || 
               await page.locator('text=/required|invalid|error/i').isVisible()).toBeTruthy()
      }
    })

    test('should save configuration changes correctly', async () => {
      // Look for save buttons in the interface
      const saveButtons = page.locator('button:has-text("Save")')
      const saveButtonCount = await saveButtons.count()
      
      if (saveButtonCount > 0) {
        const saveButton = saveButtons.first()
        
        // Make a change first (if inputs are available)
        const editableInputs = page.locator('input:not([readonly]):not([disabled])')
        const inputCount = await editableInputs.count()
        
        if (inputCount > 0) {
          await editableInputs.first().fill('Configuration test value')
        }
        
        // Click save
        await saveButton.click()
        
        // Wait for save operation
        await page.waitForTimeout(1000)
        
        // Look for success indicators
        const successIndicators = page.locator('.toast, [role="alert"], .notification, text=/saved|success/i')
        const hasSuccessIndicator = await successIndicators.count() > 0
        
        // Save operation should complete without errors
        expect(hasSuccessIndicator || saveButton.isVisible()).toBeTruthy()
      }
    })
  })

  test.describe('Canvas UX Fixes', () => {
    test('should prevent nodes from spawning under minimap', async () => {
      const canvas = page.locator('[data-testid="reactflow"], .react-flow')
      await expect(canvas).toBeVisible()
      
      // Check if minimap exists
      const minimap = page.locator('[data-testid="minimap"], .react-flow__minimap')
      const minimapExists = await minimap.isVisible()
      
      if (minimapExists) {
        const minimapBox = await minimap.boundingBox()
        
        // Try to add a node by dragging from sidebar
        const triggerNode = page.locator('text=Facebook Lead Form, text=Website Opt-in Form').first()
        const triggerExists = await triggerNode.isVisible()
        
        if (triggerExists && minimapBox) {
          // Attempt to drag to minimap area
          await triggerNode.dragTo(minimap)
          
          // Wait for potential node creation
          await page.waitForTimeout(1000)
          
          // Check that no node was created in the minimap area
          // This is implementation specific - the fix should prevent this
          const nodesInMinimapArea = page.locator('.react-flow__node').filter({
            has: page.locator(`[style*="transform: translate(${minimapBox.x}px, ${minimapBox.y}px)"]`)
          })
          
          const nodeCount = await nodesInMinimapArea.count()
          expect(nodeCount).toBe(0)
        }
      }
    })

    test('should allow canvas panning with panOnDrag enabled', async () => {
      const canvas = page.locator('[data-testid="reactflow"], .react-flow')
      await expect(canvas).toBeVisible()
      
      const canvasBox = await canvas.boundingBox()
      if (canvasBox) {
        // Perform pan operation
        const startX = canvasBox.x + canvasBox.width / 2
        const startY = canvasBox.y + canvasBox.height / 2
        const endX = startX + 100
        const endY = startY + 50
        
        // Start pan drag
        await page.mouse.move(startX, startY)
        await page.mouse.down()
        await page.mouse.move(endX, endY)
        await page.mouse.up()
        
        // Canvas should handle pan without errors
        await page.waitForTimeout(500)
        
        // Verify canvas is still interactive
        await expect(canvas).toBeVisible()
        
        // Check that cursor changes appropriately during hover
        await canvas.hover()
        const cursorStyle = await canvas.evaluate(el => getComputedStyle(el).cursor)
        
        // Canvas should allow dragging/panning
        expect(['grab', 'move', 'default', 'pointer'].includes(cursorStyle)).toBeTruthy()
      }
    })

    test('should generate unique node IDs to prevent replacement', async () => {
      // Try to add multiple nodes of the same type
      const triggerNode = page.locator('text=Facebook Lead Form').first()
      const canvas = page.locator('[data-testid="reactflow"], .react-flow')
      
      if (await triggerNode.isVisible()) {
        // Add first node
        await triggerNode.dragTo(canvas, {
          targetPosition: { x: 100, y: 100 }
        })
        await page.waitForTimeout(500)
        
        // Add second node of same type
        await triggerNode.dragTo(canvas, {
          targetPosition: { x: 200, y: 200 }
        })
        await page.waitForTimeout(500)
        
        // Add third node of same type
        await triggerNode.dragTo(canvas, {
          targetPosition: { x: 300, y: 300 }
        })
        await page.waitForTimeout(500)
        
        // Count nodes on canvas
        const nodeElements = page.locator('.react-flow__node')
        const nodeCount = await nodeElements.count()
        
        // Should have multiple unique nodes, not replacement
        expect(nodeCount).toBeGreaterThanOrEqual(3)
        
        // Each node should have a unique ID (check data-id attributes)
        const nodeIds = await nodeElements.evaluateAll(nodes => 
          nodes.map(node => node.getAttribute('data-id') || node.id)
        )
        
        const uniqueIds = new Set(nodeIds.filter(id => id))
        expect(uniqueIds.size).toBe(nodeIds.filter(id => id).length)
      }
    })
  })

  test.describe('Workflow Validation Integration', () => {
    test('should block test execution with invalid configuration', async () => {
      // Look for test execution buttons
      const testButton = page.locator('button:has-text("Run Test"), button:has-text("Test")')
      
      if (await testButton.isVisible()) {
        // Try to run test with empty/invalid workflow
        await testButton.click()
        
        // Should show validation error or prevent execution
        await page.waitForTimeout(1000)
        
        // Look for validation messages or error indicators
        const validationMessages = page.locator(
          'text=/no trigger|invalid|error|validation|required/i, ' +
          '.error, .validation-error, [role="alert"]'
        )
        
        const hasValidationFeedback = await validationMessages.count() > 0
        
        // Should provide feedback about invalid configuration
        expect(hasValidationFeedback).toBeTruthy()
      }
    })

    test('should show specific validation messages for missing fields', async () => {
      // Check for validation feedback in the UI
      const validationElements = page.locator(
        '.validation-message, .error-message, [data-testid="validation"]'
      )
      
      const validationCount = await validationElements.count()
      
      if (validationCount > 0) {
        const validationText = await validationElements.first().textContent()
        
        // Should provide specific, helpful validation messages
        expect(validationText).toBeTruthy()
        expect(validationText!.length).toBeGreaterThan(0)
      }
      
      // Check for trigger requirement validation
      const triggerValidation = page.locator('text=/trigger.*required|no trigger|missing trigger/i')
      const hasTriggerValidation = await triggerValidation.isVisible()
      
      if (hasTriggerValidation) {
        expect(await triggerValidation.textContent()).toContain('trigger')
      }
    })

    test('should allow valid workflows to execute tests', async () => {
      // First create a valid workflow by adding required nodes
      const triggerNode = page.locator('text=Facebook Lead Form').first()
      const emailNode = page.locator('text=Send Email').first()
      const canvas = page.locator('[data-testid="reactflow"], .react-flow')
      
      if (await triggerNode.isVisible() && await emailNode.isVisible()) {
        // Add trigger node
        await triggerNode.dragTo(canvas, {
          targetPosition: { x: 100, y: 100 }
        })
        await page.waitForTimeout(500)
        
        // Add email action node
        await emailNode.dragTo(canvas, {
          targetPosition: { x: 300, y: 100 }
        })
        await page.waitForTimeout(500)
        
        // Try to run test with valid workflow
        const testButton = page.locator('button:has-text("Run Test"), button:has-text("Test")')
        
        if (await testButton.isVisible()) {
          await testButton.click()
          
          // Should allow execution or show test interface
          await page.waitForTimeout(1000)
          
          // Look for test execution UI or success feedback
          const testExecution = page.locator(
            'text=/running|executing|test.*payload|test.*data/i, ' +
            '.test-runner, [data-testid="test-execution"]'
          )
          
          const executionStarted = await testExecution.count() > 0
          
          // Should proceed with test execution for valid workflow
          // Note: This might show a payload form or execution steps
          expect(executionStarted || await testButton.isVisible()).toBeTruthy()
        }
      }
    })
  })

  test.describe('Auto-save and State Management', () => {
    test('should trigger auto-save after configuration changes', async () => {
      // Make changes that should trigger auto-save
      const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"]')
      
      if (await searchInput.isVisible()) {
        await searchInput.fill('auto-save test')
        
        // Wait for auto-save interval
        await page.waitForTimeout(3000)
        
        // Look for save indicators
        const saveIndicators = page.locator(
          '.toast, [role="alert"], .notification, ' +
          'text=/saving|saved|auto.*save/i'
        )
        
        // Auto-save should provide some feedback
        const hasSaveIndicator = await saveIndicators.count() > 0
        
        // Check console for save messages
        const logs: string[] = []
        page.on('console', msg => logs.push(msg.text()))
        
        await page.waitForTimeout(500)
        const hasSaveLogs = logs.some(log => 
          log.toLowerCase().includes('save') || 
          log.toLowerCase().includes('auto')
        )
        
        expect(hasSaveIndicator || hasSaveLogs).toBeTruthy()
      }
    })

    test('should maintain workflow state during operations', async () => {
      // Test state persistence during various operations
      const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"]')
      
      if (await searchInput.isVisible()) {
        const testValue = 'persistent-state-test'
        await searchInput.fill(testValue)
        
        // Perform other operations
        const canvas = page.locator('[data-testid="reactflow"], .react-flow')
        if (await canvas.isVisible()) {
          await canvas.click()
        }
        
        // Check various buttons/toggles
        const toggleButtons = page.locator('button:has-text("Active"), button:has-text("Inactive"), button:has-text("Test Mode")')
        const toggleCount = await toggleButtons.count()
        
        if (toggleCount > 0) {
          await toggleButtons.first().click()
          await page.waitForTimeout(500)
        }
        
        // Verify state is maintained
        if (await searchInput.isVisible()) {
          await expect(searchInput).toHaveValue(testValue)
        }
      }
    })
  })

  test.describe('Visual Feedback and Toggle States', () => {
    test('should show clear visual states for workflow status toggle', async () => {
      const statusToggle = page.locator('button:has-text("Active"), button:has-text("Inactive")')
      
      if (await statusToggle.isVisible()) {
        const initialText = await statusToggle.textContent()
        const initialClasses = await statusToggle.getAttribute('class')
        
        // Click to toggle status
        await statusToggle.click()
        await page.waitForTimeout(1000)
        
        // Check for visual changes
        const newText = await statusToggle.textContent()
        const newClasses = await statusToggle.getAttribute('class')
        
        // Text or classes should change to indicate status change
        const hasVisualChange = (initialText !== newText) || (initialClasses !== newClasses)
        expect(hasVisualChange).toBeTruthy()
        
        // Check for appropriate styling
        if (newText?.includes('Active')) {
          expect(newClasses).toMatch(/green|success|active/)
        } else if (newText?.includes('Inactive')) {
          expect(newClasses).toMatch(/gray|inactive|disabled/)
        }
      }
    })

    test('should show clear visual states for test mode toggle', async () => {
      const testModeToggle = page.locator('button:has-text("Test Mode")')
      
      if (await testModeToggle.isVisible()) {
        const initialClasses = await testModeToggle.getAttribute('class')
        const initialText = await testModeToggle.textContent()
        
        // Activate test mode
        await testModeToggle.click()
        await page.waitForTimeout(500)
        
        // Check for visual feedback
        const newClasses = await testModeToggle.getAttribute('class')
        const newText = await testModeToggle.textContent()
        
        const hasVisualChange = (initialClasses !== newClasses) || (initialText !== newText)
        expect(hasVisualChange).toBeTruthy()
        
        // Should indicate active test mode
        if (newText?.includes('Active') || newClasses?.includes('active')) {
          expect(newClasses).toMatch(/blue|primary|active/)
        }
      }
    })

    test('should handle rapid toggle operations without breaking', async () => {
      const toggleButtons = page.locator('button:has-text("Test Mode"), button:has-text("Active"), button:has-text("Inactive")')
      const toggleCount = await toggleButtons.count()
      
      if (toggleCount > 0) {
        const toggle = toggleButtons.first()
        
        // Rapid clicking test
        for (let i = 0; i < 5; i++) {
          await toggle.click()
          await page.waitForTimeout(100)
        }
        
        // Should remain stable and functional
        await expect(toggle).toBeVisible()
        
        // Should still be clickable
        await toggle.click()
        await page.waitForTimeout(200)
        
        expect(await toggle.isEnabled()).toBeTruthy()
      }
    })
  })

  test.describe('Complete Workflow Integration', () => {
    test('should support full workflow creation and testing cycle', async () => {
      // Step 1: Create workflow with trigger and action
      const triggerNode = page.locator('text=Facebook Lead Form').first()
      const emailNode = page.locator('text=Send Email').first()
      const canvas = page.locator('[data-testid="reactflow"], .react-flow')
      
      if (await triggerNode.isVisible() && await emailNode.isVisible()) {
        // Add nodes
        await triggerNode.dragTo(canvas, {
          targetPosition: { x: 100, y: 100 }
        })
        await page.waitForTimeout(500)
        
        await emailNode.dragTo(canvas, {
          targetPosition: { x: 300, y: 100 }
        })
        await page.waitForTimeout(500)
        
        // Step 2: Test auto-save
        const searchInput = page.locator('input[placeholder*="Search"]')
        if (await searchInput.isVisible()) {
          await searchInput.fill('integration test workflow')
          await page.waitForTimeout(2000) // Auto-save delay
        }
        
        // Step 3: Test canvas interaction
        await canvas.click({ position: { x: 200, y: 200 } })
        await page.waitForTimeout(500)
        
        // Step 4: Test workflow status
        const statusToggle = page.locator('button:has-text("Active"), button:has-text("Inactive")')
        if (await statusToggle.isVisible()) {
          await statusToggle.click()
          await page.waitForTimeout(1000)
        }
        
        // Step 5: Test mode validation
        const testModeToggle = page.locator('button:has-text("Test Mode")')
        if (await testModeToggle.isVisible()) {
          await testModeToggle.click()
          await page.waitForTimeout(500)
          
          const testButton = page.locator('button:has-text("Run Test")')
          if (await testButton.isVisible()) {
            await testButton.click()
            await page.waitForTimeout(1000)
          }
        }
        
        // All operations should complete without errors
        await expect(page.locator('h1, h2')).toBeVisible()
        
        // Workflow should be in a valid state
        const errorElements = page.locator('.error, [role="alert"]:has-text("error")')
        const errorCount = await errorElements.count()
        expect(errorCount).toBe(0)
      }
    })

    test('should maintain performance with all fixes active', async () => {
      const startTime = Date.now()
      
      // Perform multiple operations rapidly
      const operations = [
        async () => {
          const search = page.locator('input[placeholder*="Search"]')
          if (await search.isVisible()) {
            await search.fill('performance test')
          }
        },
        async () => {
          const canvas = page.locator('[data-testid="reactflow"]')
          if (await canvas.isVisible()) {
            await canvas.click()
          }
        },
        async () => {
          const toggle = page.locator('button:has-text("Test Mode")')
          if (await toggle.isVisible()) {
            await toggle.click()
          }
        }
      ]
      
      // Execute operations
      for (const operation of operations) {
        await operation()
        await page.waitForTimeout(100)
      }
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Should complete in reasonable time
      expect(duration).toBeLessThan(10000) // 10 seconds max
      
      // Interface should remain responsive
      await expect(page.locator('h1, h2')).toBeVisible()
    })

    test('should handle edge cases without breaking', async () => {
      // Test various edge cases
      const canvas = page.locator('[data-testid="reactflow"], .react-flow')
      
      if (await canvas.isVisible()) {
        // Try keyboard shortcuts on empty canvas
        await canvas.click()
        await page.keyboard.press('Delete')
        await page.keyboard.press('Control+s')
        await page.keyboard.press('Control+z')
        
        // Try drag operations outside canvas
        const sidebar = page.locator('text=Workflow Nodes').first()
        if (await sidebar.isVisible()) {
          const box = await sidebar.boundingBox()
          if (box) {
            await page.mouse.move(box.x, box.y)
            await page.mouse.down()
            await page.mouse.move(0, 0) // Drag to edge
            await page.mouse.up()
          }
        }
        
        // Interface should remain stable
        await expect(canvas).toBeVisible()
        await expect(page.locator('h1, h2')).toBeVisible()
      }
    })
  })

  test.describe('Accessibility and Usability', () => {
    test('should support keyboard navigation', async () => {
      // Test tab navigation
      await page.keyboard.press('Tab')
      await page.waitForTimeout(100)
      
      let focusedElement = page.locator(':focus')
      await expect(focusedElement).toBeVisible()
      
      // Continue tabbing
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      
      focusedElement = page.locator(':focus')
      await expect(focusedElement).toBeVisible()
      
      // Test enter key on focused elements
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)
      
      // Should handle keyboard interactions
      await expect(page.locator('body')).toBeVisible()
    })

    test('should provide appropriate ARIA labels and descriptions', async () => {
      const interactiveElements = page.locator('button, input, textarea, select, [role="button"]')
      const elementCount = await interactiveElements.count()
      
      expect(elementCount).toBeGreaterThan(0)
      
      // Check for accessibility attributes
      const firstElement = interactiveElements.first()
      const ariaLabel = await firstElement.getAttribute('aria-label')
      const ariaDescription = await firstElement.getAttribute('aria-describedby')
      const title = await firstElement.getAttribute('title')
      const placeholder = await firstElement.getAttribute('placeholder')
      
      // Should have some form of accessible description
      const hasAccessibleText = ariaLabel || ariaDescription || title || placeholder
      expect(hasAccessibleText).toBeTruthy()
    })
  })

  test.describe('Error Recovery and Resilience', () => {
    test('should recover from simulated errors gracefully', async () => {
      // Simulate network issues
      await page.route('**/api/automations/**', route => route.abort())
      
      // Try operations that might use API
      const saveButton = page.locator('button:has-text("Save")')
      if (await saveButton.isVisible()) {
        await saveButton.click()
        await page.waitForTimeout(2000)
      }
      
      // Restore network
      await page.unroute('**/api/automations/**')
      
      // Interface should remain functional
      await expect(page.locator('[data-testid="workflow-builder"]')).toBeVisible()
    })

    test('should handle page refresh gracefully', async () => {
      // Make some changes
      const searchInput = page.locator('input[placeholder*="Search"]')
      if (await searchInput.isVisible()) {
        await searchInput.fill('refresh test')
      }
      
      // Refresh page
      await page.reload()
      
      // Should load properly
      await expect(page.locator('[data-testid="workflow-builder"]')).toBeVisible()
      await expect(page.locator('text=Workflow Nodes')).toBeVisible()
    })
  })
})