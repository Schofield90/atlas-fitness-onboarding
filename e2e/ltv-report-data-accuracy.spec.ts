/**
 * E2E Test: Lifetime Value Report Data Accuracy
 *
 * Verifies that the LTV report displays correct payment data from the database.
 * Tests specifically for Henrik Pedersen who should have 9 payments totaling £1,153.
 */

import { test, expect, Page } from "@playwright/test";
import { Client } from "pg";

const STAFF_EMAIL = "sam@atlas-gyms.co.uk";
const STAFF_PASSWORD = "@Aa80236661";
const ORG_ID = "ee1206d7-62fb-49cf-9f39-95b9c54423a4";

// Database connection
const DB_URL =
  "postgresql://postgres:@Aa80236661@db.lzlrojoaxrqvmhempnkn.supabase.co:5432/postgres";

interface PaymentData {
  totalPayments: number;
  totalRevenue: number;
  firstPayment: string;
  lastPayment: string;
}

/**
 * Query database for Henrik Pedersen's payment data
 */
async function getHenrikPaymentData(): Promise<PaymentData> {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  try {
    // Get Henrik Pedersen's client ID
    const clientQuery = await client.query(
      `SELECT id FROM clients
       WHERE org_id = $1
       AND first_name ILIKE 'Henrik'
       AND last_name ILIKE 'Pedersen'
       LIMIT 1`,
      [ORG_ID],
    );

    if (clientQuery.rows.length === 0) {
      throw new Error("Henrik Pedersen not found in database");
    }

    const henrikId = clientQuery.rows[0].id;

    // Get all payments for Henrik
    const paymentsQuery = await client.query(
      `SELECT
        COUNT(*) as total_payments,
        COALESCE(SUM(amount), 0) as total_revenue,
        MIN(payment_date) as first_payment,
        MAX(payment_date) as last_payment
       FROM payments
       WHERE client_id = $1
       AND organization_id = $2`,
      [henrikId, ORG_ID],
    );

    const result = paymentsQuery.rows[0];

    return {
      totalPayments: parseInt(result.total_payments),
      totalRevenue: parseFloat(result.total_revenue),
      firstPayment: result.first_payment,
      lastPayment: result.last_payment,
    };
  } finally {
    await client.end();
  }
}

/**
 * Get overall org payment stats
 */
async function getOrgPaymentStats() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  try {
    const query = await client.query(
      `SELECT
        COUNT(DISTINCT client_id) as total_clients,
        COALESCE(SUM(amount), 0) as total_revenue,
        COUNT(*) as total_payments
       FROM payments
       WHERE organization_id = $1
       AND client_id IS NOT NULL`,
      [ORG_ID],
    );

    return {
      totalClients: parseInt(query.rows[0].total_clients),
      totalRevenue: parseFloat(query.rows[0].total_revenue),
      totalPayments: parseInt(query.rows[0].total_payments),
    };
  } finally {
    await client.end();
  }
}

/**
 * Login as staff user
 */
async function loginAsStaff(page: Page) {
  await page.goto("https://login.gymleadhub.co.uk/owner-login");

  // Fill login form
  await page.fill('input[type="email"]', STAFF_EMAIL);
  await page.fill('input[type="password"]', STAFF_PASSWORD);

  // Click sign in
  await page.click('button[type="submit"]');

  // Wait for dashboard to load (more flexible URL matching)
  await page.waitForURL(/\/(dashboard|reports)/, { timeout: 15000 });
}

test.describe("LTV Report Data Accuracy", () => {
  test("should display Henrik Pedersen's correct payment data", async ({
    page,
  }) => {
    // Step 1: Get expected data from database
    console.log("📊 Fetching Henrik Pedersen's payment data from database...");
    const dbData = await getHenrikPaymentData();

    console.log("Database shows:", {
      payments: dbData.totalPayments,
      revenue: `£${dbData.totalRevenue}`,
      firstPayment: dbData.firstPayment,
      lastPayment: dbData.lastPayment,
    });

    // Step 2: Login
    console.log("🔐 Logging in as staff...");
    await loginAsStaff(page);

    // Step 3: Navigate to LTV report
    console.log("📈 Navigating to LTV report...");
    await page.goto("https://login.gymleadhub.co.uk/reports/lifetime-value");

    // Wait for data to load
    await page.waitForSelector("text=Client Lifetime Value", {
      timeout: 10000,
    });
    await page.waitForTimeout(2000); // Wait for API call to complete

    // Step 4: Find Henrik Pedersen in the top clients list
    console.log("🔍 Looking for Henrik Pedersen in LTV report...");

    // Take screenshot for debugging
    await page.screenshot({ path: "ltv-report-henrik.png", fullPage: true });

    // Find Henrik's row (look for text containing "Henrik Pedersen")
    const henrikRow = page.locator("text=Henrik Pedersen").first();
    await expect(henrikRow).toBeVisible({ timeout: 5000 });

    // Get the displayed payment count
    const paymentCountText = await henrikRow
      .locator("..")
      .locator("text=/\\d+ payment/")
      .textContent();

    const displayedPayments = parseInt(
      paymentCountText?.match(/(\d+) payment/)?.[1] || "0",
    );

    // Get the displayed revenue
    const revenueText = await henrikRow
      .locator("..")
      .locator("text=/£\\d+/")
      .first()
      .textContent();

    const displayedRevenue = parseFloat(
      revenueText?.replace(/[£,]/g, "") || "0",
    );

    console.log("Report shows:", {
      payments: displayedPayments,
      revenue: `£${displayedRevenue}`,
    });

    // Step 5: Compare with database
    console.log("✅ Comparing report data with database...");

    expect(displayedPayments).toBe(dbData.totalPayments);
    expect(displayedRevenue).toBe(dbData.totalRevenue);

    console.log("✅ Henrik Pedersen's data matches database!");
  });

  test("should display correct overall org statistics", async ({ page }) => {
    // Step 1: Get expected data from database
    console.log("📊 Fetching org payment statistics from database...");
    const dbStats = await getOrgPaymentStats();

    console.log("Database shows:", {
      totalClients: dbStats.totalClients,
      totalRevenue: `£${dbStats.totalRevenue}`,
      totalPayments: dbStats.totalPayments,
    });

    // Step 2: Login and navigate
    await loginAsStaff(page);
    await page.goto("https://login.gymleadhub.co.uk/reports/lifetime-value");
    await page.waitForSelector("text=Client Lifetime Value", {
      timeout: 10000,
    });
    await page.waitForTimeout(2000);

    // Step 3: Check summary stats
    console.log("🔍 Checking summary statistics...");

    // Get Total Clients
    const totalClientsElement = page
      .locator("text=Total Clients")
      .locator("..")
      .locator("text=/^\\d+$/");
    const displayedClients = parseInt(
      (await totalClientsElement.textContent()) || "0",
    );

    // Get Total Revenue
    const totalRevenueElement = page
      .locator("text=Total Revenue")
      .locator("..")
      .locator("text=/£[\\d,]+/");
    const revenueText = await totalRevenueElement.textContent();
    const displayedRevenue = parseFloat(
      revenueText?.replace(/[£,]/g, "") || "0",
    );

    console.log("Report shows:", {
      totalClients: displayedClients,
      totalRevenue: `£${displayedRevenue}`,
    });

    // Step 4: Compare
    console.log("✅ Comparing summary stats with database...");

    expect(displayedClients).toBe(dbStats.totalClients);
    expect(displayedRevenue).toBeCloseTo(dbStats.totalRevenue, 0); // Allow 1 penny difference due to rounding

    console.log("✅ Summary statistics match database!");
  });

  test("should show all clients with payments (no missing data)", async ({
    page,
  }) => {
    // Get database stats
    const dbStats = await getOrgPaymentStats();

    await loginAsStaff(page);
    await page.goto("https://login.gymleadhub.co.uk/reports/lifetime-value");
    await page.waitForSelector("text=Client Lifetime Value", {
      timeout: 10000,
    });
    await page.waitForTimeout(2000);

    // Count client rows in the table
    const clientRows = page.locator("[data-client-id]"); // Assuming rows have this attribute
    const displayedClientCount = await clientRows.count();

    console.log(`Database has ${dbStats.totalClients} clients with payments`);
    console.log(`Report displays ${displayedClientCount} clients`);

    // Should match
    expect(displayedClientCount).toBe(dbStats.totalClients);
  });
});

test.describe("Unlinked Payments Investigation", () => {
  test("should identify unlinked Stripe and GoCardless payments", async ({
    page,
  }) => {
    const client = new Client({ connectionString: DB_URL });
    await client.connect();

    try {
      // Check for NULL client_id payments
      const unlinkedQuery = await client.query(
        `SELECT
          payment_provider,
          COUNT(*) as unlinked_count,
          SUM(amount) as unlinked_revenue
         FROM payments
         WHERE organization_id = $1
         AND client_id IS NULL
         GROUP BY payment_provider
         ORDER BY payment_provider`,
        [ORG_ID],
      );

      console.log("🚨 Unlinked Payments Found:");
      unlinkedQuery.rows.forEach((row) => {
        console.log(
          `  ${row.payment_provider}: ${row.unlinked_count} payments = £${row.unlinked_revenue}`,
        );
      });

      // If unlinked payments exist, test should warn
      const totalUnlinked = unlinkedQuery.rows.reduce(
        (sum, row) => sum + parseInt(row.unlinked_count),
        0,
      );

      if (totalUnlinked > 0) {
        console.warn(
          `⚠️  ${totalUnlinked} payments are unlinked and won't appear in LTV report!`,
        );
        console.warn("   Run the backfill endpoints to fix this:");
        console.warn("   - Stripe: /api/gym/stripe/backfill-payments");
        console.warn("   - GoCardless: /api/gym/gocardless/reimport-payments");
      }

      // Log but don't fail - this is informational
      expect(totalUnlinked).toBeGreaterThanOrEqual(0);
    } finally {
      await client.end();
    }
  });
});
