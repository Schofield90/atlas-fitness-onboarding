import { NextRequest, NextResponse } from "next/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth();

    const body = await request.json();
    const { clientId, ...updateData } = body;

    if (!clientId) {
      return NextResponse.json(
        { success: false, error: "Client ID is required" },
        { status: 400 },
      );
    }

    // Create Supabase client with service role to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const { createClient: createServiceClient } = await import(
      "@supabase/supabase-js"
    );
    const supabaseAdmin = createServiceClient(supabaseUrl, supabaseServiceKey);

    // Get existing client data first
    const { data: existingClient } = await supabaseAdmin
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .eq("org_id", userWithOrg.organizationId)
      .single();

    if (!existingClient) {
      return NextResponse.json(
        { success: false, error: "Client not found" },
        { status: 404 },
      );
    }

    // List of fields that we know exist in the database
    const safeFields = [
      "first_name",
      "last_name",
      "email",
      "phone",
      "date_of_birth",
      "emergency_contact_name",
      "emergency_contact_phone",
      "medical_notes",
      "updated_at",
    ];

    // Filter update data to only include safe fields
    const safeUpdateData: any = {};
    for (const field of safeFields) {
      if (field in updateData) {
        safeUpdateData[field] = updateData[field];
      }
    }

    // Add timestamp
    safeUpdateData.updated_at = new Date().toISOString();

    // Update the client record with safe data only
    const { data: updatedClient, error: updateError } = await supabaseAdmin
      .from("clients")
      .update(safeUpdateData)
      .eq("id", clientId)
      .eq("org_id", userWithOrg.organizationId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating client:", updateError);
      return createErrorResponse(updateError, 500);
    }

    // Store nutrition data temporarily in localStorage on the client side
    // The client will need to handle this
    const nutritionData = {
      height_cm: updateData.height_cm,
      weight_kg: updateData.weight_kg,
      fitness_goal: updateData.fitness_goal,
      activity_level: updateData.activity_level,
      dietary_type: updateData.dietary_type,
      allergies: updateData.allergies,
      cooking_time: updateData.cooking_time,
      meals_per_day: updateData.meals_per_day,
    };

    return NextResponse.json({
      success: true,
      data: updatedClient,
      message: "Profile updated successfully",
      nutritionData: nutritionData, // Send back for localStorage
      warning:
        "Nutrition fields are pending database update. Data saved locally.",
    });
  } catch (error) {
    console.error("Error in client update:", error);
    return createErrorResponse(error);
  }
}
