import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
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

    // Get Stripe connection
    const { data: stripeAccount } = await supabase
      .from("stripe_connect_accounts")
      .select("access_token, stripe_account_id")
      .eq("organization_id", userOrg.organization_id)
      .single();

    if (!stripeAccount || !stripeAccount.access_token) {
      return NextResponse.json(
        { error: "Stripe account not connected" },
        { status: 404 },
      );
    }

    // Initialize Stripe with the connected account's API key
    const stripe = new Stripe(stripeAccount.access_token, {
      apiVersion: "2024-11-20.acacia",
    });

    // Fetch customers (limited to 10 for testing)
    const customers = await stripe.customers.list({
      limit: 10,
    });

    // Fetch recent charges (limited to 10 for testing)
    const charges = await stripe.charges.list({
      limit: 10,
    });

    // Fetch subscriptions (limited to 10 for testing)
    const subscriptions = await stripe.subscriptions.list({
      limit: 10,
    });

    return NextResponse.json({
      success: true,
      data: {
        account_id: stripeAccount.stripe_account_id,
        customers: {
          total: customers.data.length,
          has_more: customers.has_more,
          data: customers.data.map((c) => ({
            id: c.id,
            email: c.email,
            name: c.name,
            created: new Date(c.created * 1000).toISOString(),
            currency: c.currency,
          })),
        },
        charges: {
          total: charges.data.length,
          has_more: charges.has_more,
          data: charges.data.map((ch) => ({
            id: ch.id,
            amount: ch.amount / 100, // Convert cents to dollars
            currency: ch.currency,
            status: ch.status,
            customer: ch.customer,
            created: new Date(ch.created * 1000).toISOString(),
          })),
        },
        subscriptions: {
          total: subscriptions.data.length,
          has_more: subscriptions.has_more,
          data: subscriptions.data.map((s) => ({
            id: s.id,
            customer: s.customer,
            status: s.status,
            current_period_start: new Date(
              s.current_period_start * 1000,
            ).toISOString(),
            current_period_end: new Date(
              s.current_period_end * 1000,
            ).toISOString(),
          })),
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching Stripe data:", error);
    return NextResponse.json(
      { error: `Failed to fetch data: ${error.message}` },
      { status: 500 },
    );
  }
}
