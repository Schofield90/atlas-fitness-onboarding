import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey
  ? new Stripe(stripeKey, {
      apiVersion: "2025-07-30.basil",
    })
  : null;

/**
 * Admin endpoint to sync SaaS plans with Stripe
 * Creates/updates Stripe products and prices for each plan
 */
export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe not configured" },
        { status: 500 },
      );
    }

    const supabase = createAdminClient();

    // Verify super admin
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.includes("Bearer")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all active SaaS plans
    const { data: plans, error: plansError } = await supabase
      .from("saas_plans")
      .select("*")
      .eq("is_active", true);

    if (plansError || !plans) {
      return NextResponse.json(
        { error: "Failed to fetch plans" },
        { status: 500 },
      );
    }

    const results = [];

    for (const plan of plans) {
      try {
        // Create or update Stripe product
        let stripeProduct;

        if (plan.stripe_product_id) {
          // Update existing product
          stripeProduct = await stripe.products.update(plan.stripe_product_id, {
            name: `${plan.name} Plan`,
            description: plan.description || undefined,
            metadata: {
              plan_id: plan.id,
              plan_slug: plan.slug,
            },
          });
        } else {
          // Create new product
          stripeProduct = await stripe.products.create({
            name: `${plan.name} Plan`,
            description: plan.description || undefined,
            metadata: {
              plan_id: plan.id,
              plan_slug: plan.slug,
            },
          });

          // Save product ID to database
          await supabase
            .from("saas_plans")
            .update({ stripe_product_id: stripeProduct.id })
            .eq("id", plan.id);
        }

        // Create monthly price if needed
        let monthlyPriceId = plan.stripe_price_id;
        if (plan.price_monthly > 0) {
          const monthlyPrice = await stripe.prices.create({
            product: stripeProduct.id,
            unit_amount: Math.round(plan.price_monthly * 100), // Convert to pence
            currency: "gbp",
            recurring: {
              interval: "month",
            },
            metadata: {
              plan_id: plan.id,
              billing_interval: "monthly",
            },
          });

          monthlyPriceId = monthlyPrice.id;

          await supabase
            .from("saas_plans")
            .update({ stripe_price_id: monthlyPriceId })
            .eq("id", plan.id);
        }

        // Create yearly price if needed
        let yearlyPriceId = plan.stripe_price_id_yearly;
        if (plan.price_yearly > 0) {
          const yearlyPrice = await stripe.prices.create({
            product: stripeProduct.id,
            unit_amount: Math.round(plan.price_yearly * 100), // Convert to pence
            currency: "gbp",
            recurring: {
              interval: "year",
            },
            metadata: {
              plan_id: plan.id,
              billing_interval: "yearly",
            },
          });

          yearlyPriceId = yearlyPrice.id;

          await supabase
            .from("saas_plans")
            .update({ stripe_price_id_yearly: yearlyPriceId })
            .eq("id", plan.id);
        }

        results.push({
          plan: plan.name,
          success: true,
          product_id: stripeProduct.id,
          monthly_price_id: monthlyPriceId,
          yearly_price_id: yearlyPriceId,
        });
      } catch (error: any) {
        results.push({
          plan: plan.name,
          success: false,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${results.filter((r) => r.success).length} of ${plans.length} plans`,
      results,
    });
  } catch (error) {
    console.error("Error syncing plans with Stripe:", error);
    return NextResponse.json(
      {
        error: "Failed to sync plans",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
