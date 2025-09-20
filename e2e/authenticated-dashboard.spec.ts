import { test, expect } from "@playwright/test";

// Owner portal tests
test.describe("Owner Dashboard", () => {
  // This test will run with owner auth automatically
  test.use({ project: "owner" });

  test("should access dashboard as authenticated owner", async ({ page }) => {
    // Navigate to dashboard - should already be authenticated
    await page.goto("/dashboard");

    // Should not redirect to login
    await expect(page).not.toHaveURL(/.*owner-login/);

    // Should see dashboard content
    await expect(page.locator("h1").first()).toContainText(/dashboard/i);
  });

  test("should access class calendar", async ({ page }) => {
    await page.goto("/class-calendar");

    // Should see calendar content
    await expect(page.locator("h1").first()).toContainText(/class calendar/i);

    // Should be able to interact with calendar
    const addButton = page.locator('button:has-text("Add Class")');
    await expect(addButton).toBeVisible();
  });
});

// Admin portal tests
test.describe("Admin Dashboard", () => {
  // This test will run with admin auth automatically
  test.use({ project: "admin" });

  test("should access admin dashboard", async ({ page }) => {
    await page.goto("/dashboard");

    // Should be in admin context
    await expect(page).toHaveURL(/admin\.localhost/);

    // Should have admin privileges
    // Add specific admin-only element checks here
  });
});

// Member portal tests
test.describe("Member Portal", () => {
  // This test will run with member auth automatically
  test.use({ project: "member" });

  test("should access member dashboard", async ({ page }) => {
    await page.goto("/dashboard");

    // Should be in member context
    await expect(page).toHaveURL(/members\.localhost/);

    // Should see member-specific content
    // Add specific member-only element checks here
  });
});
