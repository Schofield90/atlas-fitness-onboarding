import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireOrgAccess } from "@/app/lib/auth/organization";

export const dynamic = "force-dynamic";

/**
 * Diagnostic endpoint to check import status
 * Shows what data has been imported from Stripe and GoCardless
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createAdminClient();

    // Get organization ID
    let organizationId: string;
    try {
      const { organizationId: orgId } = await requireOrgAccess();
      organizationId = orgId;
    } catch (e) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 401 },
      );
    }

    // Check payment provider connections
    const { data: providers } = await supabase
      .from("payment_provider_accounts")
      .select("provider, environment, connected_at")
      .eq("organization_id", organizationId);

    // Check imported payments
    const { data: paymentsBreakdown } = await supabase
      .from("payments")
      .select("payment_provider, status")
      .eq("organization_id", organizationId);

    const paymentStats = {
      total: paymentsBreakdown?.length || 0,
      stripe: paymentsBreakdown?.filter((p) => p.payment_provider === "stripe")
        .length || 0,
      gocardless:
        paymentsBreakdown?.filter((p) => p.payment_provider === "gocardless")
          .length || 0,
      succeeded:
        paymentsBreakdown?.filter((p) => p.status === "succeeded").length || 0,
    };

    // Check imported memberships
    const { data: membershipsBreakdown } = await supabase
      .from("customer_memberships")
      .select("payment_provider, status")
      .eq("organization_id", organizationId);

    const membershipStats = {
      total: membershipsBreakdown?.length || 0,
      stripe:
        membershipsBreakdown?.filter((m) => m.payment_provider === "stripe")
          .length || 0,
      gocardless:
        membershipsBreakdown?.filter((m) => m.payment_provider === "gocardless")
          .length || 0,
      active:
        membershipsBreakdown?.filter((m) => m.status === "active").length || 0,
    };

    // Check membership plans
    const { data: plansBreakdown } = await supabase
      .from("membership_plans")
      .select("payment_provider, is_active, stripe_price_id, provider_price_id")
      .eq("organization_id", organizationId);

    const planStats = {
      total: plansBreakdown?.length || 0,
      stripe:
        plansBreakdown?.filter((p) => p.payment_provider === "stripe").length ||
        0,
      gocardless:
        plansBreakdown?.filter((p) => p.payment_provider === "gocardless")
          .length || 0,
      manual:
        plansBreakdown?.filter(
          (p) =>
            !p.payment_provider ||
            (p.payment_provider !== "stripe" &&
              p.payment_provider !== "gocardless"),
        ).length || 0,
      active: plansBreakdown?.filter((p) => p.is_active).length || 0,
    };

    // Check for orphaned data (payments without client_id)
    const { data: orphanedPayments } = await supabase
      .from("payments")
      .select("id, payment_provider, amount, created_at")
      .eq("organization_id", organizationId)
      .is("client_id", null)
      .limit(10);

    // Check clients with payment provider IDs
    const { data: clientsWithStripe } = await supabase
      .from("clients")
      .select("id")
      .eq("org_id", organizationId)
      .not("stripe_customer_id", "is", null);

    const { data: clientsTotal } = await supabase
      .from("clients")
      .select("id")
      .eq("org_id", organizationId);

    return NextResponse.json({
      success: true,
      organization_id: organizationId,
      providers: providers || [],
      payments: paymentStats,
      memberships: membershipStats,
      plans: planStats,
      clients: {
        total: clientsTotal?.length || 0,
        withStripeId: clientsWithStripe?.length || 0,
      },
      orphanedData: {
        paymentsWithoutClient: orphanedPayments?.length || 0,
        sampleOrphanedPayments: orphanedPayments?.slice(0, 5) || [],
      },
    });
  } catch (error: any) {
    console.error("Import status check error:", error);
    return NextResponse.json(
      { error: `Failed to check import status: ${error.message}` },
      { status: 500 },
    );
  }
}
