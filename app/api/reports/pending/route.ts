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
    const pendingType = searchParams.get("pending_type") as
      | "online"
      | "offline"
      | null;
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");
    const customerId = searchParams.get("customer_id");
    const processor = searchParams.getAll("processor");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = Math.min(
      parseInt(searchParams.get("page_size") || "50"),
      100,
    );

    // Set default date range if not provided (last 90 days)
    let fromDate = dateFrom;
    let toDate = dateTo;

    if (!fromDate || !toDate) {
      const defaultTo = new Date();
      const defaultFrom = new Date();
      defaultFrom.setDate(defaultTo.getDate() - 90);

      fromDate = fromDate || defaultFrom.toISOString().split("T")[0];
      toDate = toDate || defaultTo.toISOString().split("T")[0];
    }

    // Build the base query
    let query = supabase
      .from("pending_payments_view")
      .select("*", { count: "exact" })
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    // Apply filters
    if (pendingType) {
      query = query.eq("pending_type", pendingType);
    }

    if (fromDate) {
      query = query.gte("created_at", fromDate + "T00:00:00Z");
    }

    if (toDate) {
      query = query.lte("created_at", toDate + "T23:59:59Z");
    }

    if (customerId) {
      query = query.eq("customer_id", customerId);
    }

    if (processor.length > 0) {
      query = query.in("processor", processor);
    }

    if (search) {
      query = query.or(
        `customer_name.ilike.%${search}%,email.ilike.%${search}%,invoice_number.ilike.%${search}%,notes.ilike.%${search}%`,
      );
    }

    // Apply pagination
    const offset = (page - 1) * pageSize;
    query = query.range(offset, offset + pageSize - 1);

    const { data: payments, error, count } = await query;

    if (error) {
      console.error("Error fetching pending payments:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch pending payments" },
        { status: 500 },
      );
    }

    // Calculate summary statistics
    let summaryQuery = supabase
      .from("pending_payments_view")
      .select("pending_type, amount_cents")
      .eq("organization_id", organizationId);

    // Apply same filters for summary (except pagination)
    if (pendingType) {
      summaryQuery = summaryQuery.eq("pending_type", pendingType);
    }
    if (fromDate) {
      summaryQuery = summaryQuery.gte("created_at", fromDate + "T00:00:00Z");
    }
    if (toDate) {
      summaryQuery = summaryQuery.lte("created_at", toDate + "T23:59:59Z");
    }
    if (customerId) {
      summaryQuery = summaryQuery.eq("customer_id", customerId);
    }
    if (processor.length > 0) {
      summaryQuery = summaryQuery.in("processor", processor);
    }
    if (search) {
      summaryQuery = summaryQuery.or(
        `customer_name.ilike.%${search}%,email.ilike.%${search}%,invoice_number.ilike.%${search}%,notes.ilike.%${search}%`,
      );
    }

    const { data: summaryData, error: summaryError } = await summaryQuery;

    if (summaryError) {
      console.error("Error fetching summary:", summaryError);
    }

    // Calculate summary
    const summary = {
      total_pending: count || 0,
      total_amount_cents: 0,
      total_amount: 0,
      online_pending: 0,
      online_amount_cents: 0,
      online_amount: 0,
      offline_pending: 0,
      offline_amount_cents: 0,
      offline_amount: 0,
    };

    if (summaryData) {
      summary.total_amount_cents = summaryData.reduce(
        (sum, payment) => sum + (payment.amount_cents || 0),
        0,
      );

      const onlinePayments = summaryData.filter(
        (payment) => payment.pending_type === "online",
      );
      summary.online_pending = onlinePayments.length;
      summary.online_amount_cents = onlinePayments.reduce(
        (sum, payment) => sum + (payment.amount_cents || 0),
        0,
      );

      const offlinePayments = summaryData.filter(
        (payment) => payment.pending_type === "offline",
      );
      summary.offline_pending = offlinePayments.length;
      summary.offline_amount_cents = offlinePayments.reduce(
        (sum, payment) => sum + (payment.amount_cents || 0),
        0,
      );

      // Convert to currency units
      summary.total_amount = Math.round(summary.total_amount_cents) / 100;
      summary.online_amount = Math.round(summary.online_amount_cents) / 100;
      summary.offline_amount = Math.round(summary.offline_amount_cents) / 100;
    }

    return NextResponse.json({
      success: true,
      data: {
        payments: payments || [],
        pagination: {
          page,
          page_size: pageSize,
          total_count: count || 0,
          total_pages: Math.ceil((count || 0) / pageSize),
        },
        summary,
      },
    });
  } catch (error: any) {
    console.error("Pending payments API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch pending payments",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
