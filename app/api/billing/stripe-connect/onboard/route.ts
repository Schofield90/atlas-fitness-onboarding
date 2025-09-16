import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import Stripe from "stripe";

const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey
  ? new Stripe(stripeKey, {
      apiVersion: "2025-07-30.basil",
    })
  : null;

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const adminSupabase = createAdminClient();

    // Get current user and organization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization with role check
    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (!userOrg || !["owner", "admin"].includes(userOrg.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    // Get organization details
    const { data: organization } = await supabase
      .from("organizations")
      .select("name, email, phone")
      .eq("id", userOrg.organization_id)
      .single();

    // Get or create payment settings
    let { data: settings } = await supabase
      .from("organization_payment_settings")
      .select("stripe_account_id")
      .eq("organization_id", userOrg.organization_id)
      .single();

    let accountId = settings?.stripe_account_id;

    // Create new Stripe Connect account if doesn't exist
    if (!accountId) {
      if (!stripe) {
        return NextResponse.json(
          { error: "Stripe not configured" },
          { status: 500 },
        );
      }

      const account = await stripe.accounts.create({
        type: "express",
        country: "GB",
        email: organization?.email || user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: "company",
        company: {
          name: organization?.name || "Gym Business",
          phone: organization?.phone,
        },
        metadata: {
          organization_id: userOrg.organization_id,
          platform: "atlas_fitness",
        },
      });

      accountId = account.id;

      // Save account ID to database
      await adminSupabase.from("organization_payment_settings").upsert(
        {
          organization_id: userOrg.organization_id,
          stripe_account_id: accountId,
          stripe_onboarding_completed: false,
        },
        {
          onConflict: "organization_id",
        },
      );
    }

    // Create account link for onboarding
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe not configured" },
        { status: 500 },
      );
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations/payments?stripe_refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations/payments?stripe_success=true`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error("Error creating onboarding link:", error);
    return NextResponse.json(
      { error: "Failed to create onboarding link" },
      { status: 500 },
    );
  }
}
