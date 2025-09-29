import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireOrgAccess } from "@/app/lib/auth/organization";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createAdminClient();
    const searchParams = request.nextUrl.searchParams;

    // Get date range from query params
    const startDate =
      searchParams.get("startDate") ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = searchParams.get("endDate") || new Date().toISOString();
    // Get organization ID from authenticated user
    let organizationId: string;
    try {
      const { organizationId: orgId } = await requireOrgAccess();
      organizationId = orgId;
    } catch (e) {
      return NextResponse.json(
        { error: "No organization found. Please complete onboarding." },
        { status: 401 },
      );
    }

    // Fetch revenue data from multiple sources
    const [membershipsResult, bookingsResult, transactionsResult] =
      await Promise.all([
        // Membership revenue
        supabase
          .from("customer_memberships")
          .select(
            `
          id,
          status,
          payment_status,
          created_at,
          next_billing_date,
          membership_plan:membership_plans(
            id,
            name,
            price_pennies,
            billing_period
          ),
          customer:leads(
            id,
            name,
            email
          )
        `,
          )
          .eq("organization_id", organizationId)
          .gte("created_at", startDate)
          .lte("created_at", endDate),

        // Class booking revenue
        supabase
          .from("bookings")
          .select(
            `
          id,
          payment_status,
          payment_amount,
          created_at,
          class_session:class_sessions(
            program:programs(
              name,
              price_pennies
            )
          ),
          customer:leads(
            id,
            name,
            email
          )
        `,
          )
          .gte("created_at", startDate)
          .lte("created_at", endDate),

        // Direct payment transactions
        supabase
          .from("payment_transactions")
          .select(
            `
          id,
          amount,
          status,
          type,
          description,
          created_at,
          customer:leads(
            id,
            name,
            email
          )
        `,
          )
          .eq("organization_id", organizationId)
          .gte("created_at", startDate)
          .lte("created_at", endDate),
      ]);

    const memberships = membershipsResult.data || [];
    const bookings = bookingsResult.data || [];
    const transactions = transactionsResult.data || [];

    // Calculate revenue metrics
    const membershipRevenue =
      memberships
        .filter((m) => m.payment_status === "paid")
        .reduce((sum, m) => sum + (m.membership_plan?.price_pennies || 0), 0) /
      100;

    const bookingRevenue =
      bookings
        .filter((b) => b.payment_status === "paid")
        .reduce(
          (sum, b) =>
            sum +
            (b.payment_amount || b.class_session?.program?.price_pennies || 0),
          0,
        ) / 100;

    const transactionRevenue =
      transactions
        .filter((t) => t.status === "completed")
        .reduce((sum, t) => sum + t.amount, 0) / 100;

    const totalRevenue =
      membershipRevenue + bookingRevenue + transactionRevenue;

    // Calculate pending revenue
    const pendingMemberships =
      memberships
        .filter((m) => m.payment_status === "pending")
        .reduce((sum, m) => sum + (m.membership_plan?.price_pennies || 0), 0) /
      100;

    const pendingBookings =
      bookings
        .filter((b) => b.payment_status === "pending")
        .reduce(
          (sum, b) =>
            sum +
            (b.payment_amount || b.class_session?.program?.price_pennies || 0),
          0,
        ) / 100;

    const totalPending = pendingMemberships + pendingBookings;

    // Revenue by type breakdown
    const revenueByType = {
      Memberships: membershipRevenue,
      "Class Bookings": bookingRevenue,
      "Other Transactions": transactionRevenue,
    };

    // Daily revenue trend
    const dailyRevenue: Record<string, number> = {};

    [...memberships, ...bookings, ...transactions].forEach((item) => {
      const date = new Date(item.created_at).toLocaleDateString("en-GB");
      let amount = 0;

      if ("membership_plan" in item && item.payment_status === "paid") {
        amount = (item.membership_plan?.price_pennies || 0) / 100;
      } else if ("payment_amount" in item && item.payment_status === "paid") {
        amount = (item.payment_amount || 0) / 100;
      } else if ("amount" in item && item.status === "completed") {
        amount = item.amount / 100;
      }

      dailyRevenue[date] = (dailyRevenue[date] || 0) + amount;
    });

    const dailyTrend = Object.entries(dailyRevenue)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Top revenue customers
    const customerRevenue: Record<string, any> = {};

    [...memberships, ...bookings, ...transactions].forEach((item) => {
      if (!item.customer) return;

      const customerId = item.customer.id;
      if (!customerRevenue[customerId]) {
        customerRevenue[customerId] = {
          id: customerId,
          name: item.customer.name,
          email: item.customer.email,
          totalRevenue: 0,
          transactionCount: 0,
        };
      }

      let amount = 0;
      if ("membership_plan" in item && item.payment_status === "paid") {
        amount = (item.membership_plan?.price_pennies || 0) / 100;
      } else if ("payment_amount" in item && item.payment_status === "paid") {
        amount = (item.payment_amount || 0) / 100;
      } else if ("amount" in item && item.status === "completed") {
        amount = item.amount / 100;
      }

      customerRevenue[customerId].totalRevenue += amount;
      customerRevenue[customerId].transactionCount++;
    });

    const topCustomers = Object.values(customerRevenue)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    // Monthly recurring revenue (MRR) calculation
    const activeMemberships = await supabase
      .from("customer_memberships")
      .select(
        `
        membership_plan:membership_plans(
          price_pennies,
          billing_period
        )
      `,
      )
      .eq("organization_id", organizationId)
      .eq("status", "active");

    const mrr = (activeMemberships.data || []).reduce((sum, m) => {
      const price = (m.membership_plan?.price_pennies || 0) / 100;
      const period = m.membership_plan?.billing_period || "monthly";

      // Convert to monthly
      if (period === "weekly") return sum + price * 4.33;
      if (period === "yearly") return sum + price / 12;
      return sum + price;
    }, 0);

    return NextResponse.json({
      summary: {
        totalRevenue,
        totalPending,
        membershipRevenue,
        bookingRevenue,
        transactionRevenue,
        mrr,
        dateRange: {
          start: startDate,
          end: endDate,
        },
      },
      revenueByType: Object.entries(revenueByType).map(([type, amount]) => ({
        type,
        amount,
      })),
      dailyTrend,
      topCustomers,
      rawData: {
        memberships,
        bookings,
        transactions,
      },
    });
  } catch (error: any) {
    console.error("Revenue report error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
