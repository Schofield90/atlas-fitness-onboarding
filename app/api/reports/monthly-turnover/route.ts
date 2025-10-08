import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireAuth } from "@/app/lib/api/auth-check";

export const dynamic = "force-dynamic";

/**
 * GET /api/reports/monthly-turnover
 * Returns monthly turnover data with category breakdown
 * Query params:
 * - view: 'month' | 'year' (default: 'month')
 * - months: number of months to include (default: 12)
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuth();
    const organizationId = user.organizationId;

    const searchParams = request.nextUrl.searchParams;
    const view = searchParams.get("view") || "month";
    const months = parseInt(searchParams.get("months") || "12");

    // Use admin client to bypass RLS
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Calculate proper start date by going back N months
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    const startDateString = startDate.toISOString().split("T")[0];

    // Get payment data
    const result = await supabaseAdmin
      .from("payments")
      .select(
        `
        payment_date,
        amount,
        client_id
      `,
      )
      .eq("organization_id", organizationId)
      .in("payment_status", ["paid_out", "succeeded", "confirmed"])
      .gte("payment_date", startDateString);

    if (result.error) throw result.error;

    // Process monthly data
    const grouped = new Map();
    result.data?.forEach((payment) => {
      const date = new Date(payment.payment_date);
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!grouped.has(period)) {
        grouped.set(period, {
          period,
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          payment_count: 0,
          total_revenue: 0,
          unique_customers: new Set(),
        });
      }

      const group = grouped.get(period);
      group.payment_count++;
      group.total_revenue += parseFloat(payment.amount as any) || 0;
      if (payment.client_id) {
        group.unique_customers.add(payment.client_id);
      }
    });

    const processedData = Array.from(grouped.values())
      .map((g) => ({
        period: g.period,
        year: g.year,
        month: g.month,
        payment_count: g.payment_count,
        total_revenue: g.total_revenue,
        unique_customers: g.unique_customers.size,
      }))
      .sort((a, b) => b.period.localeCompare(a.period));

    // Get category breakdown
    const categoryResult = await supabaseAdmin
      .from("payments")
      .select(
        `
        payment_date,
        amount,
        customer_memberships!inner(
          membership_plans!inner(
            category
          )
        )
      `,
      )
      .eq("organization_id", organizationId)
      .in("payment_status", ["paid_out", "succeeded", "confirmed"])
      .gte("payment_date", startDateString);

    // Process category data
    const categoryBreakdown = new Map<string, Map<string, any>>();

    categoryResult.data?.forEach((payment: any) => {
      const date = new Date(payment.payment_date);
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const category =
        payment.customer_memberships?.membership_plans?.category ||
        "Uncategorized";

      if (!categoryBreakdown.has(period)) {
        categoryBreakdown.set(period, new Map());
      }

      const periodMap = categoryBreakdown.get(period)!;
      if (!periodMap.has(category)) {
        periodMap.set(category, {
          category,
          payment_count: 0,
          total_revenue: 0,
        });
      }

      const catData = periodMap.get(category)!;
      catData.payment_count++;
      catData.total_revenue += parseFloat(payment.amount) || 0;
    });

    // Convert to array format
    const categoryData: any[] = [];
    categoryBreakdown.forEach((categories, period) => {
      categories.forEach((data, category) => {
        categoryData.push({
          period,
          category,
          payment_count: data.payment_count,
          total_revenue: data.total_revenue,
        });
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        view,
        periods: processedData,
        categoryBreakdown: categoryData,
        totalRevenue: processedData.reduce(
          (sum, p) => sum + p.total_revenue,
          0,
        ),
        totalPayments: processedData.reduce(
          (sum, p) => sum + p.payment_count,
          0,
        ),
        averageMonthlyRevenue:
          processedData.reduce((sum, p) => sum + p.total_revenue, 0) /
          (processedData.length || 1),
      },
    });
  } catch (error: any) {
    console.error("Monthly turnover error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch monthly turnover" },
      { status: 500 },
    );
  }
}
