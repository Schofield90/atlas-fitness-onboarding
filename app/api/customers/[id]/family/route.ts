import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";

// GET /api/customers/[id]/family - Get family members for customer
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

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

    // Get family members where this customer is the primary
    const { data: primaryData } = await supabase
      .from("customer_family_members")
      .select(
        `
        *,
        family_member_client:clients!customer_family_members_family_member_client_id_fkey(
          id, first_name, last_name, email, phone
        )
      `,
      )
      .eq("primary_client_id", customerId);

    // Get family members where this customer is a family member
    const { data: memberData } = await supabase
      .from("customer_family_members")
      .select(
        `
        *,
        primary_client:clients!customer_family_members_primary_client_id_fkey(
          id, first_name, last_name, email, phone
        )
      `,
      )
      .eq("family_member_client_id", customerId);

    // Transform and combine the data
    const allFamily = [
      ...(primaryData || []).map((item) => ({
        ...item,
        member: item.family_member_client
          ? {
              ...item.family_member_client,
              name: `${item.family_member_client.first_name} ${item.family_member_client.last_name}`.trim(),
            }
          : {
              id: null,
              name: `${item.first_name || ""} ${item.last_name || ""}`.trim(),
              email: item.email,
              phone: item.phone,
              first_name: item.first_name,
              last_name: item.last_name,
            },
        relation_type: "primary",
      })),
      ...(memberData || []).map((item) => ({
        ...item,
        member: item.primary_client
          ? {
              ...item.primary_client,
              name: `${item.primary_client.first_name} ${item.primary_client.last_name}`.trim(),
            }
          : null,
        relation_type: "member",
        relationship_type: getInverseRelationship(item.relationship_type),
      })),
    ];

    return NextResponse.json({ family: allFamily });
  } catch (error) {
    console.error("Error fetching family members:", error);
    return createErrorResponse(error);
  }
}

// POST /api/customers/[id]/family - Add family member
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    const { id: customerId } = await params;
    const familyData = await request.json();

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

    // Create family member relationship
    const { data: familyMember, error } = await supabase
      .from("customer_family_members")
      .insert({
        organization_id: user.organizationId,
        primary_client_id: customerId,
        family_member_client_id: familyData.family_member_client_id,
        first_name: familyData.first_name,
        last_name: familyData.last_name,
        email: familyData.email,
        phone: familyData.phone,
        date_of_birth: familyData.date_of_birth,
        relationship_type: familyData.relationship_type,
        relationship_description: familyData.relationship_description,
        is_authorized_pickup: familyData.is_authorized_pickup || false,
        can_modify_bookings: familyData.can_modify_bookings || false,
        can_view_billing: familyData.can_view_billing || false,
        status: "active",
        notes: familyData.notes,
      })
      .select(
        `
        *,
        family_member_client:clients!customer_family_members_family_member_client_id_fkey(
          id, first_name, last_name, email, phone
        )
      `,
      )
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ familyMember }, { status: 201 });
  } catch (error) {
    console.error("Error adding family member:", error);
    return createErrorResponse(error);
  }
}

// PUT /api/customers/[id]/family - Update family member
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    const { id: customerId } = await params;
    const { family_member_id, ...familyData } = await request.json();

    if (!family_member_id) {
      return NextResponse.json(
        { error: "Family member ID is required" },
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

    // Update family member relationship
    const { data: familyMember, error } = await supabase
      .from("customer_family_members")
      .update({
        first_name: familyData.first_name,
        last_name: familyData.last_name,
        email: familyData.email,
        phone: familyData.phone,
        date_of_birth: familyData.date_of_birth,
        relationship_type: familyData.relationship_type,
        relationship_description: familyData.relationship_description,
        is_authorized_pickup: familyData.is_authorized_pickup,
        can_modify_bookings: familyData.can_modify_bookings,
        can_view_billing: familyData.can_view_billing,
        status: familyData.status,
        notes: familyData.notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", family_member_id)
      .eq("primary_client_id", customerId)
      .eq("organization_id", user.organizationId)
      .select(
        `
        *,
        family_member_client:clients!customer_family_members_family_member_client_id_fkey(
          id, first_name, last_name, email, phone
        )
      `,
      )
      .single();

    if (error) {
      throw error;
    }

    if (!familyMember) {
      return NextResponse.json(
        { error: "Family member not found or unauthorized" },
        { status: 404 },
      );
    }

    return NextResponse.json({ familyMember });
  } catch (error) {
    console.error("Error updating family member:", error);
    return createErrorResponse(error);
  }
}

// DELETE /api/customers/[id]/family - Remove family member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    const { id: customerId } = await params;
    const { searchParams } = new URL(request.url);
    const familyMemberId = searchParams.get("family_member_id");

    if (!familyMemberId) {
      return NextResponse.json(
        { error: "Family member ID is required" },
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

    // Delete family member relationship
    const { error } = await supabase
      .from("customer_family_members")
      .delete()
      .eq("id", familyMemberId)
      .eq("organization_id", user.organizationId)
      .or(
        `primary_client_id.eq.${customerId},family_member_client_id.eq.${customerId}`,
      );

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing family member:", error);
    return createErrorResponse(error);
  }
}

// Helper function to get inverse relationship
function getInverseRelationship(relationship: string): string {
  const inverseMap: Record<string, string> = {
    parent: "child",
    child: "parent",
    spouse: "spouse",
    sibling: "sibling",
    guardian: "dependent",
    dependent: "guardian",
    other: "other",
  };
  return inverseMap[relationship] || relationship;
}
