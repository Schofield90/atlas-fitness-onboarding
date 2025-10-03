import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/app/lib/supabase/admin";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 },
      );
    }

    // Verify webhook signature
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

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // Get plan details from metadata
        const planId = session.metadata?.plan_id;
        const billingPeriod = session.metadata?.billing_period;

        if (!planId) {
          console.error("No plan_id in session metadata");
          break;
        }

        // Get customer email from session
        const customerEmail = session.customer_email;
        if (!customerEmail) {
          console.error("No customer email in session");
          break;
        }

        // Create organization for the new customer
        const organizationName = customerEmail.split("@")[0] + "'s Gym";

        const { data: organization, error: orgError } = await supabase
          .from("organizations")
          .insert({
            name: organizationName,
            status: "active",
            settings: {
              subscription: {
                plan_id: planId,
                billing_period: billingPeriod,
                stripe_customer_id: session.customer,
                stripe_subscription_id: session.subscription,
                status: "active",
              },
            },
          })
          .select()
          .single();

        if (orgError) {
          console.error("Error creating organization:", orgError);
          break;
        }

        // Create admin user account
        const temporaryPassword = Math.random().toString(36).slice(-12);

        const { data: authUser, error: authError } =
          await supabase.auth.admin.createUser({
            email: customerEmail,
            password: temporaryPassword,
            email_confirm: true,
            user_metadata: {
              organization_id: organization.id,
              role: "owner",
            },
          });

        if (authError) {
          console.error("Error creating auth user:", authError);
          break;
        }

        // Link user to organization
        await supabase.from("user_organizations").insert({
          user_id: authUser.user.id,
          organization_id: organization.id,
          role: "owner",
        });

        // Store subscription details
        await supabase.from("subscriptions").insert({
          organization_id: organization.id,
          plan_id: planId,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          status: "active",
          billing_period: billingPeriod,
          current_period_end: new Date(
            (session as any).subscription_data?.current_period_end * 1000 ||
              Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        });

        // TODO: Send welcome email with login credentials
        console.log(
          `Organization created for ${customerEmail}, temp password: ${temporaryPassword}`,
        );

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;

        await supabase
          .from("subscriptions")
          .update({
            status: subscription.status,
            current_period_end: new Date(
              subscription.current_period_end * 1000,
            ).toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        await supabase
          .from("subscriptions")
          .update({
            status: "canceled",
            canceled_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        // Also update organization status
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("organization_id")
          .eq("stripe_subscription_id", subscription.id)
          .single();

        if (sub) {
          await supabase
            .from("organizations")
            .update({ status: "suspended" })
            .eq("id", sub.organization_id);
        }

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;

        // Find subscription and notify organization
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("organization_id")
          .eq("stripe_customer_id", invoice.customer as string)
          .single();

        if (sub) {
          // TODO: Send payment failed notification
          console.log(`Payment failed for organization ${sub.organization_id}`);
        }

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }
}
