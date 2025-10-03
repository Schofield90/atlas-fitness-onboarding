import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { clientName } = await request.json();
    const supabaseAdmin = createAdminClient();

    // Find the client by name
    const { data: client } = await supabaseAdmin
      .from("clients")
      .select("*")
      .or(
        `name.ilike.%${clientName}%,first_name.ilike.%${clientName}%,last_name.ilike.%${clientName}%`,
      )
      .single();

    if (!client) {
      return NextResponse.json({
        success: false,
        error: `Client "${clientName}" not found`,
      });
    }

    // Check both tables for payments
    const [paymentsResult, transactionsResult] = await Promise.all([
      supabaseAdmin
        .from("payments")
        .select("*")
        .eq("client_id", client.id)
        .order("payment_date", { ascending: false }),
      supabaseAdmin
        .from("transactions")
        .select("*")
        .eq("client_id", client.id)
        .eq("type", "payment")
        .order("created_at", { ascending: false }),
    ]);

    // Also get some clients that DO have payments for comparison
    const { data: clientsWithPayments } = await supabaseAdmin
      .from("payments")
      .select("client_id")
      .limit(5);

    let clientsWithPaymentDetails = [];
    if (clientsWithPayments) {
      const uniqueClientIds = [
        ...new Set(clientsWithPayments.map((p) => p.client_id)),
      ];
      const { data: clientDetails } = await supabaseAdmin
        .from("clients")
        .select("id, name, email")
        .in("id", uniqueClientIds);
      clientsWithPaymentDetails = clientDetails || [];
    }

    return NextResponse.json({
      success: true,
      searchedClient: {
        id: client.id,
        name: client.name,
        email: client.email,
        organization_id: client.organization_id,
      },
      paymentsFound: {
        inPaymentsTable: paymentsResult.data?.length || 0,
        inTransactionsTable: transactionsResult.data?.length || 0,
        total:
          (paymentsResult.data?.length || 0) +
          (transactionsResult.data?.length || 0),
      },
      payments: {
        fromPaymentsTable: paymentsResult.data || [],
        fromTransactionsTable: transactionsResult.data || [],
      },
      clientsWithPayments: clientsWithPaymentDetails,
      message:
        paymentsResult.data?.length || transactionsResult.data?.length
          ? "Payments found for this client"
          : `No payments found for ${client.name}. Check the 'clientsWithPayments' list to see which clients have imported payments.`,
    });
  } catch (error: any) {
    console.error("Check client payments error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Check failed",
    });
  }
}
