import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    // Use service role to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    console.log("Testing recipe creation...");

    const testRecipe = {
      name: `Test Recipe ${Date.now()}`,
      description: "Test recipe to verify table is working",
      meal_type: "lunch",
      calories: 450,
      protein: 25.5,
      carbs: 45.0,
      fat: 15.0,
      prep_time: 15,
      cook_time: 20,
      servings: 1,
      difficulty: "easy",
      ingredients: [
        { item: "chicken breast", amount: "150", unit: "g" },
        { item: "rice", amount: "100", unit: "g" },
        { item: "vegetables", amount: "200", unit: "g" },
      ],
      instructions: [
        "Cook the rice according to package instructions",
        "Grill the chicken breast",
        "Steam the vegetables",
        "Serve together",
      ],
      dietary_tags: ["high-protein", "balanced"],
      allergens: [],
      source: "ai_generated",
      status: "active",
      upvotes: 0,
      downvotes: 0,
      times_used: 0,
    };

    console.log("Attempting to insert:", JSON.stringify(testRecipe, null, 2));

    const { data: newRecipe, error: insertError } = await supabaseAdmin
      .from("recipes")
      .insert(testRecipe)
      .select()
      .single();

    if (insertError) {
      console.error("Error creating test recipe:", insertError);
      return NextResponse.json({
        success: false,
        error: "Failed to create test recipe",
        details: {
          message: insertError.message,
          code: insertError.code,
          hint: insertError.hint,
          details: insertError.details,
        },
        attemptedData: testRecipe,
      });
    }

    // Now count total recipes
    const { count } = await supabaseAdmin
      .from("recipes")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({
      success: true,
      message: "Test recipe created successfully",
      recipe: newRecipe,
      totalRecipes: count,
    });
  } catch (error) {
    console.error("Error in test recipe creation:", error);
    return NextResponse.json(
      { error: "Failed to test recipe creation", details: error },
      { status: 500 },
    );
  }
}
