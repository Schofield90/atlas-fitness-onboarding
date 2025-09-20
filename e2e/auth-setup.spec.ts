import { test } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

// Test user configurations
const TEST_USERS = {
  admin: {
    email: process.env.TEST_SUPERADMIN_EMAIL || "superadmin@test.example.com",
    password: process.env.TEST_USER_PASSWORD || "TestPassword123!",
    role: "superadmin",
    subdomain: "admin",
  },
  owner: {
    email: process.env.TEST_OWNER_EMAIL || "owner@test.example.com",
    password: process.env.TEST_USER_PASSWORD || "TestPassword123!",
    role: "owner",
    subdomain: "login",
  },
  member: {
    email: process.env.TEST_MEMBER_EMAIL || "member@test.example.com",
    password: process.env.TEST_USER_PASSWORD || "TestPassword123!",
    role: "member",
    subdomain: "members",
  },
};

// Ensure .playwright directory exists
const stateDir = path.join(process.cwd(), ".playwright");
if (!fs.existsSync(stateDir)) {
  fs.mkdirSync(stateDir, { recursive: true });
}

test.describe("Authentication Setup", () => {
  test("authenticate as admin", async ({ request, context }) => {
    console.log("Setting up admin authentication...");

    // Call test login API
    const response = await request.post(
      "http://localhost:3000/api/test/login",
      {
        data: TEST_USERS.admin,
      },
    );

    if (!response.ok()) {
      const error = await response.text();
      throw new Error(
        `Failed to authenticate admin: ${response.status()} - ${error}`,
      );
    }

    const data = await response.json();
    console.log(`Admin user authenticated: ${data.user.email}`);

    // Save cookies and local storage
    const cookies = await context.cookies();

    // Save storage state
    await context.storageState({
      path: path.join(stateDir, "state.admin.json"),
    });

    console.log("Admin authentication state saved");
  });

  test("authenticate as owner", async ({ request, context }) => {
    console.log("Setting up owner authentication...");

    const response = await request.post(
      "http://localhost:3000/api/test/login",
      {
        data: TEST_USERS.owner,
      },
    );

    if (!response.ok()) {
      const error = await response.text();
      throw new Error(
        `Failed to authenticate owner: ${response.status()} - ${error}`,
      );
    }

    const data = await response.json();
    console.log(`Owner user authenticated: ${data.user.email}`);

    await context.storageState({
      path: path.join(stateDir, "state.owner.json"),
    });

    console.log("Owner authentication state saved");
  });

  test("authenticate as member", async ({ request, context }) => {
    console.log("Setting up member authentication...");

    const response = await request.post(
      "http://localhost:3000/api/test/login",
      {
        data: TEST_USERS.member,
      },
    );

    if (!response.ok()) {
      const error = await response.text();
      throw new Error(
        `Failed to authenticate member: ${response.status()} - ${error}`,
      );
    }

    const data = await response.json();
    console.log(`Member user authenticated: ${data.user.email}`);

    await context.storageState({
      path: path.join(stateDir, "state.member.json"),
    });

    console.log("Member authentication state saved");
  });
});

// Export for use in other tests
export { TEST_USERS };
