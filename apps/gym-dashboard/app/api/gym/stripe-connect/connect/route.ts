import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
});

export async function GET(request: NextRequest) {
  try {
    console.log('[Stripe Connect] Starting connection request');
    const supabase = await createClient();
    console.log('[Stripe Connect] Supabase client created');

    const {
      data: { user },
    } = await supabase.auth.getUser();
    console.log('[Stripe Connect] User:', user?.id);

    if (!user) {
      console.log('[Stripe Connect] No user found');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization
    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (!userOrg) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 },
      );
    }

    // Check if account already exists
    const { data: existingAccount } = await supabase
      .from("stripe_connect_accounts")
      .select("stripe_account_id")
      .eq("organization_id", userOrg.organization_id)
      .maybeSingle();

    let accountId: string;

    if (existingAccount?.stripe_account_id) {
      // Use existing account
      accountId = existingAccount.stripe_account_id;
    } else {
      // Create new Express account
      const account = await stripe.accounts.create({
        type: "express",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      accountId = account.id;

      // Save account to database
      const supabaseAdmin = createAdminClient();
      await supabaseAdmin.from("stripe_connect_accounts").insert({
        organization_id: userOrg.organization_id,
        stripe_account_id: accountId,
        connected_at: new Date().toISOString(),
      });
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_GYM_DASHBOARD_URL ||
      "https://login.gymleadhub.co.uk";

    // Create Account Link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/settings/integrations/payments?refresh=true`,
      return_url: `${baseUrl}/settings/integrations/payments?success=true`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error("[Stripe Connect] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
