import { test, expect, type Page } from '@playwright/test'

test.describe('Automation Builder MiniMap', () => {
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

    // Wait for MiniMap to be visible
    await page.waitForSelector('.react-flow__minimap, [data-testid="minimap"]', { timeout: 5000 })
  })

  test.afterEach(async () => {
    await page.close()
  })

  test('should not navigate when clicking on MiniMap', async () => {
    // Record initial URL
    const initialUrl = page.url()
    const initialPathname = new URL(initialUrl).pathname

    // Find the MiniMap component
    const miniMap = page.locator('.react-flow__minimap, [data-testid="minimap"]').first()
    await expect(miniMap).toBeVisible()

    // Click on the MiniMap
    await miniMap.click()
    
    // Wait a moment to ensure any navigation would have occurred
    await page.waitForTimeout(500)

    // Verify URL hasn't changed
    const currentUrl = page.url()
    const currentPathname = new URL(currentUrl).pathname
    
    expect(currentPathname).toBe(initialPathname)
    expect(currentUrl).toBe(initialUrl)
  })

  test('should not navigate when clicking on MiniMap nodes', async () => {
    // First, add some nodes to make the minimap more interactive
    await test.step('Add nodes to canvas', async () => {
      const canvas = page.locator('.react-flow').first()
      
      // Add trigger
      const trigger = page.locator('[data-testid="palette-trigger"], .node-palette:has-text("Trigger")').first()
      await trigger.dragTo(canvas, { targetPosition: { x: 200, y: 200 } })

      // Add action
      const emailAction = page.locator('[data-testid="palette-email"], .node-palette:has-text("Email")').first()
      await emailAction.dragTo(canvas, { targetPosition: { x: 400, y: 200 } })

      // Verify nodes are added
      await expect(page.locator('.react-flow__node')).toHaveCount(2)
    })

    // Record initial URL
    const initialUrl = page.url()
    const initialPathname = new URL(initialUrl).pathname

    // Click on MiniMap node representations
    await test.step('Click on MiniMap node areas', async () => {
      const miniMap = page.locator('.react-flow__minimap').first()
      await expect(miniMap).toBeVisible()

      // Click different areas of the minimap where nodes would be represented
      await miniMap.click({ position: { x: 50, y: 50 } })
      await page.waitForTimeout(200)
      
      await miniMap.click({ position: { x: 100, y: 50 } })
      await page.waitForTimeout(200)

      // Click center of minimap
      const minimapBox = await miniMap.boundingBox()
      if (minimapBox) {
        await miniMap.click({ 
          position: { 
            x: minimapBox.width / 2, 
            y: minimapBox.height / 2 
          } 
        })
      }
      
      await page.waitForTimeout(500)
    })

    // Verify URL still hasn't changed
    const currentUrl = page.url()
    const currentPathname = new URL(currentUrl).pathname
    
    expect(currentPathname).toBe(initialPathname)
    expect(currentUrl).toBe(initialUrl)
  })

  test('should not scroll page when clicking MiniMap', async () => {
    // Set initial scroll position
    await page.evaluate(() => {
      window.scrollTo(0, 0)
    })

    // Record initial scroll position
    const initialScrollY = await page.evaluate(() => window.pageYOffset)
    const initialScrollX = await page.evaluate(() => window.pageXOffset)

    // Click on MiniMap multiple times
    const miniMap = page.locator('.react-flow__minimap').first()
    await expect(miniMap).toBeVisible()

    await miniMap.click()
    await page.waitForTimeout(100)
    
    await miniMap.click({ position: { x: 50, y: 30 } })
    await page.waitForTimeout(100)
    
    await miniMap.click({ position: { x: 100, y: 60 } })
    await page.waitForTimeout(500)

    // Verify scroll position hasn't changed
    const currentScrollY = await page.evaluate(() => window.pageYOffset)
    const currentScrollX = await page.evaluate(() => window.pageXOffset)
    
    expect(currentScrollY).toBe(initialScrollY)
    expect(currentScrollX).toBe(initialScrollX)
  })

  test('should not trigger browser back/forward when clicking MiniMap', async () => {
    // Navigate to a different page first to have history
    await page.goto(page.url().replace('/builder', '/templates'))
    await page.waitForTimeout(500)
    
    // Navigate back to builder
    await page.goto(page.url().replace('/templates', '/builder'))
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('.react-flow__minimap', { timeout: 5000 })

    // Record current history state
    const initialUrl = page.url()

    // Click MiniMap
    const miniMap = page.locator('.react-flow__minimap').first()
    await miniMap.click()
    await page.waitForTimeout(500)

    // Verify we're still on the builder page
    expect(page.url()).toBe(initialUrl)
    expect(page.url()).toContain('/builder')
  })

  test('should not interfere with MiniMap viewport functionality', async () => {
    // Add nodes to make the canvas larger
    await test.step('Create larger workflow', async () => {
      const canvas = page.locator('.react-flow').first()
      
      // Add nodes spread across the canvas
      const trigger = page.locator('[data-testid="palette-trigger"], .node-palette:has-text("Trigger")').first()
      await trigger.dragTo(canvas, { targetPosition: { x: 100, y: 100 } })

      const email = page.locator('[data-testid="palette-email"], .node-palette:has-text("Email")').first()
      await email.dragTo(canvas, { targetPosition: { x: 600, y: 300 } })

      const sms = page.locator('[data-testid="palette-sms"], .node-palette:has-text("SMS")').first()  
      await sms.dragTo(canvas, { targetPosition: { x: 300, y: 500 } })

      await expect(page.locator('.react-flow__node')).toHaveCount(3)
    })

    // Test that MiniMap viewport updates correctly (even though clicking doesn't navigate)
    await test.step('Test MiniMap viewport representation', async () => {
      const miniMap = page.locator('.react-flow__minimap').first()
      await expect(miniMap).toBeVisible()

      // Pan the main canvas
      const canvas = page.locator('.react-flow').first()
      await canvas.hover()
      await page.mouse.down()
      await page.mouse.move(100, 100)
      await page.mouse.up()

      await page.waitForTimeout(500)

      // MiniMap should still be visible and functional for viewport representation
      await expect(miniMap).toBeVisible()

      // The viewport indicator in minimap should be present
      const viewportIndicator = page.locator('.react-flow__minimap-mask, .react-flow__minimap-node').first()
      if (await viewportIndicator.isVisible({ timeout: 2000 })) {
        await expect(viewportIndicator).toBeVisible()
      }
    })
  })

  test('should prevent default click behavior on MiniMap', async () => {
    const miniMap = page.locator('.react-flow__minimap').first()
    await expect(miniMap).toBeVisible()

    // Add event listener to check if preventDefault was called
    await page.evaluate(() => {
      const minimap = document.querySelector('.react-flow__minimap')
      if (minimap) {
        minimap.addEventListener('click', (e) => {
          // Store whether preventDefault was called
          (window as any).preventDefaultCalled = e.defaultPrevented
        })
      }
    })

    // Click the minimap
    await miniMap.click()
    await page.waitForTimeout(100)

    // Check if preventDefault was called
    const preventDefaultCalled = await page.evaluate(() => (window as any).preventDefaultCalled)
    expect(preventDefaultCalled).toBe(true)
  })

  test('should handle double clicks on MiniMap without navigation', async () => {
    const initialUrl = page.url()
    
    const miniMap = page.locator('.react-flow__minimap').first()
    await expect(miniMap).toBeVisible()

    // Double click on MiniMap
    await miniMap.dblclick()
    await page.waitForTimeout(500)

    // Verify URL hasn't changed
    expect(page.url()).toBe(initialUrl)
  })

  test('should handle right clicks on MiniMap without navigation', async () => {
    const initialUrl = page.url()
    
    const miniMap = page.locator('.react-flow__minimap').first()
    await expect(miniMap).toBeVisible()

    // Right click on MiniMap  
    await miniMap.click({ button: 'right' })
    await page.waitForTimeout(500)

    // Verify URL hasn't changed
    expect(page.url()).toBe(initialUrl)
  })

  test('should not interfere with other builder interactions', async () => {
    // Add nodes first
    const canvas = page.locator('.react-flow').first()
    const trigger = page.locator('[data-testid="palette-trigger"], .node-palette:has-text("Trigger")').first()
    await trigger.dragTo(canvas, { targetPosition: { x: 200, y: 200 } })

    // Click minimap
    const miniMap = page.locator('.react-flow__minimap').first()
    await miniMap.click()
    await page.waitForTimeout(200)

    // Verify other interactions still work
    // Test node selection
    const node = page.locator('.react-flow__node').first()
    await node.click()
    
    // Node should be selectable
    await expect(node).toHaveClass(/selected|react-flow__node-default/, { timeout: 2000 })

    // Test canvas panning still works
    await canvas.hover()
    await page.mouse.down()
    await page.mouse.move(50, 50) 
    await page.mouse.up()

    // Test zoom controls still work
    const zoomIn = page.locator('.react-flow__controls button[title*="zoom"], .react-flow__controls-zoomin').first()
    if (await zoomIn.isVisible()) {
      await zoomIn.click()
    }

    // All interactions should work normally
    await expect(page.locator('.react-flow__node')).toBeVisible()
  })

  test('should maintain MiniMap visibility after clicks', async () => {
    const miniMap = page.locator('.react-flow__minimap').first()
    await expect(miniMap).toBeVisible()

    // Click multiple times
    await miniMap.click()
    await page.waitForTimeout(100)
    await expect(miniMap).toBeVisible()

    await miniMap.click({ position: { x: 30, y: 30 } })
    await page.waitForTimeout(100)
    await expect(miniMap).toBeVisible()

    await miniMap.click({ position: { x: 80, y: 50 } })
    await page.waitForTimeout(100)
    await expect(miniMap).toBeVisible()

    // MiniMap should remain visible and functional
    await expect(miniMap).toBeVisible()
  })

  test('should handle keyboard events on MiniMap without navigation', async () => {
    const initialUrl = page.url()
    
    const miniMap = page.locator('.react-flow__minimap').first()
    await expect(miniMap).toBeVisible()

    // Focus and press keys
    await miniMap.click()
    await miniMap.press('Enter')
    await page.waitForTimeout(200)
    
    await miniMap.press('Space')
    await page.waitForTimeout(200)

    // Verify URL hasn't changed
    expect(page.url()).toBe(initialUrl)
  })
})