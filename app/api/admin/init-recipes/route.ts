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

    // First, check if the recipes table exists by trying to query it
    const { data: existingRecipes, error: checkError } = await supabaseAdmin
      .from("recipes")
      .select("id")
      .limit(1);

    if (checkError && checkError.code === "42P01") {
      // Table doesn't exist
      return NextResponse.json({
        success: false,
        error:
          "Recipes table does not exist. Please create it via Supabase dashboard.",
        instructions:
          "Copy the SQL from /supabase/migrations/20250911_create_recipes_system.sql and run it in Supabase SQL editor",
      });
    }

    // Count existing recipes
    const { count } = await supabaseAdmin
      .from("recipes")
      .select("*", { count: "exact", head: true });

    // If no recipes exist, create a sample one to test
    if (count === 0) {
      console.log("No recipes found, creating a sample recipe...");

      const sampleRecipe = {
        name: "Overnight Oats with Berries",
        description:
          "Healthy and delicious overnight oats topped with fresh berries",
        meal_type: "breakfast",
        calories: 350,
        protein: 12,
        carbs: 55,
        fat: 8,
        fiber: 8,
        prep_time: 10,
        cook_time: 0,
        servings: 1,
        difficulty: "easy",
        ingredients: [
          { item: "rolled oats", amount: "50", unit: "g" },
          { item: "almond milk", amount: "150", unit: "ml" },
          { item: "chia seeds", amount: "1", unit: "tbsp" },
          { item: "honey", amount: "1", unit: "tbsp" },
          { item: "mixed berries", amount: "100", unit: "g" },
        ],
        instructions: [
          "Mix oats, almond milk, and chia seeds in a jar",
          "Add honey and stir well",
          "Cover and refrigerate overnight",
          "Top with fresh berries before serving",
        ],
        dietary_tags: ["vegetarian", "gluten-free"],
        allergens: ["nuts"],
        source: "ai_generated",
        status: "active",
        upvotes: 0,
        downvotes: 0,
        times_used: 0,
      };

      const { data: newRecipe, error: insertError } = await supabaseAdmin
        .from("recipes")
        .insert(sampleRecipe)
        .select()
        .single();

      if (insertError) {
        console.error("Error creating sample recipe:", insertError);
        return NextResponse.json({
          success: false,
          error: "Failed to create sample recipe",
          details: insertError,
        });
      }

      return NextResponse.json({
        success: true,
        message: "Created sample recipe successfully",
        recipe: newRecipe,
        totalRecipes: 1,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Recipes table exists with ${count} recipes`,
      totalRecipes: count,
    });
  } catch (error) {
    console.error("Error initializing recipes:", error);
    return NextResponse.json(
      { error: "Failed to initialize recipes", details: error },
      { status: 500 },
    );
  }
}
