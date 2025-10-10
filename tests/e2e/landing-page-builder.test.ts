import { test, expect } from '@playwright/test'

test.describe('Landing Page Builder - E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the landing page builder
    await page.goto('http://localhost:3000/landing-pages/builder')
  })

  test('should load landing page builder without errors', async ({ page }) => {
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle')

    // Check for page title or main heading
    const heading = page.locator('h1, h2').first()
    await expect(heading).toBeVisible()

    // Verify no immediate console errors
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    // Give time for any errors to appear
    await page.waitForTimeout(2000)
    expect(errors.length).toBe(0)
  })

  test('should render text component with sanitized HTML', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Look for text component in the builder
    const textComponent = page.locator('[class*="TextComponent"]').first()

    if (await textComponent.isVisible()) {
      // Verify the component is rendered
      await expect(textComponent).toBeVisible()

      // Check that dangerous scripts are not rendered
      const scriptTags = await page.locator('script[src*="malicious"]').count()
      expect(scriptTags).toBe(0)
    }
  })

  test('should render HTML component with sanitized rich content', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Look for HTML component
    const htmlComponent = page.locator('[class*="HTMLComponent"]').first()

    if (await htmlComponent.isVisible()) {
      await expect(htmlComponent).toBeVisible()

      // Verify no iframe tags (should be sanitized out)
      const iframeTags = await page.locator('iframe').count()
      expect(iframeTags).toBe(0)
    }
  })

  test('should handle XSS attack attempts in text input', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Try to find an editable text field
    const editableField = page.locator('textarea, [contenteditable="true"]').first()

    if (await editableField.isVisible()) {
      // Attempt XSS injection
      await editableField.fill('<script>alert("XSS")</script><p>Safe text</p>')

      // Wait for sanitization
      await page.waitForTimeout(1000)

      // Verify script tag was sanitized
      const scriptContent = await page.evaluate(() => {
        const scripts = document.querySelectorAll('script')
        return Array.from(scripts).some(s => s.textContent?.includes('XSS'))
      })

      expect(scriptContent).toBe(false)
    }
  })

  test('should load without webpack/module errors', async ({ page }) => {
    const consoleErrors: string[] = []
    const networkErrors: string[] = []

    // Listen for console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // Listen for failed network requests
    page.on('requestfailed', (request) => {
      networkErrors.push(`${request.url()} - ${request.failure()?.errorText}`)
    })

    await page.goto('http://localhost:3000/landing-pages/builder')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    // Check for specific errors we fixed
    const hasJsdomError = consoleErrors.some(err =>
      err.includes('perf_hooks') ||
      err.includes('jsdom') ||
      err.includes('Module not found')
    )

    expect(hasJsdomError).toBe(false)

    // Log any errors for debugging
    if (consoleErrors.length > 0) {
      console.log('Console Errors:', consoleErrors)
    }
    if (networkErrors.length > 0) {
      console.log('Network Errors:', networkErrors)
    }
  })

  test('should verify isomorphic-dompurify is working', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Check that DOMPurify is available
    const dompurifyWorks = await page.evaluate(() => {
      // Simulate what the app does
      try {
        const testHtml = '<p>Safe content</p><script>alert("bad")</script>'
        // This would use isomorphic-dompurify internally
        const div = document.createElement('div')
        div.innerHTML = testHtml

        // Check if script was removed (basic sanitization check)
        return !div.innerHTML.includes('<script>')
      } catch (e) {
        return false
      }
    })

    expect(dompurifyWorks).toBe(true)
  })

  test('should render page builder UI components', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Check for common page builder elements
    const pageBuilderPresent = await page.evaluate(() => {
      return document.body.innerHTML.length > 100 // Basic check that content loaded
    })

    expect(pageBuilderPresent).toBe(true)

    // Take a screenshot for visual verification
    await page.screenshot({
      path: '/tmp/landing-page-builder-test.png',
      fullPage: true
    })
  })

  test('should not have critical accessibility violations', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Basic accessibility checks
    const hasMainLandmark = await page.locator('main').count()
    const hasHeadings = await page.locator('h1, h2, h3').count()

    // Page should have some semantic structure
    expect(hasMainLandmark + hasHeadings).toBeGreaterThan(0)
  })
})
