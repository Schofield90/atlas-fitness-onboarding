import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { requireAuth } from "@/app/lib/api/auth-check";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Use requireAuth which has the improved organization lookup
    const userWithOrg = await requireAuth();

    const supabase = await createClient();
    const body = await request.json();

    // Create contact with the organization from requireAuth
    const { data: contact, error } = await supabase
      .from("contacts")
      .insert({
        organization_id: userWithOrg.organizationId,
        first_name: body.first_name || "",
        last_name: body.last_name || "",
        email: body.email || "",
        phone: body.phone || "",
        company: body.company,
        position: body.position,
        address: body.address,
        city: body.city,
        state: body.state,
        zip: body.zip,
        country: body.country,
        website: body.website,
        source: body.source || "manual",
        status: body.status || "active",
        tags: body.tags || [],
        notes: body.notes,
        birthday: body.birthday,
        social_media: body.social_media,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating contact:", error);
      return NextResponse.json(
        {
          error: "Failed to create contact",
          details: error.message,
        },
        { status: 500 },
      );
    }

    // Also create a lead record for compatibility if email or phone provided
    if (body.email || body.phone) {
      const leadName =
        `${body.first_name || ""} ${body.last_name || ""}`.trim() ||
        body.email ||
        "Unknown";

      await supabase.from("leads").insert({
        organization_id: userWithOrg.organizationId,
        name: leadName,
        email: body.email,
        phone: body.phone,
        source: body.source || "manual",
        status: "new",
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      contact,
    });
  } catch (error: any) {
    console.error("Contact creation error:", error);

    // Handle auth errors
    if (
      error.name === "AuthenticationError" ||
      error.name === "MultiTenantError"
    ) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        { status: 401 },
      );
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Use requireAuth which has the improved organization lookup
    const userWithOrg = await requireAuth();

    const supabase = await createClient();

    // Fetch all clients as contacts (auto-populate from clients table)
    const { data: clients, error } = await supabase
      .from("clients")
      .select(
        `
        id,
        first_name,
        last_name,
        email,
        phone,
        status,
        source,
        tags,
        metadata,
        created_at,
        updated_at,
        lead_id,
        subscription_status,
        customer_memberships!customer_memberships_client_id_fkey(
          id,
          status,
          membership_plans(name)
        )
      `,
      )
      .eq("org_id", userWithOrg.organizationId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching contacts from clients:", error);
      return NextResponse.json(
        {
          error: "Failed to fetch contacts",
          details: error.message,
        },
        { status: 500 },
      );
    }

    // Transform clients into contacts format
    const contacts = clients?.map((client: any) => {
      // Determine if current or ex-client based on status
      const isCurrentClient =
        client.status === "active" || client.status === "paused";
      const clientType = isCurrentClient ? "Current Client" : "Ex-Client";

      // Get active membership info
      const activeMembership = client.customer_memberships?.find(
        (m: any) => m.status === "active",
      );

      return {
        id: client.id,
        first_name: client.first_name,
        last_name: client.last_name,
        email: client.email,
        phone: client.phone,
        lead_id: client.lead_id,
        client_id: client.id,
        client_type: clientType,
        is_current_client: isCurrentClient,
        status: client.status,
        subscription_status: client.subscription_status,
        membership_plan: activeMembership?.membership_plans?.name || null,
        tags: client.tags || [],
        metadata: client.metadata || {},
        source: client.source,
        created_at: client.created_at,
        updated_at: client.updated_at,
        // Add opt-in flags (default to false if not in metadata)
        sms_opt_in: client.metadata?.sms_opt_in || false,
        whatsapp_opt_in: client.metadata?.whatsapp_opt_in || false,
        email_opt_in: client.metadata?.email_opt_in || false,
      };
    });

    return NextResponse.json({
      success: true,
      contacts: contacts || [],
      organizationId: userWithOrg.organizationId,
    });
  } catch (error: any) {
    console.error("Contact fetch error:", error);

    // Handle auth errors
    if (
      error.name === "AuthenticationError" ||
      error.name === "MultiTenantError"
    ) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        { status: 401 },
      );
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
