import { test, expect } from "@playwright/test";

test("Admin portal login flow", async ({ page }) => {
  // Navigate to admin portal
  await page.goto("https://admin.gymleadhub.co.uk");

  // Should redirect to signin
  await expect(page).toHaveURL(/signin/);

  // Fill in login credentials
  await page.fill(
    'input[type="email"]',
    process.env.TEST_ADMIN_EMAIL || "sam@gymleadhub.co.uk",
  );
  await page.fill(
    'input[type="password"]',
    process.env.TEST_ADMIN_PASSWORD || "@Aa80236661",
  );

  // Click login button
  await page.click('button[type="submit"]');

  // Wait for redirect
  await page.waitForURL(/admin/, { timeout: 10000 });

  // Should be on admin dashboard
  await expect(page).toHaveURL(/\/admin/);

  // Should see admin portal header
  await expect(page.locator("text=Admin Portal")).toBeVisible();

  // Should see logged in email in header
  await expect(
    page.locator("text=Logged in as: sam@gymleadhub.co.uk"),
  ).toBeVisible();
});
