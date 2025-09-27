import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

// Calculate BMR (Basal Metabolic Rate)
function calculateBMR(
  weight: number,
  height: number,
  age: number,
  gender: string = "male",
): number {
  if (gender === "female") {
    return 655 + 9.6 * weight + 1.8 * height - 4.7 * age;
  }
  return 66 + 13.7 * weight + 5 * height - 6.8 * age;
}

// Calculate TDEE (Total Daily Energy Expenditure)
function calculateTDEE(bmr: number, activityLevel: string): number {
  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    extra_active: 1.9,
  };
  return bmr * (activityMultipliers[activityLevel] || 1.55);
}

// Calculate macros based on goal
function calculateMacros(tdee: number, weight: number, goal: string) {
  let targetCalories = tdee;
  let proteinGrams = 0;
  let carbsGrams = 0;
  let fatGrams = 0;

  switch (goal) {
    case "lose_weight":
      targetCalories = tdee - 500; // 500 calorie deficit
      proteinGrams = Math.round(weight * 2.2); // High protein for muscle preservation
      fatGrams = Math.round((targetCalories * 0.25) / 9);
      carbsGrams = Math.round(
        (targetCalories - proteinGrams * 4 - fatGrams * 9) / 4,
      );
      break;
    case "gain_muscle":
      targetCalories = tdee + 300; // 300 calorie surplus
      proteinGrams = Math.round(weight * 2.0);
      fatGrams = Math.round((targetCalories * 0.25) / 9);
      carbsGrams = Math.round(
        (targetCalories - proteinGrams * 4 - fatGrams * 9) / 4,
      );
      break;
    case "improve_fitness":
    case "athletic_performance":
      targetCalories = tdee + 100; // Slight surplus for performance
      proteinGrams = Math.round(weight * 2.0);
      fatGrams = Math.round((targetCalories * 0.28) / 9);
      carbsGrams = Math.round(
        (targetCalories - proteinGrams * 4 - fatGrams * 9) / 4,
      );
      break;
    case "maintain":
    default:
      targetCalories = tdee;
      proteinGrams = Math.round(weight * 1.8);
      fatGrams = Math.round((targetCalories * 0.3) / 9);
      carbsGrams = Math.round(
        (targetCalories - proteinGrams * 4 - fatGrams * 9) / 4,
      );
      break;
  }

  return {
    target_calories: Math.round(targetCalories),
    protein_grams: proteinGrams,
    carbs_grams: carbsGrams,
    fat_grams: fatGrams,
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user from auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { clientId, ...updateData } = body;

    if (!clientId) {
      return NextResponse.json(
        { success: false, error: "Client ID is required" },
        { status: 400 },
      );
    }

    // Create admin client to bypass RLS for reading and updating
    const adminClient = createAdminClient();

    // Verify the client belongs to the authenticated user
    const { data: clientCheck, error: clientCheckError } = await adminClient
      .from("clients")
      .select(
        "id, org_id, user_id, date_of_birth, height_cm, weight_kg, gender, activity_level, fitness_goal",
      )
      .eq("id", clientId)
      .eq("user_id", user.id)
      .single();

    if (clientCheckError || !clientCheck) {
      console.error("Client verification failed:", clientCheckError);
      return NextResponse.json(
        { success: false, error: "Client not found or access denied" },
        { status: 403 },
      );
    }

    // Calculate age from date_of_birth
    let age = 30; // Default age
    const dateOfBirth = updateData.date_of_birth || clientCheck.date_of_birth;
    if (dateOfBirth) {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }
    }

    // Get values for calculation (use updated values if provided, otherwise existing)
    const height = parseFloat(
      updateData.height_cm || clientCheck.height_cm || "170",
    );
    const weight = parseFloat(
      updateData.weight_kg || clientCheck.weight_kg || "70",
    );
    const activityLevel =
      updateData.activity_level ||
      clientCheck.activity_level ||
      "moderately_active";
    const fitnessGoal =
      updateData.fitness_goal || clientCheck.fitness_goal || "maintain";
    const gender = updateData.gender || clientCheck.gender || "male";

    // Calculate nutrition values if we have height and weight
    if (height && weight && !isNaN(height) && !isNaN(weight)) {
      // Calculate BMR, TDEE, BMI, and macros
      const bmr = calculateBMR(weight, height, age, gender);
      const tdee = calculateTDEE(bmr, activityLevel);
      const bmi = weight / Math.pow(height / 100, 2);
      const macros = calculateMacros(tdee, weight, fitnessGoal);

      // Add calculated values to update data
      updateData.bmr = Math.round(bmr);
      updateData.tdee = Math.round(tdee);
      updateData.bmi = Math.round(bmi * 10) / 10;
      updateData.target_calories = macros.target_calories;
      updateData.protein_grams = macros.protein_grams;
      updateData.carbs_grams = macros.carbs_grams;
      updateData.fat_grams = macros.fat_grams;

      // Mark nutrition profile as completed if we have all required data
      if (updateData.dietary_type && updateData.activity_level) {
        updateData.nutrition_profile_completed = true;
      }
    }

    // Add updated_at timestamp
    updateData.updated_at = new Date().toISOString();

    // Update the client record
    const { data: updatedClient, error: updateError } = await adminClient
      .from("clients")
      .update(updateData)
      .eq("id", clientId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating client profile:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update profile" },
        { status: 500 },
      );
    }

    // If nutrition-related fields were updated, sync with nutrition profile
    const nutritionFields = [
      "height_cm",
      "weight_kg",
      "fitness_goal",
      "activity_level",
      "dietary_type",
      "allergies",
      "cooking_time",
      "meals_per_day",
      "target_calories",
      "protein_grams",
      "carbs_grams",
      "fat_grams",
    ];
    const hasNutritionUpdates = nutritionFields.some(
      (field) => field in updateData,
    );

    if (hasNutritionUpdates && clientCheck.org_id) {
      // Check if nutrition profile exists
      const { data: nutritionProfile } = await adminClient
        .from("nutrition_profiles")
        .select("id")
        .eq("client_id", clientId)
        .eq("organization_id", clientCheck.org_id)
        .single();

      if (nutritionProfile) {
        // Update nutrition profile with new data
        const nutritionUpdate: any = {
          height: height,
          height_cm: height,
          current_weight: weight,
          weight_kg: weight,
          goal_weight: weight, // Default to current weight
          target_weight_kg: weight,
          age: age,
          activity_level: activityLevel,
          target_calories: updateData.target_calories,
          protein_grams: updateData.protein_grams,
          carbs_grams: updateData.carbs_grams,
          fat_grams: updateData.fat_grams,
          updated_at: new Date().toISOString(),
        };

        // Map fitness goal to nutrition goal
        const goalMapping: Record<string, string> = {
          lose_weight: "lose",
          maintain: "maintain",
          gain_muscle: "gain",
          improve_fitness: "maintain",
          athletic_performance: "gain",
        };
        nutritionUpdate.goal = goalMapping[fitnessGoal] || "maintain";

        const { error: nutritionUpdateError } = await adminClient
          .from("nutrition_profiles")
          .update(nutritionUpdate)
          .eq("id", nutritionProfile.id);

        if (nutritionUpdateError) {
          console.error(
            "Error syncing nutrition profile:",
            nutritionUpdateError,
          );
        } else {
          console.log("Successfully synced nutrition profile with client data");
        }
      } else if (height && weight && updateData.target_calories) {
        // Create nutrition profile if it doesn't exist and we have the required data
        const goalMapping: Record<string, string> = {
          lose_weight: "lose",
          maintain: "maintain",
          gain_muscle: "gain",
          improve_fitness: "maintain",
          athletic_performance: "gain",
        };

        const { error: createError } = await adminClient
          .from("nutrition_profiles")
          .insert({
            client_id: clientId,
            organization_id: clientCheck.org_id,
            height: height,
            height_cm: height,
            current_weight: weight,
            weight_kg: weight,
            goal_weight: weight,
            target_weight_kg: weight,
            age: age,
            goal: goalMapping[fitnessGoal] || "maintain",
            activity_level: activityLevel,
            target_calories: updateData.target_calories,
            protein_grams: updateData.protein_grams,
            carbs_grams: updateData.carbs_grams,
            fat_grams: updateData.fat_grams,
          });

        if (createError) {
          console.error("Error creating nutrition profile:", createError);
        } else {
          console.log("Successfully created nutrition profile");
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedClient,
      message: "Profile updated successfully",
      macros: updateData.target_calories
        ? {
            calories: updateData.target_calories,
            protein: updateData.protein_grams,
            carbs: updateData.carbs_grams,
            fat: updateData.fat_grams,
            bmr: updateData.bmr,
            tdee: updateData.tdee,
            bmi: updateData.bmi,
          }
        : undefined,
    });
  } catch (error) {
    console.error("Error in client profile update:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
