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
    const month =
      searchParams.get("month") || new Date().toISOString().slice(0, 7); // YYYY-MM
    const dateType = searchParams.get("date_type") || "confirmed";
    const processor = searchParams.getAll("processor");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = Math.min(
      parseInt(searchParams.get("page_size") || "50"),
      100,
    );
    const format = searchParams.get("format"); // For CSV export

    // Calculate date range for the month
    const startDate = `${month}-01`;
    const endDate = new Date(month + "-01");
    endDate.setMonth(endDate.getMonth() + 1);
    const endDateStr = endDate.toISOString().slice(0, 10);

    // Build the query using Supabase query builder
    let query = supabase
      .from("invoice_items")
      .select(
        `
        *,
        invoices!inner (
          invoice_date,
          payment_date,
          processor,
          customer_id
        ),
        invoices.clients (
          name
        )
      `,
        { count: format !== "csv" ? "exact" : undefined },
      )
      .eq("organization_id", organizationId);

    // Apply date filter
    if (dateType === "due") {
      query = query
        .gte("invoices.invoice_date", startDate)
        .lt("invoices.invoice_date", endDateStr);
    } else {
      // For confirmed dates, we need to use a more complex filter
      // This requires a custom filter that checks payment_date first, then invoice_date
      query = query
        .or(
          `invoices.payment_date.gte.${startDate},and(invoices.payment_date.is.null,invoices.invoice_date.gte.${startDate})`,
        )
        .or(
          `invoices.payment_date.lt.${endDateStr},and(invoices.payment_date.is.null,invoices.invoice_date.lt.${endDateStr})`,
        );
    }

    // Add processor filter
    if (processor.length > 0) {
      query = query.in("invoices.processor", processor);
    }

    // Add ordering
    if (dateType === "due") {
      query = query.order("invoice_date", {
        foreignTable: "invoices",
        ascending: false,
      });
    } else {
      query = query.order("payment_date", {
        foreignTable: "invoices",
        ascending: false,
        nullsFirst: false,
      });
    }

    // Apply pagination for non-CSV requests
    if (format !== "csv") {
      const offset = (page - 1) * pageSize;
      query = query.range(offset, offset + pageSize - 1);
    }

    const { data: rawData, error, count } = await query;

    if (error) {
      console.error("Error fetching line items:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch line items" },
        { status: 500 },
      );
    }

    // Transform the data to match our interface
    const lineItems = (rawData || []).map((item: any) => {
      const invoice = item.invoices;
      const customer = invoice?.clients?.name || "Unknown Customer";
      const date =
        dateType === "due"
          ? invoice?.invoice_date
          : invoice?.payment_date || invoice?.invoice_date;

      return {
        date,
        invoice_id: item.invoice_id,
        customer,
        item_type: item.item_type,
        item_name: item.name,
        qty: item.qty,
        unit_price: Math.round(item.unit_price_cents) / 100,
        tax: Math.round(item.tax_cents) / 100,
        discount: Math.round(item.discount_cents) / 100,
        total: Math.round(item.total_cents) / 100,
        processor: invoice?.processor,
      };
    });

    // For CSV export, return CSV format
    if (format === "csv") {
      const csvHeaders = [
        "Date",
        "Invoice ID",
        "Customer",
        "Item Type",
        "Item Name",
        "Quantity",
        "Unit Price",
        "Tax",
        "Discount",
        "Total",
        "Processor",
      ];

      const csvRows = lineItems.map((item: any) => [
        item.date,
        item.invoice_id,
        item.customer,
        item.item_type,
        item.item_name,
        item.qty,
        item.unit_price,
        item.tax,
        item.discount,
        item.total,
        item.processor,
      ]);

      const csvContent = [
        csvHeaders.join(","),
        ...csvRows.map((row) => row.map((field) => `"${field}"`).join(",")),
      ].join("\n");

      return new Response(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="invoice-line-items-${month}.csv"`,
        },
      });
    }

    // Calculate summary totals from the data
    const summary = lineItems.reduce(
      (acc: any, item: any) => {
        acc.total_amount += item.total;
        acc.total_tax += item.tax;
        acc.total_discount += item.discount;
        acc.total_count += 1;
        return acc;
      },
      {
        total_amount: 0,
        total_tax: 0,
        total_discount: 0,
        total_count: 0,
      },
    );

    return NextResponse.json({
      success: true,
      data: {
        line_items: lineItems,
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
    console.error("Line items API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch line items",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
