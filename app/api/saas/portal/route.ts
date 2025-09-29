import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import Stripe from "stripe";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey
  ? new Stripe(stripeKey, {
      apiVersion: "2025-07-30.basil",
    })
  : null;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user and organization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization
    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (!userOrg) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 },
      );
    }

    // Get subscription
    const { data: subscription } = await supabase
      .from("saas_subscriptions")
      .select("stripe_customer_id")
      .eq("organization_id", userOrg.organization_id)
      .single();

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json({ error: "No customer found" }, { status: 404 });
    }

    // Check if Stripe is configured
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe not configured" },
        { status: 500 },
      );
    }

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
    });

    // Redirect to portal
    return NextResponse.redirect(session.url);
  } catch (error) {
    console.error("Error creating portal session:", error);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 },
    );
  }
}
