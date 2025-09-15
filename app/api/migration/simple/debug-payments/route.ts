import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();

    // Get organization from query params
    const organizationId =
      request.nextUrl.searchParams.get("organizationId") ||
      "63589490-8f55-4157-bd3a-e141594b748e";

    // Get counts from both tables
    const [paymentsResult, transactionsResult, clientsResult] =
      await Promise.all([
        supabaseAdmin
          .from("payments")
          .select("*", { count: "exact", head: false })
          .eq("organization_id", organizationId)
          .limit(5),
        supabaseAdmin
          .from("transactions")
          .select("*", { count: "exact", head: false })
          .eq("type", "payment")
          .limit(5),
        supabaseAdmin
          .from("clients")
          .select("id, name, email")
          .eq("organization_id", organizationId)
          .limit(10),
      ]);

    // Get sample payment with client info
    let samplePaymentWithClient = null;
    if (paymentsResult.data && paymentsResult.data.length > 0) {
      const payment = paymentsResult.data[0];
      const { data: client } = await supabaseAdmin
        .from("clients")
        .select("*")
        .eq("id", payment.client_id)
        .single();

      samplePaymentWithClient = {
        payment,
        client,
        clientFound: !!client,
      };
    }

    // Check if client_ids in payments match existing clients
    let matchingClients = 0;
    let unmatchedPayments = [];
    if (paymentsResult.data) {
      for (const payment of paymentsResult.data) {
        const { data: client } = await supabaseAdmin
          .from("clients")
          .select("id, name")
          .eq("id", payment.client_id)
          .single();

        if (client) {
          matchingClients++;
        } else {
          unmatchedPayments.push({
            paymentId: payment.id,
            clientId: payment.client_id,
            amount: payment.amount,
            date: payment.payment_date,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        paymentsTableCount: paymentsResult.count || 0,
        transactionsTableCount: transactionsResult.count || 0,
        totalClientsInOrg: clientsResult.data?.length || 0,
        organizationId,
      },
      sampleData: {
        samplePayments: paymentsResult.data,
        sampleTransactions: transactionsResult.data,
        sampleClients: clientsResult.data,
      },
      validation: {
        samplePaymentWithClient,
        matchingClientsCount: matchingClients,
        unmatchedPayments,
        message:
          unmatchedPayments.length > 0
            ? "Some payments have client_ids that don't exist in the clients table"
            : "All sample payments have valid client references",
      },
    });
  } catch (error: any) {
    console.error("Debug payments error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Debug failed",
    });
  }
}
