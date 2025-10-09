import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/app/lib/supabase/server";
import { requireAuth } from "@/app/lib/auth-helpers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { user, error: authError } = await requireAuth();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    // Get organization's Stripe account ID
    const supabase = await createClient();
    const { data: orgData } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (!orgData) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    // Check if organization has Stripe Connect
    const { data: stripeAccount } = await supabase
      .from("stripe_connect_accounts")
      .select("stripe_account_id, access_token")
      .eq("organization_id", orgData.organization_id)
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
        organization_id: orgData.organization_id,
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
