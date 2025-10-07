import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { customerId: string } },
) {
  try {
    const { customerId } = params;

    if (!customerId) {
      return NextResponse.json(
        { error: "Customer ID is required" },
        { status: 400 },
      );
    }

    // Use admin client to bypass RLS
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    console.log(`[Payments API] Loading payments for customer: ${customerId}`);

    // Load from payment_transactions table
    const { data: paymentTransactions, error: ptError } = await supabaseAdmin
      .from("payment_transactions")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    if (ptError) {
      console.error("[Payments API] Payment transactions error:", ptError);
    }

    // Load from payments table (imported payments)
    const { data: importedPayments, error: ipError } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("client_id", customerId)
      .order("payment_date", { ascending: false });

    if (ipError) {
      console.error("[Payments API] Imported payments error:", ipError);
    }

    // Load from transactions table
    const { data: transactions, error: tError } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("client_id", customerId)
      .eq("type", "payment")
      .order("created_at", { ascending: false });

    if (tError) {
      console.error("[Payments API] Transactions error:", tError);
    }

    console.log(`[Payments API] Found payments:`, {
      payment_transactions: paymentTransactions?.length || 0,
      imported_payments: importedPayments?.length || 0,
      transactions: transactions?.length || 0,
    });

    return NextResponse.json({
      success: true,
      payments: {
        payment_transactions: paymentTransactions || [],
        imported_payments: importedPayments || [],
        transactions: transactions || [],
      },
    });
  } catch (error: any) {
    console.error("[Payments API] Error:", error);
    return NextResponse.json(
      { error: `Failed to load payments: ${error.message}` },
      { status: 500 },
    );
  }
}
