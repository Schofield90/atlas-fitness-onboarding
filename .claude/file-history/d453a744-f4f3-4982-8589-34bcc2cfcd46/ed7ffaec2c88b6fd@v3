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

const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const stripe = getStripeClient();
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "No signature provided" },
        { status: 400 },
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return NextResponse.json(
        { error: "Webhook signature verification failed" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    switch (event.type) {
      case "account.updated": {
        const account = event.data.object as Stripe.Account;

        // Update account status in database
        await supabase
          .from("stripe_connect_accounts")
          .update({
            onboarding_completed: account.details_submitted || false,
            charges_enabled: account.charges_enabled || false,
            payouts_enabled: account.payouts_enabled || false,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_account_id", account.id);

        console.log(
          `Account ${account.id} updated - onboarding: ${account.details_submitted}, charges: ${account.charges_enabled}, payouts: ${account.payouts_enabled}`,
        );
        break;
      }

      case "account.external_account.created":
      case "account.external_account.updated": {
        const account = event.account as string;
        console.log(`External account updated for ${account}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing Connect webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
