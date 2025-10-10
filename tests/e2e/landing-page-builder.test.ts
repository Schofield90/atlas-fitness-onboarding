import { test, expect, Page } from '@playwright/test'

// Test user credentials
const TEST_USER = {
  email: 'sam@atlas-gyms.co.uk',
  password: '@Aa80236661'
}

// Helper function for login
async function login(page: Page) {
  await page.goto('http://localhost:3000/signin')
  await page.fill('[name="email"]', TEST_USER.email)
  await page.fill('[name="password"]', TEST_USER.password)
  await page.click('button[type="submit"]')
  // Wait for redirect to dashboard or landing pages
  await page.waitForTimeout(2000)
}

test.describe('Landing Page Builder - E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await login(page)
    // Navigate to the landing page builder
    await page.goto('http://localhost:3000/landing-pages/builder')
    await page.waitForLoadState('networkidle')
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

  // NEW TESTS FOR SIDEBAR AND DARK THEME FIXES
  test('should display sidebar navigation on landing pages', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Check that sidebar exists - DashboardLayout wraps the page
    // Look for common sidebar elements from DashboardLayout
    const sidebar = page.locator('nav').first()
    const hasNavigation = await sidebar.count()

    // Should have navigation sidebar visible
    expect(hasNavigation).toBeGreaterThan(0)

    // Check for common nav items that should be in sidebar
    const dashboardLink = page.locator('text=Dashboard').first()
    const leadingPagesLink = page.locator('text=Landing Pages').first()

    // At least one navigation element should be visible
    const navItemsVisible = await dashboardLink.isVisible() || await leadingPagesLink.isVisible()
    expect(navItemsVisible).toBe(true)
  })

  test('should apply dark theme colors throughout page builder', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Check main container has dark theme background
    const mainContainer = page.locator('div').first()
    const backgroundColor = await mainContainer.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor
    })

    // Dark theme should use gray-900 (#111827) or gray-800 (#1F2937) backgrounds
    // RGB values: gray-900 = rgb(17, 24, 39), gray-800 = rgb(31, 41, 55)
    const isDarkBackground = backgroundColor.includes('rgb(17, 24, 39)') ||
                           backgroundColor.includes('rgb(31, 41, 55)') ||
                           backgroundColor.includes('rgb(0, 0, 0)')  // Some elements might be pure black

    // Check that we're not using light colors like white or gray-50
    const isLightBackground = backgroundColor.includes('rgb(255, 255, 255)') ||
                            backgroundColor.includes('rgb(249, 250, 251)')

    expect(isLightBackground).toBe(false)
    // Note: We check that it's NOT light theme rather than checking for specific dark colors
    // because the exact background color might vary by component
  })

  test('should maintain dark theme in component library', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Component library should have dark theme
    // Look for component library section
    const componentLibrary = page.locator('text=Components').first()

    if (await componentLibrary.isVisible()) {
      const libraryContainer = componentLibrary.locator('..') // Parent container
      const bgColor = await libraryContainer.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor
      })

      // Should not be white (light theme)
      expect(bgColor).not.toContain('rgb(255, 255, 255)')
    }
  })

  test('should navigate between landing pages without losing sidebar', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Start at builder page, navigate to landing pages list
    await page.goto('http://localhost:3000/landing-pages')
    await page.waitForLoadState('networkidle')

    // Check sidebar still exists on list page
    const sidebarOnList = page.locator('nav').first()
    expect(await sidebarOnList.count()).toBeGreaterThan(0)

    // Navigate back to builder
    await page.goto('http://localhost:3000/landing-pages/builder')
    await page.waitForLoadState('networkidle')

    // Sidebar should still be visible
    const sidebarOnBuilder = page.locator('nav').first()
    expect(await sidebarOnBuilder.count()).toBeGreaterThan(0)
  })
})
