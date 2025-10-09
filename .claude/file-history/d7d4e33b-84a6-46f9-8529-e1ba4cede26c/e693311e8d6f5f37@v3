import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/app/lib/supabase/server";
import { requireAuth } from "@/app/lib/api/auth-check";

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuth();

    // Lazy-load Stripe client at runtime
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        {
          error:
            "Payment processing is not configured. Please contact support.",
        },
        { status: 503 },
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia",
    });

    // Parse request body
    const body = await request.json();
    const { amount, customerId, customerEmail, customerName, description } =
      body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount provided" },
        { status: 400 },
      );
    }

    // Check if organization has Stripe Connect
    const supabase = await createClient();
    const { data: stripeAccount } = await supabase
      .from("stripe_connect_accounts")
      .select("stripe_account_id, access_token")
      .eq("organization_id", user.organizationId)
      .maybeSingle();

    // Create Payment Intent
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: Math.round(amount), // Amount in pennies
      currency: "gbp",
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        customer_id: customerId || "",
        customer_email: customerEmail || "",
        customer_name: customerName || "",
        organization_id: user.organizationId,
      },
      description: description || "Membership Payment",
    };

    // If organization has Stripe Connect, create on their account
    if (stripeAccount?.stripe_account_id) {
      paymentIntentParams.application_fee_amount = Math.round(amount * 0.02); // 2% platform fee
      paymentIntentParams.transfer_data = {
        destination: stripeAccount.stripe_account_id,
      };
    }

    const paymentIntent =
      await stripe.paymentIntents.create(paymentIntentParams);

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: any) {
    console.error("Error creating payment intent:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create payment intent",
      },
      { status: 500 },
    );
  }
}
