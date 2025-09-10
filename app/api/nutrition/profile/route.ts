import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";

// Helper function to ensure client exists for user
async function ensureClientExists(
  supabaseAdmin: any,
  userId: string,
  organizationId: string,
) {
  // First try to find existing client
  const { data: existingClient, error: clientError } = await supabaseAdmin
    .from("clients")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (existingClient) {
    console.log(
      "Found existing client:",
      existingClient.id,
      "for user:",
      userId,
    );
    return { client: existingClient, created: false };
  }

  if (clientError && clientError.code !== "PGRST116") {
    console.error("Error checking for existing client:", clientError);
    throw clientError;
  }

  // No client exists, create one
  console.log(
    "Creating client record for user:",
    userId,
    "org:",
    organizationId,
  );

  // Get user details for client creation
  const { data: user, error: userError } =
    await supabaseAdmin.auth.admin.getUserById(userId);
  if (userError || !user) {
    console.error("Failed to get user details:", userError);
    throw new Error(`Cannot create client - user not found: ${userId}`);
  }

  // Based on the migration, the clients table uses org_id, not organization_id
  const { data: newClient, error: createError } = await supabaseAdmin
    .from("clients")
    .insert({
      user_id: userId,
      org_id: organizationId, // Use org_id as per the database schema
      first_name:
        user.user_metadata?.first_name ||
        user.email?.split("@")[0] ||
        "Unknown",
      last_name: user.user_metadata?.last_name || "User",
      email: user.email,
      phone: user.user_metadata?.phone || null,
      status: "active",
    })
    .select("id")
    .single();

  if (createError) {
    console.error("Failed to create client record with both schemas:", {
      error: createError.message,
      code: createError.code,
      userId,
      organizationId,
      hint: createError.hint,
      details: createError.details,
    });
    throw createError;
  }

  console.log("Created new client:", newClient.id, "for user:", userId);
  return { client: newClient, created: true };
}

// Types for nutrition profile
export interface NutritionProfile {
  id?: string;
  user_id: string;
  organization_id: string;
  age: number;
  sex: "MALE" | "FEMALE";
  height: number; // in cm
  current_weight: number; // in kg
  goal_weight: number; // in kg
  activity_level:
    | "SEDENTARY"
    | "LIGHTLY_ACTIVE"
    | "MODERATELY_ACTIVE"
    | "VERY_ACTIVE"
    | "EXTREMELY_ACTIVE";
  training_frequency: number; // days per week
  training_types: string[];
  dietary_preferences: string[];
  allergies: string[];
  food_likes: string[];
  food_dislikes: string[];
  cooking_time: "MINIMAL" | "MODERATE" | "EXTENSIVE";
  budget_constraint: "LOW" | "MODERATE" | "HIGH";
  created_at?: string;
  updated_at?: string;
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth();

    // Create Supabase client with service role to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const { createClient: createServiceClient } = await import(
      "@supabase/supabase-js"
    );
    const supabaseAdmin = createServiceClient(supabaseUrl, supabaseServiceKey);

    // Ensure client record exists for this user
    let client;
    try {
      const result = await ensureClientExists(
        supabaseAdmin,
        userWithOrg.id,
        userWithOrg.organizationId,
      );
      client = result.client;
      if (result.created) {
        console.log("Created new client record for nutrition profile lookup");
      }
    } catch (error) {
      console.error("Failed to ensure client exists:", error);
      return NextResponse.json(
        { error: "Failed to create or find client record" },
        { status: 500 },
      );
    }

    // Get user's nutrition profile using client_id
    console.log(
      "Looking up nutrition profile for client:",
      client.id,
      "org:",
      userWithOrg.organizationId,
    );

    // First, let's check what profiles exist for this client
    const { data: allProfiles, error: allError } = await supabaseAdmin
      .from("nutrition_profiles")
      .select("id, client_id, organization_id, created_at")
      .eq("client_id", client.id);

    console.log("All profiles for client:", allProfiles);

    const { data: profile, error } = await supabaseAdmin
      .from("nutrition_profiles")
      .select("*")
      .eq("client_id", client.id)
      .eq("organization_id", userWithOrg.organizationId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = not found
      console.error("Error fetching nutrition profile:", {
        error: error.message,
        code: error.code,
        client_id: client.id,
        organization_id: userWithOrg.organizationId,
      });

      // Try with lead_id as fallback
      console.log("Trying fallback lookup with lead_id:", client.id);
      const { data: leadProfile, error: leadError } = await supabaseAdmin
        .from("nutrition_profiles")
        .select("*")
        .eq("lead_id", client.id)
        .eq("organization_id", userWithOrg.organizationId)
        .single();

      if (leadError && leadError.code !== "PGRST116") {
        console.error("Error fetching nutrition profile with lead_id:", {
          error: leadError.message,
          code: leadError.code,
          lead_id: client.id,
          organization_id: userWithOrg.organizationId,
        });
        return createErrorResponse(leadError, 500);
      }

      if (leadProfile) {
        console.log("Found profile via lead_id fallback:", leadProfile.id);
        return NextResponse.json({
          success: true,
          data: leadProfile,
        });
      }
    } else if (profile) {
      console.log("Found profile via client_id:", profile.id);
    }

    // If no profile exists, return null
    if (!profile) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    return NextResponse.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error("Error in GET /api/nutrition/profile:", error);
    return createErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth();

    // Create Supabase client with service role to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const { createClient: createServiceClient } = await import(
      "@supabase/supabase-js"
    );
    const supabaseAdmin = createServiceClient(supabaseUrl, supabaseServiceKey);

    // Ensure client record exists for this user
    let client;
    try {
      const result = await ensureClientExists(
        supabaseAdmin,
        userWithOrg.id,
        userWithOrg.organizationId,
      );
      client = result.client;
      if (result.created) {
        console.log("Created new client record for nutrition profile creation");
      }
    } catch (error) {
      console.error("Failed to ensure client exists:", error);
      return NextResponse.json(
        { error: "Failed to create or find client record" },
        { status: 500 },
      );
    }

    // Get request body
    const body = await request.json();

    // Log what we received for debugging
    console.log("Received profile data:", JSON.stringify(body, null, 2));

    // Validate required fields - use the actual database column names
    const requiredFields = [
      "age",
      "gender", // Database expects this field
      "height_cm", // Database expects this field
      "weight_kg", // Database expects this field
      "target_weight_kg", // Database expects this field
      "activity_level",
      "bmr",
      "tdee",
      "target_calories",
      "protein_grams",
      "carbs_grams",
      "fat_grams",
    ];
    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 },
        );
      }
    }

    // Check if profile already exists using client_id
    console.log(
      "Checking for existing nutrition profile for client:",
      client.id,
      "org:",
      userWithOrg.organizationId,
    );
    const { data: existingProfile, error: existingError } = await supabaseAdmin
      .from("nutrition_profiles")
      .select("id")
      .eq("client_id", client.id)
      .eq("organization_id", userWithOrg.organizationId)
      .single();

    if (existingError && existingError.code !== "PGRST116") {
      console.error("Error checking for existing nutrition profile:", {
        error: existingError.message,
        code: existingError.code,
        client_id: client.id,
        organization_id: userWithOrg.organizationId,
      });
      return createErrorResponse(existingError, 500);
    }

    if (existingProfile) {
      console.log("Found existing profile to update:", existingProfile.id);
    } else {
      console.log("No existing profile found, will create new one");
    }

    let profile;

    if (existingProfile) {
      // Update existing profile - use ONLY columns that exist in the database
      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from("nutrition_profiles")
        .update({
          // Basic demographics - support both sex and gender fields
          age: body.age,
          sex: body.gender?.toUpperCase() || body.sex || "MALE",
          gender: body.gender?.toLowerCase() || "other",

          // Physical measurements - use both old and new column names for compatibility
          height: body.height_cm || body.height,
          height_cm: body.height_cm || body.height,
          current_weight: body.weight_kg || body.current_weight,
          weight_kg: body.weight_kg || body.current_weight,
          goal_weight: body.target_weight_kg || body.goal_weight,
          target_weight_kg: body.target_weight_kg || body.goal_weight,

          // Goals and activity - database expects uppercase for activity_level
          goal: body.goal?.toLowerCase() || "maintain",
          activity_level:
            body.activity_level?.toUpperCase() || "MODERATELY_ACTIVE",
          weekly_weight_change_kg: body.weekly_weight_change_kg || 0.5,

          // Calculated values (from migration: bmr INTEGER, tdee INTEGER, target_calories INTEGER)
          bmr: body.bmr,
          tdee: body.tdee,
          target_calories: body.target_calories,

          // Macros (from migration: protein_grams INTEGER, carbs_grams INTEGER, fat_grams INTEGER)
          protein_grams: body.protein_grams,
          carbs_grams: body.carbs_grams,
          fat_grams: body.fat_grams,
          fiber_grams: body.fiber_grams || 25,

          // Meal planning (from migration: meals_per_day INTEGER, snacks_per_day INTEGER)
          meals_per_day: body.meals_per_day || 3,
          snacks_per_day: body.snacks_per_day || 2,

          // Additional required fields from original schema
          training_frequency: body.training_frequency || 3,
          training_types: body.training_types || [],
          dietary_preferences: body.dietary_preferences || [],
          allergies: body.allergies || [],
          food_likes: body.food_likes || [],
          food_dislikes: body.food_dislikes || [],
          cooking_time: body.cooking_time?.toUpperCase() || "MODERATE",
          budget_constraint:
            body.budget_constraint?.toUpperCase() || "MODERATE",

          updated_at: new Date().toISOString(),
        })
        .eq("id", existingProfile.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating nutrition profile:", {
          error: updateError.message,
          code: updateError.code,
          profile_id: existingProfile.id,
          client_id: client.id,
          organization_id: userWithOrg.organizationId,
          hint: updateError.hint,
          details: updateError.details,
        });

        // Return more detailed error for debugging
        return NextResponse.json(
          {
            error: `Database error: ${updateError.message}`,
            code: updateError.code,
            hint: updateError.hint,
            details: updateError.details,
          },
          { status: 500 },
        );
      }

      console.log(
        "Successfully updated nutrition profile:",
        existingProfile.id,
      );

      profile = updatedProfile;
    } else {
      // Create new profile with client_id - use ONLY columns that exist in the database
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from("nutrition_profiles")
        .insert({
          client_id: client.id,
          organization_id: userWithOrg.organizationId,

          // Basic demographics - support both sex and gender fields
          age: body.age,
          sex: body.gender?.toUpperCase() || body.sex || "MALE",
          gender: body.gender?.toLowerCase() || "other",

          // Physical measurements - use both old and new column names for compatibility
          height: body.height_cm || body.height,
          height_cm: body.height_cm || body.height,
          current_weight: body.weight_kg || body.current_weight,
          weight_kg: body.weight_kg || body.current_weight,
          goal_weight: body.target_weight_kg || body.goal_weight,
          target_weight_kg: body.target_weight_kg || body.goal_weight,

          // Goals and activity - database expects uppercase for activity_level
          goal: body.goal?.toLowerCase() || "maintain",
          activity_level:
            body.activity_level?.toUpperCase() || "MODERATELY_ACTIVE",
          weekly_weight_change_kg: body.weekly_weight_change_kg || 0.5,

          // Calculated values (from migration: bmr INTEGER, tdee INTEGER, target_calories INTEGER)
          bmr: body.bmr,
          tdee: body.tdee,
          target_calories: body.target_calories,

          // Macros (from migration: protein_grams INTEGER, carbs_grams INTEGER, fat_grams INTEGER)
          protein_grams: body.protein_grams,
          carbs_grams: body.carbs_grams,
          fat_grams: body.fat_grams,
          fiber_grams: body.fiber_grams || 25,

          // Meal planning (from migration: meals_per_day INTEGER, snacks_per_day INTEGER)
          meals_per_day: body.meals_per_day || 3,
          snacks_per_day: body.snacks_per_day || 2,

          // Additional required fields from original schema
          training_frequency: body.training_frequency || 3,
          training_types: body.training_types || [],
          dietary_preferences: body.dietary_preferences || [],
          allergies: body.allergies || [],
          food_likes: body.food_likes || [],
          food_dislikes: body.food_dislikes || [],
          cooking_time: body.cooking_time?.toUpperCase() || "MODERATE",
          budget_constraint:
            body.budget_constraint?.toUpperCase() || "MODERATE",
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating nutrition profile:", {
          error: createError.message,
          code: createError.code,
          client_id: client.id,
          organization_id: userWithOrg.organizationId,
          hint: createError.hint,
          details: createError.details,
        });

        // Return more detailed error for debugging
        return NextResponse.json(
          {
            error: `Database error: ${createError.message}`,
            code: createError.code,
            hint: createError.hint,
            details: createError.details,
          },
          { status: 500 },
        );
      }

      console.log("Successfully created nutrition profile:", newProfile?.id);

      profile = newProfile;
    }

    const successMessage = existingProfile
      ? "Profile updated successfully"
      : "Profile created successfully";

    console.log(successMessage, "for client:", client.id);

    return NextResponse.json({
      success: true,
      message: successMessage,
      data: profile,
    });
  } catch (error) {
    console.error("Error in POST /api/nutrition/profile:", error);
    return createErrorResponse(error);
  }
}
