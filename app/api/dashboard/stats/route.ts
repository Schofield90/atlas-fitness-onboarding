import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireAuth } from "@/app/lib/api/auth-check";

export const dynamic = "force-dynamic";

/**
 * GET /api/dashboard/stats
 * Returns main dashboard metrics
 */
export async function GET() {
  try {
    // Authenticate user
    const user = await requireAuth();
    const organizationId = user.organizationId;

    // Use admin client to bypass RLS
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    // Get active members count
    const { count: activeMembers } = await supabaseAdmin
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("org_id", organizationId)
      .eq("status", "active");

    // Get today's class sessions
    const { count: classesToday } = await supabaseAdmin
      .from("class_sessions")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .gte("start_time", todayStart.toISOString())
      .lt(
        "start_time",
        new Date(todayStart.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      );

    // Get this month's revenue from payments table
    const { data: thisMonthPayments } = await supabaseAdmin
      .from("payments")
      .select("amount")
      .eq("organization_id", organizationId)
      .gte("payment_date", startOfMonth.toISOString().split("T")[0]);

    const thisMonthRevenue =
      thisMonthPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    // Get last month's revenue for growth calculation
    const { data: lastMonthPayments } = await supabaseAdmin
      .from("payments")
      .select("amount")
      .eq("organization_id", organizationId)
      .gte("payment_date", startOfLastMonth.toISOString().split("T")[0])
      .lte("payment_date", endOfLastMonth.toISOString().split("T")[0]);

    const lastMonthRevenue =
      lastMonthPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    // Calculate growth percentage
    let growthPercentage = 0;
    if (lastMonthRevenue > 0) {
      growthPercentage =
        ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
    } else if (thisMonthRevenue > 0) {
      growthPercentage = 100; // 100% growth if we had 0 last month
    }

    return NextResponse.json({
      success: true,
      stats: {
        activeMembers: activeMembers || 0,
        classesToday: classesToday || 0,
        thisMonthRevenue,
        growthPercentage,
      },
    });
  } catch (error: any) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
