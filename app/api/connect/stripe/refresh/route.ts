/**
 * Stripe Connect Refresh API
 * Refreshes onboarding link if incomplete
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

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const { organization, user, error } = await getOrganizationAndUser();
    if (error || !organization || !user) {
      return NextResponse.json(
        { error: error || "Not authenticated" },
        { status: 401 },
      );
    }

    const supabase = createClient();

    // Get connected account
    const { data: connectedAccount } = await supabase
      .from("connected_accounts")
      .select("stripe_account_id")
      .eq("organization_id", organization.id)
      .single();

    if (!connectedAccount?.stripe_account_id) {
      return NextResponse.json(
        { error: "No Stripe account found. Please start onboarding first." },
        { status: 404 },
      );
    }

    // Create new account link
    const accountLink = await getStripe().accountLinks.create({
      account: connectedAccount.stripe_account_id,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/connect/stripe/refresh`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/integrations/payments?stripe=connected`,
      type: "account_onboarding",
    });

    // Redirect to account link
    return NextResponse.redirect(accountLink.url);
  } catch (error) {
    console.error("Error refreshing Stripe Connect link:", error);
    return NextResponse.json(
      { error: "Failed to refresh Connect link" },
      { status: 500 },
    );
  }
}
