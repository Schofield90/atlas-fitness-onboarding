import { NextRequest, NextResponse } from "next/server";
import { requireOrgAccess } from "@/app/lib/auth/organization";
import { createClient } from "@/app/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { organizationId } = await requireOrgAccess();
    const supabase = await createClient();
    const payoutId = params.id;

    // Fetch payout header to get processor and date for filename
    const { data: payoutHeader, error: headerError } = await supabase
      .from("payout_summaries")
      .select("processor, payout_date, amount")
      .eq("org_id", organizationId)
      .eq("id", payoutId)
      .single();

    if (headerError || !payoutHeader) {
      console.error("Error fetching payout header:", headerError);
      return NextResponse.json(
        { success: false, error: "Payout not found" },
        { status: 404 },
      );
    }

    // Fetch payout items with customer details
    const { data: payoutItems, error: itemsError } = await supabase
      .from("payout_items_detailed")
      .select("*")
      .eq("org_id", organizationId)
      .eq("payout_id", payoutId)
      .order("occurred_at", { ascending: false });

    if (itemsError) {
      console.error("Error fetching payout items:", itemsError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch payout items" },
        { status: 500 },
      );
    }

    // Generate CSV content
    const csvHeaders = [
      "Date",
      "Type",
      "Customer",
      "Item",
      "Amount",
      "Fees",
      "Net",
    ];

    const csvRows = (payoutItems || []).map((item) => {
      const amount = item.amount;
      const fee = item.fee;
      const net = amount - fee;

      return [
        item.occurred_date,
        item.type === "charge" ? "Charge" : "Refund",
        item.customer_name || "Unknown Customer",
        item.item,
        `£${amount.toFixed(2)}`,
        `£${fee.toFixed(2)}`,
        `£${net.toFixed(2)}`,
      ];
    });

    // Add summary row
    const totalAmount =
      payoutItems?.reduce((sum, item) => sum + item.amount, 0) || 0;
    const totalFees =
      payoutItems?.reduce((sum, item) => sum + item.fee, 0) || 0;
    const netAmount = totalAmount - totalFees;

    csvRows.push(["", "", "", "", "", "", ""]); // Empty row
    csvRows.push([
      "TOTAL",
      "",
      "",
      "",
      `£${totalAmount.toFixed(2)}`,
      `£${totalFees.toFixed(2)}`,
      `£${netAmount.toFixed(2)}`,
    ]);

    // Build CSV content
    const csvContent = [
      csvHeaders.join(","),
      ...csvRows.map((row) =>
        row
          .map((field) =>
            // Escape fields that contain commas, quotes, or newlines
            typeof field === "string" &&
            (field.includes(",") || field.includes('"') || field.includes("\n"))
              ? `"${field.replace(/"/g, '""')}"`
              : field,
          )
          .join(","),
      ),
    ].join("\n");

    // Generate filename
    const processorName =
      payoutHeader.processor.charAt(0).toUpperCase() +
      payoutHeader.processor.slice(1);
    const payoutDate = new Date(payoutHeader.payout_date)
      .toISOString()
      .split("T")[0];
    const filename = `${processorName}_Payout_${payoutDate}_£${payoutHeader.amount.toFixed(2).replace(".", "_")}.csv`;

    // Return CSV as downloadable file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    console.error("Payout export API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to export payout data",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
