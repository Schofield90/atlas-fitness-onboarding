import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireAuth } from "@/app/lib/api/auth-check";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // ✅ SECURITY FIX: Require authentication
    const user = await requireAuth();
    const organizationId = user.organizationId;

    const { id: customerId } = params;

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

    // ✅ SECURITY FIX: Verify customer belongs to user's organization
    const { data: customer, error: customerError } = await supabaseAdmin
      .from("clients")
      .select("id, org_id, organization_id")
      .eq("id", customerId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 },
      );
    }

    const customerOrgId = customer.organization_id || customer.org_id;
    if (customerOrgId !== organizationId) {
      console.warn(
        `[Payments API] Unauthorized access attempt - User org: ${organizationId}, Customer org: ${customerOrgId}`
      );
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 },
      );
    }

    console.log(`[Payments API] Loading payments for customer: ${customerId}`);

    // Load from payment_transactions table
    // ✅ SECURITY FIX: Filter by organization_id
    const { data: paymentTransactions, error: ptError } = await supabaseAdmin
      .from("payment_transactions")
      .select("*")
      .eq("customer_id", customerId)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (ptError) {
      console.error("[Payments API] Payment transactions error:", ptError);
    }

    // Load from payments table (imported payments)
    // ✅ SECURITY FIX: Filter by organization_id
    const { data: importedPayments, error: ipError } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("client_id", customerId)
      .eq("organization_id", organizationId)
      .order("payment_date", { ascending: false });

    if (ipError) {
      console.error("[Payments API] Imported payments error:", ipError);
    }

    // Load from transactions table
    // ✅ SECURITY FIX: Filter by organization_id
    const { data: transactions, error: tError } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("client_id", customerId)
      .eq("organization_id", organizationId)
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
    // ✅ SECURITY FIX: Sanitize error message
    return NextResponse.json(
      { error: "Failed to load payments" },
      { status: 500 },
    );
  }
}
