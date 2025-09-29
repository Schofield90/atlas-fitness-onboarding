import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const clientId = request.nextUrl.searchParams.get("clientId");

    if (!clientId) {
      // Return a sample client that has payments
      return NextResponse.json({
        message: "Sample client with payments",
        sampleClientId: "1366c7ac-a9df-4c9f-86b5-48127f3abe0e",
        clientName: "Andy Smith",
        instruction:
          "Add ?clientId=1366c7ac-a9df-4c9f-86b5-48127f3abe0e to the URL to test",
      });
    }

    const supabase = createAdminClient();

    // Fetch from both tables like PaymentHistory component does
    const [transactionsResult, paymentsResult] = await Promise.all([
      supabase
        .from("transactions")
        .select("*")
        .eq("client_id", clientId)
        .eq("type", "payment")
        .order("created_at", { ascending: false }),
      supabase
        .from("payments")
        .select("*")
        .eq("client_id", clientId)
        .order("payment_date", { ascending: false }),
    ]);

    // Format the results
    const allPayments = [];

    if (transactionsResult.data) {
      allPayments.push(
        ...transactionsResult.data.map((t) => ({
          ...t,
          source: "transactions_table",
        })),
      );
    }

    if (paymentsResult.data) {
      allPayments.push(
        ...paymentsResult.data.map((p) => ({
          ...p,
          source: "payments_table",
        })),
      );
    }

    return NextResponse.json({
      success: true,
      clientId,
      paymentsFound: {
        fromTransactions: transactionsResult.data?.length || 0,
        fromPaymentsTable: paymentsResult.data?.length || 0,
        total: allPayments.length,
      },
      payments: allPayments,
      componentUrl: `/leads/${clientId}`,
      message:
        allPayments.length > 0
          ? `Found ${allPayments.length} payments for this client. Visit /leads/${clientId} to see them in the UI.`
          : "No payments found for this client ID",
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || "Test failed",
    });
  }
}
