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

    // Parse query parameters (same as main route)
    const status = searchParams.getAll("status");
    const timeType = searchParams.get("time") || "preset";
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");
    const customerId = searchParams.get("customer_id");
    const membershipId = searchParams.get("membership_id");
    const processor = searchParams.getAll("processor");
    const search = searchParams.get("search");

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

    // Build the query (no pagination for export)
    let query = supabase
      .from("invoice_summaries")
      .select("*")
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

    const { data: invoices, error } = await query;

    if (error) {
      console.error("Error fetching invoices for export:", error);
      return NextResponse.json(
        { success: false, error: "Failed to export invoices" },
        { status: 500 },
      );
    }

    // Generate CSV content
    const headers = [
      "Invoice Number",
      "Customer Name",
      "Customer Email",
      "Membership Plan",
      "Status",
      "Invoice Date",
      "Payment Date",
      "Subtotal",
      "Tax",
      "Discount",
      "Fees",
      "Total",
      "Processor",
      "Description",
      "Item Count",
      "Item Names",
    ];

    const csvRows = [
      headers.join(","),
      ...(invoices || []).map((invoice) => {
        return [
          `"${invoice.invoice_number || ""}"`,
          `"${invoice.customer_name || ""}"`,
          `"${invoice.customer_email || ""}"`,
          `"${invoice.membership_plan_name || ""}"`,
          `"${invoice.status}"`,
          `"${invoice.invoice_date}"`,
          `"${invoice.payment_date || ""}"`,
          `"${invoice.subtotal.toFixed(2)}"`,
          `"${invoice.tax.toFixed(2)}"`,
          `"${invoice.discount.toFixed(2)}"`,
          `"${invoice.fees.toFixed(2)}"`,
          `"${invoice.total.toFixed(2)}"`,
          `"${invoice.processor}"`,
          `"${(invoice.description || "").replace(/"/g, '""')}"`,
          `"${invoice.item_count}"`,
          `"${(invoice.item_names || []).join("; ").replace(/"/g, '""')}"`,
        ].join(",");
      }),
    ];

    const csvContent = csvRows.join("\n");

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="invoices-export-${new Date().toISOString().split("T")[0]}.csv"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    console.error("Invoices export error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to export invoices",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
