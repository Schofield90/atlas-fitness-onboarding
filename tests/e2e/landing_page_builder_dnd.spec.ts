import { test, expect } from '@playwright/test'

test.describe('Landing Page Builder: Drag and Drop', () => {
  test('drag Button from sidebar onto canvas inserts component', async ({ page, baseURL }) => {
    await page.goto(`${baseURL || ''}/landing-pages/builder`)

    // Open builder from the landing page (start from scratch card)
    const startFromScratch = page.getByRole('button', { name: /Start from Scratch/i })
    if (await startFromScratch.isVisible().catch(() => false)) {
      await startFromScratch.click()
    }

    // Ensure component library is visible
    await expect(page.getByText('Components')).toBeVisible()

    // Find Button in the palette
    const buttonPaletteItem = page.locator('[data-testid="palette-button"]').first()
    await expect(buttonPaletteItem).toBeVisible()

    // Target canvas
    const canvas = page.locator('[data-testid="builder-canvas"]').first()
    await expect(canvas).toBeVisible()

    // Drag Button to canvas
    await buttonPaletteItem.dragTo(canvas, {
      sourcePosition: { x: 10, y: 10 },
      targetPosition: { x: 200, y: 200 }
    })

    // Verify Button component appeared
    await expect(page.locator('[data-testid^="builder-component-"]').filter({ hasText: /Click Me|Button/i })).toBeVisible()
  })
})

