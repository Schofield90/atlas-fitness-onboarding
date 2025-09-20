/**
 * Stripe Connect API
 * Handles merchant onboarding for card payment acceptance
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

    const supabase = await createClient();

    // Check if already connected
    const { data: connectedAccount } = await supabase
      .from("connected_accounts")
      .select("stripe_account_id, stripe_account_status")
      .eq("organization_id", organization.id)
      .single();

    let accountId = connectedAccount?.stripe_account_id;

    // Create account if doesn't exist
    if (!accountId) {
      const account = await getStripe().accounts.create({
        type: "express",
        country: "GB",
        email: user.email,
        business_type: "company",
        company: {
          name: organization.name,
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          organization_id: organization.id,
        },
      });

      accountId = account.id;

      // Store account
      await supabase.from("connected_accounts").upsert(
        {
          organization_id: organization.id,
          stripe_account_id: accountId,
          stripe_account_status: "pending",
          stripe_charges_enabled: false,
          stripe_payouts_enabled: false,
          stripe_details_submitted: false,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "organization_id",
        },
      );
    }

    // Create account link for onboarding
    const accountLink = await getStripe().accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/connect/stripe/refresh`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/integrations/payments?stripe=connected`,
      type: "account_onboarding",
    });

    return NextResponse.json({
      success: true,
      url: accountLink.url,
      accountId,
    });
  } catch (error) {
    console.error("Error creating Stripe Connect link:", error);
    return NextResponse.json(
      { error: "Failed to create Connect link" },
      { status: 500 },
    );
  }
}
