import { test, expect } from "@playwright/test";

test.describe("Debug Calendar", () => {
  test("debug calendar authentication and content", async ({
    page,
    request,
  }) => {
    console.log("=== Starting debug test ===");

    // Step 1: Navigate to the page first to establish domain context
    console.log("1. Setting up domain context...");
    await page.goto("http://login.localhost:3000/");

    // Step 2: Authenticate via browser context
    console.log("2. Authenticating via browser...");
    const loginResult = await page.evaluate(async () => {
      const response = await fetch("/api/test/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "owner@test.example.com",
          password: "TestPassword123!",
          role: "owner",
          subdomain: "login",
        }),
      });

      const data = await response.json();
      return { status: response.status, data };
    });

    console.log(
      "Login result:",
      loginResult.data.success ? "SUCCESS" : "FAILED",
    );
    expect(loginResult.status).toBe(200);
    expect(loginResult.data.success).toBeTruthy();

    // Step 2.5: Check cookies after login
    console.log("2.5. Checking cookies after login...");
    const cookies = await page.context().cookies();
    console.log("Cookies count:", cookies.length);
    const authCookies = cookies.filter(
      (c) => c.name.includes("auth") || c.name.includes("sb-"),
    );
    console.log(
      "Auth cookies:",
      authCookies.map((c) => ({
        name: c.name,
        domain: c.domain,
        secure: c.secure,
      })),
    );

    // Step 3: Navigate to calendar and wait longer
    console.log("3. Navigating to calendar...");
    await page.goto("http://login.localhost:3000/class-calendar");

    // Wait for network to be idle
    await page.waitForLoadState("networkidle");

    console.log("Current URL:", page.url());
    console.log("Page title:", await page.title());

    // Step 4: Check what's actually on the page
    console.log("4. Taking screenshot and checking content...");
    await page.screenshot({
      path: "test-results/debug-calendar.png",
      fullPage: true,
    });

    // Check for various elements that might be present
    const elements = {
      loginForm: await page.locator("form").count(),
      calendarGrid: await page.locator('[data-testid="calendar-grid"]').count(),
      noClassesMessage: await page.locator("text=No Classes Scheduled").count(),
      addClassButton: await page
        .locator('button:has-text("Add Class")')
        .count(),
      loadingSpinner: await page.locator(".animate-spin").count(),
      errorMessage: await page.locator("text=error", { exact: false }).count(),
    };

    console.log("Elements found:", elements);

    // Check if we can see the main content areas
    const bodyText = await page.locator("body").textContent();
    console.log(
      "Page contains 'Calendar':",
      bodyText?.includes("Calendar") || false,
    );
    console.log("Page contains 'Class':", bodyText?.includes("Class") || false);
    console.log("Page contains 'Owner':", bodyText?.includes("Owner") || false);
    console.log("Page contains 'Login':", bodyText?.includes("Login") || false);

    // Step 5: Try to call the API directly
    console.log("5. Testing API call...");
    const apiResponse = await page.evaluate(async () => {
      try {
        const orgId = "63589490-8f55-4157-bd3a-e141594b748e";
        const response = await fetch(
          `/api/class-sessions?organizationId=${orgId}`,
        );
        const data = await response.json();
        return { status: response.status, data };
      } catch (error) {
        return { error: error.message };
      }
    });

    console.log("API response:", apiResponse);

    // Step 6: Check if we need to manually set cookies for the test
    console.log("6. Checking authentication state...");
    const authCheck = await page.evaluate(async () => {
      try {
        const response = await fetch("/api/auth/user");
        const data = await response.json();
        return { status: response.status, data };
      } catch (error) {
        return { error: error.message };
      }
    });

    console.log("Auth check response:", authCheck);

    console.log("=== Debug test completed ===");
  });
});
