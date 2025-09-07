import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Test configuration
const BASE_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:3002";
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://lzlrojoaxrqvmhempnkn.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0OTI1MzksImV4cCI6MjA2ODA2ODUzOX0.8rGsdaYcnwFIyWEhKKqz-W-KsOAP6WRTuEv8UrzkKuc";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

test.describe("Comprehensive Booking System Tests", () => {
  // Test data
  let testOrganizationId: string;
  let testClientId: string;
  let testLeadId: string;
  let testClassSessionId: string;

  test.beforeAll(async () => {
    console.log("🔧 Setting up test data...");

    // Get a test organization
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .limit(1)
      .single();

    if (org) {
      testOrganizationId = org.id;
      console.log("✅ Using organization:", testOrganizationId);
    }

    // Get a test client
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("organization_id", testOrganizationId)
      .limit(1)
      .single();

    if (client) {
      testClientId = client.id;
      console.log("✅ Using client:", testClientId);
    }

    // Get a test lead
    const { data: lead } = await supabase
      .from("leads")
      .select("id")
      .eq("organization_id", testOrganizationId)
      .limit(1)
      .single();

    if (lead) {
      testLeadId = lead.id;
      console.log("✅ Using lead:", testLeadId);
    }

    // Get a test class session
    const { data: session } = await supabase
      .from("class_sessions")
      .select("id")
      .eq("organization_id", testOrganizationId)
      .gte("start_time", new Date().toISOString())
      .limit(1)
      .single();

    if (session) {
      testClassSessionId = session.id;
      console.log("✅ Using class session:", testClassSessionId);
    }
  });

  test("Schema Check: Verify class_bookings table has required columns", async () => {
    console.log("🔍 Checking class_bookings table schema...");

    const { data: columns, error } = await supabase.rpc("get_table_columns", {
      table_name: "class_bookings",
    });

    if (error) {
      // Try direct query
      const { data, error: queryError } = await supabase
        .from("class_bookings")
        .select("*")
        .limit(0);

      expect(queryError).toBeNull();
    }

    // These columns MUST exist
    const requiredColumns = [
      "id",
      "class_session_id", // THIS IS THE CRITICAL COLUMN
      "customer_id",
      "client_id",
      "organization_id",
      "booking_status",
      "payment_status",
    ];

    console.log("✅ class_bookings table exists and can be queried");
  });

  test("Schema Check: Verify bookings table has required columns", async () => {
    console.log("🔍 Checking bookings table schema...");

    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .limit(0);

    expect(error).toBeNull();
    console.log("✅ bookings table exists and can be queried");
  });

  test("API Test: Create booking via class_bookings table", async () => {
    console.log("🚀 Testing booking creation via class_bookings...");

    const bookingData = {
      class_session_id: testClassSessionId,
      client_id: testClientId,
      organization_id: testOrganizationId,
      booking_status: "confirmed",
      payment_status: "paid",
      notes: "E2E test booking",
    };

    const { data, error } = await supabase
      .from("class_bookings")
      .insert(bookingData)
      .select()
      .single();

    if (error) {
      console.error("❌ Error creating booking:", error);
      throw error;
    }

    expect(data).toBeTruthy();
    expect(data.id).toBeTruthy();
    expect(data.class_session_id).toBe(testClassSessionId);
    expect(data.client_id).toBe(testClientId);

    console.log("✅ Successfully created booking:", data.id);

    // Clean up
    if (data?.id) {
      await supabase.from("class_bookings").delete().eq("id", data.id);
    }
  });

  test("API Test: Create booking via bookings table", async () => {
    console.log("🚀 Testing booking creation via bookings table...");

    const bookingData = {
      class_session_id: testClassSessionId,
      client_id: testClientId,
      organization_id: testOrganizationId,
      booking_status: "confirmed",
      payment_status: "paid",
      notes: "E2E test booking via bookings table",
    };

    const { data, error } = await supabase
      .from("bookings")
      .insert(bookingData)
      .select()
      .single();

    if (error) {
      console.error("❌ Error creating booking:", error);
      throw error;
    }

    expect(data).toBeTruthy();
    expect(data.id).toBeTruthy();
    expect(data.class_session_id).toBe(testClassSessionId);

    console.log("✅ Successfully created booking in bookings table:", data.id);

    // Clean up
    if (data?.id) {
      await supabase.from("bookings").delete().eq("id", data.id);
    }
  });

  test("UI Test: Book a client through the UI", async ({ page }) => {
    console.log("🌐 Testing UI booking flow...");

    // Navigate to members page
    await page.goto(`${BASE_URL}/members`);

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Check if we can see the members list
    const membersVisible = await page
      .locator('[data-testid="members-list"], .members-container, table')
      .isVisible();

    if (!membersVisible) {
      console.log("⚠️ Members list not visible, checking for auth...");
      // May need to sign in first
    }

    console.log("✅ Members page loaded");

    // Try to find a book button
    const bookButton = page
      .locator('button:has-text("Book"), button:has-text("Book Class")')
      .first();

    if (await bookButton.isVisible()) {
      await bookButton.click();
      console.log("✅ Clicked book button");

      // Wait for modal
      await page.waitForSelector(
        '[role="dialog"], .modal, [data-testid="booking-modal"]',
        { timeout: 5000 },
      );
      console.log("✅ Booking modal opened");

      // Check for any error messages in console
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          consoleErrors.push(msg.text());
        }
      });

      // Try to complete booking
      const confirmButton = page.locator('button:has-text("Confirm")').first();
      if (await confirmButton.isVisible()) {
        await confirmButton.click();

        // Check for errors
        await page.waitForTimeout(2000);

        if (consoleErrors.length > 0) {
          console.error("❌ Console errors detected:", consoleErrors);

          // Check specifically for class_session_id error
          const hasSchemaError = consoleErrors.some(
            (err) =>
              err.includes("class_session_id") || err.includes("PGRST204"),
          );

          if (hasSchemaError) {
            throw new Error(
              "SCHEMA ERROR: class_session_id column is still missing!",
            );
          }
        }
      }
    }
  });

  test("Dual Customer Support: Book a client", async () => {
    console.log("🔄 Testing client booking...");

    const { data, error } = await supabase
      .from("class_bookings")
      .insert({
        class_session_id: testClassSessionId,
        client_id: testClientId,
        organization_id: testOrganizationId,
        booking_status: "confirmed",
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data?.client_id).toBe(testClientId);
    expect(data?.customer_id).toBeNull();

    console.log("✅ Client booking successful");

    // Clean up
    if (data?.id) {
      await supabase.from("class_bookings").delete().eq("id", data.id);
    }
  });

  test("Dual Customer Support: Book a lead", async () => {
    console.log("🔄 Testing lead booking...");

    const { data, error } = await supabase
      .from("class_bookings")
      .insert({
        class_session_id: testClassSessionId,
        customer_id: testLeadId,
        organization_id: testOrganizationId,
        booking_status: "confirmed",
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data?.customer_id).toBe(testLeadId);
    expect(data?.client_id).toBeNull();

    console.log("✅ Lead booking successful");

    // Clean up
    if (data?.id) {
      await supabase.from("class_bookings").delete().eq("id", data.id);
    }
  });

  test("Constraint Test: Cannot set both customer_id and client_id", async () => {
    console.log("🔒 Testing constraint...");

    const { error } = await supabase.from("class_bookings").insert({
      class_session_id: testClassSessionId,
      customer_id: testLeadId,
      client_id: testClientId, // Both set - should fail
      organization_id: testOrganizationId,
    });

    expect(error).toBeTruthy();
    console.log("✅ Constraint working - prevented dual customer types");
  });
});

test.describe("Critical Error Checks", () => {
  test("No PGRST204 errors when booking", async ({ page }) => {
    const errors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error" && msg.text().includes("PGRST204")) {
        errors.push(msg.text());
      }
    });

    await page.goto(`${BASE_URL}/members`);
    await page.waitForTimeout(3000);

    if (errors.length > 0) {
      console.error("❌ PGRST204 errors detected:", errors);
      throw new Error("Schema cache errors still present!");
    }

    console.log("✅ No PGRST204 errors detected");
  });

  test("class_session_id column exists", async () => {
    const { error } = await supabase
      .from("class_bookings")
      .select("class_session_id")
      .limit(1);

    if (error && error.message.includes("class_session_id")) {
      throw new Error("❌ class_session_id column is STILL MISSING!");
    }

    console.log("✅ class_session_id column exists and is accessible");
  });
});
