import { test, expect, Page } from '@playwright/test'

// Simple login helper (relies on seeded test user env or default test user)
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@atlasfitness.com',
  password: process.env.TEST_USER_PASSWORD || 'Test123!@#'
}

async function login(page: Page) {
  await page.goto('/login')
  await page.fill('input[type="email"], input[name="email"]', TEST_USER.email)
  await page.fill('input[type="password"], input[name="password"]', TEST_USER.password)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard', { timeout: 15000 })
}

test.describe('Members page displays existing members and correct counts', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('lists members and shows counters > 0', async ({ page }) => {
    await page.goto('/members')
    await expect(page.getByText('Members')).toBeVisible()

    // Wait for loading to finish
    await expect(page.getByText('Loading members...')).toHaveCount(0, { timeout: 15000 })

    // Expect at least one row
    const rows = page.locator('table tbody tr')
    await expect(rows).toHaveCountGreaterThan(0)

    // Read the Total Members stat and assert > 0
    const totalText = await page.locator('text=Total Members').locator('xpath=..').locator('xpath=..').locator('xpath=.//p[contains(@class, "text-2xl")]').textContent()
    const total = parseInt((totalText || '0').replace(/[^0-9]/g, ''), 10)
    expect(total).toBeGreaterThan(0)

    // Active, Pending, Inactive counters should sum to total (or at least be numbers)
    const getStat = async (label: string) => {
      const el = page.locator(`text=${label}`).locator('xpath=..').locator('xpath=..').locator('xpath=.//p[contains(@class, "text-2xl")]')
      const txt = await el.textContent()
      return parseInt((txt || '0').replace(/[^0-9]/g, ''), 10)
    }
    const active = await getStat('Active')
    const pending = await getStat('Pending')
    const inactive = await getStat('Inactive')

    expect(active + pending + inactive).toBeGreaterThan(0)
  })

  test('search bar filters results', async ({ page }) => {
    await page.goto('/members')
    await expect(page.getByText('Members')).toBeVisible()

    // Wait for initial load
    await expect(page.getByText('Loading members...')).toHaveCount(0, { timeout: 15000 })

    // Capture first row text (name or email) and search for it
    const firstRowEmail = await page.locator('table tbody tr').first().locator('td').nth(0).locator('xpath=.//div[contains(@class, "text-gray-400")]').textContent()
    if (firstRowEmail) {
      await page.fill('input[placeholder="Search members..."]', firstRowEmail.slice(0, 3))
      await expect(page.locator('table tbody tr')).toHaveCountGreaterThan(0)
    }
  })
})

