import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // SECURITY: Get authenticated user's organization
    const user = await requireAuth();
    const supabase = await createClient();

    const { id: customerId } = await params;

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
      .eq("organization_id", user.organizationId) // SECURITY: Ensure organization ownership
      .single();

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

    if (leadError && clientError) {
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
      return NextResponse.json({ customer: customerData });
    }

    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  } catch (error) {
    console.error("Error fetching customer:", error);
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
    const supabase = await createClient();

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
      .eq("organization_id", user.organizationId)
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
    const { data, error } = await supabase
      .from(tableName)
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", customerId)
      .eq("organization_id", user.organizationId) // SECURITY: Ensure organization ownership
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
