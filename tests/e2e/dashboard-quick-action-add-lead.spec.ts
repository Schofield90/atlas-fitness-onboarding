import { test, expect } from '@playwright/test'

test.describe('Dashboard Quick Actions - Add New Lead', () => {
  test('clicking Add New Lead opens create lead form', async ({ page }) => {
    await page.goto('/dashboard/overview')
    await page.waitForLoadState('networkidle')

    await page.getByTitle('Add new lead').click()

    await page.waitForURL(/.*\/leads\?action=new.*/)

    await expect(page.getByText(/Add New Lead|Create Lead/)).toBeVisible()
  })
})

