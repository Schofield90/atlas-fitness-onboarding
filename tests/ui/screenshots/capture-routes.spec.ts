import { test } from '@playwright/test'

const viewports = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1920, height: 1080 }
]

const routesToCapture = [
  { path: '/', name: 'landing' },
  { path: '/signin', name: 'signin' },
  { path: '/signup', name: 'signup' },
  { path: '/dashboard', name: 'dashboard' },
  { path: '/integrations/facebook', name: 'facebook-integration' },
  { path: '/booking', name: 'booking' },
  { path: '/leads', name: 'leads' }
]

test.describe('Screenshot Capture', () => {
  viewports.forEach(viewport => {
    routesToCapture.forEach(route => {
      test(`Capture ${route.name} at ${viewport.name} size`, async ({ page }) => {
        // Set viewport
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        
        // Navigate to route
        await page.goto(route.path)
        
        // Wait for content to load
        await page.waitForLoadState('networkidle')
        
        // Wait for animations to complete
        await page.waitForTimeout(500)
        
        // Take screenshot
        await page.screenshot({
          path: `test-results/${route.name}-${viewport.name}.png`,
          fullPage: true
        })
      })
    })
  })
})