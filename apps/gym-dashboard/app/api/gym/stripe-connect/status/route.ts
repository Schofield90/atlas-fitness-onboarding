import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization
    const { data: userOrg, error: orgError } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (orgError || !userOrg) {
      console.log("No user organization found:", orgError);
      return NextResponse.json({ connected: false });
    }

    console.log("Checking Stripe connection for org:", userOrg.organization_id);

    // Use admin client to bypass RLS
    const supabaseAdmin = createAdminClient();

    // Check for Stripe Connect account
    const { data: connectAccount, error: connectError } = await supabaseAdmin
      .from("stripe_connect_accounts")
      .select("*")
      .eq("organization_id", userOrg.organization_id)
      .single();

    if (connectError || !connectAccount) {
      console.log("No Stripe connection found:", connectError);
      return NextResponse.json({ connected: false });
    }

    console.log("Stripe connection found:", {
      account_id: connectAccount.stripe_account_id,
      has_token: !!connectAccount.access_token,
    });

    // Get account details from Stripe using the connected account's API key
    const stripe = new Stripe(connectAccount.access_token, {
      apiVersion: "2024-11-20.acacia",
    });

    const account = await stripe.accounts.retrieve();

    return NextResponse.json({
      connected: true,
      account: {
        id: account.id,
        email: account.email,
        country: account.country,
        default_currency: account.default_currency,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        onboarding_completed: connectAccount.onboarding_completed,
      },
    });
  } catch (error) {
    console.error("Error checking Stripe Connect status:", error);
    return NextResponse.json({ connected: false });
  }
}
