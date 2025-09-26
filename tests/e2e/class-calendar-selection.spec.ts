import { test, expect } from '@playwright/test';

test.describe('Class Calendar selection shows details', () => {
  test('clicking a class updates the details panel', async ({ page }) => {
    await page.goto('/dashboard/class-calendar?test=1');

    // Wait for calendar to load and any class blocks to appear
    const classBlock = page.locator('[data-testid^="class-block-"]').first();
    await classBlock.waitFor({ state: 'visible', timeout: 20000 });

    // Verify side panel initially shows no selection
    const panel = page.locator('[data-testid="selected-class-panel"]').first();
    await expect(panel).toContainText('No Class Selected');

    // Click a class
    await classBlock.click();

    // Details should now show a title
    const title = page.locator('[data-testid="selected-class-title"]');
    await expect(title).toBeVisible({ timeout: 10000 });
  });
});

