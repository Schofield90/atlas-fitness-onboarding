import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
});

export async function POST(request: NextRequest) {
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
      .select("stripe_account_id, access_token")
      .eq("organization_id", userOrg.organization_id)
      .single();

    if (!connectAccount) {
      return NextResponse.json(
        { error: "No Stripe account found" },
        { status: 404 },
      );
    }

    // Only delete Express accounts (acct_), not OAuth connected accounts
    if (connectAccount.stripe_account_id?.startsWith('acct_')) {
      try {
        await stripe.accounts.del(connectAccount.stripe_account_id);
      } catch (err) {
        console.log("Could not delete Stripe account:", err);
      }
    }

    // For OAuth accounts, revoke access token
    if (connectAccount.access_token) {
      try {
        await stripe.oauth.deauthorize({
          client_id: process.env.STRIPE_CONNECT_CLIENT_ID!,
          stripe_user_id: connectAccount.stripe_account_id,
        });
      } catch (err) {
        console.log("Could not revoke OAuth token:", err);
      }
    }

    // Remove from database
    const supabaseAdmin = createAdminClient();
    await supabaseAdmin
      .from("stripe_connect_accounts")
      .delete()
      .eq("organization_id", userOrg.organization_id);

    // Clear stripe_account_id from organization
    await supabaseAdmin
      .from("organizations")
      .update({ stripe_account_id: null })
      .eq("id", userOrg.organization_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error disconnecting Stripe:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
