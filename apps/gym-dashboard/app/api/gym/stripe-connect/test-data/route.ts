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
        { error: "No Stripe account connected" },
        { status: 404 },
      );
    }

    // Fetch customers from connected account
    const customers = await stripe.customers.list(
      { limit: 10 },
      { stripeAccount: connectAccount.stripe_account_id }
    );

    // Fetch recent payments from connected account
    const paymentIntents = await stripe.paymentIntents.list(
      { limit: 10 },
      { stripeAccount: connectAccount.stripe_account_id }
    );

    return NextResponse.json({
      accountId: connectAccount.stripe_account_id,
      customersCount: customers.data.length,
      customers: customers.data.map(c => ({
        id: c.id,
        email: c.email,
        name: c.name,
        created: new Date(c.created * 1000).toLocaleDateString(),
      })),
      paymentsCount: paymentIntents.data.length,
      payments: paymentIntents.data.map(p => ({
        id: p.id,
        amount: p.amount / 100,
        currency: p.currency,
        status: p.status,
        created: new Date(p.created * 1000).toLocaleDateString(),
      })),
    });
  } catch (error) {
    console.error("Error testing Stripe data:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch data",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 },
    );
  }
}
