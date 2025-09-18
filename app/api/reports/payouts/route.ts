import { NextRequest, NextResponse } from "next/server";
import { requireOrgAccess } from "@/app/lib/auth/organization";
import { createClient } from "@/app/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { organizationId } = await requireOrgAccess();
    const supabase = createClient();
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const month = searchParams.get("month"); // YYYY-MM format
    const processor = searchParams.get("processor") || "all";
    const status = searchParams.get("status") || "all";
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = Math.min(
      parseInt(searchParams.get("page_size") || "50"),
      100,
    );

    // Set default month if not provided (current month)
    let filterMonth = month;
    if (!filterMonth) {
      const now = new Date();
      filterMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}`;
    }

    // Parse month to get date range
    const [year, monthNum] = filterMonth.split("-").map(Number);
    const startDate = new Date(year, monthNum - 1, 1); // First day of month
    const endDate = new Date(year, monthNum, 0); // Last day of month

    const fromDate = startDate.toISOString().split("T")[0];
    const toDate = endDate.toISOString().split("T")[0];

    // Build the base query using the payout_summaries view
    let query = supabase
      .from("payout_summaries")
      .select("*", { count: "exact" })
      .eq("org_id", organizationId)
      .gte("payout_date", fromDate)
      .lte("payout_date", toDate)
      .order("payout_date", { ascending: false });

    // Apply processor filter
    if (processor !== "all") {
      query = query.eq("processor", processor);
    }

    // Apply status filter
    if (status !== "all") {
      query = query.eq("status", status);
    }

    // Apply pagination
    const offset = (page - 1) * pageSize;
    query = query.range(offset, offset + pageSize - 1);

    const { data: payouts, error, count } = await query;

    if (error) {
      console.error("Error fetching payouts:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch payouts" },
        { status: 500 },
      );
    }

    // Calculate summary statistics for the same filters
    let summaryQuery = supabase
      .from("payout_summaries")
      .select("processor, amount_cents, total_fees_cents")
      .eq("org_id", organizationId)
      .gte("payout_date", fromDate)
      .lte("payout_date", toDate);

    if (processor !== "all") {
      summaryQuery = summaryQuery.eq("processor", processor);
    }

    if (status !== "all") {
      summaryQuery = summaryQuery.eq("status", status);
    }

    const { data: summaryData, error: summaryError } = await summaryQuery;

    if (summaryError) {
      console.error("Error fetching summary:", summaryError);
    }

    // Calculate summary
    const summary = {
      total_payouts: count || 0,
      total_amount_cents: 0,
      total_amount: 0,
      stripe_amount_cents: 0,
      stripe_amount: 0,
      gocardless_amount_cents: 0,
      gocardless_amount: 0,
      total_fees_cents: 0,
      total_fees: 0,
    };

    if (summaryData) {
      summary.total_amount_cents = summaryData.reduce(
        (sum, payout) => sum + (payout.amount_cents || 0),
        0,
      );
      summary.stripe_amount_cents = summaryData
        .filter((payout) => payout.processor === "stripe")
        .reduce((sum, payout) => sum + (payout.amount_cents || 0), 0);
      summary.gocardless_amount_cents = summaryData
        .filter((payout) => payout.processor === "gocardless")
        .reduce((sum, payout) => sum + (payout.amount_cents || 0), 0);
      summary.total_fees_cents = summaryData.reduce(
        (sum, payout) => sum + (payout.total_fees_cents || 0),
        0,
      );

      // Convert to currency units
      summary.total_amount = Math.round(summary.total_amount_cents) / 100;
      summary.stripe_amount = Math.round(summary.stripe_amount_cents) / 100;
      summary.gocardless_amount =
        Math.round(summary.gocardless_amount_cents) / 100;
      summary.total_fees = Math.round(summary.total_fees_cents) / 100;
    }

    return NextResponse.json({
      success: true,
      data: {
        payouts: payouts || [],
        pagination: {
          page,
          page_size: pageSize,
          total_count: count || 0,
          total_pages: Math.ceil((count || 0) / pageSize),
        },
        summary,
        filters: {
          month: filterMonth,
          processor,
          status,
        },
      },
    });
  } catch (error: any) {
    console.error("Payouts API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch payouts",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
