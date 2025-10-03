import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/app/lib/supabase/admin";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/settings/integrations/payments?error=missing_params", request.url),
      );
    }

    // Decode state
    const { organization_id, user_id } = JSON.parse(
      Buffer.from(state, "base64").toString(),
    );

    // Exchange authorization code for access token
    const response = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    });

    // Save Connect account details
    const supabase = createAdminClient();

    // First, delete any existing Express account that was created
    const { data: existingAccount } = await supabase
      .from("stripe_connect_accounts")
      .select("stripe_account_id")
      .eq("organization_id", organization_id)
      .maybeSingle();

    if (existingAccount?.stripe_account_id && existingAccount.stripe_account_id.startsWith('acct_')) {
      // Delete the old Express account from Stripe if it exists
      try {
        await stripe.accounts.del(existingAccount.stripe_account_id);
      } catch (err) {
        console.log("Could not delete old Express account:", err);
      }
    }

    // Save the connected account (existing or new)
    await supabase
      .from("stripe_connect_accounts")
      .upsert({
        organization_id,
        stripe_account_id: response.stripe_user_id,
        access_token: response.access_token,
        refresh_token: response.refresh_token,
        scope: response.scope,
        connected_at: new Date().toISOString(),
        onboarding_completed: true,
        charges_enabled: true,
        payouts_enabled: true,
      })
      .eq("organization_id", organization_id);

    // Update organization settings
    await supabase
      .from("organizations")
      .update({
        stripe_account_id: response.stripe_user_id,
      })
      .eq("id", organization_id);

    return NextResponse.redirect(
      new URL(
        "/settings/integrations/payments?success=true",
        request.url,
      ),
    );
  } catch (error) {
    console.error("Error in Stripe Connect callback:", error);
    return NextResponse.redirect(
      new URL("/settings/integrations/payments?error=connection_failed", request.url),
    );
  }
}
