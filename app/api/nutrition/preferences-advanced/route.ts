import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

// GET - Retrieve comprehensive preferences for a client
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get client data
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Get nutrition profile with all preference data
    const { data: profile, error: profileError } = await supabase
      .from("nutrition_profiles")
      .select("*")
      .eq("client_id", client.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({
        success: true,
        data: null,
        message: "No nutrition profile found",
      });
    }

    // Merge all preference sources
    const mergedPreferences = {
      ...(profile.preferences || {}),
      ...(profile.dietary_preferences || {}),
      profile_id: profile.id,
      client_id: client.id,
      completeness: profile.preference_completeness || 0,
      last_updated: profile.last_preference_update || profile.updated_at,
    };

    // Track preference history
    const { data: history } = await supabase
      .from("preference_history")
      .select("*")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      data: mergedPreferences,
      history: history || [],
      profile: {
        goals: profile.goals,
        activity_level: profile.activity_level,
        target_calories: profile.target_calories,
      },
    });
  } catch (error) {
    console.error("Error fetching preferences:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST - Save or update comprehensive preferences
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const body = await req.json();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get client data
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Get existing profile
    const { data: existingProfile } = await supabase
      .from("nutrition_profiles")
      .select("*")
      .eq("client_id", client.id)
      .single();

    if (!existingProfile) {
      return NextResponse.json(
        { error: "Nutrition profile not found" },
        { status: 404 },
      );
    }

    // Merge new preferences with existing ones
    const updatedPreferences = {
      ...existingProfile.preferences,
      ...body.preferences,
    };

    // Calculate completeness based on filled fields
    const completeness = calculateCompleteness(updatedPreferences);

    // Update nutrition profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from("nutrition_profiles")
      .update({
        preferences: updatedPreferences,
        dietary_preferences: {
          restrictions: updatedPreferences.dietary_restrictions || [],
          allergies: updatedPreferences.allergies || [],
          cooking_skill: updatedPreferences.cooking_skill || "intermediate",
          time_availability: updatedPreferences.time_availability || "moderate",
        },
        preference_completeness: completeness,
        last_preference_update: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingProfile.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Save to preference history for tracking changes
    await supabase.from("preference_history").insert({
      client_id: client.id,
      profile_id: existingProfile.id,
      preferences: body.preferences,
      change_type: body.change_type || "update",
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      data: updatedProfile,
      completeness,
    });
  } catch (error) {
    console.error("Error saving preferences:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Helper function to calculate preference completeness
function calculateCompleteness(preferences: any): number {
  const requiredFields = [
    "dietary_restrictions",
    "allergies",
    "favorite_foods",
    "disliked_foods",
    "meal_timings",
    "cooking_skill",
    "time_availability",
    "kitchen_equipment",
    "cultural_preferences",
    "specific_goals",
  ];

  let filledFields = 0;

  requiredFields.forEach((field) => {
    const value = preferences[field];
    if (Array.isArray(value) && value.length > 0) {
      filledFields++;
    } else if (typeof value === "object" && Object.keys(value).length > 0) {
      filledFields++;
    } else if (value && value !== "") {
      filledFields++;
    }
  });

  // Cap at 100% to prevent going over
  return Math.min(
    100,
    Math.round((filledFields / requiredFields.length) * 100),
  );
}
