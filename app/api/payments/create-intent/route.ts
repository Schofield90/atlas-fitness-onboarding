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
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const body = await request.json();

    const {
      amount, // in pence
      customerId,
      clientId, // Support both old and new naming
      programId,
      organizationId,
      description,
      membershipId,
      type = "membership_payment",
    } = body;

    // Use clientId if provided, otherwise fall back to customerId
    const clientIdToUse = clientId || customerId;
    const orgIdToUse = organizationId;

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get customer's organization
    const { data: customer } = await supabase
      .from("clients")
      .select("organization_id, email, stripe_customer_id")
      .eq("id", clientIdToUse)
      .single();

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 },
      );
    }

    // Get organization's payment settings
    const { data: paymentSettings } = await adminSupabase
      .from("organization_payment_settings")
      .select("*")
      .eq("organization_id", customer.organization_id)
      .single();

    if (!paymentSettings?.stripe_account_id) {
      return NextResponse.json(
        { error: "Organization has not connected Stripe account" },
        { status: 400 },
      );
    }

    if (!paymentSettings.stripe_charges_enabled) {
      return NextResponse.json(
        {
          error:
            "Organization cannot accept payments yet. Please complete Stripe setup.",
        },
        { status: 400 },
      );
    }

    // Calculate platform fee
    const platformFeeAmount = Math.round(
      amount * paymentSettings.platform_commission_rate,
    );

    // Create or retrieve Stripe customer on connected account
    let stripeCustomerId = customer.stripe_customer_id;

    if (!stripeCustomerId && stripe) {
      // Create customer on connected account
      const stripeCustomer = await stripe.customers.create(
        {
          email: customer.email,
          metadata: {
            client_id: clientIdToUse,
            organization_id: customer.organization_id || orgIdToUse,
          },
        },
        {
          stripeAccount: paymentSettings.stripe_account_id,
        },
      );

      stripeCustomerId = stripeCustomer.id;

      // Save customer ID
      await adminSupabase
        .from("clients")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", clientIdToUse);
    }

    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe not configured" },
        { status: 500 },
      );
    }

    // Create payment intent on connected account
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount,
        currency: "gbp",
        customer: stripeCustomerId,
        description: description || `${type} for program ${programId}`,
        application_fee_amount: platformFeeAmount,
        metadata: {
          type,
          client_id: clientIdToUse,
          organization_id: customer.organization_id || orgIdToUse,
          membership_id: membershipId || "",
          program_id: programId || "",
          user_id: user.id,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      },
      {
        stripeAccount: paymentSettings.stripe_account_id,
      },
    );

    // Log the payment attempt
    await adminSupabase.from("payment_transactions").insert({
      organization_id: customer.organization_id || orgIdToUse,
      customer_id: clientIdToUse,
      stripe_payment_intent_id: paymentIntent.id,
      amount_pennies: amount,
      currency: "gbp",
      status: "pending",
      description: description || `${type} for program ${programId}`,
      platform_fee_pennies: platformFeeAmount,
      metadata: {
        type,
        program_id: programId,
        created_by: user.id,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount,
      platformFee: platformFeeAmount,
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 },
    );
  }
}
