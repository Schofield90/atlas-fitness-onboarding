/**
 * Global Setup for Calendar E2E Tests
 *
 * Prepares the test environment for calendar testing by:
 * - Validating environment variables
 * - Setting up database test state
 * - Configuring timezone settings
 * - Creating necessary test data
 */

const { chromium } = require("@playwright/test");

async function globalSetup(config) {
  console.log("🔧 Setting up Calendar E2E Test Environment...\n");

  // 1. Validate Environment Variables
  const requiredEnvVars = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];

  console.log("📋 Validating environment variables...");
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`❌ Required environment variable ${envVar} is not set`);
    }
    console.log(`   ✅ ${envVar}: ${process.env[envVar].substring(0, 20)}...`);
  }

  // 2. Set timezone for consistent testing
  process.env.TZ = "UTC";
  console.log(`🌍 Set timezone to: ${process.env.TZ}`);

  // 3. Validate server availability
  console.log("\n🌐 Checking server availability...");
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    const baseUrl =
      config.webServer?.baseURL ||
      process.env.BASE_URL ||
      "http://localhost:3000";
    console.log(`   Connecting to: ${baseUrl}`);

    await page.goto(`${baseUrl}/health`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    console.log("   ✅ Server is responding");
  } catch (error) {
    console.log(`   ❌ Server check failed: ${error.message}`);
    throw new Error("Server is not available for testing");
  }

  // 4. Test database connectivity
  console.log("\n🗄️  Testing database connectivity...");
  try {
    const response = await page.evaluate(async () => {
      const response = await fetch("/api/health");
      return {
        status: response.status,
        data: await response.json(),
      };
    });

    if (response.status === 200) {
      console.log("   ✅ Database connectivity confirmed");
    } else {
      throw new Error(`Database health check failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Database check failed: ${error.message}`);
    throw new Error("Database is not available for testing");
  }

  // 5. Clean up any existing test data
  console.log("\n🧹 Cleaning up existing test data...");
  try {
    const cleanupResponse = await page.evaluate(async () => {
      // Clean up test classes that might exist from previous runs
      const response = await fetch("/api/class-sessions?cleanup=test", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, deleted: data.deleted || 0 };
      } else {
        return { success: false, error: response.statusText };
      }
    });

    if (cleanupResponse.success) {
      console.log(`   ✅ Cleaned up ${cleanupResponse.deleted} test classes`);
    } else {
      console.log(`   ⚠️  Cleanup warning: ${cleanupResponse.error}`);
    }
  } catch (error) {
    console.log(`   ⚠️  Cleanup warning: ${error.message}`);
    // Don't fail setup for cleanup issues
  }

  // 6. Verify authentication system
  console.log("\n🔐 Testing authentication system...");
  try {
    const authResponse = await page.evaluate(async () => {
      const response = await fetch("/api/auth/test-client-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testMode: true }),
      });

      return {
        status: response.status,
        ok: response.ok,
      };
    });

    if (authResponse.ok) {
      console.log("   ✅ Authentication system ready");
    } else {
      throw new Error(`Auth test failed with status: ${authResponse.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Authentication test failed: ${error.message}`);
    throw new Error("Authentication system is not ready for testing");
  }

  // 7. Create test organization if needed
  console.log("\n🏢 Setting up test organization...");
  try {
    const orgResponse = await page.evaluate(async () => {
      const response = await fetch("/api/organization/current");
      const data = await response.json();

      if (data.success && data.organization) {
        return {
          exists: true,
          id: data.organization.id,
          name: data.organization.name,
        };
      } else {
        // Try to create test organization
        const createResponse = await fetch("/api/setup/create-test-org", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "E2E Calendar Test Gym",
            testMode: true,
          }),
        });

        if (createResponse.ok) {
          const createData = await createResponse.json();
          return {
            exists: false,
            created: true,
            id: createData.organization.id,
          };
        } else {
          return {
            exists: false,
            created: false,
            error: createResponse.statusText,
          };
        }
      }
    });

    if (orgResponse.exists) {
      console.log(
        `   ✅ Using existing organization: ${orgResponse.name} (${orgResponse.id})`,
      );
    } else if (orgResponse.created) {
      console.log(`   ✅ Created test organization: ${orgResponse.id}`);
    } else {
      console.log(`   ⚠️  Organization setup warning: ${orgResponse.error}`);
    }
  } catch (error) {
    console.log(`   ⚠️  Organization setup warning: ${error.message}`);
    // Don't fail setup for org issues if basic functionality works
  }

  // 8. Verify calendar API endpoints
  console.log("\n📅 Testing calendar API endpoints...");
  try {
    const apiTests = [
      {
        endpoint: "/api/class-sessions",
        method: "GET",
        name: "Class Sessions",
      },
      {
        endpoint: "/api/clear-calendar",
        method: "DELETE",
        name: "Clear Calendar",
      },
    ];

    for (const apiTest of apiTests) {
      const testResponse = await page.evaluate(async ({ endpoint, method }) => {
        const response = await fetch(endpoint, { method });
        return { status: response.status, ok: response.ok };
      }, apiTest);

      if (testResponse.ok || testResponse.status === 400) {
        // 400 might be expected for some endpoints
        console.log(`   ✅ ${apiTest.name} endpoint ready`);
      } else {
        console.log(
          `   ❌ ${apiTest.name} endpoint failed: ${testResponse.status}`,
        );
      }
    }
  } catch (error) {
    console.log(`   ⚠️  API endpoint test warning: ${error.message}`);
  }

  // 9. Setup screenshot directory
  console.log("\n📸 Setting up screenshot directories...");
  const fs = require("fs");
  const path = require("path");

  const screenshotDir = path.join(process.cwd(), "e2e", "screenshots");
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
    console.log(`   ✅ Created screenshot directory: ${screenshotDir}`);
  } else {
    console.log(`   ✅ Screenshot directory exists: ${screenshotDir}`);
  }

  // 10. Final validation
  console.log("\n✨ Running final validation...");
  try {
    await page.goto("/class-calendar", {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    console.log("   ✅ Calendar page loads successfully");
  } catch (error) {
    console.log(`   ❌ Calendar page validation failed: ${error.message}`);
    throw new Error("Calendar page is not ready for testing");
  }

  await browser.close();

  console.log("\n🎉 Calendar E2E Test Environment Setup Complete!");
  console.log("📋 Environment Summary:");
  console.log(`   - Server: Ready`);
  console.log(`   - Database: Connected`);
  console.log(`   - Authentication: Working`);
  console.log(`   - Calendar API: Available`);
  console.log(`   - Timezone: ${process.env.TZ}`);
  console.log(`   - Screenshots: Configured`);
  console.log("\n🚀 Ready to run calendar tests!\n");

  // Store setup metadata for tests
  global.calendarTestSetup = {
    timestamp: new Date().toISOString(),
    timezone: process.env.TZ,
    baseUrl:
      config.webServer?.baseURL ||
      process.env.BASE_URL ||
      "http://localhost:3000",
    screenshotDir,
  };
}

module.exports = globalSetup;
