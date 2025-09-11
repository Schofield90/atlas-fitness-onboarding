import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";

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

    // Update the client record
    const { data: updatedClient, error: updateError } = await supabaseAdmin
      .from("clients")
      .update(updateData)
      .eq("id", clientId)
      .eq("org_id", userWithOrg.organizationId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating client:", updateError);
      return createErrorResponse(updateError, 500);
    }

    // If fitness-related fields were updated, sync with nutrition profile
    const fitnessFields = ["height_cm", "weight_kg", "fitness_goal"];
    const hasFitnessUpdates = fitnessFields.some(
      (field) => field in updateData,
    );

    if (hasFitnessUpdates) {
      // Check if nutrition profile exists
      const { data: nutritionProfile } = await supabaseAdmin
        .from("nutrition_profiles")
        .select("id")
        .eq("client_id", clientId)
        .eq("organization_id", userWithOrg.organizationId)
        .single();

      if (nutritionProfile) {
        // Update nutrition profile with new fitness data
        const nutritionUpdate: any = {};

        if (updateData.height_cm !== undefined) {
          nutritionUpdate.height = updateData.height_cm;
          nutritionUpdate.height_cm = updateData.height_cm;
        }

        if (updateData.weight_kg !== undefined) {
          nutritionUpdate.current_weight = updateData.weight_kg;
          nutritionUpdate.weight_kg = updateData.weight_kg;
          // If no goal weight set, use current weight as goal
          if (!nutritionProfile.goal_weight) {
            nutritionUpdate.goal_weight = updateData.weight_kg;
            nutritionUpdate.target_weight_kg = updateData.weight_kg;
          }
        }

        if (updateData.fitness_goal !== undefined) {
          // Map fitness goal to nutrition goal
          const goalMapping: Record<string, string> = {
            lose_weight: "lose",
            maintain: "maintain",
            gain_muscle: "gain",
            improve_health: "maintain",
          };
          nutritionUpdate.goal =
            goalMapping[updateData.fitness_goal] || "maintain";
        }

        if (Object.keys(nutritionUpdate).length > 0) {
          nutritionUpdate.updated_at = new Date().toISOString();

          const { error: nutritionUpdateError } = await supabaseAdmin
            .from("nutrition_profiles")
            .update(nutritionUpdate)
            .eq("id", nutritionProfile.id);

          if (nutritionUpdateError) {
            console.error(
              "Error syncing nutrition profile:",
              nutritionUpdateError,
            );
            // Don't fail the whole request if nutrition sync fails
          } else {
            console.log(
              "Successfully synced nutrition profile with client fitness data",
            );
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedClient,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Error in client update:", error);
    return createErrorResponse(error);
  }
}
