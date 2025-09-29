import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { cookies } from "next/headers";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(cookies());

    // Get the request body
    const body = await request.json();
    const { profileId, clientId } = body;

    if (!profileId || !clientId) {
      return NextResponse.json(
        { error: "Profile ID and Client ID are required" },
        { status: 400 },
      );
    }

    // Check if there are any new InBody scans
    // In a real implementation, this would integrate with InBody's API
    // For now, we'll simulate checking for new data
    const { data: latestMetric } = await supabase
      .from("nutrition_body_metrics")
      .select("*")
      .eq("profile_id", profileId)
      .eq("device_type", "INBODY")
      .order("measurement_date", { ascending: false })
      .limit(1)
      .single();

    // Check if we need to recalculate macros based on new body composition
    if (latestMetric) {
      const { data: profile, error: profileError } = await supabase
        .from("nutrition_profiles")
        .select("*")
        .eq("id", profileId)
        .single();

      if (profileError) throw profileError;

      if (profile) {
        // Use InBody BMR if available
        const bmr = latestMetric.basal_metabolic_rate || profile.bmr;

        // Get actual training frequency from recent sessions
        const fourWeeksAgo = new Date();
        fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

        const { data: trainingSessions } = await supabase
          .from("nutrition_training_sessions")
          .select("id")
          .eq("profile_id", profileId)
          .gte("session_date", fourWeeksAgo.toISOString());

        const actualTrainingFrequency = trainingSessions
          ? Math.round(trainingSessions.length / 4)
          : profile.training_frequency;

        // Calculate TDEE with actual data
        let activityMultiplier = 1.2; // Sedentary base

        if (actualTrainingFrequency >= 6)
          activityMultiplier = 1.725; // Very Active
        else if (actualTrainingFrequency >= 4)
          activityMultiplier = 1.55; // Moderately Active
        else if (actualTrainingFrequency >= 2) activityMultiplier = 1.375; // Lightly Active

        const tdee = Math.round(bmr * activityMultiplier);

        // Adjust calories based on goal
        let targetCalories = tdee;
        if (profile.goal === "weight_loss")
          targetCalories = Math.round(tdee * 0.85);
        else if (profile.goal === "muscle_gain")
          targetCalories = Math.round(tdee * 1.1);

        // Calculate macros based on body composition
        const leanMass =
          latestMetric.lean_body_mass ||
          latestMetric.weight *
            (1 - (latestMetric.body_fat_percentage || 20) / 100);

        // Protein: 2.2g per kg of lean mass for active individuals
        const proteinGrams = Math.round(leanMass * 2.2);

        // Fat: 25-30% of calories
        const fatCalories = targetCalories * 0.275;
        const fatGrams = Math.round(fatCalories / 9);

        // Carbs: Fill the rest
        const carbCalories = targetCalories - proteinGrams * 4 - fatGrams * 9;
        const carbGrams = Math.round(carbCalories / 4);

        // Fiber: 14g per 1000 calories
        const fiberGrams = Math.round((targetCalories / 1000) * 14);

        // Update the nutrition profile with new calculations
        const { error: updateError } = await supabase
          .from("nutrition_profiles")
          .update({
            current_weight: latestMetric.weight,
            bmr: bmr,
            tdee: tdee,
            daily_calories: targetCalories,
            protein_grams: proteinGrams,
            carbs_grams: carbGrams,
            fat_grams: fatGrams,
            fiber_grams: fiberGrams,
            updated_at: new Date().toISOString(),
          })
          .eq("id", profileId);

        if (updateError) throw updateError;

        return NextResponse.json({
          success: true,
          message: "Body metrics synced and macros recalculated",
          data: {
            latestMetric,
            updatedMacros: {
              calories: targetCalories,
              protein: proteinGrams,
              carbs: carbGrams,
              fat: fatGrams,
              fiber: fiberGrams,
            },
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "No new InBody data to sync",
      data: null,
    });
  } catch (error: any) {
    console.error("Error syncing body metrics:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sync body metrics" },
      { status: 500 },
    );
  }
}

// GET endpoint to check for new InBody scans
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(cookies());
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get("profileId");

    if (!profileId) {
      return NextResponse.json(
        { error: "Profile ID is required" },
        { status: 400 },
      );
    }

    // Get the latest body metric
    const { data: latestMetric, error } = await supabase
      .from("nutrition_body_metrics")
      .select("*")
      .eq("profile_id", profileId)
      .order("measurement_date", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    // Check if there's a scheduled InBody scan
    const today = new Date();
    const nextScanDate = latestMetric
      ? new Date(
          new Date(latestMetric.measurement_date).getTime() +
            30 * 24 * 60 * 60 * 1000,
        ) // 30 days later
      : null;

    return NextResponse.json({
      success: true,
      data: {
        latestScan: latestMetric,
        nextScheduledScan: nextScanDate,
        daysSinceLastScan: latestMetric
          ? Math.floor(
              (today.getTime() -
                new Date(latestMetric.measurement_date).getTime()) /
                (1000 * 60 * 60 * 24),
            )
          : null,
      },
    });
  } catch (error: any) {
    console.error("Error fetching body metrics status:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch body metrics status" },
      { status: 500 },
    );
  }
}
