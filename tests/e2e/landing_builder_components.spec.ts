import { test, expect } from '@playwright/test'

test.describe('Landing Page Builder components render', () => {
  test('should insert and render all implemented components', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/landing-pages/builder`)
    await page.waitForLoadState('networkidle')

    // Start from scratch
    const startButton = page.getByRole('button', { name: /Start from Scratch/i })
    await expect(startButton).toBeVisible({ timeout: 10000 })
    await startButton.click()

    // Wait for Components sidebar
    await expect(page.locator('text=Components')).toBeVisible({ timeout: 10000 })

    const items: Array<{ label: string; type: string }> = [
      { label: 'Testimonials', type: 'testimonials' },
      { label: 'Pricing', type: 'pricing' },
      { label: 'FAQ', type: 'faq' },
      { label: 'Countdown', type: 'countdown' },
      { label: 'Video', type: 'video' },
      { label: 'Social Icons', type: 'social' },
      { label: 'Custom HTML', type: 'html' },
      { label: 'Footer', type: 'footer' },
      { label: 'Columns', type: 'columns' }
    ]

    for (const item of items) {
      const button = page.getByRole('button', { name: item.label })
      await expect(button).toBeVisible()
      await button.click()
      // Ensure placeholder is not shown for this type
      await expect(page.locator(`text=Component type "${item.type}" not implemented`).first()).toHaveCount(0)
    }
  })
})

