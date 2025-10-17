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

    console.log("Checking recipes table...");

    // Try to query the recipes table
    const { data: checkData, error: checkError } = await supabaseAdmin
      .from("recipes")
      .select("*")
      .limit(1);

    if (checkError) {
      console.log("Recipes table error:", checkError);

      // Table doesn't exist or has wrong schema
      return NextResponse.json({
        success: false,
        error: "Recipes table needs to be created",
        instructions: [
          "1. Go to Supabase SQL Editor: https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql/new",
          "2. Copy and run this SQL:",
          "",
          "DROP TABLE IF EXISTS recipe_usage_log CASCADE;",
          "DROP TABLE IF EXISTS recipe_favorites CASCADE;",
          "DROP TABLE IF EXISTS recipe_votes CASCADE;",
          "DROP TABLE IF EXISTS recipes CASCADE;",
          "",
          "Then copy and paste the entire content from:",
          "/supabase/migrations/20250911_create_recipes_system.sql",
        ],
        sqlPreview: `
-- Drop existing tables
DROP TABLE IF EXISTS recipe_usage_log CASCADE;
DROP TABLE IF EXISTS recipe_favorites CASCADE;
DROP TABLE IF EXISTS recipe_votes CASCADE;
DROP TABLE IF EXISTS recipes CASCADE;

-- Create recipes table
CREATE TABLE recipes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    meal_type VARCHAR(50) NOT NULL,
    calories INTEGER NOT NULL,
    protein DECIMAL(10,2) NOT NULL,
    carbs DECIMAL(10,2) NOT NULL,
    fat DECIMAL(10,2) NOT NULL,
    fiber DECIMAL(10,2),
    sugar DECIMAL(10,2),
    sodium DECIMAL(10,2),
    prep_time INTEGER,
    cook_time INTEGER,
    servings INTEGER DEFAULT 1,
    difficulty VARCHAR(20),
    cuisine VARCHAR(100),
    ingredients JSONB NOT NULL,
    instructions JSONB NOT NULL,
    equipment JSONB,
    dietary_tags TEXT[],
    allergens TEXT[],
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    times_used INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0.5,
    source VARCHAR(50) DEFAULT 'ai_generated',
    created_by UUID REFERENCES auth.users(id),
    organization_id UUID REFERENCES organizations(id),
    image_url TEXT,
    thumbnail_url TEXT,
    status VARCHAR(20) DEFAULT 'active',
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_recipes_meal_type ON recipes(meal_type);
CREATE INDEX idx_recipes_status ON recipes(status);
CREATE INDEX idx_recipes_organization ON recipes(organization_id);

-- Create related tables
CREATE TABLE recipe_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(recipe_id, user_id)
);

CREATE TABLE recipe_favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(recipe_id, user_id)
);

CREATE TABLE recipe_usage_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    organization_id UUID REFERENCES organizations(id),
    used_for_date DATE,
    meal_plan_id UUID REFERENCES meal_plans(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
        `,
      });
    }

    // Count existing recipes
    const { count } = await supabaseAdmin
      .from("recipes")
      .select("*", { count: "exact", head: true });

    // If no recipes exist, create a sample one
    if (count === 0) {
      console.log("Creating sample recipe...");

      const { data: newRecipe, error: insertError } = await supabaseAdmin
        .from("recipes")
        .insert({
          name: "Overnight Oats with Berries",
          description:
            "Healthy and delicious overnight oats topped with fresh berries",
          meal_type: "breakfast",
          calories: 350,
          protein: 12.5,
          carbs: 55.0,
          fat: 8.0,
          fiber: 8.0,
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
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error creating sample recipe:", insertError);
        return NextResponse.json({
          success: false,
          error: "Failed to create sample recipe",
          details: insertError,
          message:
            "Table exists but may have wrong schema. Please recreate it using the SQL above.",
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
      message: `Recipes table is working correctly with ${count} recipes`,
      totalRecipes: count,
    });
  } catch (error) {
    console.error("Error checking recipes table:", error);
    return NextResponse.json(
      { error: "Failed to check recipes table", details: error },
      { status: 500 },
    );
  }
}
