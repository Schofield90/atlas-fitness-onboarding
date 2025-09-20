import { test, expect } from "@playwright/test";

test.describe("Test Login API", () => {
  test("should create test user and login", async ({ request }) => {
    // Test the login endpoint
    const response = await request.post(
      "http://localhost:3000/api/test/login",
      {
        data: {
          email: "test@example.com",
          role: "owner",
          subdomain: "login",
          password: "TestPassword123!",
        },
      },
    );

    console.log("Response status:", response.status());
    const responseText = await response.text();
    console.log("Response:", responseText);

    if (response.ok()) {
      const data = JSON.parse(responseText);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("user");
      expect(data.user).toHaveProperty("email", "test@example.com");
      console.log("✅ Test login successful!");
    } else {
      console.log("❌ Test login failed:", responseText);
    }
  });
});
