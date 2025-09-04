import { test, expect } from '@playwright/test'

test.describe('Recurring Classes flow', () => {
  test('Dashboard → Recurring Classes shows list or empty state without alerts', async ({ page }) => {
    await page.goto('/dashboard')

    // Click on Recurring Classes card
    await page.getByRole('button', { name: /Recurring Classes/i }).click()

    // Wait for navigation
    await page.waitForURL('**/classes/recurring')

    // Ensure no alert dialog appears
    const dialogPromise = new Promise((_resolve, reject) => {
      page.on('dialog', () => reject(new Error('Unexpected alert dialog appeared')))
    })

    // Expect either empty state headline or some class cards
    const emptyState = page.getByText(/No class types yet/i)
    const manageButtons = page.getByRole('button', { name: /Manage Recurring/i })

    const emptyVisible = await emptyState.isVisible().catch(() => false)
    const hasManageButtons = await manageButtons.count()

    expect(emptyVisible || hasManageButtons > 0).toBeTruthy()

    // Resolve dialogPromise safely
    await Promise.race([
      dialogPromise,
      page.waitForTimeout(500) // brief wait to ensure no dialogs
    ])
  })
})

