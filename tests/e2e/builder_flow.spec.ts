import { test, expect, type Page } from '@playwright/test'

test.describe('Automation Builder Flow', () => {
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

  test('should add trigger + 2 actions, connect, pan canvas, save, reload → graph persists', async () => {
    // Step 1: Add a trigger node
    await test.step('Add trigger node', async () => {
      // Look for trigger in node palette
      const triggerPalette = page.locator('[data-testid="palette-trigger"], .node-palette').first()
      await expect(triggerPalette).toBeVisible({ timeout: 5000 })

      // Drag trigger onto canvas
      const canvas = page.locator('.react-flow, [data-testid="reactflow-canvas"]').first()
      await expect(canvas).toBeVisible()

      await triggerPalette.dragTo(canvas, {
        sourcePosition: { x: 50, y: 50 },
        targetPosition: { x: 100, y: 200 }
      })

      // Verify trigger node appears
      await expect(page.locator('.react-flow__node[data-testid*="trigger"], .react-flow__node:has-text("Trigger")')).toBeVisible()
    })

    // Step 2: Add first action node  
    await test.step('Add first action node', async () => {
      // Look for email action in palette
      const emailAction = page.locator('[data-testid="palette-email"], .node-palette:has-text("Email")', { hasText: /email|send/i }).first()
      await expect(emailAction).toBeVisible()

      // Drag to canvas
      const canvas = page.locator('.react-flow').first()
      await emailAction.dragTo(canvas, {
        sourcePosition: { x: 50, y: 50 },
        targetPosition: { x: 300, y: 200 }
      })

      // Verify first action appears
      await expect(page.locator('.react-flow__node').nth(1)).toBeVisible()
    })

    // Step 3: Add second action node
    await test.step('Add second action node', async () => {
      // Look for SMS action in palette
      const smsAction = page.locator('[data-testid="palette-sms"], .node-palette:has-text("SMS")', { hasText: /sms|text/i }).first()
      await expect(smsAction).toBeVisible()

      // Drag to canvas
      const canvas = page.locator('.react-flow').first()
      await smsAction.dragTo(canvas, {
        sourcePosition: { x: 50, y: 50 },
        targetPosition: { x: 500, y: 200 }
      })

      // Verify second action appears
      await expect(page.locator('.react-flow__node').nth(2)).toBeVisible()
    })

    // Step 4: Connect the nodes
    await test.step('Connect nodes', async () => {
      // Get node handles for connections
      const triggerHandle = page.locator('.react-flow__node').first().locator('.react-flow__handle-right, [data-testid="source-handle"]').first()
      const firstActionHandle = page.locator('.react-flow__node').nth(1).locator('.react-flow__handle-left, [data-testid="target-handle"]').first()

      // Connect trigger to first action
      await triggerHandle.hover()
      await page.mouse.down()
      await firstActionHandle.hover()
      await page.mouse.up()

      // Connect first action to second action
      const firstActionOutput = page.locator('.react-flow__node').nth(1).locator('.react-flow__handle-right, [data-testid="source-handle"]').first()
      const secondActionInput = page.locator('.react-flow__node').nth(2).locator('.react-flow__handle-left, [data-testid="target-handle"]').first()

      await firstActionOutput.hover()
      await page.mouse.down()
      await secondActionInput.hover()
      await page.mouse.up()

      // Verify edges appear
      await expect(page.locator('.react-flow__edge')).toHaveCount(2, { timeout: 3000 })
    })

    // Step 5: Pan the canvas
    await test.step('Pan canvas', async () => {
      const canvas = page.locator('.react-flow').first()
      
      // Get initial position of a node
      const initialNodePosition = await page.locator('.react-flow__node').first().boundingBox()
      
      // Pan by dragging the canvas
      await canvas.hover()
      await page.mouse.down({ button: 'left' })
      await page.mouse.move(200, 100)
      await page.mouse.up()

      // Verify nodes moved (panned)
      const newNodePosition = await page.locator('.react-flow__node').first().boundingBox()
      expect(newNodePosition?.x).not.toBe(initialNodePosition?.x)
    })

    // Step 6: Save the workflow
    await test.step('Save workflow', async () => {
      const saveButton = page.locator('button:has-text("Save"), [data-testid="save-button"]').first()
      await expect(saveButton).toBeVisible()
      await saveButton.click()

      // Wait for save confirmation
      await expect(page.locator('.toast, .notification:has-text("saved")', { hasText: /saved|success/i })).toBeVisible({ timeout: 5000 })
    })

    // Step 7: Reload page and verify persistence
    await test.step('Reload and verify persistence', async () => {
      // Reload the page
      await page.reload()
      await page.waitForLoadState('networkidle')
      
      // Wait for ReactFlow to load
      await page.waitForSelector('.react-flow', { timeout: 10000 })

      // Verify all nodes are still there
      await expect(page.locator('.react-flow__node')).toHaveCount(3, { timeout: 5000 })

      // Verify connections persist
      await expect(page.locator('.react-flow__edge')).toHaveCount(2, { timeout: 3000 })

      // Verify trigger node is still there
      await expect(page.locator('.react-flow__node').first()).toBeVisible()
      
      // Verify action nodes are still there
      await expect(page.locator('.react-flow__node').nth(1)).toBeVisible()
      await expect(page.locator('.react-flow__node').nth(2)).toBeVisible()
    })
  })

  test('should handle drag and drop from node palette correctly', async () => {
    // Test palette visibility
    await expect(page.locator('.node-palette, [data-testid="node-palette"]')).toBeVisible({ timeout: 5000 })

    // Test different node types are available
    await expect(page.locator('.node-palette:has-text("Trigger"), [data-testid="palette-trigger"]')).toBeVisible()
    await expect(page.locator('.node-palette:has-text("Email"), [data-testid="palette-email"]')).toBeVisible()
    await expect(page.locator('.node-palette:has-text("SMS"), [data-testid="palette-sms"]')).toBeVisible()

    // Test drag from palette creates unique nodes
    const canvas = page.locator('.react-flow').first()
    
    // Drag first node
    const trigger = page.locator('[data-testid="palette-trigger"], .node-palette:has-text("Trigger")').first()
    await trigger.dragTo(canvas, {
      sourcePosition: { x: 50, y: 50 },
      targetPosition: { x: 100, y: 100 }
    })

    // Drag second node
    const email = page.locator('[data-testid="palette-email"], .node-palette:has-text("Email")').first()
    await email.dragTo(canvas, {
      sourcePosition: { x: 50, y: 50 },
      targetPosition: { x: 300, y: 100 }
    })

    // Verify both nodes exist with unique IDs
    const nodes = page.locator('.react-flow__node')
    await expect(nodes).toHaveCount(2)

    // Get node IDs to ensure they're unique
    const firstNodeId = await nodes.nth(0).getAttribute('data-id')
    const secondNodeId = await nodes.nth(1).getAttribute('data-id')
    
    expect(firstNodeId).not.toBe(secondNodeId)
    expect(firstNodeId).toBeTruthy()
    expect(secondNodeId).toBeTruthy()
  })

  test('should handle canvas interactions correctly', async () => {
    // Add a node first
    const trigger = page.locator('[data-testid="palette-trigger"], .node-palette:has-text("Trigger")').first()
    const canvas = page.locator('.react-flow').first()
    
    await trigger.dragTo(canvas, {
      targetPosition: { x: 200, y: 200 }
    })

    // Test node selection
    const node = page.locator('.react-flow__node').first()
    await node.click()
    
    // Should show selection (check for selected class or styling)
    await expect(node).toHaveClass(/selected|active/, { timeout: 2000 })

    // Test canvas panning
    const initialViewport = await page.evaluate(() => {
      const reactFlowInstance = (window as any).reactFlowInstance
      return reactFlowInstance ? reactFlowInstance.getViewport() : { x: 0, y: 0, zoom: 1 }
    })

    // Pan the canvas
    await canvas.hover()
    await page.mouse.down()
    await page.mouse.move(100, 50)
    await page.mouse.up()

    // Check viewport changed
    const newViewport = await page.evaluate(() => {
      const reactFlowInstance = (window as any).reactFlowInstance
      return reactFlowInstance ? reactFlowInstance.getViewport() : { x: 0, y: 0, zoom: 1 }
    })

    expect(newViewport.x).not.toBe(initialViewport.x)
  })

  test('should handle zoom interactions correctly', async () => {
    // Add a node
    const trigger = page.locator('[data-testid="palette-trigger"], .node-palette:has-text("Trigger")').first()
    const canvas = page.locator('.react-flow').first()
    
    await trigger.dragTo(canvas)
    
    // Test zoom controls
    const zoomIn = page.locator('.react-flow__controls button[title*="zoom in"], .react-flow__controls-zoomin')
    const zoomOut = page.locator('.react-flow__controls button[title*="zoom out"], .react-flow__controls-zoomout')

    // Test zoom in
    if (await zoomIn.isVisible()) {
      await zoomIn.click()
      await page.waitForTimeout(500)
    }

    // Test zoom out  
    if (await zoomOut.isVisible()) {
      await zoomOut.click()
      await page.waitForTimeout(500)
    }

    // Test mouse wheel zoom
    await canvas.hover()
    await page.mouse.wheel(0, -100) // Zoom in
    await page.waitForTimeout(300)
    await page.mouse.wheel(0, 100)  // Zoom out

    // Node should still be visible after zoom operations
    await expect(page.locator('.react-flow__node')).toBeVisible()
  })

  test('should maintain workflow state during navigation', async () => {
    // Create a simple workflow
    const trigger = page.locator('[data-testid="palette-trigger"], .node-palette:has-text("Trigger")').first()
    const canvas = page.locator('.react-flow').first()
    
    await trigger.dragTo(canvas, { targetPosition: { x: 200, y: 200 } })

    // Save workflow
    const saveButton = page.locator('button:has-text("Save"), [data-testid="save-button"]').first()
    if (await saveButton.isVisible()) {
      await saveButton.click()
      await page.waitForTimeout(1000)
    }

    // Navigate away and back
    await page.goto(page.url().replace('/builder', '/templates'))
    await page.waitForTimeout(500)
    await page.goto(page.url().replace('/templates', '/builder'))
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('.react-flow', { timeout: 10000 })

    // Verify workflow is restored
    await expect(page.locator('.react-flow__node')).toHaveCount(1, { timeout: 5000 })
  })
})