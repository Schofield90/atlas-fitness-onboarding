import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import Stripe from "stripe";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 seconds timeout (requires Pro plan)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    // Use admin client for all operations
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: stripeAccount } = await supabaseAdmin
      .from("stripe_connect_accounts")
      .select("access_token")
      .eq("organization_id", organizationId)
      .single();

    if (!stripeAccount || !stripeAccount.access_token) {
      return NextResponse.json(
        { error: "Stripe account not connected" },
        { status: 404 },
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeAccount.access_token, {
      apiVersion: "2024-11-20.acacia",
    });

    // Get all clients with Stripe customer IDs
    const { data: clients } = await supabaseAdmin
      .from("clients")
      .select("id, stripe_customer_id")
      .eq("organization_id", organizationId)
      .not("stripe_customer_id", "is", null);

    if (!clients || clients.length === 0) {
      return NextResponse.json({
        success: true,
        stats: { total: 0, linked: 0 },
      });
    }

    let totalPaymentMethods = 0;
    let linked = 0;

    // For each client, get their payment methods from Stripe
    for (const client of clients) {
      if (!client.stripe_customer_id) continue;

      try {
        const paymentMethods = await stripe.paymentMethods.list({
          customer: client.stripe_customer_id,
          type: "card",
        });

        totalPaymentMethods += paymentMethods.data.length;

        // Store payment method info in client metadata
        if (paymentMethods.data.length > 0) {
          const defaultPaymentMethod = paymentMethods.data[0];

          await supabaseAdmin
            .from("clients")
            .update({
              payment_method_last4: defaultPaymentMethod.card?.last4 || null,
              payment_method_brand: defaultPaymentMethod.card?.brand || null,
              payment_method_exp_month:
                defaultPaymentMethod.card?.exp_month || null,
              payment_method_exp_year:
                defaultPaymentMethod.card?.exp_year || null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", client.id);

          linked++;
        }
      } catch (error) {
        console.error(
          `Error fetching payment methods for customer ${client.stripe_customer_id}:`,
          error,
        );
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        total: totalPaymentMethods,
        linked,
      },
    });
  } catch (error: any) {
    console.error("Error importing payment methods:", error);
    return NextResponse.json(
      { error: `Failed to import payment methods: ${error.message}` },
      { status: 500 },
    );
  }
}
