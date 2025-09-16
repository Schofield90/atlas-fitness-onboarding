import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";

// GET /api/customers/[id]/medical - Get medical information for customer
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

    // Get medical information
    const { data: medical, error } = await supabase
      .from("customer_medical_info")
      .select("*")
      .eq("client_id", customerId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "no rows returned"
      throw error;
    }

    return NextResponse.json({ medical: medical || null });
  } catch (error) {
    console.error("Error fetching medical information:", error);
    return createErrorResponse(error);
  }
}

// POST /api/customers/[id]/medical - Create or update medical information
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const supabase = createClient();

    const { id: customerId } = await params;
    const medicalData = await request.json();

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

    // Check if medical record already exists
    const { data: existing } = await supabase
      .from("customer_medical_info")
      .select("id")
      .eq("client_id", customerId)
      .single();

    let medical, error;

    if (existing) {
      // Update existing record
      ({ data: medical, error } = await supabase
        .from("customer_medical_info")
        .update({
          medical_conditions: medicalData.medical_conditions || [],
          medications: medicalData.medications || [],
          allergies: medicalData.allergies || [],
          injuries: medicalData.injuries || [],
          emergency_medical_info: medicalData.emergency_medical_info,
          doctor_name: medicalData.doctor_name,
          doctor_phone: medicalData.doctor_phone,
          height_inches: medicalData.height_inches,
          weight_lbs: medicalData.weight_lbs,
          blood_type: medicalData.blood_type,
          activity_restrictions: medicalData.activity_restrictions,
          fitness_limitations: medicalData.fitness_limitations,
          insurance_provider: medicalData.insurance_provider,
          insurance_policy_number: medicalData.insurance_policy_number,
          medical_info_consent: medicalData.medical_info_consent || false,
          share_with_trainers: medicalData.share_with_trainers || false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single());
    } else {
      // Create new record
      ({ data: medical, error } = await supabase
        .from("customer_medical_info")
        .insert({
          client_id: customerId,
          organization_id: user.organizationId,
          medical_conditions: medicalData.medical_conditions || [],
          medications: medicalData.medications || [],
          allergies: medicalData.allergies || [],
          injuries: medicalData.injuries || [],
          emergency_medical_info: medicalData.emergency_medical_info,
          doctor_name: medicalData.doctor_name,
          doctor_phone: medicalData.doctor_phone,
          height_inches: medicalData.height_inches,
          weight_lbs: medicalData.weight_lbs,
          blood_type: medicalData.blood_type,
          activity_restrictions: medicalData.activity_restrictions,
          fitness_limitations: medicalData.fitness_limitations,
          insurance_provider: medicalData.insurance_provider,
          insurance_policy_number: medicalData.insurance_policy_number,
          medical_info_consent: medicalData.medical_info_consent || false,
          share_with_trainers: medicalData.share_with_trainers || false,
        })
        .select()
        .single());
    }

    if (error) {
      throw error;
    }

    return NextResponse.json({ medical }, { status: existing ? 200 : 201 });
  } catch (error) {
    console.error("Error saving medical information:", error);
    return createErrorResponse(error);
  }
}

// DELETE /api/customers/[id]/medical - Delete medical information
export async function DELETE(
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

    // Delete medical information
    const { error } = await supabase
      .from("customer_medical_info")
      .delete()
      .eq("client_id", customerId)
      .eq("organization_id", user.organizationId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting medical information:", error);
    return createErrorResponse(error);
  }
}
