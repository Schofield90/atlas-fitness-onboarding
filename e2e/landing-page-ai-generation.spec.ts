import { test, expect } from "@playwright/test";

test.describe("AI Landing Page Generation", () => {
  test("should generate landing page using AI with Claude Sonnet 4.5", async ({
    page,
  }) => {
    // Navigate to landing page builder
    await page.goto("http://localhost:3001/landing-pages/builder");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Take initial screenshot
    await page.screenshot({
      path: ".playwright-mcp/landing-page-builder-initial.png",
    });

    // Find the "AI Build from Description" section
    const aiSection = page
      .locator("text=AI Build from Description")
      .locator("..");
    await expect(aiSection).toBeVisible();

    // Enter test description
    const textarea = aiSection.locator("textarea");
    await textarea.fill(
      "A landing page for a CrossFit gym targeting busy professionals who want to get fit in 30-minute sessions",
    );

    // Set up request interception to verify correct endpoint is called
    let apiEndpointCalled = "";
    let apiRequestBody: any = null;
    let apiResponse: any = null;

    page.on("request", (request) => {
      const url = request.url();
      if (url.includes("/api/landing-pages/")) {
        console.log("[TEST] API Request:", url);
        apiEndpointCalled = url;
        apiRequestBody = request.postDataJSON();
      }
    });

    page.on("response", async (response) => {
      const url = response.url();
      if (url.includes("/api/landing-pages/")) {
        console.log("[TEST] API Response:", response.status());
        try {
          apiResponse = await response.json();
          console.log(
            "[TEST] Response body:",
            JSON.stringify(apiResponse, null, 2),
          );
        } catch (e) {
          console.log("[TEST] Could not parse response as JSON");
        }
      }
    });

    // Click AI Build button
    const buildButton = aiSection.locator("button", { hasText: /AI Build/i });
    await buildButton.click();

    // Wait for API call to complete (up to 60 seconds for AI generation)
    await page.waitForTimeout(2000); // Give it a moment to start

    // Check if loading state appears
    const loadingIndicator = page.locator("text=/AI Building Page/i");
    if (await loadingIndicator.isVisible()) {
      console.log(
        "[TEST] Loading indicator visible, waiting for completion...",
      );
    }

    // Wait for either success or error message (up to 60 seconds)
    const successMessage = page.locator("text=/generated successfully/i");
    const errorMessage = page.locator("text=/failed/i, text=/error/i");

    try {
      await Promise.race([
        successMessage.waitFor({ timeout: 60000 }),
        errorMessage.waitFor({ timeout: 60000 }),
      ]);
    } catch (e) {
      console.log(
        "[TEST] No success or error message appeared within 60 seconds",
      );
    }

    // Take final screenshot
    await page.screenshot({
      path: ".playwright-mcp/landing-page-builder-final.png",
    });

    // Verify results
    console.log("\n=== TEST RESULTS ===");
    console.log("API Endpoint Called:", apiEndpointCalled);
    console.log("Request Body:", JSON.stringify(apiRequestBody, null, 2));
    console.log("Response:", JSON.stringify(apiResponse, null, 2));

    // Assert correct endpoint was called
    expect(apiEndpointCalled).toContain("/api/landing-pages/ai-generate");

    // Assert response was successful
    if (apiResponse) {
      expect(apiResponse.success).toBe(true);
      expect(apiResponse.data).toBeDefined();
      expect(apiResponse.data.id).toBeDefined();
    } else {
      throw new Error("No API response received");
    }

    // Check if success message appeared
    await expect(successMessage).toBeVisible({ timeout: 5000 });

    console.log("✅ Test passed: AI generation successful");
  });
});
