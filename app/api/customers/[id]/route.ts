import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // SECURITY: Get authenticated user's organization
    const user = await requireAuth();
    console.log("[GET /api/customers/[id]] Auth successful:", {
      userId: user.id,
      organizationId: user.organizationId,
      email: user.email,
    });

    // Use admin client to bypass RLS
    const supabase = createAdminClient();

    const { id: customerId } = await params;

    console.log("[GET /api/customers/[id]] Loading customer:", {
      customerId,
      organizationId: user.organizationId,
    });

    // First try to get from clients table
    const { data: clientData, error: clientError } = await supabase
      .from("clients")
      .select(
        `
        *,
        memberships (
          id,
          membership_type,
          status,
          start_date,
          end_date,
          credits_remaining,
          unlimited_access
        ),
        emergency_contacts (*),
        customer_medical_info (*),
        customer_documents (*),
        customer_waivers (*),
        customer_family_members (
          *,
          family_member_client:clients!customer_family_members_family_member_client_id_fkey(
            id, first_name, last_name, email, phone
          )
        ),
        bookings (
          id,
          booking_status,
          booking_time,
          attended_at,
          class_session:class_sessions (
            id,
            name,
            start_time,
            end_time,
            program:programs (name)
          )
        )
      `,
      )
      .eq("id", customerId)
      .eq("org_id", user.organizationId) // SECURITY: Ensure organization ownership (clients table uses org_id)
      .single();

    console.log("[GET /api/customers/[id]] Clients table result:", {
      found: !!clientData,
      error: clientError?.message,
    });

    if (clientData) {
      // Transform and return client data
      const customerData = {
        ...clientData,
        name: `${clientData.first_name || ""} ${clientData.last_name || ""}`.trim(),
        is_lead: false,
        table_name: "clients",
      };
      return NextResponse.json({ customer: customerData });
    }

    // If not found in clients, try leads table
    const { data: leadData, error: leadError } = await supabase
      .from("leads")
      .select(
        `
        *,
        lead_tags (
          tag_id,
          tags (
            id,
            name,
            color
          )
        )
      `,
      )
      .eq("id", customerId)
      .eq("organization_id", user.organizationId) // SECURITY: Ensure organization ownership
      .single();

    console.log("[GET /api/customers/[id]] Leads table result:", {
      found: !!leadData,
      error: leadError?.message,
    });

    if (leadError && clientError) {
      console.error(
        "[GET /api/customers/[id]] Customer not found in either table:",
        {
          clientError: clientError?.message,
          leadError: leadError?.message,
        },
      );
      return NextResponse.json(
        { error: "Customer not found or unauthorized" },
        { status: 404 },
      );
    }

    if (leadData) {
      // Transform lead data
      const customerData = {
        ...leadData,
        first_name: leadData.first_name || leadData.name?.split(" ")[0] || "",
        last_name:
          leadData.last_name ||
          leadData.name?.split(" ").slice(1).join(" ") ||
          "",
        is_lead: true,
        table_name: "leads",
      };
      console.log("[GET /api/customers/[id]] Returning lead data");
      return NextResponse.json({ customer: customerData });
    }

    console.error("[GET /api/customers/[id]] No customer data found");
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  } catch (error) {
    console.error("[GET /api/customers/[id]] Error fetching customer:", error);
    return createErrorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // SECURITY: Get authenticated user's organization
    const user = await requireAuth();
    // Use admin client to bypass RLS
    const supabase = createAdminClient();

    const { id: customerId } = await params;
    const updates = await request.json();

    // Remove fields that shouldn't be updated
    const {
      organization_id,
      created_by,
      id,
      is_lead,
      table_name,
      ...cleanUpdates
    } = updates;

    // First determine which table the customer is in
    let tableName = "leads";
    let updateData = cleanUpdates;

    // Check if this is a client
    const { data: clientCheck } = await supabase
      .from("clients")
      .select("id")
      .eq("id", customerId)
      .eq("org_id", user.organizationId) // clients table uses org_id
      .single();

    if (clientCheck) {
      tableName = "clients";
      // Transform data for clients table if name is provided
      if (cleanUpdates.name) {
        const nameParts = cleanUpdates.name.split(" ");
        updateData = {
          ...cleanUpdates,
          first_name: nameParts[0] || "",
          last_name: nameParts.slice(1).join(" ") || "",
        };
        delete updateData.name;
      }
    }

    // SECURITY: Update only if customer belongs to user's organization
    // Use org_id for clients table, organization_id for leads table
    const orgIdField = tableName === "clients" ? "org_id" : "organization_id";
    const { data, error } = await supabase
      .from(tableName)
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", customerId)
      .eq(orgIdField, user.organizationId) // SECURITY: Ensure organization ownership
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Customer not found or unauthorized" },
        { status: 404 },
      );
    }

    // Transform the response for consistency
    let responseData = data;
    if (tableName === "clients" && data.first_name && data.last_name) {
      responseData = {
        ...data,
        name: `${data.first_name} ${data.last_name}`.trim(),
      };
    }

    return NextResponse.json({ customer: responseData });
  } catch (error) {
    console.error("Error updating customer:", error);
    return createErrorResponse(error);
  }
}
