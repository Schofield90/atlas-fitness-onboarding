import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create recipes table
    const { error: recipesError } = await supabase.rpc("exec_sql", {
      sql: `
        -- Create recipes table for community meal library
        CREATE TABLE IF NOT EXISTS recipes (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            meal_type VARCHAR(50) NOT NULL CHECK (meal_type IN ('breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner')),
            
            -- Nutritional information
            calories INTEGER NOT NULL,
            protein DECIMAL(10,2) NOT NULL,
            carbs DECIMAL(10,2) NOT NULL,
            fat DECIMAL(10,2) NOT NULL,
            fiber DECIMAL(10,2),
            sugar DECIMAL(10,2),
            sodium DECIMAL(10,2),
            
            -- Time information
            prep_time INTEGER,
            cook_time INTEGER,
            total_time INTEGER GENERATED ALWAYS AS (prep_time + cook_time) STORED,
            
            -- Recipe details
            servings INTEGER DEFAULT 1,
            difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard')),
            cuisine VARCHAR(100),
            
            -- Ingredients and instructions stored as JSONB
            ingredients JSONB NOT NULL,
            instructions JSONB NOT NULL,
            equipment JSONB,
            
            -- Dietary information
            dietary_tags TEXT[],
            allergens TEXT[],
            
            -- Community features
            upvotes INTEGER DEFAULT 0,
            downvotes INTEGER DEFAULT 0,
            rating DECIMAL(3,2) GENERATED ALWAYS AS (
                CASE 
                    WHEN (upvotes + downvotes) > 0 
                    THEN (upvotes::DECIMAL / (upvotes + downvotes))::DECIMAL(3,2)
                    ELSE 0.5 
                END
            ) STORED,
            times_used INTEGER DEFAULT 0,
            
            -- Source information
            source VARCHAR(50) DEFAULT 'ai_generated',
            created_by UUID REFERENCES auth.users(id),
            organization_id UUID REFERENCES organizations(id),
            
            -- Images
            image_url TEXT,
            thumbnail_url TEXT,
            
            -- Status
            status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'pending', 'archived')),
            is_featured BOOLEAN DEFAULT FALSE,
            
            -- Timestamps
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `,
    });

    if (recipesError) {
      console.error("Error creating recipes table:", recipesError);
      // Continue anyway - table might already exist
    }

    // Create indexes
    const indexes = [
      "CREATE INDEX IF NOT EXISTS idx_recipes_meal_type ON recipes(meal_type)",
      "CREATE INDEX IF NOT EXISTS idx_recipes_dietary_tags ON recipes USING GIN(dietary_tags)",
      "CREATE INDEX IF NOT EXISTS idx_recipes_allergens ON recipes USING GIN(allergens)",
      "CREATE INDEX IF NOT EXISTS idx_recipes_rating ON recipes(rating DESC)",
      "CREATE INDEX IF NOT EXISTS idx_recipes_times_used ON recipes(times_used DESC)",
      "CREATE INDEX IF NOT EXISTS idx_recipes_calories ON recipes(calories)",
      "CREATE INDEX IF NOT EXISTS idx_recipes_organization ON recipes(organization_id)",
      "CREATE INDEX IF NOT EXISTS idx_recipes_status ON recipes(status)",
    ];

    for (const index of indexes) {
      await supabase
        .rpc("exec_sql", { sql: index })
        .catch((e) => console.log(`Index might already exist: ${e.message}`));
    }

    // Create recipe_votes table
    const { error: votesError } = await supabase.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS recipe_votes (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES auth.users(id),
            vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(recipe_id, user_id)
        );
      `,
    });

    // Create recipe_favorites table
    const { error: favoritesError } = await supabase.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS recipe_favorites (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES auth.users(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(recipe_id, user_id)
        );
      `,
    });

    // Create recipe_usage_log table
    const { error: usageError } = await supabase.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS recipe_usage_log (
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

    return NextResponse.json({
      success: true,
      message: "Recipes system tables created successfully",
    });
  } catch (error: any) {
    console.error("Error creating recipes tables:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
