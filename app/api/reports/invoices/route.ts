import { NextRequest, NextResponse } from "next/server";
import { requireOrgAccess } from "@/app/lib/auth/organization";
import { createClient } from "@/app/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { organizationId } = await requireOrgAccess();
    const supabase = createClient();
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const status = searchParams.getAll("status");
    const timeType = searchParams.get("time") || "preset";
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");
    const customerId = searchParams.get("customer_id");
    const membershipId = searchParams.get("membership_id");
    const processor = searchParams.getAll("processor");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = Math.min(
      parseInt(searchParams.get("page_size") || "50"),
      100,
    );

    // Set default date range if not provided (last 30 days)
    let fromDate = dateFrom;
    let toDate = dateTo;

    if (!fromDate || !toDate) {
      const defaultTo = new Date();
      const defaultFrom = new Date();
      defaultFrom.setDate(defaultTo.getDate() - 30);

      fromDate = fromDate || defaultFrom.toISOString().split("T")[0];
      toDate = toDate || defaultTo.toISOString().split("T")[0];
    }

    // Build the base query
    let query = supabase
      .from("invoice_summaries")
      .select("*", { count: "exact" })
      .eq("organization_id", organizationId)
      .order("invoice_date", { ascending: false });

    // Apply filters
    if (status.length > 0) {
      query = query.in("status", status);
    }

    if (fromDate) {
      query = query.gte("invoice_date", fromDate);
    }

    if (toDate) {
      query = query.lte("invoice_date", toDate);
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

    if (search) {
      query = query.or(
        `customer_name.ilike.%${search}%,customer_email.ilike.%${search}%,invoice_number.ilike.%${search}%,description.ilike.%${search}%`,
      );
    }

    // Apply pagination
    const offset = (page - 1) * pageSize;
    query = query.range(offset, offset + pageSize - 1);

    const { data: invoices, error, count } = await query;

    if (error) {
      console.error("Error fetching invoices:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch invoices" },
        { status: 500 },
      );
    }

    // Calculate summary statistics
    let summaryQuery = supabase
      .from("invoice_summaries")
      .select("status, total_cents")
      .eq("organization_id", organizationId);

    // Apply same filters for summary (except pagination)
    if (status.length > 0) {
      summaryQuery = summaryQuery.in("status", status);
    }
    if (fromDate) {
      summaryQuery = summaryQuery.gte("invoice_date", fromDate);
    }
    if (toDate) {
      summaryQuery = summaryQuery.lte("invoice_date", toDate);
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
    if (search) {
      summaryQuery = summaryQuery.or(
        `customer_name.ilike.%${search}%,customer_email.ilike.%${search}%,invoice_number.ilike.%${search}%,description.ilike.%${search}%`,
      );
    }

    const { data: summaryData, error: summaryError } = await summaryQuery;

    if (summaryError) {
      console.error("Error fetching summary:", summaryError);
    }

    // Calculate summary
    const summary = {
      total_invoices: count || 0,
      total_amount_cents: 0,
      total_amount: 0,
      paid_amount_cents: 0,
      paid_amount: 0,
      pending_amount_cents: 0,
      pending_amount: 0,
      failed_amount_cents: 0,
      failed_amount: 0,
    };

    if (summaryData) {
      summary.total_amount_cents = summaryData.reduce(
        (sum, inv) => sum + (inv.total_cents || 0),
        0,
      );
      summary.paid_amount_cents = summaryData
        .filter((inv) => inv.status === "paid")
        .reduce((sum, inv) => sum + (inv.total_cents || 0), 0);
      summary.pending_amount_cents = summaryData
        .filter((inv) =>
          ["pending", "offline", "retrying"].includes(inv.status),
        )
        .reduce((sum, inv) => sum + (inv.total_cents || 0), 0);
      summary.failed_amount_cents = summaryData
        .filter((inv) => inv.status === "failed")
        .reduce((sum, inv) => sum + (inv.total_cents || 0), 0);

      // Convert to currency units
      summary.total_amount = Math.round(summary.total_amount_cents) / 100;
      summary.paid_amount = Math.round(summary.paid_amount_cents) / 100;
      summary.pending_amount = Math.round(summary.pending_amount_cents) / 100;
      summary.failed_amount = Math.round(summary.failed_amount_cents) / 100;
    }

    return NextResponse.json({
      success: true,
      data: {
        invoices: invoices || [],
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
    console.error("Invoices API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch invoices",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
