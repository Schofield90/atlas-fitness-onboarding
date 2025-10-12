import { test, expect } from "@playwright/test";

test.describe("AI Landing Page Full E2E Test", () => {
  test("should generate landing page with authentication", async ({ page }) => {
    console.log("🔐 Step 1: Logging in...");

    // Go to login page
    await page.goto("http://localhost:3001/owner-login");
    await page.waitForLoadState("networkidle");

    // Fill in login credentials
    await page.fill('input[type="email"]', "sam@atlas-gyms.co.uk");
    await page.fill('input[type="password"]', "@Aa80236661");

    // Click login button
    await page.click('button[type="submit"]');
    console.log("✅ Submitted login form");

    // Wait for redirect after login (usually to dashboard or where they came from)
    await page.waitForURL(/\/(dashboard|landing-pages)/, { timeout: 10000 });
    console.log("✅ Logged in successfully");

    console.log("\n📄 Step 2: Navigating to landing page builder...");

    // Navigate to landing page builder
    await page.goto("http://localhost:3001/landing-pages/builder");
    await page.waitForLoadState("networkidle");
    console.log("✅ Page loaded");

    // Take screenshot of initial state
    await page.screenshot({ path: ".playwright-mcp/builder-loaded.png" });
    console.log("✅ Screenshot saved: builder-loaded.png");

    console.log("\n🤖 Step 3: Finding AI Build section...");

    // Find the AI Build from Description section
    const aiSection = page.locator("text=AI Build from Description").first();

    if (!(await aiSection.isVisible())) {
      console.log("❌ AI Build section not visible, checking page content...");
      const pageContent = await page.content();
      console.log("Page title:", await page.title());
      console.log(
        'Page contains "AI Build":',
        pageContent.includes("AI Build"),
      );
      console.log('Page contains "landing":', pageContent.includes("landing"));
      throw new Error("AI Build from Description section not found");
    }

    console.log("✅ AI Build section found");

    // Find the textarea within the AI section
    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeVisible({ timeout: 5000 });
    console.log("✅ Textarea found");

    console.log("\n✍️  Step 4: Entering test description...");

    // Enter test description
    const testDescription =
      "A landing page for a CrossFit gym targeting busy professionals who want to get fit in 30-minute sessions";
    await textarea.fill(testDescription);
    console.log("✅ Description entered:", testDescription);

    // Take screenshot before clicking
    await page.screenshot({ path: ".playwright-mcp/form-filled.png" });
    console.log("✅ Screenshot saved: form-filled.png");

    console.log("\n🚀 Step 5: Testing API endpoint call...");

    // Set up network monitoring BEFORE clicking
    let apiEndpointCalled = "";
    let apiRequestBody: any = null;
    let apiResponse: any = null;
    let apiStatus = 0;

    page.on("request", (request) => {
      const url = request.url();
      if (url.includes("/api/landing-pages/")) {
        console.log("📡 API Request detected:", url);
        apiEndpointCalled = url;
        try {
          apiRequestBody = request.postDataJSON();
        } catch (e) {
          // May not have JSON body
        }
      }
    });

    page.on("response", async (response) => {
      const url = response.url();
      if (url.includes("/api/landing-pages/")) {
        apiStatus = response.status();
        console.log("📡 API Response status:", apiStatus);
        try {
          apiResponse = await response.json();
          console.log("📡 API Response preview:", {
            success: apiResponse.success,
            error: apiResponse.error,
            dataKeys: Object.keys(apiResponse.data || {}),
          });
        } catch (e) {
          console.log("📡 Could not parse response as JSON");
        }
      }
    });

    // Find and click the AI Build button
    const buildButton = page.locator('button:has-text("AI Build")').first();
    await expect(buildButton).toBeVisible({ timeout: 5000 });
    console.log("✅ AI Build button found");

    await buildButton.click();
    console.log("✅ Clicked AI Build button");

    // Take screenshot after click
    await page.screenshot({ path: ".playwright-mcp/button-clicked.png" });
    console.log("✅ Screenshot saved: button-clicked.png");

    console.log("\n⏳ Step 6: Waiting for API response (up to 60 seconds)...");

    // Wait for API call to be made (give it up to 60 seconds)
    await page.waitForTimeout(2000); // Give it a moment to start

    // Check for loading indicator
    const loadingIndicator = page.locator(
      "text=/AI Building|Building|Loading|Generating/i",
    );
    if (await loadingIndicator.isVisible()) {
      console.log("⏳ Loading indicator visible, waiting for completion...");
    }

    // Wait for either success or error message (up to 60 seconds)
    try {
      await Promise.race([
        page.waitForSelector("text=/generated successfully|Page generated/i", {
          timeout: 60000,
        }),
        page.waitForSelector("text=/failed|error/i", { timeout: 60000 }),
      ]);
    } catch (e) {
      console.log("⚠️  No success or error message appeared within 60 seconds");
    }

    // Take final screenshot
    await page.screenshot({ path: ".playwright-mcp/final-result.png" });
    console.log("✅ Screenshot saved: final-result.png");

    console.log("\n📊 Step 7: Analyzing results...");

    // Verify results
    console.log("\n=== TEST RESULTS ===");
    console.log("API Endpoint Called:", apiEndpointCalled);
    console.log("API Status:", apiStatus);
    console.log(
      "Request Description:",
      apiRequestBody?.description?.substring(0, 50) + "...",
    );
    console.log("Response Success:", apiResponse?.success);
    console.log("Response Error:", apiResponse?.error);

    if (apiResponse?.data) {
      console.log("Generated Page ID:", apiResponse.data.id);
      console.log("Generated Page Name:", apiResponse.data.name);
      console.log(
        "Number of Components:",
        apiResponse.data.content?.length || 0,
      );
    }

    // Assert correct endpoint was called
    expect(apiEndpointCalled).toContain("/api/landing-pages/ai-generate");
    console.log("✅ PASS: Called ai-generate endpoint (not ai-build)");

    // Assert response was successful
    if (apiResponse) {
      if (apiResponse.success) {
        expect(apiResponse.success).toBe(true);
        expect(apiResponse.data).toBeDefined();
        expect(apiResponse.data.id).toBeDefined();
        console.log("✅ PASS: AI generation successful");
      } else {
        console.log("❌ FAIL: API returned error:", apiResponse.error);
        throw new Error(`API Error: ${apiResponse.error}`);
      }
    } else {
      console.log("❌ FAIL: No API response received");
      throw new Error("No API response received");
    }

    console.log("\n✅ ===  ALL TESTS PASSED ===");
  });
});
