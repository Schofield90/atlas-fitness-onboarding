import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Test configuration
const BASE_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Initialize Supabase client for test data setup
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test data interfaces
interface TestCustomer {
  id: string;
  type: "client" | "lead";
  email: string;
  first_name: string;
  last_name: string;
}

interface TestClassSession {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  capacity: number;
  price: number;
  room?: string;
  instructor?: string;
}

interface TestMembership {
  id: string;
  client_id?: string;
  customer_id?: string;
  membership_plan_id: string;
  classes_per_period: number;
  classes_used_this_period: number;
  status: string;
}

test.describe("Atlas Fitness Booking Flow - Fixed Version E2E Tests", () => {
  let testOrganizationId: string;
  let testClient: TestCustomer;
  let testLead: TestCustomer;
  let testClassSessions: TestClassSession[] = [];
  let testMembership: TestMembership;
  let testMembershipPlanId: string;
  let testClassPackage: any;

  test.beforeAll(async () => {
    console.log(
      "🔧 Setting up comprehensive test data for booking flow fixes...",
    );

    // Get organization ID (use existing test org or create one)
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("name", "E2E Test Gym")
      .single();

    testOrganizationId = org?.id || "63589490-8f55-4157-bd3a-e141594b748e";

    // Create test client for client booking tests
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .insert({
        first_name: "Test",
        last_name: "Client",
        email: `test.client.${Date.now()}@example.com`,
        phone: "+44 7700 900123",
        org_id: testOrganizationId,
        status: "active",
      })
      .select()
      .single();

    if (clientError)
      throw new Error(`Failed to create test client: ${clientError.message}`);
    testClient = { ...client, type: "client" };

    // Create test lead for lead booking tests
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert({
        first_name: "Test",
        last_name: "Lead",
        email: `test.lead.${Date.now()}@example.com`,
        phone: "+44 7700 900456",
        organization_id: testOrganizationId,
        status: "qualified",
      })
      .select()
      .single();

    if (leadError)
      throw new Error(`Failed to create test lead: ${leadError.message}`);
    testLead = { ...lead, type: "lead" };

    // Create test membership plan
    const { data: membershipPlan, error: planError } = await supabase
      .from("membership_plans")
      .insert({
        name: "E2E Test Plan",
        description: "Test membership plan for E2E tests",
        price_pennies: 5000,
        classes_per_period: 10,
        period_type: "monthly",
        organization_id: testOrganizationId,
        status: "active",
      })
      .select()
      .single();

    if (planError)
      throw new Error(
        `Failed to create test membership plan: ${planError.message}`,
      );
    testMembershipPlanId = membershipPlan.id;

    // Create test membership for the client
    const { data: membership, error: membershipError } = await supabase
      .from("customer_memberships")
      .insert({
        client_id: testClient.id, // Using client_id for client membership
        organization_id: testOrganizationId,
        membership_plan_id: testMembershipPlanId,
        status: "active",
        start_date: new Date().toISOString(),
        classes_per_period: 10,
        classes_used_this_period: 3, // Already used 3 classes
      })
      .select()
      .single();

    if (membershipError)
      throw new Error(
        `Failed to create test membership: ${membershipError.message}`,
      );
    testMembership = membership;

    // Create test class package
    const { data: classPackagePlan, error: packagePlanError } = await supabase
      .from("class_packages")
      .insert({
        name: "E2E Test Package",
        description: "Test class package for E2E tests",
        classes_included: 5,
        price_pennies: 8000, // £80.00
        organization_id: testOrganizationId,
        status: "active",
      })
      .select()
      .single();

    if (packagePlanError)
      throw new Error(
        `Failed to create test class package plan: ${packagePlanError.message}`,
      );

    const { data: customerClassPackage, error: packageError } = await supabase
      .from("customer_class_packages")
      .insert({
        client_id: testClient.id,
        organization_id: testOrganizationId,
        package_id: classPackagePlan.id,
        status: "active",
        classes_remaining: 3, // 2 already used out of 5
        classes_used: 2,
        purchased_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (packageError)
      throw new Error(
        `Failed to create test customer class package: ${packageError.message}`,
      );
    testClassPackage = customerClassPackage;

    // Create test class sessions for booking
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const dayAfter = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const classSessionsData = [
      {
        title: "Morning Yoga",
        start_time: new Date(
          tomorrow.getTime() + 9 * 60 * 60 * 1000,
        ).toISOString(), // 9 AM tomorrow
        end_time: new Date(
          tomorrow.getTime() + 10 * 60 * 60 * 1000,
        ).toISOString(), // 10 AM tomorrow
        capacity: 20,
        price: 2000, // £20.00 in pennies
        room: "Studio A",
        instructor: "Jane Smith",
        organization_id: testOrganizationId,
      },
      {
        title: "HIIT Training",
        start_time: new Date(
          tomorrow.getTime() + 18 * 60 * 60 * 1000,
        ).toISOString(), // 6 PM tomorrow
        end_time: new Date(
          tomorrow.getTime() + 19 * 60 * 60 * 1000,
        ).toISOString(), // 7 PM tomorrow
        capacity: 15,
        price: 2500, // £25.00 in pennies
        room: "Main Gym",
        instructor: "Mike Johnson",
        organization_id: testOrganizationId,
      },
      {
        title: "Pilates",
        start_time: new Date(
          dayAfter.getTime() + 10 * 60 * 60 * 1000,
        ).toISOString(), // 10 AM day after
        end_time: new Date(
          dayAfter.getTime() + 11 * 60 * 60 * 1000,
        ).toISOString(), // 11 AM day after
        capacity: 12,
        price: 1800, // £18.00 in pennies
        room: "Studio B",
        instructor: "Sarah Wilson",
        organization_id: testOrganizationId,
      },
    ];

    const { data: sessions, error: sessionsError } = await supabase
      .from("class_sessions")
      .insert(classSessionsData)
      .select();

    if (sessionsError)
      throw new Error(
        `Failed to create test class sessions: ${sessionsError.message}`,
      );
    testClassSessions = sessions;

    console.log("✅ Test data setup completed successfully");
    console.log(`📊 Created test client: ${testClient.email}`);
    console.log(`📊 Created test lead: ${testLead.email}`);
    console.log(`📊 Created ${testClassSessions.length} test class sessions`);
    console.log(
      `📊 Created membership with ${testMembership.classes_used_this_period}/${testMembership.classes_per_period} classes used`,
    );
  });

  test.afterAll(async () => {
    console.log("🧹 Cleaning up test data...");

    try {
      // Clean up bookings first (foreign key dependencies)
      if (testClient.id) {
        await supabase.from("bookings").delete().eq("client_id", testClient.id);
      }
      if (testLead.id) {
        await supabase.from("bookings").delete().eq("customer_id", testLead.id);
      }

      // Clean up memberships
      if (testMembership.id) {
        await supabase
          .from("customer_memberships")
          .delete()
          .eq("id", testMembership.id);
      }

      // Clean up class packages
      if (testClassPackage.id) {
        await supabase
          .from("customer_class_packages")
          .delete()
          .eq("id", testClassPackage.id);
      }
      if (testClassPackage.package_id) {
        await supabase
          .from("class_packages")
          .delete()
          .eq("id", testClassPackage.package_id);
      }

      // Clean up membership plan
      if (testMembershipPlanId) {
        await supabase
          .from("membership_plans")
          .delete()
          .eq("id", testMembershipPlanId);
      }

      // Clean up class sessions
      for (const session of testClassSessions) {
        await supabase.from("class_sessions").delete().eq("id", session.id);
      }

      // Clean up customers
      if (testClient.id) {
        await supabase.from("clients").delete().eq("id", testClient.id);
      }
      if (testLead.id) {
        await supabase.from("leads").delete().eq("id", testLead.id);
      }

      console.log("✅ Test data cleanup completed successfully");
    } catch (error) {
      console.error("❌ Error during test cleanup:", error);
    }
  });

  test("Should book a single class for a client from Members tab - Testing DB schema fixes", async ({
    page,
  }) => {
    console.log(
      "🧪 Testing single class booking for client - verifying dual customer architecture fix",
    );

    // Navigate to members page
    await page.goto(`${BASE_URL}/members`);

    // Wait for the page to load and find our test client
    await page.waitForSelector('[data-testid="members-list"]', {
      timeout: 10000,
    });

    // Look for our test client by email or name
    const clientRow = page.locator(`text="${testClient.email}"`).first();
    await expect(clientRow).toBeVisible({ timeout: 5000 });

    // Click on the client row to open details
    await clientRow.click();

    // Wait for client details modal
    await page.waitForSelector('[data-testid="client-details-modal"]', {
      timeout: 5000,
    });

    // Click "Book Class" button
    await page.click('[data-testid="book-class-btn"]');

    // Wait for booking modal - this should not show 400 errors anymore
    await page.waitForSelector('[data-testid="single-class-booking-modal"]', {
      timeout: 10000,
    });

    // Select the first test class session
    const firstClass = testClassSessions[0];
    await page.click(`[data-testid="class-session-${firstClass.id}"]`);

    // Verify membership payment option is available (should show classes remaining)
    const membershipOption = page.locator(
      `[data-testid="payment-method-membership-${testMembership.id}"]`,
    );
    await expect(membershipOption).toBeVisible();

    // Verify it shows correct remaining classes (10 - 3 = 7 remaining)
    await expect(
      page.locator('[data-testid="membership-classes-remaining"]'),
    ).toContainText("7 classes remaining");

    // Select membership payment
    await membershipOption.click();

    // Click continue to payment - this should not cause connection errors
    await page.click('[data-testid="continue-to-payment-btn"]');

    // Confirm booking - this should use client_id not customer_id
    await page.click('[data-testid="confirm-booking-btn"]');

    // Wait for success message - verifies no foreign key constraint violations
    await expect(page.locator('[data-testid="booking-success"]')).toBeVisible({
      timeout: 10000,
    });

    // Verify booking was created in database with correct client_id
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("client_id", testClient.id)
      .eq("class_session_id", firstClass.id)
      .single();

    expect(bookingError).toBeNull();
    expect(booking).toBeTruthy();
    expect(booking?.booking_status).toBe("confirmed");
    expect(booking?.client_id).toBe(testClient.id);
    expect(booking?.customer_id).toBeNull(); // Should be null for client bookings

    // Verify membership usage was updated correctly (3 + 1 = 4)
    const { data: updatedMembership } = await supabase
      .from("customer_memberships")
      .select("classes_used_this_period")
      .eq("id", testMembership.id)
      .single();

    expect(updatedMembership?.classes_used_this_period).toBe(4);

    console.log(
      "✅ Client booking test passed - dual customer architecture working correctly",
    );
  });

  test("Should book a single class for a lead - Testing customer_id field", async ({
    page,
  }) => {
    console.log(
      "🧪 Testing single class booking for lead - verifying customer_id support",
    );

    // Navigate to leads page
    await page.goto(`${BASE_URL}/leads`);

    // Wait for the page to load
    await page.waitForSelector('[data-testid="leads-list"]', {
      timeout: 10000,
    });

    // Look for our test lead
    const leadRow = page.locator(`text="${testLead.email}"`).first();
    await expect(leadRow).toBeVisible({ timeout: 5000 });

    // Click on the lead row
    await leadRow.click();

    // Wait for lead details modal
    await page.waitForSelector('[data-testid="lead-details-modal"]', {
      timeout: 5000,
    });

    // Click "Book Class" button
    await page.click('[data-testid="book-class-btn"]');

    // Wait for booking modal
    await page.waitForSelector('[data-testid="single-class-booking-modal"]', {
      timeout: 10000,
    });

    // Select the second test class session
    const secondClass = testClassSessions[1];
    await page.click(`[data-testid="class-session-${secondClass.id}"]`);

    // For leads, use free booking (no membership)
    await page.click('[data-testid="payment-method-free"]');

    // Click continue to payment
    await page.click('[data-testid="continue-to-payment-btn"]');

    // Confirm booking - this should use customer_id not client_id
    await page.click('[data-testid="confirm-booking-btn"]');

    // Wait for success message
    await expect(page.locator('[data-testid="booking-success"]')).toBeVisible({
      timeout: 10000,
    });

    // Verify booking was created with customer_id
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("customer_id", testLead.id)
      .eq("class_session_id", secondClass.id)
      .single();

    expect(bookingError).toBeNull();
    expect(booking).toBeTruthy();
    expect(booking?.booking_status).toBe("confirmed");
    expect(booking?.customer_id).toBe(testLead.id);
    expect(booking?.client_id).toBeNull(); // Should be null for lead bookings

    console.log(
      "✅ Lead booking test passed - customer_id field working correctly",
    );
  });

  test("Should use MultiClassBookingModal to book multiple classes - Testing bulk booking flow", async ({
    page,
  }) => {
    console.log(
      "🧪 Testing MultiClassBookingModal - bulk booking functionality",
    );

    await page.goto(`${BASE_URL}/members`);
    await page.waitForSelector('[data-testid="members-list"]', {
      timeout: 10000,
    });

    // Find and click our test client
    const clientRow = page.locator(`text="${testClient.email}"`).first();
    await clientRow.click();

    await page.waitForSelector('[data-testid="client-details-modal"]', {
      timeout: 5000,
    });

    // Click "Book Multiple Classes" button
    await page.click('[data-testid="book-multiple-classes-btn"]');

    // Wait for multi-class booking modal
    await page.waitForSelector('[data-testid="multi-class-booking-modal"]', {
      timeout: 10000,
    });

    // Select all available test classes
    for (let i = 0; i < Math.min(2, testClassSessions.length); i++) {
      const session = testClassSessions[i];
      await page.click(`[data-testid="class-checkbox-${session.id}"]`);
    }

    // Click continue to payment - this should not cause database errors
    await page.click('[data-testid="continue-to-payment-btn"]');

    // Wait for payment assignment step
    await page.waitForSelector('[data-testid="payment-assignment-step"]', {
      timeout: 5000,
    });

    // Assign payment methods to each selected class
    // First class: use membership (should decrement remaining classes)
    const firstClassPayment = page.locator(
      `[data-testid="class-payment-${testClassSessions[0].id}"]`,
    );
    await firstClassPayment
      .locator(`[data-testid="payment-method-membership-${testMembership.id}"]`)
      .click();

    // Second class: use free booking
    const secondClassPayment = page.locator(
      `[data-testid="class-payment-${testClassSessions[1].id}"]`,
    );
    await secondClassPayment
      .locator('[data-testid="payment-method-free"]')
      .click();

    // Confirm all bookings
    await page.click('[data-testid="confirm-bookings-btn"]');

    // Wait for success message
    await expect(page.locator('[data-testid="bookings-success"]')).toBeVisible({
      timeout: 10000,
    });

    // Verify both bookings were created correctly
    const { data: bookings } = await supabase
      .from("bookings")
      .select("*")
      .eq("client_id", testClient.id)
      .in("class_session_id", [
        testClassSessions[0].id,
        testClassSessions[1].id,
      ]);

    expect(bookings).toHaveLength(2);
    expect(bookings?.every((b) => b.booking_status === "confirmed")).toBe(true);
    expect(bookings?.every((b) => b.client_id === testClient.id)).toBe(true);

    console.log(
      "✅ Multi-class booking test passed - bulk booking flow working correctly",
    );
  });

  test("Should use class package payment and track remaining classes - Testing package credit tracking", async ({
    page,
  }) => {
    console.log("🧪 Testing class package payment and credit tracking");

    await page.goto(`${BASE_URL}/members`);
    await page.waitForSelector('[data-testid="members-list"]', {
      timeout: 10000,
    });

    // Find and click our test client
    const clientRow = page.locator(`text="${testClient.email}"`).first();
    await clientRow.click();

    await page.waitForSelector('[data-testid="client-details-modal"]', {
      timeout: 5000,
    });
    await page.click('[data-testid="book-class-btn"]');
    await page.waitForSelector('[data-testid="single-class-booking-modal"]', {
      timeout: 10000,
    });

    // Select a class
    await page.click(
      `[data-testid="class-session-${testClassSessions[0].id}"]`,
    );

    // Verify class package option is available and shows correct remaining classes
    const packageOption = page.locator(
      `[data-testid="payment-method-package-${testClassPackage.id}"]`,
    );
    await expect(packageOption).toBeVisible();

    // Should show "3 classes remaining"
    await expect(
      page.locator('[data-testid="package-classes-remaining"]'),
    ).toContainText("3 classes remaining");

    // Select package payment
    await packageOption.click();

    await page.click('[data-testid="continue-to-payment-btn"]');
    await page.click('[data-testid="confirm-booking-btn"]');

    // Wait for success
    await expect(page.locator('[data-testid="booking-success"]')).toBeVisible({
      timeout: 10000,
    });

    // Verify booking was created correctly
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("client_id", testClient.id)
      .eq("class_session_id", testClassSessions[0].id)
      .single();

    expect(bookingError).toBeNull();
    expect(booking?.booking_status).toBe("confirmed");
    expect(booking?.payment_status).toBe("succeeded"); // Package payments are pre-paid

    // Verify package usage was updated (3 - 1 = 2 remaining, 2 + 1 = 3 used)
    const { data: updatedPackage } = await supabase
      .from("customer_class_packages")
      .select("classes_remaining, classes_used")
      .eq("id", testClassPackage.id)
      .single();

    expect(updatedPackage?.classes_remaining).toBe(2);
    expect(updatedPackage?.classes_used).toBe(3);

    console.log(
      "✅ Class package payment test passed - credit tracking working correctly",
    );
  });

  test("Should prevent 'already booked' false positives - Testing phantom booking fix", async ({
    page,
  }) => {
    console.log(
      "🧪 Testing prevention of false positive 'already booked' messages",
    );

    // Create a legitimate booking first
    const { data: existingBooking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        client_id: testClient.id,
        class_session_id: testClassSessions[2].id, // Use third class session
        organization_id: testOrganizationId,
        booking_status: "confirmed",
        payment_status: "succeeded",
      })
      .select()
      .single();

    expect(bookingError).toBeNull();

    await page.goto(`${BASE_URL}/members`);
    await page.waitForSelector('[data-testid="members-list"]', {
      timeout: 10000,
    });

    const clientRow = page.locator(`text="${testClient.email}"`).first();
    await clientRow.click();

    await page.waitForSelector('[data-testid="client-details-modal"]', {
      timeout: 5000,
    });
    await page.click('[data-testid="book-class-btn"]');
    await page.waitForSelector('[data-testid="single-class-booking-modal"]', {
      timeout: 10000,
    });

    // Try to book the same class - should show already booked message
    await page.click(
      `[data-testid="class-session-${testClassSessions[2].id}"]`,
    );

    // Should show already booked message for the legitimate booking
    await expect(
      page.locator('[data-testid="already-booked-message"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="already-booked-message"]'),
    ).toContainText("already booked");

    // Try to book a different class - should NOT show already booked message
    // (This tests that phantom bookings with NULL class_session_ids don't interfere)
    const availableClassIndex = testClassSessions.findIndex(
      (s) => s.id !== testClassSessions[2].id,
    );
    await page.click(
      `[data-testid="class-session-${testClassSessions[availableClassIndex].id}"]`,
    );

    // Should NOT show already booked message for different class
    await expect(
      page.locator('[data-testid="already-booked-message"]'),
    ).not.toBeVisible();

    // Should be able to select payment method and proceed
    await page.click('[data-testid="payment-method-free"]');
    await page.click('[data-testid="continue-to-payment-btn"]');

    // This should work without errors (no phantom bookings blocking)
    await expect(
      page.locator('[data-testid="confirm-booking-btn"]'),
    ).toBeEnabled();

    // Clean up the test booking
    await supabase.from("bookings").delete().eq("id", existingBooking.id);

    console.log(
      "✅ Phantom booking prevention test passed - no false positives",
    );
  });

  test("Should track membership usage correctly - Testing classes_used_this_period updates", async ({
    page,
  }) => {
    console.log("🧪 Testing membership usage tracking accuracy");

    // Get current membership usage
    const { data: membershipBefore } = await supabase
      .from("customer_memberships")
      .select("classes_used_this_period")
      .eq("id", testMembership.id)
      .single();

    const usageBefore = membershipBefore?.classes_used_this_period || 0;
    console.log(`📊 Membership usage before booking: ${usageBefore}`);

    await page.goto(`${BASE_URL}/members`);
    await page.waitForSelector('[data-testid="members-list"]', {
      timeout: 10000,
    });

    const clientRow = page.locator(`text="${testClient.email}"`).first();
    await clientRow.click();

    await page.waitForSelector('[data-testid="client-details-modal"]', {
      timeout: 5000,
    });
    await page.click('[data-testid="book-class-btn"]');
    await page.waitForSelector('[data-testid="single-class-booking-modal"]', {
      timeout: 10000,
    });

    // Find an available class (not already booked)
    const availableClass =
      testClassSessions.find(async (session) => {
        const { data: existingBooking } = await supabase
          .from("bookings")
          .select("id")
          .eq("client_id", testClient.id)
          .eq("class_session_id", session.id)
          .single();
        return !existingBooking;
      }) || testClassSessions[0];

    await page.click(`[data-testid="class-session-${availableClass.id}"]`);

    // Use membership payment
    await page.click(
      `[data-testid="payment-method-membership-${testMembership.id}"]`,
    );

    // Verify remaining classes display is correct
    const expectedRemaining =
      testMembership.classes_per_period - usageBefore - 1;
    await expect(
      page.locator('[data-testid="membership-classes-remaining"]'),
    ).toContainText(`${expectedRemaining} classes remaining`);

    await page.click('[data-testid="continue-to-payment-btn"]');
    await page.click('[data-testid="confirm-booking-btn"]');

    // Wait for booking confirmation
    await expect(page.locator('[data-testid="booking-success"]')).toBeVisible({
      timeout: 10000,
    });

    // Verify membership usage was incremented correctly
    const { data: membershipAfter } = await supabase
      .from("customer_memberships")
      .select("classes_used_this_period")
      .eq("id", testMembership.id)
      .single();

    const usageAfter = membershipAfter?.classes_used_this_period || 0;
    console.log(`📊 Membership usage after booking: ${usageAfter}`);

    expect(usageAfter).toBe(usageBefore + 1);

    console.log(
      "✅ Membership usage tracking test passed - accurate increment",
    );
  });

  test("Should handle card payment flow without database errors - Testing payment processing", async ({
    page,
  }) => {
    console.log(
      "🧪 Testing card payment flow - verifying no connection errors",
    );

    await page.goto(`${BASE_URL}/leads`);
    await page.waitForSelector('[data-testid="leads-list"]', {
      timeout: 10000,
    });

    const leadRow = page.locator(`text="${testLead.email}"`).first();
    await leadRow.click();

    await page.waitForSelector('[data-testid="lead-details-modal"]', {
      timeout: 5000,
    });
    await page.click('[data-testid="book-class-btn"]');
    await page.waitForSelector('[data-testid="single-class-booking-modal"]', {
      timeout: 10000,
    });

    // Select a class with a price
    const paidClass =
      testClassSessions.find((s) => s.price > 0) || testClassSessions[0];
    await page.click(`[data-testid="class-session-${paidClass.id}"]`);

    // Select card payment method
    await page.click('[data-testid="payment-method-card"]');

    // Verify price is displayed correctly
    const expectedPrice = `£${(paidClass.price / 100).toFixed(2)}`;
    await expect(page.locator('[data-testid="payment-price"]')).toContainText(
      expectedPrice,
    );

    // Click continue to payment - should not cause connection errors
    await page.click('[data-testid="continue-to-payment-btn"]');

    // Should reach payment processing step without errors
    // (In a real test, you'd integrate with Stripe test mode here)
    await expect(
      page.locator('[data-testid="payment-processing"]'),
    ).toBeVisible({ timeout: 5000 });

    console.log("✅ Card payment flow test passed - no connection errors");
  });

  test("Should handle Continue to Payment flow without 400 errors - Testing API endpoints", async ({
    page,
  }) => {
    console.log(
      "🧪 Testing Continue to Payment flow - verifying no API errors",
    );

    // Listen for network requests to catch any 400 errors
    const failedRequests: string[] = [];
    page.on("response", (response) => {
      if (response.status() >= 400) {
        failedRequests.push(`${response.status()} - ${response.url()}`);
        console.error(
          `❌ Failed request: ${response.status()} ${response.url()}`,
        );
      }
    });

    await page.goto(`${BASE_URL}/members`);
    await page.waitForSelector('[data-testid="members-list"]', {
      timeout: 10000,
    });

    const clientRow = page.locator(`text="${testClient.email}"`).first();
    await clientRow.click();

    await page.waitForSelector('[data-testid="client-details-modal"]', {
      timeout: 5000,
    });
    await page.click('[data-testid="book-class-btn"]');
    await page.waitForSelector('[data-testid="single-class-booking-modal"]', {
      timeout: 10000,
    });

    // Select class and payment method
    await page.click(
      `[data-testid="class-session-${testClassSessions[0].id}"]`,
    );
    await page.click('[data-testid="payment-method-free"]');

    // This is the critical step that was failing before the fix
    await page.click('[data-testid="continue-to-payment-btn"]');

    // Wait a moment for any API calls to complete
    await page.waitForTimeout(2000);

    // Verify no 400 errors occurred during the flow
    expect(failedRequests.filter((req) => req.startsWith("400"))).toHaveLength(
      0,
    );

    // Should reach confirmation step successfully
    await expect(
      page.locator('[data-testid="confirm-booking-btn"]'),
    ).toBeVisible({ timeout: 5000 });

    console.log("✅ Continue to Payment flow test passed - no 400 errors");
  });

  test("Should validate database schema fixes work correctly - Integration test", async ({
    page,
  }) => {
    console.log("🧪 Testing database schema fixes - comprehensive validation");

    // Test both client_id and customer_id constraints work correctly

    // 1. Test client booking creates record with client_id only
    const clientBookingData = {
      client_id: testClient.id,
      class_session_id: testClassSessions[0].id,
      organization_id: testOrganizationId,
      booking_status: "confirmed",
      payment_status: "succeeded",
    };

    const { data: clientBooking, error: clientError } = await supabase
      .from("bookings")
      .insert(clientBookingData)
      .select()
      .single();

    expect(clientError).toBeNull();
    expect(clientBooking?.client_id).toBe(testClient.id);
    expect(clientBooking?.customer_id).toBeNull();

    // 2. Test lead booking creates record with customer_id only
    const leadBookingData = {
      customer_id: testLead.id,
      class_session_id: testClassSessions[1].id,
      organization_id: testOrganizationId,
      booking_status: "confirmed",
      payment_status: "succeeded",
    };

    const { data: leadBooking, error: leadError } = await supabase
      .from("bookings")
      .insert(leadBookingData)
      .select()
      .single();

    expect(leadError).toBeNull();
    expect(leadBooking?.customer_id).toBe(testLead.id);
    expect(leadBooking?.client_id).toBeNull();

    // 3. Test constraint prevents invalid bookings (both fields set)
    const invalidBookingData = {
      client_id: testClient.id,
      customer_id: testLead.id, // Both set - should violate constraint
      class_session_id: testClassSessions[2].id,
      organization_id: testOrganizationId,
      booking_status: "confirmed",
      payment_status: "succeeded",
    };

    const { error: constraintError } = await supabase
      .from("bookings")
      .insert(invalidBookingData);

    expect(constraintError).toBeTruthy(); // Should fail due to constraint
    expect(constraintError?.message).toContain(
      "check_customer_or_client_booking",
    );

    // 4. Test constraint prevents null bookings (neither field set)
    const nullBookingData = {
      class_session_id: testClassSessions[2].id,
      organization_id: testOrganizationId,
      booking_status: "confirmed",
      payment_status: "succeeded",
    };

    const { error: nullError } = await supabase
      .from("bookings")
      .insert(nullBookingData);

    expect(nullError).toBeTruthy(); // Should fail due to constraint

    // Clean up test bookings
    if (clientBooking)
      await supabase.from("bookings").delete().eq("id", clientBooking.id);
    if (leadBooking)
      await supabase.from("bookings").delete().eq("id", leadBooking.id);

    console.log(
      "✅ Database schema validation test passed - constraints working correctly",
    );
  });
});

test.describe("Booking Flow Performance and Reliability Tests", () => {
  test("Should handle booking modal load within 3 seconds - Performance test", async ({
    page,
  }) => {
    const startTime = Date.now();

    await page.goto(`${BASE_URL}/members`);
    await page.waitForSelector('[data-testid="members-list"]', {
      timeout: 10000,
    });

    // Click first available client booking button
    await page.click('[data-testid="book-class-btn"]:first-of-type');

    // Wait for booking modal to fully load
    await page.waitForSelector('[data-testid="single-class-booking-modal"]', {
      timeout: 10000,
    });
    await page.waitForSelector('[data-testid="class-sessions-list"]', {
      timeout: 5000,
    });

    const loadTime = Date.now() - startTime;
    console.log(`📊 Booking modal load time: ${loadTime}ms`);

    expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
  });

  test("Should recover from network failures gracefully - Reliability test", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/members`);
    await page.waitForSelector('[data-testid="members-list"]', {
      timeout: 10000,
    });

    // Simulate network failure during booking
    await page.route("**/api/**", (route) => {
      if (route.request().method() === "POST") {
        route.abort("failed");
      } else {
        route.continue();
      }
    });

    await page.click('[data-testid="book-class-btn"]:first-of-type');
    await page.waitForSelector('[data-testid="single-class-booking-modal"]', {
      timeout: 10000,
    });

    // Try to book - should show error message gracefully
    await page.click('[data-testid="class-session"]:first-of-type');
    await page.click('[data-testid="payment-method-free"]');
    await page.click('[data-testid="continue-to-payment-btn"]');
    await page.click('[data-testid="confirm-booking-btn"]');

    // Should show error message instead of crashing
    await expect(
      page.locator(
        '[data-testid="booking-error"], [data-testid="network-error"]',
      ),
    ).toBeVisible({ timeout: 10000 });

    console.log("✅ Network failure recovery test passed");
  });
});
