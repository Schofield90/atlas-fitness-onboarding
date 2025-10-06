import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import Stripe from "stripe";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 seconds timeout

/**
 * Import historical payment data from Stripe charges
 * This eliminates the need for clunky GoTeamUp CSV imports
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      organizationId,
      startDate, // Optional: filter charges after this date (YYYY-MM-DD)
      endDate, // Optional: filter charges before this date (YYYY-MM-DD)
      startingAfter, // For pagination
      limit = 100,
    } = body;

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

    // Get Stripe connection
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

    // Build Stripe query parameters
    const queryParams: Stripe.ChargeListParams = {
      limit,
    };

    if (startingAfter) {
      queryParams.starting_after = startingAfter;
    }

    // Convert dates to Unix timestamps if provided
    if (startDate || endDate) {
      queryParams.created = {};
      if (startDate) {
        queryParams.created.gte = Math.floor(
          new Date(startDate).getTime() / 1000,
        );
      }
      if (endDate) {
        queryParams.created.lte = Math.floor(
          new Date(endDate).getTime() / 1000,
        );
      }
    }

    // Fetch charges from Stripe
    console.log("Fetching charges from Stripe with params:", queryParams);
    const charges = await stripe.charges.list(queryParams);

    let imported = 0;
    let skipped = 0;
    let totalAmount = 0;
    let clientsCreated = 0;

    // Import each charge
    for (const charge of charges.data) {
      // Only import successful charges
      if (charge.status !== "succeeded") {
        skipped++;
        continue;
      }

      // Find client by Stripe customer ID
      let clientId: string | null = null;
      if (charge.customer) {
        const { data: client } = await supabaseAdmin
          .from("clients")
          .select("id")
          .eq("org_id", organizationId)
          .eq("stripe_customer_id", charge.customer as string)
          .maybeSingle();

        if (client) {
          clientId = client.id;
        } else {
          // Client not found - auto-create archived client for historical data
          try {
            const stripeCustomer = await stripe.customers.retrieve(
              charge.customer as string,
            );

            const nameParts = (stripeCustomer.name || "Unknown Customer").split(
              " ",
            );
            const firstName = nameParts[0] || "Unknown";
            const lastName = nameParts.slice(1).join(" ") || "";

            const { data: newClient, error: clientError } = await supabaseAdmin
              .from("clients")
              .insert({
                org_id: organizationId,
                first_name: firstName,
                last_name: lastName,
                email: stripeCustomer.email || null,
                phone: stripeCustomer.phone || null,
                stripe_customer_id: charge.customer as string,
                status: "archived", // Mark as archived so they don't clutter active lists
                source: "stripe_import",
                created_at:
                  new Date(stripeCustomer.created * 1000).toISOString() ||
                  new Date().toISOString(),
              })
              .select("id")
              .single();

            if (!clientError && newClient) {
              clientId = newClient.id;
              clientsCreated++;
              console.log(
                `Auto-created archived client for Stripe customer ${charge.customer}`,
              );
            } else {
              console.error(
                `Failed to create client for ${charge.customer}:`,
                clientError,
              );
            }
          } catch (customerError) {
            console.error(
              `Failed to fetch Stripe customer ${charge.customer}:`,
              customerError,
            );
          }
        }
      }

      // Check if charge already exists
      const { data: existingPayment } = await supabaseAdmin
        .from("payments")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("provider_payment_id", charge.id)
        .eq("payment_provider", "stripe")
        .maybeSingle();

      if (existingPayment) {
        console.log(`Charge ${charge.id} already imported, skipping`);
        skipped++;
        continue;
      }

      // Create payment record
      const paymentDate = new Date(charge.created * 1000).toISOString().split("T")[0];
      const { error: insertError } = await supabaseAdmin
        .from("payments")
        .insert({
          organization_id: organizationId,
          client_id: clientId, // Will be null if customer not found in CRM
          amount: charge.amount / 100, // Convert cents to dollars
          currency: charge.currency.toUpperCase(),
          status: "completed", // Internal status
          payment_status: charge.status, // Stripe charge status (succeeded, pending, failed)
          payment_method: charge.payment_method_details?.type || "unknown",
          payment_provider: "stripe",
          provider_payment_id: charge.id,
          payment_date: paymentDate,
          description:
            charge.description ||
            `Payment from ${charge.billing_details?.name || "customer"}`,
          metadata: {
            stripe_customer_id: charge.customer,
            stripe_charge_id: charge.id,
            stripe_payment_intent_id: charge.payment_intent,
            receipt_url: charge.receipt_url,
            payment_method_details: charge.payment_method_details,
            billing_details: charge.billing_details,
          },
          created_at: new Date(charge.created * 1000).toISOString(),
        });

      if (!insertError) {
        imported++;
        totalAmount += charge.amount / 100;
      } else {
        console.error(`Error importing charge ${charge.id}:`, insertError);
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        total: charges.data.length,
        imported,
        skipped,
        clientsCreated,
        totalAmount: Math.round(totalAmount * 100) / 100,
        hasMore: charges.has_more,
        nextStartingAfter:
          charges.has_more && charges.data.length > 0
            ? charges.data[charges.data.length - 1].id
            : undefined,
      },
      message: `Imported ${imported} charges totaling ${Math.round(totalAmount * 100) / 100} ${charges.data[0]?.currency || "GBP"}. Auto-created ${clientsCreated} archived clients.`,
    });
  } catch (error: any) {
    console.error("Error importing charges:", error);
    return NextResponse.json(
      { error: `Failed to import charges: ${error.message}` },
      { status: 500 },
    );
  }
}
