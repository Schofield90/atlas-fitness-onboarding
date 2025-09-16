/**
 * Payment System Health Check
 * Verifies all payment provider credentials and database access
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/app/lib/supabase/server";

export async function GET(request: NextRequest) {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    checks: {
      stripe: {
        configured: false,
        connected: false,
        error: null as string | null,
      },
      gocardless: {
        configured: false,
        connected: false,
        error: null as string | null,
      },
      database: {
        connected: false,
        tables: {
          billing_customers: false,
          billing_subscriptions: false,
          connected_accounts: false,
          gym_products: false,
          gym_charges: false,
          webhook_events: false,
        },
      },
      environment: {
        stripe_keys: false,
        gocardless_keys: false,
        webhook_secrets: false,
      },
    },
  };

  try {
    // Check Stripe configuration
    if (process.env.STRIPE_SECRET_KEY) {
      health.checks.stripe.configured = true;
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
          apiVersion: "2024-11-20.acacia",
        });
        // Test connection with a simple API call
        await stripe.customers.list({ limit: 1 });
        health.checks.stripe.connected = true;
      } catch (error) {
        health.checks.stripe.error =
          error instanceof Error ? error.message : "Unknown error";
        health.status = "degraded";
      }
    } else {
      health.checks.stripe.error = "STRIPE_SECRET_KEY not configured";
      health.status = "degraded";
    }

    // Check GoCardless configuration
    if (
      process.env.GOCARDLESS_CLIENT_ID &&
      process.env.GOCARDLESS_CLIENT_SECRET
    ) {
      health.checks.gocardless.configured = true;
      // Basic check - more detailed check would require API call
      if (process.env.GOCARDLESS_ENVIRONMENT) {
        health.checks.gocardless.connected = true;
      } else {
        health.checks.gocardless.error =
          "GOCARDLESS_ENVIRONMENT not configured";
        health.status = "degraded";
      }
    } else {
      health.checks.gocardless.error = "GoCardless credentials not configured";
      health.status = "degraded";
    }

    // Check database
    const supabase = createClient();
    try {
      // Test table access
      const tables = [
        "billing_customers",
        "billing_subscriptions",
        "connected_accounts",
        "gym_products",
        "gym_charges",
        "webhook_events",
      ];

      for (const table of tables) {
        try {
          const { error } = await supabase.from(table).select("id").limit(1);

          if (!error) {
            health.checks.database.tables[
              table as keyof typeof health.checks.database.tables
            ] = true;
          }
        } catch {
          // Table doesn't exist or no access
        }
      }

      health.checks.database.connected = true;
    } catch (error) {
      health.status = "unhealthy";
    }

    // Check environment variables
    health.checks.environment.stripe_keys = !!(
      process.env.STRIPE_SECRET_KEY &&
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    );

    health.checks.environment.gocardless_keys = !!(
      process.env.GOCARDLESS_CLIENT_ID &&
      process.env.GOCARDLESS_CLIENT_SECRET &&
      process.env.GOCARDLESS_REDIRECT_URI
    );

    health.checks.environment.webhook_secrets = !!(
      process.env.STRIPE_WEBHOOK_SECRET && process.env.GOCARDLESS_WEBHOOK_SECRET
    );

    // Determine overall status
    const criticalChecks = [
      health.checks.database.connected,
      health.checks.environment.stripe_keys ||
        health.checks.environment.gocardless_keys,
    ];

    if (!criticalChecks.every((check) => check)) {
      health.status = "unhealthy";
    }

    const statusCode =
      health.status === "healthy"
        ? 200
        : health.status === "degraded"
          ? 206
          : 503;

    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    console.error("Health check error:", error);
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
