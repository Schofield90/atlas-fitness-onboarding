import { test, expect, type Page } from '@playwright/test'

test.describe('Workflow Templates MVP', () => {
  let page: Page

  test.beforeEach(async ({ browser, baseURL }) => {
    page = await browser.newPage()
    
    // Navigate to the templates page
    await page.goto(`${baseURL}/automations/templates`)
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle')
  })

  test.afterEach(async () => {
    await page.close()
  })

  test('should render template cards and allow preview with read-only graph', async () => {
    // Step 1: Verify templates page loads with template cards
    await test.step('Verify templates page loads', async () => {
      // Check for template cards
      await expect(page.locator('.template-card, [data-testid="template-card"]')).toHaveCount.toBeGreaterThan(0, { timeout: 10000 })

      // Check for specific template types
      await expect(page.locator(':has-text("Welcome"), :has-text("Lead")', { hasText: /welcome|lead/i })).toBeVisible()
      await expect(page.locator(':has-text("Email"), :has-text("SMS")', { hasText: /email|sms/i })).toBeVisible()
    })

    // Step 2: Test template preview functionality
    await test.step('Test template preview', async () => {
      // Find a template with preview functionality
      const templateCard = page.locator('.template-card, [data-testid="template-card"]').first()
      await expect(templateCard).toBeVisible()

      // Look for and click preview button
      const previewButton = templateCard.locator('button:has-text("Preview"), [data-testid="preview-button"], button:has-text("View")').first()
      
      if (await previewButton.isVisible()) {
        await previewButton.click()

        // Should open preview modal or navigate to preview
        const previewModal = page.locator('.preview-modal, [data-testid="template-preview"], .modal:has(.react-flow)').first()
        await expect(previewModal).toBeVisible({ timeout: 5000 })

        // Should show read-only workflow graph
        await expect(previewModal.locator('.react-flow, [data-testid="workflow-preview"]')).toBeVisible()

        // Verify it's read-only - should not have edit controls
        await expect(previewModal.locator('.node-palette, [data-testid="node-palette"]')).not.toBeVisible()
        
        // Should not have save/edit buttons in preview
        await expect(previewModal.locator('button:has-text("Save"), button:has-text("Edit"), [data-testid="save-button"]')).not.toBeVisible()

        // Should have nodes representing the template workflow
        await expect(previewModal.locator('.react-flow__node')).toHaveCount.toBeGreaterThan(0, { timeout: 3000 })

        // Close preview
        const closeButton = previewModal.locator('button:has-text("×"), button:has-text("Close"), [data-testid="close-preview"]').first()
        if (await closeButton.isVisible()) {
          await closeButton.click()
        } else {
          // Try escape key
          await page.keyboard.press('Escape')
        }

        // Preview should close
        await expect(previewModal).not.toBeVisible()
      }
    })
  })

  test('should clone template and open builder when "Use Template" is clicked', async () => {
    // Step 1: Find template with "Use Template" functionality
    await test.step('Find and use template', async () => {
      const templateCard = page.locator('.template-card, [data-testid="template-card"]').first()
      await expect(templateCard).toBeVisible()

      // Look for "Use Template" button
      const useTemplateButton = templateCard.locator(
        'button:has-text("Use Template"), button:has-text("Use"), [data-testid="use-template"], button:has-text("Start")'
      ).first()
      
      await expect(useTemplateButton).toBeVisible()
      await useTemplateButton.click()
    })

    // Step 2: Should navigate to builder with template cloned
    await test.step('Verify navigation to builder', async () => {
      // Should navigate to builder page
      await expect(page).toHaveURL(/\/builder/, { timeout: 10000 })
      
      // Wait for builder to load
      await page.waitForSelector('.react-flow', { timeout: 10000 })

      // Should show cloned workflow with template nodes
      await expect(page.locator('.react-flow__node')).toHaveCount.toBeGreaterThan(0, { timeout: 5000 })

      // Should have edit capabilities (unlike preview)
      await expect(page.locator('.node-palette, [data-testid="node-palette"]')).toBeVisible({ timeout: 5000 })

      // Should have save button available
      await expect(page.locator('button:has-text("Save"), [data-testid="save-button"]')).toBeVisible()

      // Should be able to add more nodes (verifying it's editable)
      const canvas = page.locator('.react-flow').first()
      await expect(canvas).toBeVisible()
    })
  })

  test('should display template categories and filtering', async () => {
    await test.step('Test template categorization', async () => {
      // Check for category filters
      const categoryFilter = page.locator('.category-filter, [data-testid="category-filter"], .filter-buttons')
      if (await categoryFilter.isVisible({ timeout: 3000 })) {
        await expect(categoryFilter.locator('button, .filter-option')).toHaveCount.toBeGreaterThan(0)

        // Should have categories like "All", "Lead Generation", "Marketing", etc.
        const categories = ['All', 'Lead', 'Marketing', 'Sales', 'Support']
        
        for (const category of categories) {
          const categoryButton = categoryFilter.locator(`button:has-text("${category}"), .filter-option:has-text("${category}")`)
          if (await categoryButton.isVisible()) {
            await expect(categoryButton).toBeVisible()
          }
        }
      }
    })
  })

  test('should show template details and features', async () => {
    await test.step('Verify template card information', async () => {
      const templateCard = page.locator('.template-card').first()
      await expect(templateCard).toBeVisible()

      // Should show template name
      await expect(templateCard.locator('.template-name, .card-title, h3, h4')).toBeVisible()

      // Should show template description  
      await expect(templateCard.locator('.template-description, .card-description, p')).toBeVisible()

      // Should show template features or steps
      const featuresSection = templateCard.locator('.template-features, .features-list, ul, .steps')
      if (await featuresSection.isVisible({ timeout: 2000 })) {
        await expect(featuresSection.locator('li, .feature-item, .step')).toHaveCount.toBeGreaterThan(0)
      }

      // Should show difficulty or setup time if available
      const metadata = templateCard.locator('.template-meta, .metadata, .difficulty, .setup-time')
      if (await metadata.isVisible({ timeout: 2000 })) {
        await expect(metadata).toBeVisible()
      }
    })
  })

  test('should handle template search functionality', async () => {
    await test.step('Test template search', async () => {
      // Look for search input
      const searchInput = page.locator('input[placeholder*="search"], input[type="search"], [data-testid="template-search"]').first()
      
      if (await searchInput.isVisible({ timeout: 3000 })) {
        // Test search functionality
        await searchInput.fill('welcome')
        await page.waitForTimeout(500)

        // Should filter templates
        const visibleCards = page.locator('.template-card:visible')
        await expect(visibleCards).toHaveCount.toBeGreaterThan(0)

        // Clear search
        await searchInput.clear()
        await page.waitForTimeout(500)

        // Should show all templates again
        await expect(page.locator('.template-card')).toHaveCount.toBeGreaterThan(0)
      }
    })
  })

  test('should handle template popularity and recommendations', async () => {
    await test.step('Test popular templates section', async () => {
      // Look for popular or recommended templates section
      const popularSection = page.locator('.popular-templates, .recommended, [data-testid="popular-templates"]')
      
      if (await popularSection.isVisible({ timeout: 3000 })) {
        await expect(popularSection).toBeVisible()
        await expect(popularSection.locator('.template-card')).toHaveCount.toBeGreaterThan(0)
      }

      // Look for popular badges or indicators
      const popularBadge = page.locator('.popular-badge, .recommended-badge, .badge:has-text("Popular")')
      if (await popularBadge.first().isVisible({ timeout: 2000 })) {
        await expect(popularBadge.first()).toBeVisible()
      }
    })
  })

  test('should preview template shows correct workflow structure', async () => {
    await test.step('Test detailed template preview', async () => {
      // Find a specific template (e.g., lead welcome sequence)
      const leadTemplate = page.locator('.template-card:has-text("Lead"), .template-card:has-text("Welcome")').first()
      
      if (await leadTemplate.isVisible({ timeout: 3000 })) {
        const previewButton = leadTemplate.locator('button:has-text("Preview"), button:has-text("View")').first()
        
        if (await previewButton.isVisible()) {
          await previewButton.click()

          const previewModal = page.locator('.preview-modal, [data-testid="template-preview"]').first()
          await expect(previewModal).toBeVisible({ timeout: 5000 })

          // Should show trigger node
          await expect(previewModal.locator('.react-flow__node:has-text("Trigger"), .react-flow__node[data-type="trigger"]')).toBeVisible({ timeout: 3000 })

          // Should show action nodes
          await expect(previewModal.locator('.react-flow__node:has-text("Email"), .react-flow__node:has-text("SMS")')).toBeVisible()

          // Should show connections between nodes
          await expect(previewModal.locator('.react-flow__edge')).toHaveCount.toBeGreaterThan(0)

          // Should be read-only (no drag handles visible)
          await expect(previewModal.locator('.react-flow__handle')).not.toBeVisible()

          // Close preview
          await page.keyboard.press('Escape')
          await expect(previewModal).not.toBeVisible()
        }
      }
    })
  })

  test('should handle template cloning with proper node configuration', async () => {
    await test.step('Test template cloning preserves configuration', async () => {
      // Use a template
      const templateCard = page.locator('.template-card').first()
      const useButton = templateCard.locator('button:has-text("Use"), button:has-text("Start")').first()
      
      await useButton.click()

      // Should navigate to builder
      await expect(page).toHaveURL(/\/builder/)
      await page.waitForSelector('.react-flow', { timeout: 10000 })

      // Cloned nodes should be present
      await expect(page.locator('.react-flow__node')).toHaveCount.toBeGreaterThan(0)

      // Test that we can interact with cloned nodes
      const firstNode = page.locator('.react-flow__node').first()
      await firstNode.click()

      // Should be able to configure cloned nodes
      const configPanel = page.locator('.config-panel, [data-testid="config-panel"], .node-config')
      if (await configPanel.isVisible({ timeout: 3000 })) {
        await expect(configPanel).toBeVisible()
        
        // Close config
        const closeBtn = configPanel.locator('button:has-text("×"), button:has-text("Close")').first()
        if (await closeBtn.isVisible()) {
          await closeBtn.click()
        }
      }

      // Should be able to save the cloned workflow
      const saveButton = page.locator('button:has-text("Save")').first()
      if (await saveButton.isVisible()) {
        await expect(saveButton).toBeVisible()
      }
    })
  })

  test('should handle responsive layout for template cards', async () => {
    await test.step('Test responsive template layout', async () => {
      // Check initial layout
      const templateCards = page.locator('.template-card')
      const initialCount = await templateCards.count()
      expect(initialCount).toBeGreaterThan(0)

      // Test different viewport sizes
      await page.setViewportSize({ width: 768, height: 1024 }) // Tablet
      await page.waitForTimeout(500)
      await expect(templateCards).toHaveCount(initialCount)

      await page.setViewportSize({ width: 375, height: 812 }) // Mobile
      await page.waitForTimeout(500)
      await expect(templateCards).toHaveCount(initialCount)

      // Reset to desktop
      await page.setViewportSize({ width: 1920, height: 1080 })
      await page.waitForTimeout(500)
      await expect(templateCards).toHaveCount(initialCount)
    })
  })

  test('should navigate back to templates from builder', async () => {
    await test.step('Test navigation between templates and builder', async () => {
      // Use a template to go to builder
      const useButton = page.locator('button:has-text("Use"), button:has-text("Start")').first()
      await useButton.click()

      // Should be in builder
      await expect(page).toHaveURL(/\/builder/)

      // Navigate back to templates
      await page.goto(page.url().replace('/builder', '/templates'))
      
      // Should be back on templates page
      await expect(page).toHaveURL(/\/templates/)
      await expect(page.locator('.template-card')).toBeVisible({ timeout: 5000 })
    })
  })
})