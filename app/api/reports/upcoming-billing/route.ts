import { NextRequest, NextResponse } from "next/server";
import { requireOrgAccess } from "@/app/lib/auth/organization";
import { createClient } from "@/app/lib/supabase/server";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { organizationId } = await requireOrgAccess();
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");
    const customerId = searchParams.get("customer_id");
    const membershipId = searchParams.get("membership_id");
    const processor = searchParams.getAll("processor");
    const status = searchParams.getAll("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = Math.min(
      parseInt(searchParams.get("page_size") || "50"),
      100,
    );

    // Set default date range if not provided (next 30 days)
    let fromDate = dateFrom;
    let toDate = dateTo;

    if (!fromDate || !toDate) {
      const defaultFrom = new Date();
      const defaultTo = new Date();
      defaultTo.setDate(defaultFrom.getDate() + 30);

      fromDate = fromDate || defaultFrom.toISOString().split("T")[0];
      toDate = toDate || defaultTo.toISOString().split("T")[0];
    }

    // Build the base query
    let query = supabase
      .from("billing_schedules_view")
      .select("*", { count: "exact" })
      .eq("organization_id", organizationId)
      .order("due_at", { ascending: true });

    // Apply filters
    if (fromDate) {
      query = query.gte("due_at", fromDate + "T00:00:00Z");
    }

    if (toDate) {
      query = query.lte("due_at", toDate + "T23:59:59Z");
    }

    if (customerId) {
      query = query.eq("customer_id", customerId);
    }

    if (membershipId) {
      query = query.eq("customer_membership_id", membershipId);
    }

    if (processor.length > 0) {
      query = query.in("processor", processor);
    }

    if (status.length > 0) {
      query = query.in("status", status);
    }

    if (search) {
      query = query.or(
        `customer_name.ilike.%${search}%,email.ilike.%${search}%,membership_plan_name.ilike.%${search}%,description.ilike.%${search}%`,
      );
    }

    // Apply pagination
    const offset = (page - 1) * pageSize;
    query = query.range(offset, offset + pageSize - 1);

    const { data: schedules, error, count } = await query;

    if (error) {
      console.error("Error fetching billing schedules:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch billing schedules" },
        { status: 500 },
      );
    }

    // Calculate summary statistics
    let summaryQuery = supabase
      .from("billing_schedules_view")
      .select("status, amount_cents, due_at")
      .eq("organization_id", organizationId);

    // Apply same filters for summary (except pagination)
    if (fromDate) {
      summaryQuery = summaryQuery.gte("due_at", fromDate + "T00:00:00Z");
    }
    if (toDate) {
      summaryQuery = summaryQuery.lte("due_at", toDate + "T23:59:59Z");
    }
    if (customerId) {
      summaryQuery = summaryQuery.eq("customer_id", customerId);
    }
    if (membershipId) {
      summaryQuery = summaryQuery.eq("customer_membership_id", membershipId);
    }
    if (processor.length > 0) {
      summaryQuery = summaryQuery.in("processor", processor);
    }
    if (status.length > 0) {
      summaryQuery = summaryQuery.in("status", status);
    }
    if (search) {
      summaryQuery = summaryQuery.or(
        `customer_name.ilike.%${search}%,email.ilike.%${search}%,membership_plan_name.ilike.%${search}%,description.ilike.%${search}%`,
      );
    }

    const { data: summaryData, error: summaryError } = await summaryQuery;

    if (summaryError) {
      console.error("Error fetching summary:", summaryError);
    }

    // Calculate summary
    const summary = {
      total_scheduled: count || 0,
      total_amount_cents: 0,
      total_amount: 0,
      paused_count: 0,
      paused_amount_cents: 0,
      paused_amount: 0,
      this_week_count: 0,
      this_week_amount_cents: 0,
      this_week_amount: 0,
      next_week_count: 0,
      next_week_amount_cents: 0,
      next_week_amount: 0,
    };

    if (summaryData) {
      const now = new Date();
      const thisWeekEnd = new Date(now);
      thisWeekEnd.setDate(now.getDate() + (7 - now.getDay()));
      thisWeekEnd.setHours(23, 59, 59, 999);

      const nextWeekEnd = new Date(thisWeekEnd);
      nextWeekEnd.setDate(thisWeekEnd.getDate() + 7);

      summary.total_amount_cents = summaryData.reduce(
        (sum, item) => sum + (item.amount_cents || 0),
        0,
      );
      summary.paused_count = summaryData.filter(
        (item) => item.status === "paused",
      ).length;
      summary.paused_amount_cents = summaryData
        .filter((item) => item.status === "paused")
        .reduce((sum, item) => sum + (item.amount_cents || 0), 0);

      // This week's payments
      const thisWeekPayments = summaryData.filter((item) => {
        const dueDate = new Date(item.due_at);
        return dueDate >= now && dueDate <= thisWeekEnd;
      });
      summary.this_week_count = thisWeekPayments.length;
      summary.this_week_amount_cents = thisWeekPayments.reduce(
        (sum, item) => sum + (item.amount_cents || 0),
        0,
      );

      // Next week's payments
      const nextWeekPayments = summaryData.filter((item) => {
        const dueDate = new Date(item.due_at);
        return dueDate > thisWeekEnd && dueDate <= nextWeekEnd;
      });
      summary.next_week_count = nextWeekPayments.length;
      summary.next_week_amount_cents = nextWeekPayments.reduce(
        (sum, item) => sum + (item.amount_cents || 0),
        0,
      );

      // Convert to currency units
      summary.total_amount = Math.round(summary.total_amount_cents) / 100;
      summary.paused_amount = Math.round(summary.paused_amount_cents) / 100;
      summary.this_week_amount =
        Math.round(summary.this_week_amount_cents) / 100;
      summary.next_week_amount =
        Math.round(summary.next_week_amount_cents) / 100;
    }

    // Calculate monthly breakdown for chart
    const monthlyBreakdown: Record<
      string,
      { month: string; amount: number; count: number }
    > = {};

    if (summaryData) {
      summaryData.forEach((item) => {
        const dueDate = new Date(item.due_at);
        const monthKey = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}`;
        const monthLabel = dueDate.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
        });

        if (!monthlyBreakdown[monthKey]) {
          monthlyBreakdown[monthKey] = {
            month: monthLabel,
            amount: 0,
            count: 0,
          };
        }

        if (item.status !== "paused") {
          monthlyBreakdown[monthKey].amount +=
            Math.round(item.amount_cents || 0) / 100;
          monthlyBreakdown[monthKey].count += 1;
        }
      });
    }

    // Sort monthly breakdown by date
    const sortedMonthlyData = Object.entries(monthlyBreakdown)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([_, data]) => data);

    return NextResponse.json({
      success: true,
      data: {
        schedules: schedules || [],
        pagination: {
          page,
          page_size: pageSize,
          total_count: count || 0,
          total_pages: Math.ceil((count || 0) / pageSize),
        },
        summary,
        monthly_breakdown: sortedMonthlyData,
      },
    });
  } catch (error: any) {
    console.error("Upcoming billing API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch upcoming billing",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
