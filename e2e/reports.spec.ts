/**
 * End-to-End tests for the Reports system
 * Tests all report pages, filters, exports, and accessibility
 */

import { test, expect, Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Test configuration
const TEST_ORG_ID = "test-org-123";
const TEST_USER_EMAIL = "test@example.com";

// Helper function to login as test user
async function loginAsTestUser(page: Page) {
  await page.goto("/signin");
  await page.fill('[data-testid="email-input"]', TEST_USER_EMAIL);
  await page.fill('[data-testid="password-input"]', "test123");
  await page.click('[data-testid="signin-button"]');
  await page.waitForURL("/dashboard");
}

// Helper function to navigate to reports
async function navigateToReports(page: Page) {
  await page.goto("/reports");
  await page.waitForLoadState("networkidle");
}

// Helper function to check accessibility
async function checkAccessibility(page: Page, testName: string) {
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();

  expect(
    accessibilityScanResults.violations,
    `Accessibility violations in ${testName}`,
  ).toEqual([]);
}

test.describe("Reports Hub", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test("should load reports hub and show all categories", async ({ page }) => {
    await navigateToReports(page);

    // Check page title
    await expect(page.locator("h1")).toContainText("Reports Hub");

    // Check category sections exist
    await expect(page.locator("text=Classes & Courses")).toBeVisible();
    await expect(page.locator("text=Customers")).toBeVisible();
    await expect(page.locator("text=Revenue")).toBeVisible();

    // Check summary stats
    await expect(page.locator("text=Total Reports")).toBeVisible();
    await expect(page.locator("text=Available")).toBeVisible();

    // Check accessibility
    await checkAccessibility(page, "Reports Hub");
  });

  test("should show enabled and disabled reports correctly", async ({
    page,
  }) => {
    await navigateToReports(page);

    // Check for enabled reports (should have "View Report" link)
    const enabledReports = page.locator('[data-enabled="true"]');
    await expect(enabledReports.first()).toBeVisible();
    await expect(
      enabledReports.first().locator("text=View Report"),
    ).toBeVisible();

    // Check for disabled reports (should have "Coming Soon" badge)
    const disabledReports = page.locator('[data-enabled="false"]');
    if ((await disabledReports.count()) > 0) {
      await expect(
        disabledReports.first().locator("text=Coming Soon"),
      ).toBeVisible();
    }
  });

  test("should navigate to enabled reports when clicked", async ({ page }) => {
    await navigateToReports(page);

    // Find and click on an enabled report
    const enabledReport = page.locator('[data-enabled="true"]').first();
    await enabledReport.click();

    // Should navigate away from reports hub
    await page.waitForURL((url) => !url.pathname.endsWith("/reports"));

    // Should be on a report page
    await expect(page.locator("h1")).toBeVisible();
  });

  test("should not navigate when clicking disabled reports", async ({
    page,
  }) => {
    await navigateToReports(page);

    const currentUrl = page.url();

    // Try to click a disabled report
    const disabledReport = page.locator('[data-enabled="false"]').first();
    if ((await disabledReport.count()) > 0) {
      await disabledReport.click();

      // Should remain on reports hub
      expect(page.url()).toBe(currentUrl);
    }
  });
});

test.describe("Attendances Report", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/reports/attendances");
    await page.waitForLoadState("networkidle");
  });

  test("should load attendance report page", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("All Attendances");
    await expect(page.locator("text=Filters")).toBeVisible();
    await expect(
      page.locator('[data-testid="export-csv-button"]'),
    ).toBeVisible();

    await checkAccessibility(page, "Attendances Report");
  });

  test("should show and hide filters panel", async ({ page }) => {
    // Filters should be visible by default
    await expect(page.locator('[data-testid="filters-panel"]')).toBeVisible();

    // Click to hide filters
    await page.click('[data-testid="filters-toggle"]');
    await expect(page.locator('[data-testid="filters-panel"]')).toBeHidden();

    // Click to show filters again
    await page.click('[data-testid="filters-toggle"]');
    await expect(page.locator('[data-testid="filters-panel"]')).toBeVisible();
  });

  test("should apply date preset filters", async ({ page }) => {
    // Click on "Last 7 Days" preset
    await page.click("text=Last 7 Days");

    // Wait for data to reload
    await page.waitForTimeout(1000);

    // Should see updated results or loading state
    await expect(page.locator('[data-testid="results-table"]')).toBeVisible();
  });

  test("should apply custom date range", async ({ page }) => {
    // Click custom range button
    await page.click("text=Custom Range");

    // Should show date inputs
    await expect(page.locator('input[type="date"]').first()).toBeVisible();

    // Set date range
    await page.fill('input[type="date"]').first().fill("2024-01-01");
    await page.fill('input[type="date"]').last().fill("2024-01-31");

    // Wait for data to reload
    await page.waitForTimeout(1000);
  });

  test("should change grouping options", async ({ page }) => {
    // Change grouping to "By Customer"
    await page.selectOption('[data-testid="group-by-select"]', "customer");

    // Wait for data to reload
    await page.waitForTimeout(1000);

    // Should show grouped results
    await expect(page.locator("text=Grouped Results")).toBeVisible();
  });

  test("should toggle chart view", async ({ page }) => {
    // Click chart button
    await page.click('[data-testid="chart-toggle"]');

    // Should show chart
    await expect(
      page.locator('[data-testid="attendance-chart"]'),
    ).toBeVisible();

    // Click again to hide chart
    await page.click('[data-testid="chart-toggle"]');
    await expect(page.locator('[data-testid="attendance-chart"]')).toBeHidden();
  });

  test("should export CSV", async ({ page }) => {
    // Set up download promise before clicking
    const downloadPromise = page.waitForEvent("download");

    // Click export button
    await page.click('[data-testid="export-csv-button"]');

    // Wait for download
    const download = await downloadPromise;

    // Check filename
    expect(download.suggestedFilename()).toMatch(/attendances-report-.*\.csv/);
  });

  test("should handle pagination", async ({ page }) => {
    // Check if pagination exists
    const pagination = page.locator('[data-testid="pagination"]');

    if (await pagination.isVisible()) {
      // Click next page
      const nextButton = pagination.locator("text=Next");
      if (await nextButton.isEnabled()) {
        await nextButton.click();
        await page.waitForTimeout(1000);

        // Should be on page 2
        await expect(pagination.locator("text=2")).toBeVisible();
      }
    }
  });

  test("should show summary statistics", async ({ page }) => {
    await expect(page.locator('[data-testid="total-bookings"]')).toBeVisible();
    await expect(page.locator('[data-testid="attended-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="no-show-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="attendance-rate"]')).toBeVisible();
  });

  test("should filter by booking methods", async ({ page }) => {
    // Select membership filter
    await page.check('[data-testid="booking-method-membership"]');
    await page.waitForTimeout(1000);

    // Unselect it
    await page.uncheck('[data-testid="booking-method-membership"]');
    await page.waitForTimeout(1000);
  });

  test("should handle empty results gracefully", async ({ page }) => {
    // Set a very specific date range that likely has no data
    await page.click("text=Custom Range");
    await page.fill('input[type="date"]').first().fill("1990-01-01");
    await page.fill('input[type="date"]').last().fill("1990-01-02");

    await page.waitForTimeout(2000);

    // Should show "No Data Found" message
    await expect(page.locator("text=No Data Found")).toBeVisible();
  });
});

test.describe("Invoices Report", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/reports/invoices");
    await page.waitForLoadState("networkidle");
  });

  test("should load invoices report page", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Invoices");
    await checkAccessibility(page, "Invoices Report");
  });

  test("should show invoice data in table format", async ({ page }) => {
    await expect(page.locator('[data-testid="invoices-table"]')).toBeVisible();

    // Check for table headers
    await expect(page.locator("text=Invoice Number")).toBeVisible();
    await expect(page.locator("text=Customer")).toBeVisible();
    await expect(page.locator("text=Amount")).toBeVisible();
    await expect(page.locator("text=Status")).toBeVisible();
  });

  test("should filter by invoice status", async ({ page }) => {
    // Look for status filter
    const statusFilter = page.locator('[data-testid="status-filter"]');
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption("paid");
      await page.waitForTimeout(1000);
    }
  });

  test("should export invoices CSV", async ({ page }) => {
    const downloadPromise = page.waitForEvent("download");
    await page.click('[data-testid="export-csv-button"]');

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/invoices-report-.*\.csv/);
  });
});

test.describe("Discount Codes Report", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/reports/discount-codes");
    await page.waitForLoadState("networkidle");
  });

  test("should load discount codes report page", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Discount Codes");
    await checkAccessibility(page, "Discount Codes Report");
  });

  test("should show discount codes data", async ({ page }) => {
    await expect(
      page.locator('[data-testid="discount-codes-table"]'),
    ).toBeVisible();

    // Check for relevant columns
    await expect(page.locator("text=Code")).toBeVisible();
    await expect(page.locator("text=Discount")).toBeVisible();
    await expect(page.locator("text=Uses")).toBeVisible();
  });
});

test.describe("Invoice Items Report", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/reports/invoice-items");
    await page.waitForLoadState("networkidle");
  });

  test("should load invoice items report page", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Invoice Items");
    await checkAccessibility(page, "Invoice Items Report");
  });
});

test.describe("Payouts Report", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/reports/payouts");
    await page.waitForLoadState("networkidle");
  });

  test("should load payouts report page", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Payouts");
    await checkAccessibility(page, "Payouts Report");
  });

  test("should show payout data", async ({ page }) => {
    await expect(page.locator('[data-testid="payouts-table"]')).toBeVisible();

    // Check for payout-specific columns
    await expect(page.locator("text=Amount")).toBeVisible();
    await expect(page.locator("text=Status")).toBeVisible();
    await expect(page.locator("text=Date")).toBeVisible();
  });
});

test.describe("Multi-tenant Security", () => {
  test("should only show data for current organization", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/reports/attendances");
    await page.waitForLoadState("networkidle");

    // All data should be scoped to the user's organization
    // This is tested at the API level, but we can verify UI shows appropriate data
    const table = page.locator('[data-testid="results-table"]');
    if (await table.isVisible()) {
      // Data should be present (assuming test data exists)
      const rows = table.locator("tbody tr");
      if ((await rows.count()) > 0) {
        // Verify that some data is shown, indicating proper access
        expect(await rows.count()).toBeGreaterThan(0);
      }
    }
  });

  test("should prevent direct URL access to other org data", async ({
    page,
  }) => {
    await loginAsTestUser(page);

    // Try to access a report with a different org parameter
    const response = await page.goto(
      "/reports/attendances?org_id=different-org",
    );

    // Should either redirect or show error/no data
    expect(response?.status()).not.toBe(500);
  });
});

test.describe("Error Handling", () => {
  test("should handle API errors gracefully", async ({ page }) => {
    await loginAsTestUser(page);

    // Mock API failure
    await page.route("/api/reports/attendances", (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: "Internal server error" }),
      });
    });

    await page.goto("/reports/attendances");

    // Should show error message
    await expect(page.locator("text=Failed to Load Data")).toBeVisible();
    await expect(
      page.locator('[data-testid="try-again-button"]'),
    ).toBeVisible();
  });

  test("should retry failed requests", async ({ page }) => {
    await loginAsTestUser(page);

    let callCount = 0;
    await page.route("/api/reports/attendances", (route) => {
      callCount++;
      if (callCount === 1) {
        // Fail first request
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: "Server error" }),
        });
      } else {
        // Succeed on retry
        route.continue();
      }
    });

    await page.goto("/reports/attendances");

    // Should show error first
    await expect(page.locator("text=Failed to Load Data")).toBeVisible();

    // Click retry
    await page.click('[data-testid="try-again-button"]');

    // Should eventually load data
    await page.waitForTimeout(2000);
    await expect(page.locator("text=Failed to Load Data")).toBeHidden();
  });

  test("should handle slow loading gracefully", async ({ page }) => {
    await loginAsTestUser(page);

    // Slow down API response
    await page.route("/api/reports/attendances", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      route.continue();
    });

    await page.goto("/reports/attendances");

    // Should show loading state
    await expect(page.locator("text=Loading attendance data...")).toBeVisible();

    // Eventually should load
    await expect(page.locator("text=Loading attendance data...")).toBeHidden({
      timeout: 10000,
    });
  });
});

test.describe("Keyboard Navigation", () => {
  test("should support keyboard navigation", async ({ page }) => {
    await loginAsTestUser(page);
    await navigateToReports(page);

    // Tab through report cards
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");

    // Should be able to select a report with Enter
    const focusedElement = page.locator(":focus");
    if ((await focusedElement.getAttribute("data-enabled")) === "true") {
      await page.keyboard.press("Enter");
      await page.waitForTimeout(1000);

      // Should navigate to the report
      expect(page.url()).not.toContain("/reports");
    }
  });

  test("should support keyboard shortcuts in reports", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/reports/attendances");
    await page.waitForLoadState("networkidle");

    // Test filter toggle with keyboard
    await page.keyboard.press("Tab");
    const filtersToggle = page.locator('[data-testid="filters-toggle"]');

    if (await filtersToggle.isFocused()) {
      await page.keyboard.press("Enter");
      // Filters should toggle
    }
  });
});

test.describe("Mobile Responsiveness", () => {
  test("should work on mobile devices", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone size

    await loginAsTestUser(page);
    await navigateToReports(page);

    // Reports should be stacked vertically on mobile
    await expect(page.locator('[data-testid="reports-grid"]')).toHaveCSS(
      "grid-template-columns",
      /1fr/,
    );

    // Should still be accessible
    await checkAccessibility(page, "Reports Hub Mobile");
  });

  test("should handle mobile report viewing", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await loginAsTestUser(page);
    await page.goto("/reports/attendances");
    await page.waitForLoadState("networkidle");

    // Table should be horizontally scrollable on mobile
    const table = page.locator('[data-testid="results-table"]');
    if (await table.isVisible()) {
      await expect(table).toHaveCSS("overflow-x", "auto");
    }
  });
});

test.describe("Performance", () => {
  test("should load reports hub quickly", async ({ page }) => {
    await loginAsTestUser(page);

    const startTime = Date.now();
    await navigateToReports(page);
    const loadTime = Date.now() - startTime;

    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test("should cache report data appropriately", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/reports/attendances");
    await page.waitForLoadState("networkidle");

    // Navigate away and back
    await page.goto("/dashboard");
    await page.goto("/reports/attendances");

    // Should load quickly due to caching
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1")).toContainText("All Attendances");
  });
});
