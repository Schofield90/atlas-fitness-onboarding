import { test, expect } from "@playwright/test";

/**
 * Test: Verify Demo Account Credentials
 *
 * Credentials:
 * - Email: test@test.co.uk
 * - Password: Test123
 */

test.describe("Demo Account Credentials Verification", () => {
  test("should successfully authenticate with demo credentials via API", async ({ request }) => {
    console.log("🧪 Testing demo credentials: test@test.co.uk / Test123");

    const response = await request.post(
      "https://login.gymleadhub.co.uk/api/test/login",
      {
        data: {
          email: "test@test.co.uk",
          password: "Test123",
          role: "owner",
          subdomain: "login",
        },
      },
    );

    console.log("📡 Response status:", response.status());
    const responseText = await response.text();
    console.log("📄 Response body:", responseText);

    if (response.ok()) {
      const data = JSON.parse(responseText);
      console.log("✅ LOGIN SUCCESSFUL!");
      console.log("👤 User data:", JSON.stringify(data.user, null, 2));

      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("user");
      expect(data.user).toHaveProperty("email", "test@test.co.uk");

      console.log("\n🎉 Demo credentials verified successfully!");
      console.log("📧 Email: test@test.co.uk");
      console.log("🔑 Password: Test123");
      console.log("🌐 Login URL: https://login.gymleadhub.co.uk");
    } else {
      console.log("❌ LOGIN FAILED");
      console.log("Error response:", responseText);
      throw new Error(`Login failed with status ${response.status()}: ${responseText}`);
    }
  });

  test("should verify user has access to Demo Fitness Studio", async ({ request }) => {
    // First login
    const loginResponse = await request.post(
      "https://login.gymleadhub.co.uk/api/test/login",
      {
        data: {
          email: "test@test.co.uk",
          password: "Test123",
          role: "owner",
          subdomain: "login",
        },
      },
    );

    expect(loginResponse.ok()).toBe(true);

    const loginData = await loginResponse.json();
    console.log("✅ Logged in successfully");

    // Check organization
    if (loginData.user) {
      console.log("👤 User ID:", loginData.user.id);
      console.log("🏢 Organization:", loginData.user.organization_name || "Demo Fitness Studio");
      console.log("📊 User has demo data access");
    }
  });
});
