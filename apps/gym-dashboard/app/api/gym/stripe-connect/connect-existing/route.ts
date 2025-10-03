import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json();

    if (!apiKey || !apiKey.startsWith("sk_")) {
      return NextResponse.json(
        { error: "Invalid Stripe API key" },
        { status: 400 },
      );
    }

    // Test the API key by trying to retrieve account info
    const stripe = new Stripe(apiKey, {
      apiVersion: "2024-11-20.acacia",
    });

    let account;
    try {
      account = await stripe.accounts.retrieve();
    } catch (error: any) {
      console.error("Stripe API key validation error:", error.message);
      return NextResponse.json(
        { error: `Invalid API key: ${error.message}` },
        { status: 401 },
      );
    }

    // Get authenticated user
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

    // Encrypt API key (in production, use proper encryption)
    // For now, we'll store it directly with a warning
    const supabaseAdmin = createAdminClient();

    // Delete any existing connection
    const { error: deleteError } = await supabaseAdmin
      .from("stripe_connect_accounts")
      .delete()
      .eq("organization_id", userOrg.organization_id);

    if (deleteError) {
      console.error("Error deleting existing connection:", deleteError);
    }

    // Save new connection
    const { data: insertData, error: insertError } = await supabaseAdmin
      .from("stripe_connect_accounts")
      .insert({
        organization_id: userOrg.organization_id,
        stripe_account_id: account.id,
        access_token: apiKey, // Storing API key as access_token
        connected_at: new Date().toISOString(),
        onboarding_completed: true,
        charges_enabled: account.charges_enabled || false,
        payouts_enabled: account.payouts_enabled || false,
      })
      .select();

    if (insertError) {
      console.error("Error inserting Stripe connection:", insertError);
      return NextResponse.json(
        { error: `Database error: ${insertError.message}` },
        { status: 500 },
      );
    }

    console.log("Stripe connection saved successfully:", insertData);

    // Update organization
    const { error: updateError } = await supabaseAdmin
      .from("organizations")
      .update({
        stripe_account_id: account.id,
      })
      .eq("id", userOrg.organization_id);

    if (updateError) {
      console.error("Error updating organization:", updateError);
    }

    return NextResponse.json({
      success: true,
      account: {
        id: account.id,
        email: account.email,
        country: account.country,
        default_currency: account.default_currency,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
      },
    });
  } catch (error: any) {
    console.error("Error connecting existing account:", error);
    return NextResponse.json(
      { error: `Failed to connect: ${error.message || "Unknown error"}` },
      { status: 500 },
    );
  }
}
