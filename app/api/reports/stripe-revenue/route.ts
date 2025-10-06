import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireOrgAccess } from "@/app/lib/auth/organization";

export const dynamic = "force-dynamic";

/**
 * Enhanced revenue reporting using multi-provider data
 * Data sources:
 * - payments table (from Stripe + GoCardless imports)
 * - customer_memberships (linked to Stripe/GoCardless subscriptions)
 * - membership_plans (auto-created from Stripe/GoCardless prices)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createAdminClient();
    const searchParams = request.nextUrl.searchParams;

    // Get date range
    const startDate =
      searchParams.get("startDate") ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = searchParams.get("endDate") || new Date().toISOString();

    // Get organization ID
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

    // Fetch ALL payments (Stripe + GoCardless)
    const { data: payments } = await supabase
      .from("payments")
      .select(
        `
        id,
        amount,
        currency,
        status,
        payment_method,
        payment_provider,
        created_at,
        client_id,
        user_id,
        metadata
      `,
      )
      .eq("organization_id", organizationId)
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .eq("status", "succeeded");

    // Fetch active memberships (all providers)
    const { data: memberships } = await supabase
      .from("customer_memberships")
      .select(
        `
        id,
        status,
        payment_provider,
        stripe_subscription_id,
        provider_subscription_id,
        start_date,
        next_billing_date,
        client_id,
        membership_plan:membership_plans(
          id,
          name,
          price,
          price_pennies,
          billing_period,
          payment_provider,
          stripe_price_id,
          provider_price_id
        )
      `,
      )
      .eq("organization_id", organizationId)
      .in("status", ["active", "trial"]);

    // Calculate total revenue from Stripe payments
    const totalRevenue = (payments || []).reduce(
      (sum, p) => sum + (p.amount || 0),
      0,
    );

    // Revenue by payment method
    const revenueByMethod: Record<string, number> = {};
    (payments || []).forEach((payment) => {
      const method = payment.payment_method || "unknown";
      revenueByMethod[method] = (revenueByMethod[method] || 0) + payment.amount;
    });

    // Revenue by provider
    const revenueByProvider: Record<string, number> = {};
    (payments || []).forEach((payment) => {
      const provider = payment.payment_provider || "stripe";
      revenueByProvider[provider] =
        (revenueByProvider[provider] || 0) + payment.amount;
    });

    // Daily revenue trend from Stripe payments
    const dailyRevenue: Record<string, number> = {};
    (payments || []).forEach((payment) => {
      const date = new Date(payment.created_at).toISOString().split("T")[0];
      dailyRevenue[date] = (dailyRevenue[date] || 0) + payment.amount;
    });

    const dailyTrend = Object.entries(dailyRevenue)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate MRR (Monthly Recurring Revenue) from active Stripe subscriptions
    const mrr = (memberships || []).reduce((sum, m) => {
      const price = m.membership_plan?.price || 0;
      const period = m.membership_plan?.billing_period || "monthly";

      // Convert to monthly
      if (period === "weekly") return sum + price * 4.33;
      if (period === "yearly") return sum + price / 12;
      if (period === "quarterly") return sum + price / 3;
      return sum + price;
    }, 0);

    // Calculate ARR (Annual Recurring Revenue)
    const arr = mrr * 12;

    // Revenue by membership plan
    const revenueByPlan: Record<
      string,
      { name: string; revenue: number; count: number }
    > = {};
    (memberships || []).forEach((membership) => {
      if (membership.membership_plan) {
        const planId = membership.membership_plan.id;
        if (!revenueByPlan[planId]) {
          revenueByPlan[planId] = {
            name: membership.membership_plan.name,
            revenue: 0,
            count: 0,
          };
        }
        revenueByPlan[planId].revenue += membership.membership_plan.price;
        revenueByPlan[planId].count++;
      }
    });

    // Active subscriptions count
    const activeSubscriptions = (memberships || []).filter(
      (m) => m.status === "active",
    ).length;
    const trialSubscriptions = (memberships || []).filter(
      (m) => m.status === "trial",
    ).length;

    // Payment success rate (all time for organization)
    const { data: allPayments } = await supabase
      .from("payments")
      .select("status")
      .eq("organization_id", organizationId);

    const totalPayments = allPayments?.length || 0;
    const successfulPayments =
      allPayments?.filter((p) => p.status === "succeeded").length || 0;
    const paymentSuccessRate =
      totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0;

    // Customer Lifetime Value (simplified - average revenue per customer)
    const { data: clients } = await supabase
      .from("clients")
      .select("id")
      .eq("org_id", organizationId);

    const totalCustomers = clients?.length || 0;
    const averageCustomerValue = totalCustomers > 0 ? mrr / totalCustomers : 0;

    // Churn analysis (memberships cancelled in date range)
    const { data: cancelledMemberships } = await supabase
      .from("customer_memberships")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("status", "cancelled")
      .gte("updated_at", startDate)
      .lte("updated_at", endDate);

    const churnedCount = cancelledMemberships?.length || 0;
    const totalActive = activeSubscriptions + trialSubscriptions;
    const churnRate = totalActive > 0 ? (churnedCount / totalActive) * 100 : 0;

    return NextResponse.json({
      success: true,
      summary: {
        totalRevenue,
        mrr: Math.round(mrr * 100) / 100,
        arr: Math.round(arr * 100) / 100,
        activeSubscriptions,
        trialSubscriptions,
        paymentSuccessRate: Math.round(paymentSuccessRate * 100) / 100,
        churnRate: Math.round(churnRate * 100) / 100,
        averageCustomerValue: Math.round(averageCustomerValue * 100) / 100,
        dateRange: {
          start: startDate,
          end: endDate,
        },
      },
      revenueByMethod: Object.entries(revenueByMethod).map(
        ([method, amount]) => ({
          method,
          amount: Math.round(amount * 100) / 100,
        }),
      ),
      revenueByProvider: Object.entries(revenueByProvider).map(
        ([provider, amount]) => ({
          provider,
          amount: Math.round(amount * 100) / 100,
          percentage:
            totalRevenue > 0
              ? Math.round((amount / totalRevenue) * 10000) / 100
              : 0,
        }),
      ),
      revenueByPlan: Object.entries(revenueByPlan).map(
        ([planId, { name, revenue, count }]) => ({
          planId,
          name,
          revenue: Math.round(revenue * 100) / 100,
          subscriptions: count,
          mrr: Math.round((revenue / count) * 100) / 100,
        }),
      ),
      dailyTrend,
      metrics: {
        totalPayments: (payments || []).length,
        averageTransactionValue:
          (payments || []).length > 0
            ? Math.round((totalRevenue / (payments || []).length) * 100) / 100
            : 0,
        totalCustomers,
        customersWithSubscriptions: totalActive,
      },
    });
  } catch (error: any) {
    console.error("Stripe revenue report error:", error);
    return NextResponse.json(
      { error: `Failed to generate report: ${error.message}` },
      { status: 500 },
    );
  }
}
