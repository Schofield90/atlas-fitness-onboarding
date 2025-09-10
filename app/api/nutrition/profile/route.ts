import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";

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

    // First get the client record for this user
    const { data: client, error: clientError } = await supabaseAdmin
      .from("clients")
      .select("id")
      .eq("user_id", userWithOrg.id)
      .single();

    if (clientError || !client) {
      console.log("No client found for user:", userWithOrg.id);
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    // Get user's nutrition profile using client_id
    const { data: profile, error } = await supabaseAdmin
      .from("nutrition_profiles")
      .select("*")
      .eq("client_id", client.id)
      .eq("organization_id", userWithOrg.organizationId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = not found
      console.error("Error fetching nutrition profile:", error);
      // Try with lead_id as fallback
      const { data: leadProfile, error: leadError } = await supabaseAdmin
        .from("nutrition_profiles")
        .select("*")
        .eq("lead_id", client.id)
        .eq("organization_id", userWithOrg.organizationId)
        .single();

      if (leadError && leadError.code !== "PGRST116") {
        console.error(
          "Error fetching nutrition profile with lead_id:",
          leadError,
        );
        return createErrorResponse(leadError, 500);
      }

      if (leadProfile) {
        return NextResponse.json({
          success: true,
          data: leadProfile,
        });
      }
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

    // First get the client record for this user
    const { data: client, error: clientError } = await supabaseAdmin
      .from("clients")
      .select("id")
      .eq("user_id", userWithOrg.id)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { error: "Client record not found for user" },
        { status: 404 },
      );
    }

    // Get request body
    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      "age",
      "sex",
      "height",
      "current_weight",
      "goal_weight",
      "activity_level",
      "training_frequency",
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
    const { data: existingProfile } = await supabaseAdmin
      .from("nutrition_profiles")
      .select("id")
      .eq("client_id", client.id)
      .eq("organization_id", userWithOrg.organizationId)
      .single();

    let profile;

    if (existingProfile) {
      // Update existing profile
      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from("nutrition_profiles")
        .update({
          age: body.age,
          sex: body.sex,
          height: body.height,
          current_weight: body.current_weight,
          goal_weight: body.goal_weight,
          activity_level: body.activity_level,
          training_frequency: body.training_frequency,
          training_types: body.training_types || [],
          dietary_preferences: body.dietary_preferences || [],
          allergies: body.allergies || [],
          food_likes: body.food_likes || [],
          food_dislikes: body.food_dislikes || [],
          cooking_time: body.cooking_time || "MODERATE",
          budget_constraint: body.budget_constraint || "MODERATE",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingProfile.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating nutrition profile:", updateError);
        return createErrorResponse(updateError, 500);
      }

      profile = updatedProfile;
    } else {
      // Create new profile with client_id instead of user_id
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from("nutrition_profiles")
        .insert({
          client_id: client.id, // Use client_id instead of user_id
          organization_id: userWithOrg.organizationId,
          age: body.age,
          sex: body.sex,
          height: body.height,
          current_weight: body.current_weight,
          goal_weight: body.goal_weight,
          activity_level: body.activity_level,
          training_frequency: body.training_frequency,
          training_types: body.training_types || [],
          dietary_preferences: body.dietary_preferences || [],
          allergies: body.allergies || [],
          food_likes: body.food_likes || [],
          food_dislikes: body.food_dislikes || [],
          cooking_time: body.cooking_time || "MODERATE",
          budget_constraint: body.budget_constraint || "MODERATE",
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating nutrition profile:", createError);
        return createErrorResponse(createError, 500);
      }

      profile = newProfile;
    }

    return NextResponse.json({
      success: true,
      message: existingProfile
        ? "Profile updated successfully"
        : "Profile created successfully",
      data: profile,
    });
  } catch (error) {
    console.error("Error in POST /api/nutrition/profile:", error);
    return createErrorResponse(error);
  }
}
