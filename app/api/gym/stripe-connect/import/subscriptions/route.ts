import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

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

    // Fetch all subscriptions from Stripe
    const subscriptions: Stripe.Subscription[] = [];
    let hasMore = true;
    let startingAfter: string | undefined = undefined;

    while (hasMore) {
      const batch = await stripe.subscriptions.list({
        limit: 100,
        starting_after: startingAfter,
      });

      subscriptions.push(...batch.data);
      hasMore = batch.has_more;
      if (hasMore && batch.data.length > 0) {
        startingAfter = batch.data[batch.data.length - 1].id;
      }
    }

    const activeSubscriptions = subscriptions.filter(
      (sub) => sub.status === "active" || sub.status === "trialing",
    );

    // Store subscription data in client records
    for (const subscription of activeSubscriptions) {
      const customerId = subscription.customer as string;

      // Find client by Stripe customer ID
      const { data: client } = await supabaseAdmin
        .from("clients")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("stripe_customer_id", customerId)
        .maybeSingle();

      if (client) {
        // Update client with subscription info
        await supabaseAdmin
          .from("clients")
          .update({
            stripe_subscription_id: subscription.id,
            subscription_status: subscription.status,
            subscription_current_period_end: new Date(
              subscription.current_period_end * 1000,
            ).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", client.id);
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        total: subscriptions.length,
        active: activeSubscriptions.length,
      },
    });
  } catch (error: any) {
    console.error("Error importing subscriptions:", error);
    return NextResponse.json(
      { error: `Failed to import subscriptions: ${error.message}` },
      { status: 500 },
    );
  }
}
