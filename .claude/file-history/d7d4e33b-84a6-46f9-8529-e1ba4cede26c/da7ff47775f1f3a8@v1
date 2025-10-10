import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { GoCardlessService } from "@/app/lib/gocardless-server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const redirectFlowId = searchParams.get("redirect_flow_id");

    if (!redirectFlowId) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/members?error=missing_redirect_flow`,
      );
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get session data (this contains customer ID, org ID, membership data)
    const { data: session } = await supabaseAdmin
      .from("gocardless_sessions")
      .select("*")
      .eq("redirect_flow_id", redirectFlowId)
      .maybeSingle();

    if (!session) {
      // Try to find by checking all unexpired sessions
      // GoCardless callback doesn't include our session token, only redirect_flow_id
      console.error("Session not found for redirect flow:", redirectFlowId);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/members?error=session_expired`,
      );
    }

    // Get organization's GoCardless account
    const { data: gcAccount } = await supabaseAdmin
      .from("payment_provider_accounts")
      .select("access_token, environment")
      .eq("organization_id", session.organization_id)
      .eq("provider", "gocardless")
      .single();

    if (!gcAccount) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/members?error=gocardless_not_configured`,
      );
    }

    // Initialize GoCardless service
    const gcService = new GoCardlessService({
      accessToken: gcAccount.access_token,
      environment: gcAccount.environment || "live",
    });

    // Complete redirect flow to create mandate
    const mandateResponse = await gcService.completeRedirectFlow(
      redirectFlowId,
      session.session_token,
    );

    const mandateId =
      typeof mandateResponse.mandates === "string"
        ? mandateResponse.mandates
        : mandateResponse.mandates.id;

    // Get full mandate details
    const mandateDetails = await gcService.getMandate(mandateId);

    // Create membership with Direct Debit payment method
    const membershipData = session.membership_data as any;

    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("customer_memberships")
      .insert({
        client_id: session.customer_id,
        organization_id: session.organization_id,
        membership_plan_id: membershipData.membership_plan_id,
        status: "active",
        payment_method: "direct_debit",
        start_date: membershipData.start_date,
        end_date: membershipData.end_date,
        billing_period: membershipData.billing_period,
        amount: membershipData.amount,
        discount_code: membershipData.discount_code,
        discount_amount: membershipData.discount_amount,
        payment_provider: "gocardless",
        provider_mandate_id: mandateId,
        metadata: {
          gocardless_customer_id: mandateDetails.mandates.links.customer,
          gocardless_bank_account_id:
            mandateDetails.mandates.links.customer_bank_account,
          mandate_reference: mandateDetails.mandates.reference,
          mandate_scheme: mandateDetails.mandates.scheme,
        },
      })
      .select()
      .single();

    if (membershipError) {
      console.error("Failed to create membership:", membershipError);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/members?error=membership_creation_failed`,
      );
    }

    // Create first payment if needed (for upfront or first recurring payment)
    if (membershipData.charge_immediately && membershipData.amount > 0) {
      try {
        await gcService.createPayment({
          mandateId,
          amountPence: Math.round(membershipData.amount * 100),
          currency: "GBP",
          reference: `Membership ${membership.id}`,
          description: `First payment for ${membershipData.plan_name}`,
          metadata: {
            organization_id: session.organization_id,
            customer_id: session.customer_id,
            membership_id: membership.id,
          },
        });
      } catch (paymentError: any) {
        console.error("Failed to create initial payment:", paymentError);
        // Don't fail the whole flow - membership is created, payment can be retried
      }
    }

    // Clean up session
    await supabaseAdmin
      .from("gocardless_sessions")
      .delete()
      .eq("session_token", session.session_token);

    // Redirect to success page
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/members/${session.customer_id}?membership_created=true`,
    );
  } catch (error: any) {
    console.error("Error completing GoCardless redirect:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/members?error=redirect_completion_failed`,
    );
  }
}
