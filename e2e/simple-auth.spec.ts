import { test, expect } from "@playwright/test";

test.describe("Simple Auth Test", () => {
  test("should check if test login is enabled", async ({ request }) => {
    const response = await request.get("http://localhost:3000/api/test/login");
    const data = await response.json();

    console.log("Test login status:", data);
    expect(data).toHaveProperty("enabled");
    expect(data).toHaveProperty("environment");
  });
});
