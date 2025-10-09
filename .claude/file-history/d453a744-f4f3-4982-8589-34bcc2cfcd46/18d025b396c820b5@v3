import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/app/lib/supabase/admin";

export const dynamic = "force-dynamic";

function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-11-20.acacia",
  });
}

export async function POST(request: NextRequest) {
  const stripe = getStripeClient();
  try {
    const { planId, billingPeriod } = await request.json();

    if (!planId || !billingPeriod) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Get plan details
    const supabase = createAdminClient();
    const { data: plan, error: planError } = await supabase
      .from("saas_plans")
      .select("*")
      .eq("id", planId)
      .eq("is_active", true)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Determine price based on billing period
    const priceAmount =
      billingPeriod === "monthly" ? plan.price_monthly : plan.price_yearly;
    const interval = billingPeriod === "monthly" ? "month" : "year";

    // Create or get Stripe price ID
    let stripePriceId =
      billingPeriod === "monthly"
        ? plan.stripe_price_id
        : plan.stripe_price_id_yearly;

    // If price doesn't exist in Stripe, create it
    if (!stripePriceId) {
      // First, ensure product exists
      let productId = plan.stripe_product_id;
      if (!productId) {
        const product = await stripe.products.create({
          name: plan.name,
          description: plan.description || undefined,
          metadata: {
            plan_id: plan.id,
          },
        });
        productId = product.id;

        // Save product ID
        await supabase
          .from("saas_plans")
          .update({ stripe_product_id: productId })
          .eq("id", plan.id);
      }

      // Create price
      const price = await stripe.prices.create({
        product: productId,
        unit_amount: priceAmount,
        currency: "gbp",
        recurring: {
          interval: interval,
        },
        metadata: {
          plan_id: plan.id,
          billing_period: billingPeriod,
        },
      });

      stripePriceId = price.id;

      // Save price ID
      const priceField =
        billingPeriod === "monthly"
          ? "stripe_price_id"
          : "stripe_price_id_yearly";
      await supabase
        .from("saas_plans")
        .update({ [priceField]: stripePriceId })
        .eq("id", plan.id);
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || "https://admin.gymleadhub.co.uk"}/signup/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || "https://admin.gymleadhub.co.uk"}/signup/${plan.slug}?canceled=true`,
      metadata: {
        plan_id: plan.id,
        billing_period: billingPeriod,
      },
      subscription_data: {
        metadata: {
          plan_id: plan.id,
          billing_period: billingPeriod,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
