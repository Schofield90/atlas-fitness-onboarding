/**
 * Gym Stripe Checkout API
 * Creates payment sessions for gym clients using Connected Account
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/app/lib/supabase/server";
import { getOrganizationAndUser } from "@/app/lib/auth-utils";

// Initialize Stripe lazily
let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripe && process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-11-20.acacia",
    });
  }
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }
  return stripe;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { organization, user, error } = await getOrganizationAndUser();
    if (error || !organization || !user) {
      return NextResponse.json(
        { error: error || "Not authenticated" },
        { status: 401 },
      );
    }

    const {
      productId,
      clientEmail,
      clientName,
      successUrl,
      cancelUrl,
      mode = "payment", // 'payment' or 'subscription'
    } = await request.json();

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Get connected account
    const { data: connectedAccount } = await supabase
      .from("connected_accounts")
      .select("stripe_account_id, stripe_charges_enabled")
      .eq("organization_id", organization.id)
      .single();

    if (!connectedAccount?.stripe_account_id) {
      return NextResponse.json(
        { error: "Stripe not connected. Please complete onboarding first." },
        { status: 400 },
      );
    }

    if (!connectedAccount.stripe_charges_enabled) {
      return NextResponse.json(
        {
          error:
            "Stripe account not fully verified. Please complete onboarding.",
        },
        { status: 400 },
      );
    }

    // Get product details
    const { data: product } = await supabase
      .from("gym_products")
      .select("*")
      .eq("id", productId)
      .eq("organization_id", organization.id)
      .single();

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (product.processor !== "stripe") {
      return NextResponse.json(
        { error: "Product not configured for Stripe" },
        { status: 400 },
      );
    }

    // Calculate platform fee if configured
    const platformFeeBps =
      product.platform_fee_bps ||
      parseInt(process.env.PLATFORM_FEE_BPS || "250"); // Default 2.5%
    const applicationFeeAmount = Math.floor(
      (product.amount_cents * platformFeeBps) / 10000,
    );

    // Create line item
    const lineItem: Stripe.Checkout.SessionCreateParams.LineItem =
      mode === "subscription"
        ? {
            price_data: {
              currency: product.currency,
              product_data: {
                name: product.name,
                description: product.description || undefined,
              },
              recurring: {
                interval: product.interval as "day" | "week" | "month" | "year",
              },
              unit_amount: product.amount_cents,
            },
            quantity: 1,
          }
        : {
            price_data: {
              currency: product.currency,
              product_data: {
                name: product.name,
                description: product.description || undefined,
              },
              unit_amount: product.amount_cents,
            },
            quantity: 1,
          };

    // Create checkout session on connected account
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: mode as "payment" | "subscription",
      payment_method_types: ["card"],
      line_items: [lineItem],
      success_url:
        successUrl ||
        `${process.env.NEXT_PUBLIC_APP_URL}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:
        cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/payments/cancel`,
      customer_email: clientEmail,
      metadata: {
        organization_id: organization.id,
        product_id: productId,
        client_name: clientName || "",
        platform_fee_cents: applicationFeeAmount.toString(),
      },
    };

    // Add application fee for platform
    if (applicationFeeAmount > 0) {
      if (mode === "subscription") {
        sessionParams.subscription_data = {
          application_fee_percent: platformFeeBps / 100,
          metadata: {
            organization_id: organization.id,
            product_id: productId,
          },
        };
      } else {
        sessionParams.payment_intent_data = {
          application_fee_amount: applicationFeeAmount,
          metadata: {
            organization_id: organization.id,
            product_id: productId,
          },
        };
      }
    }

    const session = await getStripe().checkout.sessions.create(sessionParams, {
      stripeAccount: connectedAccount.stripe_account_id,
    });

    // Store payment intent for tracking
    await supabase.from("gym_charges").insert({
      organization_id: organization.id,
      client_email: clientEmail,
      client_name: clientName,
      amount_cents: product.amount_cents,
      currency: product.currency,
      description: product.name,
      processor: "stripe",
      processor_payment_id: (session.payment_intent as string) || session.id,
      platform_fee_cents: applicationFeeAmount,
      status: "pending",
      metadata: {
        session_id: session.id,
        product_id: productId,
        mode,
      },
    });

    return NextResponse.json({
      success: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("Error creating gym checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
