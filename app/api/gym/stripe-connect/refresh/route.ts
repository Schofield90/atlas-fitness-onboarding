import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-11-20.acacia",
  });
}

export async function GET(request: NextRequest) {
  const stripe = getStripeClient();
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
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

    // Get Connect account
    const { data: connectAccount } = await supabase
      .from("stripe_connect_accounts")
      .select("stripe_account_id")
      .eq("organization_id", userOrg.organization_id)
      .single();

    if (!connectAccount) {
      return NextResponse.json(
        { error: "No Stripe account found" },
        { status: 404 },
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_GYM_DASHBOARD_URL ||
      "https://login.gymleadhub.co.uk";

    // Create new Account Link for continuing onboarding
    const accountLink = await stripe.accountLinks.create({
      account: connectAccount.stripe_account_id,
      refresh_url: `${baseUrl}/settings/integrations/payments?refresh=true`,
      return_url: `${baseUrl}/settings/integrations/payments?success=true`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error("Error refreshing Stripe Connect:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
