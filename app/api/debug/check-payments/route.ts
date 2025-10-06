import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const orgId = "ee1206d7-62fb-49cf-9f39-95b9c54423a4"; // Your org ID

    // Check total payments in database
    const { data: allPayments, error: allError } = await supabase
      .from("payments")
      .select("id, client_id, customer_id, amount, payment_date, payment_status, payment_provider, provider_payment_id")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (allError) {
      return NextResponse.json({ error: allError.message }, { status: 500 });
    }

    // Count payments by provider
    const { data: stripePayments } = await supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("payment_provider", "stripe");

    const { data: gocardlessPayments } = await supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("payment_provider", "gocardless");

    // Get a sample client to check their payments
    const { data: clients } = await supabase
      .from("clients")
      .select("id, name, email, org_id")
      .eq("org_id", orgId)
      .limit(3);

    const clientPaymentChecks = [];
    if (clients) {
      for (const client of clients) {
        const { data: clientPayments } = await supabase
          .from("payments")
          .select("id, amount, payment_date, payment_provider")
          .or(`client_id.eq.${client.id},customer_id.eq.${client.id}`)
          .eq("organization_id", orgId);

        clientPaymentChecks.push({
          client_id: client.id,
          client_name: client.name,
          client_email: client.email,
          payment_count: clientPayments?.length || 0,
          payments: clientPayments || [],
        });
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total_payments: allPayments?.length || 0,
        stripe_count: stripePayments || 0,
        gocardless_count: gocardlessPayments || 0,
      },
      sample_payments: allPayments,
      client_checks: clientPaymentChecks,
    });
  } catch (error: any) {
    console.error("Error checking payments:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check payments" },
      { status: 500 }
    );
  }
}
