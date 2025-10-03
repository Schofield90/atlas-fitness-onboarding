import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

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

    // Use admin client for all operations
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Verify organization exists
    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("id")
      .eq("id", organizationId)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

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

    // Fetch all customers from Stripe
    const customers: Stripe.Customer[] = [];
    let hasMore = true;
    let startingAfter: string | undefined = undefined;

    while (hasMore) {
      const batch = await stripe.customers.list({
        limit: 100,
        starting_after: startingAfter,
      });

      customers.push(...batch.data);
      hasMore = batch.has_more;
      if (hasMore && batch.data.length > 0) {
        startingAfter = batch.data[batch.data.length - 1].id;
      }
    }

    let imported = 0;
    let skipped = 0;

    // Import each customer
    for (const customer of customers) {
      // Skip customers without email
      if (!customer.email) {
        skipped++;
        continue;
      }

      // Check if client already exists with this email
      const { data: existingClient } = await supabaseAdmin
        .from("clients")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("email", customer.email)
        .maybeSingle();

      if (existingClient) {
        // Update existing client with Stripe ID
        await supabaseAdmin
          .from("clients")
          .update({
            stripe_customer_id: customer.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingClient.id);

        skipped++;
      } else {
        // Create new client
        const { error } = await supabaseAdmin.from("clients").insert({
          organization_id: organizationId,
          email: customer.email,
          first_name: customer.name?.split(" ")[0] || "",
          last_name: customer.name?.split(" ").slice(1).join(" ") || "",
          phone: customer.phone || "",
          stripe_customer_id: customer.id,
          status: "active",
          created_at: new Date(customer.created * 1000).toISOString(),
        });

        if (!error) {
          imported++;
        } else {
          console.error("Error creating client:", error);
          skipped++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        total: customers.length,
        imported,
        skipped,
      },
    });
  } catch (error: any) {
    console.error("Error importing customers:", error);
    return NextResponse.json(
      { error: `Failed to import customers: ${error.message}` },
      { status: 500 },
    );
  }
}
