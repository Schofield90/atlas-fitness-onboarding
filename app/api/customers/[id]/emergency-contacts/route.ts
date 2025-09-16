import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";

// GET /api/customers/[id]/emergency-contacts - Get emergency contacts for customer
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const supabase = createClient();

    const { id: customerId } = await params;

    // Verify customer belongs to organization
    const { data: customer } = await supabase
      .from("clients")
      .select("id")
      .eq("id", customerId)
      .eq("organization_id", user.organizationId)
      .single();

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found or unauthorized" },
        { status: 404 },
      );
    }

    // Get emergency contacts
    const { data: contacts, error } = await supabase
      .from("emergency_contacts")
      .select("*")
      .eq("client_id", customerId)
      .order("is_primary", { ascending: false })
      .order("priority_order", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({ contacts: contacts || [] });
  } catch (error) {
    console.error("Error fetching emergency contacts:", error);
    return createErrorResponse(error);
  }
}

// POST /api/customers/[id]/emergency-contacts - Create emergency contact
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const supabase = createClient();

    const { id: customerId } = await params;
    const contactData = await request.json();

    // Verify customer belongs to organization
    const { data: customer } = await supabase
      .from("clients")
      .select("id")
      .eq("id", customerId)
      .eq("organization_id", user.organizationId)
      .single();

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found or unauthorized" },
        { status: 404 },
      );
    }

    // If this is being set as primary, unset other primary contacts
    if (contactData.is_primary) {
      await supabase
        .from("emergency_contacts")
        .update({ is_primary: false })
        .eq("client_id", customerId)
        .eq("organization_id", user.organizationId);
    }

    // Create emergency contact
    const { data: contact, error } = await supabase
      .from("emergency_contacts")
      .insert({
        client_id: customerId,
        organization_id: user.organizationId,
        first_name: contactData.first_name,
        last_name: contactData.last_name,
        relationship: contactData.relationship,
        phone_primary: contactData.phone_primary,
        phone_secondary: contactData.phone_secondary,
        email: contactData.email,
        address_line_1: contactData.address_line_1,
        address_line_2: contactData.address_line_2,
        city: contactData.city,
        state: contactData.state,
        postal_code: contactData.postal_code,
        country: contactData.country || "US",
        is_primary: contactData.is_primary || false,
        priority_order: contactData.priority_order || 1,
        notes: contactData.notes,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ contact }, { status: 201 });
  } catch (error) {
    console.error("Error creating emergency contact:", error);
    return createErrorResponse(error);
  }
}

// PUT /api/customers/[id]/emergency-contacts - Update emergency contact
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const supabase = createClient();

    const { id: customerId } = await params;
    const { contact_id, ...contactData } = await request.json();

    if (!contact_id) {
      return NextResponse.json(
        { error: "Contact ID is required" },
        { status: 400 },
      );
    }

    // Verify customer belongs to organization
    const { data: customer } = await supabase
      .from("clients")
      .select("id")
      .eq("id", customerId)
      .eq("organization_id", user.organizationId)
      .single();

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found or unauthorized" },
        { status: 404 },
      );
    }

    // If this is being set as primary, unset other primary contacts
    if (contactData.is_primary) {
      await supabase
        .from("emergency_contacts")
        .update({ is_primary: false })
        .eq("client_id", customerId)
        .eq("organization_id", user.organizationId)
        .neq("id", contact_id);
    }

    // Update emergency contact
    const { data: contact, error } = await supabase
      .from("emergency_contacts")
      .update({
        first_name: contactData.first_name,
        last_name: contactData.last_name,
        relationship: contactData.relationship,
        phone_primary: contactData.phone_primary,
        phone_secondary: contactData.phone_secondary,
        email: contactData.email,
        address_line_1: contactData.address_line_1,
        address_line_2: contactData.address_line_2,
        city: contactData.city,
        state: contactData.state,
        postal_code: contactData.postal_code,
        country: contactData.country,
        is_primary: contactData.is_primary,
        priority_order: contactData.priority_order,
        notes: contactData.notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", contact_id)
      .eq("client_id", customerId)
      .eq("organization_id", user.organizationId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    if (!contact) {
      return NextResponse.json(
        { error: "Contact not found or unauthorized" },
        { status: 404 },
      );
    }

    return NextResponse.json({ contact });
  } catch (error) {
    console.error("Error updating emergency contact:", error);
    return createErrorResponse(error);
  }
}

// DELETE /api/customers/[id]/emergency-contacts - Delete emergency contact
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const supabase = createClient();

    const { id: customerId } = await params;
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get("contact_id");

    if (!contactId) {
      return NextResponse.json(
        { error: "Contact ID is required" },
        { status: 400 },
      );
    }

    // Verify customer belongs to organization
    const { data: customer } = await supabase
      .from("clients")
      .select("id")
      .eq("id", customerId)
      .eq("organization_id", user.organizationId)
      .single();

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found or unauthorized" },
        { status: 404 },
      );
    }

    // Delete emergency contact
    const { error } = await supabase
      .from("emergency_contacts")
      .delete()
      .eq("id", contactId)
      .eq("client_id", customerId)
      .eq("organization_id", user.organizationId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting emergency contact:", error);
    return createErrorResponse(error);
  }
}
