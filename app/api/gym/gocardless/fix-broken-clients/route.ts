import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

// @ts-ignore - CommonJS module
const gocardless = require("gocardless-nodejs");
const { Environments } = require("gocardless-nodejs/constants");

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Fix GoCardless clients that have addresses as names
 * Fetches real customer data from GoCardless API using payment customer IDs
 */
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

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get GoCardless connection
    const { data: connection } = await supabaseAdmin
      .from("payment_provider_accounts")
      .select("access_token, environment")
      .eq("organization_id", organizationId)
      .eq("provider", "gocardless")
      .single();

    if (!connection || !connection.access_token) {
      return NextResponse.json(
        { error: "GoCardless account not connected" },
        { status: 404 },
      );
    }

    // Initialize GoCardless client
    const client = gocardless(
      connection.access_token,
      connection.environment === "live"
        ? Environments.Live
        : Environments.Sandbox,
    );

    // Find all broken clients (addresses as first names)
    const { data: brokenClients } = await supabaseAdmin
      .from("clients")
      .select("id, first_name, last_name, email")
      .eq("org_id", organizationId)
      .eq("source", "gocardless_csv_import")
      .or(
        "first_name.ilike.%Road%,first_name.ilike.%Avenue%,first_name.ilike.%View%,first_name.ilike.%Close%,first_name.ilike.%Grove%,first_name.ilike.%Street%",
      );

    if (!brokenClients || brokenClients.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No broken clients found",
        stats: { total: 0, fixed: 0, failed: 0 },
      });
    }

    console.log(`Found ${brokenClients.length} broken clients to fix`);

    let fixed = 0;
    let failed = 0;
    const errors: Array<{ clientId: string; error: string }> = [];

    // For each broken client, find a payment and get the real customer data
    for (const brokenClient of brokenClients) {
      try {
        // Get a payment for this client to find the GoCardless customer ID
        const { data: payment } = await supabaseAdmin
          .from("payments")
          .select("provider_payment_id, metadata")
          .eq("client_id", brokenClient.id)
          .eq("payment_provider", "gocardless")
          .limit(1)
          .single();

        if (!payment || !payment.provider_payment_id) {
          console.log(
            `⚠️ No GoCardless payment found for client ${brokenClient.id}`,
          );
          failed++;
          errors.push({
            clientId: brokenClient.id,
            error: "No GoCardless payment found",
          });
          continue;
        }

        // Fetch payment from GoCardless API to get customer ID
        let gcPayment;
        try {
          gcPayment = await client.payments.find(payment.provider_payment_id);
        } catch (apiError: any) {
          console.error(
            `Failed to fetch payment ${payment.provider_payment_id}:`,
            apiError.message,
          );
          failed++;
          errors.push({
            clientId: brokenClient.id,
            error: `GoCardless API error: ${apiError.message}`,
          });
          continue;
        }

        // Get customer ID from payment
        const customerId = gcPayment.links?.customer;
        if (!customerId) {
          failed++;
          errors.push({
            clientId: brokenClient.id,
            error: "No customer ID in payment",
          });
          continue;
        }

        // Fetch customer details from GoCardless
        let gcCustomer;
        try {
          gcCustomer = await client.customers.find(customerId);
        } catch (apiError: any) {
          console.error(
            `Failed to fetch customer ${customerId}:`,
            apiError.message,
          );
          failed++;
          errors.push({
            clientId: brokenClient.id,
            error: `Customer fetch failed: ${apiError.message}`,
          });
          continue;
        }

        // Extract real customer data
        const firstName = gcCustomer.given_name || "Unknown";
        const lastName = gcCustomer.family_name || "";
        const email = gcCustomer.email || brokenClient.email; // Keep existing email if no email in GC

        // Update client with correct data
        const { error: updateError } = await supabaseAdmin
          .from("clients")
          .update({
            first_name: firstName,
            last_name: lastName,
            email: email,
            phone: gcCustomer.phone_number || null,
            metadata: {
              ...brokenClient,
              gocardless_customer_id: customerId,
              fixed_from_api: true,
              original_broken_data: {
                first_name: brokenClient.first_name,
                last_name: brokenClient.last_name,
                email: brokenClient.email,
              },
            },
          })
          .eq("id", brokenClient.id);

        if (updateError) {
          console.error(
            `Failed to update client ${brokenClient.id}:`,
            updateError,
          );
          failed++;
          errors.push({
            clientId: brokenClient.id,
            error: updateError.message,
          });
        } else {
          fixed++;
          console.log(
            `✅ Fixed client ${brokenClient.id}: ${brokenClient.first_name} → ${firstName} ${lastName} (${email})`,
          );
        }
      } catch (error: any) {
        failed++;
        errors.push({
          clientId: brokenClient.id,
          error: error.message || "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        total: brokenClients.length,
        fixed,
        failed,
      },
      message: `Fixed ${fixed} out of ${brokenClients.length} broken clients`,
      errors: errors.slice(0, 10), // Return first 10 errors
    });
  } catch (error: any) {
    console.error("Fix broken clients error:", error);
    return NextResponse.json(
      { error: `Failed to fix clients: ${error.message}` },
      { status: 500 },
    );
  }
}
