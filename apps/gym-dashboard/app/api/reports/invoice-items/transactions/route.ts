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
        total_cents,
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
      console.error("Error fetching transactions:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch transactions" },
        { status: 500 },
      );
    }

    // Aggregate the data by date and processor
    const aggregatedData = new Map<
      string,
      {
        date: string;
        processor: string;
        amount: number;
        count: number;
      }
    >();

    (rawData || []).forEach((item: any) => {
      const invoice = item.invoices;
      const date =
        dateType === "due"
          ? invoice?.invoice_date
          : invoice?.payment_date || invoice?.invoice_date;

      // Skip if date is null or undefined
      if (!date) return;

      const key = `${date}|${invoice.processor}`;
      const existing = aggregatedData.get(key);

      const amount = Math.round(item.total_cents) / 100;

      if (existing) {
        existing.amount += amount;
        existing.count += 1;
      } else {
        aggregatedData.set(key, {
          date,
          processor: invoice.processor,
          amount,
          count: 1,
        });
      }
    });

    // Convert to array and sort by date (desc) then processor
    const transactions = Array.from(aggregatedData.values()).sort((a, b) => {
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date); // Desc order
      }
      return a.processor.localeCompare(b.processor);
    });

    // For CSV export, return CSV format
    if (format === "csv") {
      const csvHeaders = ["Date", "Processor", "Amount", "Count"];

      const csvRows = transactions.map((transaction) => [
        transaction.date,
        transaction.processor,
        transaction.amount.toFixed(2),
        transaction.count,
      ]);

      const csvContent = [
        csvHeaders.join(","),
        ...csvRows.map((row) => row.map((field) => `"${field}"`).join(",")),
      ].join("\n");

      return new Response(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="invoice-transactions-${month}.csv"`,
        },
      });
    }

    // Calculate totals
    const totals = transactions.reduce(
      (acc, transaction) => {
        acc.total_amount += transaction.amount;
        acc.total_count += transaction.count;
        return acc;
      },
      {
        total_amount: 0,
        total_count: 0,
      },
    );

    return NextResponse.json({
      success: true,
      data: {
        transactions,
        totals,
      },
    });
  } catch (error: any) {
    console.error("Transactions API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch transactions",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
