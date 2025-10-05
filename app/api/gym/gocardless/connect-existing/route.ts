import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireAuth } from "@/app/lib/api/auth-check";

// @ts-ignore - CommonJS module
const gocardless = require("gocardless-nodejs");

export const dynamic = "force-dynamic";

/**
 * Connect existing GoCardless account via API key
 * Similar to Stripe connect-existing flow
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuth();
    const organizationId = user.organizationId;

    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is required" },
        { status: 400 },
      );
    }

    // Validate API key format
    if (!apiKey.startsWith("live_") && !apiKey.startsWith("sandbox_")) {
      return NextResponse.json(
        {
          error:
            "Invalid API key format. Must start with 'live_' or 'sandbox_'",
        },
        { status: 400 },
      );
    }

    // Determine environment
    const environment = apiKey.startsWith("sandbox_") ? "sandbox" : "live";

    // Initialize GoCardless client to test the API key
    let client;
    try {
      client = gocardless(
        apiKey,
        environment === "live"
          ? gocardless.constants.Environments.Live
          : gocardless.constants.Environments.Sandbox,
      );
    } catch (error: any) {
      return NextResponse.json(
        { error: `Failed to initialize GoCardless: ${error.message}` },
        { status: 400 },
      );
    }

    // Test the API key by fetching creditor (organization) details
    let creditor;
    try {
      const creditors = await client.creditors.list();
      if (
        !creditors ||
        !creditors.creditors ||
        creditors.creditors.length === 0
      ) {
        return NextResponse.json(
          {
            error:
              "No creditor found for this account. Please complete GoCardless setup first.",
          },
          { status: 400 },
        );
      }
      creditor = creditors.creditors[0]; // Use first creditor
    } catch (error: any) {
      console.error("GoCardless API key validation failed:", error);
      return NextResponse.json(
        {
          error: `Invalid API key: ${error.message || "Unable to verify credentials"}`,
        },
        { status: 401 },
      );
    }

    // API key is valid, store in database
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { error: insertError } = await supabaseAdmin
      .from("payment_provider_accounts")
      .upsert(
        {
          organization_id: organizationId,
          provider: "gocardless",
          access_token: apiKey,
          environment,
          connected_at: new Date().toISOString(),
          metadata: {
            creditor_id: creditor.id,
            creditor_name: creditor.name,
            country_code: creditor.country_code,
            scheme_identifiers: creditor.scheme_identifiers,
            verified: creditor.verification_status === "successful",
          },
        },
        {
          onConflict: "organization_id,provider",
        },
      );

    if (insertError) {
      console.error("Failed to store GoCardless connection:", insertError);
      return NextResponse.json(
        { error: "Failed to save connection" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "GoCardless account connected successfully",
      creditor: {
        id: creditor.id,
        name: creditor.name,
        country: creditor.country_code,
        verified: creditor.verification_status === "successful",
      },
      environment,
    });
  } catch (error: any) {
    console.error("GoCardless connection error:", error);
    return NextResponse.json(
      { error: `Failed to connect: ${error.message}` },
      { status: 500 },
    );
  }
}
