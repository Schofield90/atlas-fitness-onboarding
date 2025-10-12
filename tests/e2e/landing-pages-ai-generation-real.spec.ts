import { test, expect } from "@playwright/test";

test.use({
  // Force incognito mode to bypass cache
  launchOptions: {
    args: ['--incognito']
  }
});

test.describe("AI Landing Page Generation - Real Test", () => {
  test("should actually generate landing page using Claude API", async ({
    page,
  }) => {
    console.log("🔐 Step 1: Logging in...");

    // Login
    await page.goto("https://login.gymleadhub.co.uk/owner-login");
    await page.fill('input[type="email"]', "sam@atlas-gyms.co.uk");
    await page.fill('input[type="password"]', "@Aa80236661");
    await page.click('button:has-text("Sign in")');
    await page.waitForURL(/dashboard|landing-pages|reports/, {
      timeout: 15000,
    });

    console.log("✅ Logged in successfully");

    // Navigate to builder
    await page.goto("https://login.gymleadhub.co.uk/landing-pages/builder");
    await page.waitForLoadState("networkidle");

    console.log("📄 Step 2: Opening AI builder...");

    // Click AI Build Page button
    await page.locator('text=AI Build Page').click();

    // Wait for modal to appear
    await page.waitForSelector('textarea[placeholder*="Example"]', {
      timeout: 5000,
    });

    console.log("✅ AI modal opened");

    // Set up network monitoring
    let apiEndpointCalled = "";
    let apiRequestBody: any = null;
    let apiResponse: any = null;
    let apiStatus = 0;

    page.on("request", (request) => {
      const url = request.url();
      if (url.includes("/api/landing-pages/")) {
        console.log("📡 API Request:", url);
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
            hasData: !!apiResponse.data,
            pageId: apiResponse.data?.id,
          });
        } catch (e) {
          console.log("📡 Could not parse response as JSON");
        }
      }
    });

    console.log("🤖 Step 3: Generating landing page with AI...");

    // Fill in description
    const description =
      "A modern landing page for a CrossFit gym targeting busy professionals who want high-intensity workouts in 45-minute sessions";
    await page.fill('textarea[placeholder*="Example"]', description);

    // Click generate button
    const generateButton = page.locator('button:has-text("Generate Page")');
    await expect(generateButton).toBeEnabled();
    await generateButton.click();

    console.log("⏳ Waiting for AI generation (up to 60 seconds)...");

    // Wait for either success or error message (up to 60 seconds)
    try {
      await Promise.race([
        page.waitForSelector('text=/generated successfully|Page generated/i', {
          timeout: 60000,
        }),
        page.waitForSelector('text=/failed|error/i', { timeout: 60000 }),
      ]);
    } catch (e) {
      console.log("⚠️ No success or error message appeared within 60 seconds");
    }

    // Take screenshot
    await page.screenshot({
      path: "test-results/ai-generation-result.png",
      fullPage: true,
    });

    console.log("\n📊 === TEST RESULTS ===");
    console.log("API Endpoint Called:", apiEndpointCalled);
    console.log("API Status:", apiStatus);
    console.log("Request Description:", apiRequestBody?.description);
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

    // Assertions
    console.log("\n✓ Verifying API endpoint called...");
    expect(apiEndpointCalled).toContain("/api/landing-pages/ai-generate");
    console.log("✅ PASS: Called ai-generate endpoint (not ai-build)");

    console.log("\n✓ Verifying API response...");
    expect(apiStatus).toBe(200);
    console.log("✅ PASS: API returned 200 OK");

    expect(apiResponse).toBeDefined();
    console.log("✅ PASS: Received API response");

    if (apiResponse.success) {
      expect(apiResponse.success).toBe(true);
      expect(apiResponse.data).toBeDefined();
      expect(apiResponse.data.id).toBeDefined();
      expect(apiResponse.data.content).toBeDefined();
      expect(Array.isArray(apiResponse.data.content)).toBe(true);
      expect(apiResponse.data.content.length).toBeGreaterThan(0);

      console.log("✅ PASS: AI generation successful");
      console.log(
        `✅ PASS: Generated ${apiResponse.data.content.length} components`,
      );
    } else {
      console.log("❌ FAIL: API returned error:", apiResponse.error);
      throw new Error(`API Error: ${apiResponse.error}`);
    }

    // Check UI for success message
    const successMessage = page.locator(
      'text=/generated successfully|Page generated/i',
    );
    await expect(successMessage).toBeVisible({ timeout: 5000 });
    console.log("✅ PASS: Success message displayed to user");

    console.log("\n✅ === ALL TESTS PASSED ===");
    console.log("🎉 AI landing page generation is WORKING in production!");
  });
});
