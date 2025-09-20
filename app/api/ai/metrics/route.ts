import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Get authenticated user's organization - NEVER accept from request body
    const user = await requireAuth();
    const organizationId = user.organizationId;

    const supabase = await createClient();

    // Calculate key metrics
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Revenue metrics
    const { data: currentRevenue } = await supabase
      .from("payment_transactions")
      .select("amount_pennies")
      .eq("organization_id", organizationId)
      .eq("status", "succeeded")
      .gte("created_at", thisMonth.toISOString());

    const { data: lastRevenue } = await supabase
      .from("payment_transactions")
      .select("amount_pennies")
      .eq("organization_id", organizationId)
      .eq("status", "succeeded")
      .gte("created_at", lastMonth.toISOString())
      .lt("created_at", thisMonth.toISOString());

    const currentTotal =
      currentRevenue?.reduce((sum, p) => sum + p.amount_pennies, 0) || 0;
    const lastTotal =
      lastRevenue?.reduce((sum, p) => sum + p.amount_pennies, 0) || 0;
    const revenueChange =
      lastTotal > 0 ? ((currentTotal - lastTotal) / lastTotal) * 100 : 0;

    // Active members - current vs last month
    const { count: activeMembers } = await supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId);

    const { count: lastMonthMembers } = await supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .lt("created_at", thisMonth.toISOString());

    const memberChange =
      lastMonthMembers && lastMonthMembers > 0 && activeMembers !== null
        ? ((activeMembers - lastMonthMembers) / lastMonthMembers) * 100
        : 0;

    // Attendance rate
    const { data: recentBookings } = await supabase
      .from("bookings")
      .select("status")
      .eq("organization_id", organizationId)
      .gte(
        "created_at",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      );

    const attendanceRate =
      recentBookings && recentBookings.length > 0
        ? (recentBookings.filter((b) => b.status === "attended").length /
            recentBookings.length) *
          100
        : 0;

    // Previous month attendance for comparison
    const { data: previousBookings } = await supabase
      .from("bookings")
      .select("status")
      .eq("organization_id", organizationId)
      .gte("created_at", lastMonth.toISOString())
      .lt("created_at", thisMonth.toISOString());

    const previousAttendanceRate =
      previousBookings && previousBookings.length > 0
        ? (previousBookings.filter((b) => b.status === "attended").length /
            previousBookings.length) *
          100
        : 0;

    const attendanceChange =
      previousAttendanceRate > 0 ? attendanceRate - previousAttendanceRate : 0;

    // New leads this month vs last month
    const { count: newLeads } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .gte("created_at", thisMonth.toISOString());

    const { count: lastMonthLeads } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .gte("created_at", lastMonth.toISOString())
      .lt("created_at", thisMonth.toISOString());

    const leadChange =
      lastMonthLeads && lastMonthLeads > 0 && newLeads !== null
        ? ((newLeads - lastMonthLeads) / lastMonthLeads) * 100
        : 0;

    const metrics = [
      {
        label: "Monthly Revenue",
        value:
          currentTotal > 0 ? `£${(currentTotal / 100).toLocaleString()}` : "£0",
        change: Math.round(revenueChange),
        trend: revenueChange > 0 ? "up" : revenueChange < 0 ? "down" : "stable",
        insight:
          revenueChange > 10
            ? "Strong growth"
            : revenueChange < -10
              ? "Needs attention"
              : "Steady performance",
      },
      {
        label: "Active Members",
        value: activeMembers?.toString() || "0",
        change: Math.round(memberChange),
        trend: memberChange > 0 ? "up" : memberChange < 0 ? "down" : "stable",
        insight:
          memberChange > 0
            ? "Membership growing"
            : memberChange < 0
              ? "Member retention needs focus"
              : "Stable membership",
      },
      {
        label: "Attendance Rate",
        value: attendanceRate > 0 ? `${Math.round(attendanceRate)}%` : "0%",
        change: Math.round(attendanceChange),
        trend:
          attendanceChange > 0
            ? "up"
            : attendanceChange < 0
              ? "down"
              : "stable",
        insight:
          attendanceChange > 0
            ? "Attendance improving"
            : attendanceChange < -5
              ? "Attendance declining"
              : "Steady attendance",
      },
      {
        label: "New Leads",
        value: newLeads?.toString() || "0",
        change: Math.round(leadChange),
        trend: leadChange > 0 ? "up" : leadChange < 0 ? "down" : "stable",
        insight:
          leadChange > 10
            ? "Lead generation improving"
            : leadChange < -10
              ? "Lead generation needs boost"
              : "Consistent lead flow",
      },
    ];

    return NextResponse.json({ metrics });
  } catch (error) {
    console.error("AI metrics error:", error);
    return createErrorResponse(error);
  }
}
