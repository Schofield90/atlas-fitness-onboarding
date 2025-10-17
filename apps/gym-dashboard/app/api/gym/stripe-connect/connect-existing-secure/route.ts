import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import Stripe from "stripe";
import {
  encrypt,
  validateApiKeyFormat,
  maskApiKey,
} from "@/lib/crypto/encryption";

export const dynamic = "force-dynamic";

/**
 * SECURE VERSION: Connect existing Stripe account with encrypted API key storage
 * This endpoint properly encrypts API keys before storing them in the database
 */
export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json();

    // Validate API key format
    if (!apiKey || !validateApiKeyFormat(apiKey, "stripe")) {
      return NextResponse.json(
        { error: "Invalid Stripe API key format" },
        { status: 400 },
      );
    }

    // Get encryption key from environment
    const encryptionKey = process.env.API_KEY_ENCRYPTION_KEY;
    if (!encryptionKey || encryptionKey.length < 32) {
      console.error("API_KEY_ENCRYPTION_KEY not configured properly");
      return NextResponse.json(
        { error: "Server configuration error. Contact support." },
        { status: 500 },
      );
    }

    // Test the API key by trying to retrieve account info
    const stripe = new Stripe(apiKey, {
      apiVersion: "2024-11-20.acacia",
    });

    let account;
    try {
      account = await stripe.accounts.retrieve();
    } catch (error: any) {
      console.error("Stripe API key validation error:", error.message);
      return NextResponse.json(
        { error: `Invalid API key: ${error.message}` },
        { status: 401 },
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization
    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (!userOrg) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 },
      );
    }

    // CRITICAL: Encrypt the API key before storage
    const encryptedApiKey = encrypt(apiKey, encryptionKey);

    // Create masked version for audit logs (never log full API key)
    const maskedKey = maskApiKey(apiKey);

    const supabaseAdmin = createAdminClient();

    // Delete any existing connection
    const { error: deleteError } = await supabaseAdmin
      .from("stripe_connect_accounts")
      .delete()
      .eq("organization_id", userOrg.organization_id);

    if (deleteError) {
      console.error("Error deleting existing connection:", deleteError);
    }

    // Save new connection with ENCRYPTED key
    const { data: insertData, error: insertError } = await supabaseAdmin
      .from("stripe_connect_accounts")
      .insert({
        organization_id: userOrg.organization_id,
        stripe_account_id: account.id,
        access_token: encryptedApiKey, // ENCRYPTED
        access_token_mask: maskedKey, // For display only
        connected_at: new Date().toISOString(),
        onboarding_completed: true,
        charges_enabled: account.charges_enabled || false,
        payouts_enabled: account.payouts_enabled || false,
        encryption_version: "v1", // Track encryption version for future migrations
      })
      .select();

    if (insertError) {
      console.error("Error inserting Stripe connection:", insertError);
      return NextResponse.json(
        { error: `Database error: ${insertError.message}` },
        { status: 500 },
      );
    }

    // Log the connection (with masked key only)
    console.log("Stripe connection saved successfully:", {
      organization_id: userOrg.organization_id,
      account_id: account.id,
      masked_key: maskedKey,
      encryption: "enabled",
    });

    // Audit log entry
    await supabaseAdmin.from("audit_logs").insert({
      organization_id: userOrg.organization_id,
      user_id: user.id,
      action: "stripe_connect",
      resource_type: "payment_integration",
      resource_id: account.id,
      metadata: {
        account_id: account.id,
        masked_key: maskedKey,
        country: account.country,
        encryption_version: "v1",
      },
    });

    // Update organization
    const { error: updateError } = await supabaseAdmin
      .from("organizations")
      .update({
        stripe_account_id: account.id,
      })
      .eq("id", userOrg.organization_id);

    if (updateError) {
      console.error("Error updating organization:", updateError);
    }

    // Never return the API key or encrypted version
    return NextResponse.json({
      success: true,
      account: {
        id: account.id,
        email: account.email,
        country: account.country,
        default_currency: account.default_currency,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        masked_key: maskedKey, // Only return masked version
      },
    });
  } catch (error: any) {
    console.error("Error connecting existing account:", error);
    return NextResponse.json(
      { error: `Failed to connect: ${error.message || "Unknown error"}` },
      { status: 500 },
    );
  }
}
