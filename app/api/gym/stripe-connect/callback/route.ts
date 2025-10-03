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
        new URL("/settings/integrations?error=missing_params", request.url),
      );
    }

    // Decode state
    const { organization_id, user_id } = JSON.parse(
      Buffer.from(state, "base64").toString(),
    );

    // Exchange code for access token
    const response = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    });

    // Save Connect account details
    const supabase = createAdminClient();
    await supabase
      .from("stripe_connect_accounts")
      .upsert({
        organization_id,
        stripe_account_id: response.stripe_user_id,
        access_token: response.access_token,
        refresh_token: response.refresh_token,
        scope: response.scope,
        connected_at: new Date().toISOString(),
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
        "/settings/integrations/payments?stripe_success=true",
        request.url,
      ),
    );
  } catch (error) {
    console.error("Error in Stripe Connect callback:", error);
    return NextResponse.redirect(
      new URL("/settings/integrations?error=connection_failed", request.url),
    );
  }
}
