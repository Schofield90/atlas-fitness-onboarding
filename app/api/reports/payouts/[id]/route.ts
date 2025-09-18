import { NextRequest, NextResponse } from "next/server";
import { requireOrgAccess } from "@/app/lib/auth/organization";
import { createClient } from "@/app/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { organizationId } = await requireOrgAccess();
    const supabase = createClient();
    const payoutId = params.id;

    // Fetch payout header information
    const { data: payoutHeader, error: headerError } = await supabase
      .from("payout_summaries")
      .select("*")
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

    // Format header data
    const header = {
      id: payoutHeader.id,
      processor: payoutHeader.processor,
      payout_date: payoutHeader.payout_date,
      amount: payoutHeader.amount,
      status: payoutHeader.status,
      item_count: payoutHeader.item_count,
      total_fees: payoutHeader.total_fees,
      charge_count: payoutHeader.charge_count,
      refund_count: payoutHeader.refund_count,
      stripe_payout_id: payoutHeader.stripe_payout_id,
      gocardless_payout_id: payoutHeader.gocardless_payout_id,
    };

    // Format items data
    const items = (payoutItems || []).map((item) => ({
      id: item.id,
      type: item.type,
      customer_id: item.customer_id,
      customer_name: item.customer_name || "Unknown Customer",
      customer_email: item.customer_email,
      item: item.item,
      amount: item.amount,
      fee: item.fee,
      occurred_at: item.occurred_at,
      occurred_date: item.occurred_date,
      occurred_datetime: item.occurred_datetime,
      invoice_id: item.invoice_id,
    }));

    // Calculate summary totals
    const totals = {
      charges_amount: items
        .filter((item) => item.type === "charge")
        .reduce((sum, item) => sum + item.amount, 0),
      refunds_amount: items
        .filter((item) => item.type === "refund")
        .reduce((sum, item) => sum + Math.abs(item.amount), 0),
      total_fees: items.reduce((sum, item) => sum + item.fee, 0),
      net_amount: header.amount,
    };

    return NextResponse.json({
      success: true,
      data: {
        header,
        items,
        totals,
      },
    });
  } catch (error: any) {
    console.error("Payout details API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch payout details",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
