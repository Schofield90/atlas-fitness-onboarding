import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
});

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
    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (!userOrg) {
      return NextResponse.json({ connected: false });
    }

    // Check for Stripe Connect account
    const { data: connectAccount } = await supabase
      .from("stripe_connect_accounts")
      .select("*")
      .eq("organization_id", userOrg.organization_id)
      .single();

    if (!connectAccount) {
      return NextResponse.json({ connected: false });
    }

    // Get account details from Stripe
    const account = await stripe.accounts.retrieve(
      connectAccount.stripe_account_id,
    );

    return NextResponse.json({
      connected: true,
      account: {
        id: account.id,
        email: account.email,
        country: account.country,
        default_currency: account.default_currency,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
      },
    });
  } catch (error) {
    console.error("Error checking Stripe Connect status:", error);
    return NextResponse.json({ connected: false });
  }
}
