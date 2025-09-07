import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Test configuration
const BASE_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Initialize Supabase client for test data setup
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

test.describe("Booking Flow E2E Tests", () => {
  let testOrganizationId: string;
  let testClientId: string;
  let testLeadId: string;
  let testClassSessionId: string;

  test.beforeAll(async () => {
    // Setup test data
    console.log("Setting up test data...");

    // Get or create test organization
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("name", "E2E Test Organization")
      .single();

    testOrganizationId = org?.id || "63589490-8f55-4157-bd3a-e141594b748e";

    // Create test client
    const { data: client } = await supabase
      .from("clients")
      .insert({
        first_name: "Test",
        last_name: "Client",
        email: `test.client.${Date.now()}@example.com`,
        phone: "1234567890",
        org_id: testOrganizationId,
        status: "active",
      })
      .select()
      .single();

    if (client) testClientId = client.id;

    // Create test lead
    const { data: lead } = await supabase
      .from("leads")
      .insert({
        first_name: "Test",
        last_name: "Lead",
        email: `test.lead.${Date.now()}@example.com`,
        phone: "0987654321",
        organization_id: testOrganizationId,
        status: "qualified",
      })
      .select()
      .single();

    if (lead) testLeadId = lead.id;

    // Get a test class session
    const { data: session } = await supabase
      .from("class_sessions")
      .select("id")
      .eq("organization_id", testOrganizationId)
      .gte("start_time", new Date().toISOString())
      .limit(1)
      .single();

    if (session) testClassSessionId = session.id;
  });

  test.afterAll(async () => {
    // Cleanup test data
    console.log("Cleaning up test data...");

    if (testClientId) {
      await supabase.from("bookings").delete().eq("client_id", testClientId);

      await supabase.from("clients").delete().eq("id", testClientId);
    }

    if (testLeadId) {
      await supabase.from("bookings").delete().eq("customer_id", testLeadId);

      await supabase.from("leads").delete().eq("id", testLeadId);
    }
  });

  test("Should book a single class for a client", async ({ page }) => {
    // Navigate to members page
    await page.goto(`${BASE_URL}/members`);

    // Wait for the page to load
    await page.waitForSelector('[data-testid="members-list"]', {
      timeout: 10000,
    });

    // Find and click on the test client
    await page.click(`[data-testid="client-row-${testClientId}"]`);

    // Wait for client details modal
    await page.waitForSelector('[data-testid="client-details-modal"]');

    // Click on "Book Class" button
    await page.click('[data-testid="book-class-btn"]');

    // Wait for booking modal
    await page.waitForSelector('[data-testid="single-class-booking-modal"]');

    // Select a payment method (free booking)
    await page.click('[data-testid="payment-method-free"]');

    // Click continue to payment
    await page.click('[data-testid="continue-to-payment-btn"]');

    // Confirm booking
    await page.click('[data-testid="confirm-booking-btn"]');

    // Wait for success message
    await expect(page.locator('[data-testid="booking-success"]')).toBeVisible();

    // Verify booking was created in database
    const { data: booking } = await supabase
      .from("bookings")
      .select("*")
      .eq("client_id", testClientId)
      .eq("class_session_id", testClassSessionId)
      .single();

    expect(booking).toBeTruthy();
    expect(booking?.booking_status).toBe("confirmed");
  });

  test("Should book a single class for a lead", async ({ page }) => {
    // Navigate to leads page
    await page.goto(`${BASE_URL}/leads`);

    // Wait for the page to load
    await page.waitForSelector('[data-testid="leads-list"]', {
      timeout: 10000,
    });

    // Find and click on the test lead
    await page.click(`[data-testid="lead-row-${testLeadId}"]`);

    // Wait for lead details modal
    await page.waitForSelector('[data-testid="lead-details-modal"]');

    // Click on "Book Class" button
    await page.click('[data-testid="book-class-btn"]');

    // Wait for booking modal
    await page.waitForSelector('[data-testid="single-class-booking-modal"]');

    // Select a payment method (free booking)
    await page.click('[data-testid="payment-method-free"]');

    // Click continue to payment
    await page.click('[data-testid="continue-to-payment-btn"]');

    // Confirm booking
    await page.click('[data-testid="confirm-booking-btn"]');

    // Wait for success message
    await expect(page.locator('[data-testid="booking-success"]')).toBeVisible();

    // Verify booking was created in database
    const { data: booking } = await supabase
      .from("bookings")
      .select("*")
      .eq("customer_id", testLeadId)
      .eq("class_session_id", testClassSessionId)
      .single();

    expect(booking).toBeTruthy();
    expect(booking?.booking_status).toBe("confirmed");
  });

  test("Should book multiple classes for a client", async ({ page }) => {
    // Navigate to members page
    await page.goto(`${BASE_URL}/members`);

    // Wait for the page to load
    await page.waitForSelector('[data-testid="members-list"]', {
      timeout: 10000,
    });

    // Find and click on the test client
    await page.click(`[data-testid="client-row-${testClientId}"]`);

    // Wait for client details modal
    await page.waitForSelector('[data-testid="client-details-modal"]');

    // Click on "Book Multiple Classes" button
    await page.click('[data-testid="book-multiple-classes-btn"]');

    // Wait for multi-class booking modal
    await page.waitForSelector('[data-testid="multi-class-booking-modal"]');

    // Select 3 classes
    const classCheckboxes = await page
      .locator('[data-testid^="class-checkbox-"]')
      .all();
    for (let i = 0; i < Math.min(3, classCheckboxes.length); i++) {
      await classCheckboxes[i].click();
    }

    // Click continue to payment
    await page.click('[data-testid="continue-to-payment-btn"]');

    // Select payment method (free booking)
    await page.click('[data-testid="payment-method-free"]');

    // Confirm bookings
    await page.click('[data-testid="confirm-bookings-btn"]');

    // Wait for success message
    await expect(
      page.locator('[data-testid="bookings-success"]'),
    ).toBeVisible();

    // Verify bookings were created in database
    const { data: bookings } = await supabase
      .from("bookings")
      .select("*")
      .eq("client_id", testClientId)
      .eq("booking_status", "confirmed");

    expect(bookings?.length).toBeGreaterThanOrEqual(3);
  });

  test("Should handle booking with membership", async ({ page }) => {
    // First create a membership for the test client
    const { data: membership } = await supabase
      .from("customer_memberships")
      .insert({
        client_id: testClientId,
        organization_id: testOrganizationId,
        membership_plan_id: "test-plan-id",
        status: "active",
        start_date: new Date().toISOString(),
        classes_per_period: 10,
        classes_used_this_period: 2,
      })
      .select()
      .single();

    // Navigate to members page
    await page.goto(`${BASE_URL}/members`);

    // Wait for the page to load
    await page.waitForSelector('[data-testid="members-list"]', {
      timeout: 10000,
    });

    // Find and click on the test client
    await page.click(`[data-testid="client-row-${testClientId}"]`);

    // Wait for client details modal
    await page.waitForSelector('[data-testid="client-details-modal"]');

    // Click on "Book Class" button
    await page.click('[data-testid="book-class-btn"]');

    // Wait for booking modal
    await page.waitForSelector('[data-testid="single-class-booking-modal"]');

    // Verify membership option is available
    await expect(
      page.locator(
        `[data-testid="payment-method-membership-${membership?.id}"]`,
      ),
    ).toBeVisible();

    // Select membership payment method
    await page.click(
      `[data-testid="payment-method-membership-${membership?.id}"]`,
    );

    // Verify remaining classes is displayed
    await expect(
      page.locator('[data-testid="membership-classes-remaining"]'),
    ).toContainText("8 classes remaining");

    // Click continue to payment
    await page.click('[data-testid="continue-to-payment-btn"]');

    // Confirm booking
    await page.click('[data-testid="confirm-booking-btn"]');

    // Wait for success message
    await expect(page.locator('[data-testid="booking-success"]')).toBeVisible();

    // Verify membership usage was updated
    const { data: updatedMembership } = await supabase
      .from("customer_memberships")
      .select("classes_used_this_period")
      .eq("id", membership?.id)
      .single();

    expect(updatedMembership?.classes_used_this_period).toBe(3);

    // Cleanup
    if (membership?.id) {
      await supabase
        .from("customer_memberships")
        .delete()
        .eq("id", membership.id);
    }
  });

  test("Should handle booking errors gracefully", async ({ page }) => {
    // Navigate to members page with invalid client ID
    await page.goto(`${BASE_URL}/members`);

    // Try to book for a non-existent client
    await page.evaluate(() => {
      // Simulate clicking on a non-existent client
      window.dispatchEvent(
        new CustomEvent("book-class", {
          detail: { customerId: "non-existent-id" },
        }),
      );
    });

    // Wait for error message
    await expect(page.locator('[data-testid="booking-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="booking-error"]')).toContainText(
      "Failed to load customer details",
    );
  });

  test("Should prevent double booking", async ({ page }) => {
    // First create a booking for the test client
    await supabase.from("bookings").insert({
      client_id: testClientId,
      class_session_id: testClassSessionId,
      organization_id: testOrganizationId,
      booking_status: "confirmed",
      payment_status: "paid",
    });

    // Navigate to members page
    await page.goto(`${BASE_URL}/members`);

    // Wait for the page to load
    await page.waitForSelector('[data-testid="members-list"]', {
      timeout: 10000,
    });

    // Find and click on the test client
    await page.click(`[data-testid="client-row-${testClientId}"]`);

    // Wait for client details modal
    await page.waitForSelector('[data-testid="client-details-modal"]');

    // Click on "Book Class" button
    await page.click('[data-testid="book-class-btn"]');

    // Wait for booking modal
    await page.waitForSelector('[data-testid="single-class-booking-modal"]');

    // Try to book the same class again
    await page.click(`[data-testid="class-session-${testClassSessionId}"]`);

    // Should show already booked message
    await expect(
      page.locator('[data-testid="already-booked-message"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="already-booked-message"]'),
    ).toContainText("You are already booked for this class");
  });
});

test.describe("Booking Flow Performance Tests", () => {
  test("Should load booking modal within 2 seconds", async ({ page }) => {
    await page.goto(`${BASE_URL}/members`);

    const startTime = Date.now();

    // Trigger booking modal
    await page.click('[data-testid="book-class-btn"]:first-of-type');

    // Wait for modal to be visible
    await page.waitForSelector('[data-testid="single-class-booking-modal"]');

    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(2000);
  });

  test("Should handle 10 concurrent bookings", async ({ page }) => {
    const bookingPromises = [];

    for (let i = 0; i < 10; i++) {
      bookingPromises.push(
        supabase.from("bookings").insert({
          customer_id: testLeadId,
          class_session_id: testClassSessionId,
          organization_id: testOrganizationId,
          booking_status: "confirmed",
          payment_status: "pending",
          notes: `Concurrent test booking ${i}`,
        }),
      );
    }

    const results = await Promise.allSettled(bookingPromises);

    // At least one should succeed (others might fail due to constraints)
    const successCount = results.filter((r) => r.status === "fulfilled").length;
    expect(successCount).toBeGreaterThan(0);
  });
});
