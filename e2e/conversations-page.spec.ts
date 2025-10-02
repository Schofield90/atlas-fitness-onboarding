import { test, expect } from "@playwright/test";

test.describe("Conversations Page", () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto("http://localhost:3000/signin");
    await page.fill('input[type="email"]', "sam@atlas-gyms.co.uk");
    await page.fill('input[type="password"]', "@Aa80236661");
    await page.click('button[type="submit"]');

    // Wait for redirect after login
    await page.waitForURL(/dashboard|conversations/);
  });

  test("should load conversations page without hanging on Loading...", async ({
    page,
  }) => {
    // Navigate to conversations
    await page.goto("http://localhost:3000/conversations");

    // Wait for console logs to appear
    await page.waitForTimeout(2000);

    // Get console logs
    const logs: string[] = [];
    page.on("console", (msg) => {
      const text = msg.text();
      if (
        text.includes("[Conversations]") ||
        text.includes("[UnifiedMessaging]")
      ) {
        logs.push(text);
        console.log("Browser log:", text);
      }
    });

    // Check the page doesn't show "Loading conversations..." forever
    const loadingText = page.getByText("Loading conversations...");

    try {
      // Wait max 5 seconds for loading to disappear
      await loadingText.waitFor({ state: "hidden", timeout: 5000 });
      console.log("✅ Loading state cleared successfully");
    } catch (error) {
      console.log("❌ Page stuck on Loading conversations...");
      console.log("Console logs captured:", logs);
      throw new Error("Conversations page stuck on loading screen");
    }

    // Check that UnifiedMessaging component loaded
    const messagingUI = page
      .locator('[data-testid="unified-messaging"]')
      .or(page.locator("text=/conversation|message/i"))
      .first();
    await expect(messagingUI).toBeVisible({ timeout: 5000 });

    console.log("✅ Conversations page loaded successfully");
    console.log("Console logs:", logs);
  });

  test("should log userData loading process", async ({ page }) => {
    const logs: string[] = [];

    page.on("console", (msg) => {
      const text = msg.text();
      if (
        text.includes("[Conversations]") ||
        text.includes("[UnifiedMessaging]")
      ) {
        logs.push(text);
      }
    });

    await page.goto("http://localhost:3000/conversations");
    await page.waitForTimeout(3000);

    // Verify we got the expected log sequence
    const hasStartLog = logs.some((log) =>
      log.includes("Starting loadUserData"),
    );
    const hasAuthLog = logs.some((log) => log.includes("Auth user:"));
    const hasUserDataLog = logs.some((log) =>
      log.includes("Setting userData:"),
    );

    console.log("Captured logs:");
    logs.forEach((log) => console.log(" -", log));

    expect(hasStartLog).toBe(true);
    expect(hasAuthLog).toBe(true);
    expect(hasUserDataLog).toBe(true);
  });
});
