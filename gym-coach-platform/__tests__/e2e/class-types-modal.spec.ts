import { test, expect } from '@playwright/test'

test.describe.skip('Class Types modal', () => {
  test('pressing Escape closes the New Class Type modal', async ({ page }) => {
    // Navigate to Class Types page
    await page.goto('/class-types')

    // Open modal
    await page.getByRole('button', { name: /new class type/i }).click()

    // Ensure modal is visible
    await expect(page.getByRole('dialog')).toBeVisible()

    // Press Escape
    await page.keyboard.press('Escape')

    // Modal should disappear
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 5000 })
  })
})

