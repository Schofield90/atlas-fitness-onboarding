import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/app/lib/supabase/server";

const stripeKey = process.env.STRIPE_SECRET_KEY;
let stripe: Stripe | null = null;

if (stripeKey) {
  stripe = new Stripe(stripeKey, {
    apiVersion: "2024-12-18.acacia",
  });
}

export async function GET(request: NextRequest) {
  if (!stripe) {
    console.error("Stripe is not configured. Please set STRIPE_SECRET_KEY.");
    return NextResponse.json(
      { error: "Payment system not configured" },
      { status: 503 },
    );
  }

  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const planId = searchParams.get("planId");
    const billingPeriod = searchParams.get("billing") || "monthly";

    if (!planId) {
      return NextResponse.json({ error: "Missing plan ID" }, { status: 400 });
    }

    // Get the plan details
    const { data: plan, error: planError } = await supabase
      .from("billing_plans")
      .select("*")
      .eq("id", planId)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Check if user already has an organization
    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    const priceId =
      billingPeriod === "yearly"
        ? plan.stripe_price_id_yearly
        : plan.stripe_price_id_monthly;

    if (!priceId) {
      return NextResponse.json(
        { error: "This plan is not available for the selected billing period" },
        { status: 400 },
      );
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId: user.id,
        planId: planId,
        organizationId: userOrg?.organization_id || "",
        billingPeriod: billingPeriod,
      },
      customer_email: user.email,
      success_url: `${request.nextUrl.origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/pricing`,
      allow_promotion_codes: true,
      billing_address_collection: "required",
      tax_id_collection: {
        enabled: true,
      },
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          userId: user.id,
          planId: planId,
          organizationId: userOrg?.organization_id || "",
        },
      },
    });

    // Redirect to Stripe checkout
    return NextResponse.redirect(session.url!);
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
