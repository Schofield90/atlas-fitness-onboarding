import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { z } from "zod";

const assignWaiverSchema = z.object({
  customer_id: z.string().uuid("Invalid customer ID"),
  waiver_id: z.string().uuid("Invalid waiver ID"),
  validity_days: z.number().nullable().optional(),
  send_email: z.boolean().default(true),
});

const updateCustomerWaiverSchema = z.object({
  status: z.enum(["pending", "signed", "expired", "cancelled"]).optional(),
  signature_data: z.string().optional(),
  signature_method: z.enum(["digital", "wet_signature", "uploaded"]).optional(),
  witness_name: z.string().optional(),
  witness_signature: z.string().optional(),
  witness_email: z.string().email().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization
    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (!userOrg?.organization_id) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 403 },
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customer_id");
    const status = searchParams.get("status");
    const waiverId = searchParams.get("waiver_id");

    // Build query
    let query = supabase
      .from("customer_waivers")
      .select(
        `
        *,
        waivers (
          id,
          title,
          waiver_type,
          content,
          requires_witness
        )
      `,
      )
      .eq("organization_id", userOrg.organization_id)
      .order("assigned_at", { ascending: false });

    // Apply filters
    if (customerId) {
      query = query.eq("customer_id", customerId);
    }
    if (status) {
      query = query.eq("status", status);
    }
    if (waiverId) {
      query = query.eq("waiver_id", waiverId);
    }

    const { data: customerWaivers, error } = await query;

    if (error) {
      console.error("Error fetching customer waivers:", error);
      return NextResponse.json(
        { error: "Failed to fetch customer waivers" },
        { status: 500 },
      );
    }

    // Also get customer details for each waiver
    const customerIds = [
      ...new Set(customerWaivers?.map((cw) => cw.customer_id) || []),
    ];

    const { data: customers } = await supabase
      .from("clients")
      .select("id, name, email, phone")
      .in("id", customerIds);

    // If no clients found, try leads table
    const { data: leads } = await supabase
      .from("leads")
      .select("id, first_name, last_name, email, phone")
      .in("id", customerIds);

    // Merge customer data
    const customerMap = new Map();
    customers?.forEach((c) => customerMap.set(c.id, c));
    leads?.forEach((l) =>
      customerMap.set(l.id, {
        ...l,
        name: `${l.first_name} ${l.last_name}`.trim(),
      }),
    );

    // Add customer data to results
    const enrichedResults = customerWaivers?.map((cw) => ({
      ...cw,
      customer: customerMap.get(cw.customer_id) || null,
    }));

    return NextResponse.json({ success: true, data: enrichedResults });
  } catch (error) {
    console.error("Error in GET /api/waivers/customer-waivers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization
    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (!userOrg?.organization_id) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 403 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = assignWaiverSchema.parse(body);

    // Get waiver details to set expiry
    const { data: waiver } = await supabase
      .from("waivers")
      .select("validity_days, title")
      .eq("id", validatedData.waiver_id)
      .eq("organization_id", userOrg.organization_id)
      .single();

    if (!waiver) {
      return NextResponse.json({ error: "Waiver not found" }, { status: 404 });
    }

    // Calculate expiry date
    const validityDays = validatedData.validity_days ?? waiver.validity_days;
    const expiresAt = validityDays
      ? new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Create customer waiver assignment
    const { data: customerWaiver, error } = await supabase
      .from("customer_waivers")
      .insert({
        organization_id: userOrg.organization_id,
        customer_id: validatedData.customer_id,
        waiver_id: validatedData.waiver_id,
        expires_at: expiresAt,
        status: "pending",
      })
      .select(
        `
        *,
        waivers (
          id,
          title,
          waiver_type,
          content,
          requires_witness
        )
      `,
      )
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Customer already has this waiver assigned" },
          { status: 400 },
        );
      }
      console.error("Error assigning waiver:", error);
      return NextResponse.json(
        { error: "Failed to assign waiver" },
        { status: 500 },
      );
    }

    // Send email notification if requested
    if (validatedData.send_email) {
      try {
        // Get customer details for email
        let customer = null;

        const { data: clientData } = await supabase
          .from("clients")
          .select("id, name, email, phone")
          .eq("id", validatedData.customer_id)
          .single();

        if (clientData) {
          customer = clientData;
        } else {
          const { data: leadData } = await supabase
            .from("leads")
            .select("id, first_name, last_name, email, phone")
            .eq("id", validatedData.customer_id)
            .single();

          if (leadData) {
            customer = {
              ...leadData,
              name: `${leadData.first_name} ${leadData.last_name}`.trim(),
            };
          }
        }

        if (customer?.email) {
          // Get organization details
          const { data: organization } = await supabase
            .from("organizations")
            .select("name, email, phone, address")
            .eq("id", userOrg.organization_id)
            .single();

          // Generate signing URL
          const signingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/waivers/sign/${customerWaiver.id}`;

          // Send waiver assignment email
          const emailResponse = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL}/api/waivers/send-email`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: request.headers.get("Authorization") || "",
              },
              body: JSON.stringify({
                customer_waiver_id: customerWaiver.id,
                email_type: "initial",
              }),
            },
          );

          if (!emailResponse.ok) {
            console.warn(
              "Failed to send waiver email:",
              await emailResponse.text(),
            );
          }
        }
      } catch (emailError) {
        console.error("Error sending waiver email:", emailError);
      }
    }

    return NextResponse.json(
      { success: true, data: customerWaiver },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }
    console.error("Error in POST /api/waivers/customer-waivers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
