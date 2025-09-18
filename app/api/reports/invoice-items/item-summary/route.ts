import { NextRequest, NextResponse } from "next/server";
import { requireOrgAccess } from "@/app/lib/auth/organization";
import { createClient } from "@/app/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { organizationId } = await requireOrgAccess();
    const supabase = createClient();
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const month =
      searchParams.get("month") || new Date().toISOString().slice(0, 7); // YYYY-MM
    const dateType = searchParams.get("date_type") || "confirmed";
    const processor = searchParams.getAll("processor");
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
        name,
        item_type,
        total_cents,
        tax_cents,
        discount_cents,
        invoices!inner (
          invoice_date,
          payment_date,
          processor
        )
      `,
      )
      .eq("organization_id", organizationId);

    // Apply date filter
    if (dateType === "due") {
      query = query
        .gte("invoices.invoice_date", startDate)
        .lt("invoices.invoice_date", endDateStr);
    } else {
      // For confirmed dates, we need to use a more complex filter
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

    const { data: rawData, error } = await query;

    if (error) {
      console.error("Error fetching item summary:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch item summary" },
        { status: 500 },
      );
    }

    // Aggregate the data by item_type and item_name
    const aggregatedData = new Map<
      string,
      {
        item_type: string;
        item_name: string;
        payments_total: number;
        taxes_total: number;
        discounts_total: number;
        count: number;
      }
    >();

    (rawData || []).forEach((item: any) => {
      const key = `${item.item_type}|${item.name}`;
      const existing = aggregatedData.get(key);

      const paymentsAmount = Math.round(item.total_cents) / 100;
      const taxAmount = Math.round(item.tax_cents) / 100;
      const discountAmount = Math.round(item.discount_cents) / 100;

      if (existing) {
        existing.payments_total += paymentsAmount;
        existing.taxes_total += taxAmount;
        existing.discounts_total += discountAmount;
        existing.count += 1;
      } else {
        aggregatedData.set(key, {
          item_type: item.item_type,
          item_name: item.name,
          payments_total: paymentsAmount,
          taxes_total: taxAmount,
          discounts_total: discountAmount,
          count: 1,
        });
      }
    });

    // Convert to array and sort
    const items = Array.from(aggregatedData.values()).sort((a, b) => {
      // First by item_type, then by item_name
      if (a.item_type !== b.item_type) {
        return a.item_type.localeCompare(b.item_type);
      }
      return a.item_name.localeCompare(b.item_name);
    });

    // For CSV export, return CSV format
    if (format === "csv") {
      const csvHeaders = [
        "Item Type",
        "Item Name",
        "Payments Total",
        "Taxes Total",
        "Discounts Total",
        "Count",
      ];

      const csvRows = items.map((item) => [
        item.item_type,
        item.item_name,
        item.payments_total.toFixed(2),
        item.taxes_total.toFixed(2),
        item.discounts_total.toFixed(2),
        item.count,
      ]);

      const csvContent = [
        csvHeaders.join(","),
        ...csvRows.map((row) => row.map((field) => `"${field}"`).join(",")),
      ].join("\n");

      return new Response(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="invoice-item-summary-${month}.csv"`,
        },
      });
    }

    // Calculate totals
    const totals = items.reduce(
      (acc, item) => {
        acc.payments_total += item.payments_total;
        acc.taxes_total += item.taxes_total;
        acc.discounts_total += item.discounts_total;
        acc.total_count += item.count;
        return acc;
      },
      {
        payments_total: 0,
        taxes_total: 0,
        discounts_total: 0,
        total_count: 0,
      },
    );

    return NextResponse.json({
      success: true,
      data: {
        items,
        totals,
      },
    });
  } catch (error: any) {
    console.error("Item summary API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch item summary",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
