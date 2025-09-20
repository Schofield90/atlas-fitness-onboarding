import { test, expect } from "@playwright/test";

test.describe("Test Sign In with Manual Users", () => {
  test("should sign in with existing user", async ({ request }) => {
    // Test signing in with a manually created user
    const response = await request.post(
      "http://localhost:3000/api/test/login",
      {
        data: {
          email: "owner@test.example.com",
          password: "TestPassword123!",
          role: "owner",
          subdomain: "login",
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
      expect(data.user).toHaveProperty("email", "owner@test.example.com");
      console.log("✅ Sign in successful!");
    } else {
      console.log("❌ Sign in failed:", responseText);
    }
  });
});
