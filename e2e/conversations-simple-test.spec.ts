import { test, expect } from "@playwright/test";

test("Conversations page debug test", async ({ page }) => {
  // Capture all console logs
  const logs: string[] = [];
  page.on("console", (msg) => {
    const text = msg.text();
    logs.push(`[${msg.type()}] ${text}`);
    console.log(`Browser ${msg.type()}:`, text);
  });

  // Login
  await page.goto("http://localhost:3000/owner-login");
  await page.fill('input[type="email"]', "sam@atlas-gyms.co.uk");
  await page.fill('input[type="password"]', "@Aa80236661");
  await page.click(
    'button:has-text("Sign In"), button:has-text("Log In"), button[type="submit"]',
  );

  // Wait for redirect
  await page.waitForTimeout(3000);

  console.log("After login, current URL:", page.url());

  // Navigate to conversations
  await page.goto("http://localhost:3000/conversations");

  // Wait and capture logs
  await page.waitForTimeout(5000);

  console.log("\n=== CAPTURED CONSOLE LOGS ===");
  logs.forEach((log) => console.log(log));

  // Check if still on loading screen
  const loadingVisible = await page
    .getByText("Loading conversations...")
    .isVisible()
    .catch(() => false);

  if (loadingVisible) {
    console.log("\n❌ PAGE IS STUCK ON LOADING SCREEN");
    console.log("Relevant logs:");
    logs
      .filter(
        (log) =>
          log.includes("[Conversations]") ||
          log.includes("[UnifiedMessaging]") ||
          log.includes("error") ||
          log.includes("Error"),
      )
      .forEach((log) => console.log(" -", log));
  } else {
    console.log("\n✅ Loading screen cleared successfully");
  }
});
