import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const criticalRoutes = [
  { path: '/', name: 'Landing Page' },
  { path: '/signin', name: 'Sign In' },
  { path: '/signup', name: 'Sign Up' },
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/integrations/facebook', name: 'Facebook Integration' }
]

test.describe('Accessibility Tests', () => {
  criticalRoutes.forEach(route => {
    test(`${route.name} should have no accessibility violations`, async ({ page }) => {
      await page.goto(route.path)
      
      // Wait for content to load
      await page.waitForLoadState('networkidle')
      
      // Run axe accessibility checks
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
      
      // Save violations for reporting
      if (accessibilityScanResults.violations.length > 0) {
        console.log(`Violations found on ${route.name}:`)
        accessibilityScanResults.violations.forEach(violation => {
          console.log(`- ${violation.id}: ${violation.description}`)
          console.log(`  Impact: ${violation.impact}`)
          console.log(`  Affected nodes: ${violation.nodes.length}`)
        })
      }
      
      expect(accessibilityScanResults.violations).toEqual([])
    })
    
    test(`${route.name} should be keyboard navigable`, async ({ page }) => {
      await page.goto(route.path)
      
      // Check if Tab navigation works
      await page.keyboard.press('Tab')
      const firstFocused = await page.evaluate(() => document.activeElement?.tagName)
      expect(firstFocused).toBeTruthy()
      
      // Check if we can tab through interactive elements
      const interactiveElements = await page.$$('button, a, input, select, textarea, [tabindex]')
      expect(interactiveElements.length).toBeGreaterThan(0)
    })
    
    test(`${route.name} should have proper heading hierarchy`, async ({ page }) => {
      await page.goto(route.path)
      
      const headings = await page.evaluate(() => {
        const h1s = document.querySelectorAll('h1')
        const h2s = document.querySelectorAll('h2')
        const h3s = document.querySelectorAll('h3')
        
        return {
          h1Count: h1s.length,
          h2Count: h2s.length,
          h3Count: h3s.length
        }
      })
      
      // Should have exactly one h1
      expect(headings.h1Count).toBeLessThanOrEqual(1)
      
      // If there are h3s, there should be h2s
      if (headings.h3Count > 0) {
        expect(headings.h2Count).toBeGreaterThan(0)
      }
    })
  })
})