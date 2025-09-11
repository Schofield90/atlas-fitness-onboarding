#!/bin/bash

echo "🔧 Creating recipes table in Supabase..."
echo "=================================================="

# Database connection details
DB_HOST="db.lzlrojoaxrqvmhempnkn.supabase.co"
DB_USER="postgres"
DB_NAME="postgres"
DB_PASSWORD="OGFYlxSChyYLgQxn"

# Apply the SQL directly - create the full recipes system
cat << 'EOF' | PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME
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
    prep_time INTEGER, -- in minutes
    cook_time INTEGER, -- in minutes
    total_time INTEGER GENERATED ALWAYS AS (prep_time + cook_time) STORED,
    
    -- Recipe details
    servings INTEGER DEFAULT 1,
    difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard')),
    cuisine VARCHAR(100),
    
    -- Ingredients and instructions stored as JSONB for flexibility
    ingredients JSONB NOT NULL, -- Array of {item, amount, unit}
    instructions JSONB NOT NULL, -- Array of step strings
    equipment JSONB, -- Array of required equipment
    
    -- Dietary information
    dietary_tags TEXT[], -- vegetarian, vegan, gluten-free, dairy-free, etc.
    allergens TEXT[], -- nuts, dairy, eggs, gluten, soy, etc.
    
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
    source VARCHAR(50) DEFAULT 'ai_generated', -- ai_generated, user_submitted, imported
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

-- Create indexes for efficient searching
CREATE INDEX IF NOT EXISTS idx_recipes_meal_type ON recipes(meal_type);
CREATE INDEX IF NOT EXISTS idx_recipes_dietary_tags ON recipes USING GIN(dietary_tags);
CREATE INDEX IF NOT EXISTS idx_recipes_allergens ON recipes USING GIN(allergens);
CREATE INDEX IF NOT EXISTS idx_recipes_rating ON recipes(rating DESC);
CREATE INDEX IF NOT EXISTS idx_recipes_times_used ON recipes(times_used DESC);
CREATE INDEX IF NOT EXISTS idx_recipes_calories ON recipes(calories);
CREATE INDEX IF NOT EXISTS idx_recipes_organization ON recipes(organization_id);
CREATE INDEX IF NOT EXISTS idx_recipes_status ON recipes(status);

-- Create recipe_votes table to track user votes
CREATE TABLE IF NOT EXISTS recipe_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one vote per user per recipe
    UNIQUE(recipe_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_recipe_votes_recipe ON recipe_votes(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_votes_user ON recipe_votes(user_id);

-- Create recipe_favorites table
CREATE TABLE IF NOT EXISTS recipe_favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one favorite per user per recipe
    UNIQUE(recipe_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_recipe_favorites_user ON recipe_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_favorites_recipe ON recipe_favorites(recipe_id);

-- Create recipe_usage_log table to track when recipes are used
CREATE TABLE IF NOT EXISTS recipe_usage_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    organization_id UUID REFERENCES organizations(id),
    used_for_date DATE,
    meal_plan_id UUID REFERENCES meal_plans(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipe_usage_recipe ON recipe_usage_log(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_usage_date ON recipe_usage_log(used_for_date);

-- Check if recipes table was created and show count
SELECT COUNT(*) as recipe_count FROM recipes;

-- Show table structure
\d recipes
EOF

echo "✅ Recipes table creation complete!"
echo ""
echo "Now checking if any recipes exist..."

# Check recipe count
cat << 'EOF' | PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t
SELECT COUNT(*) as total_recipes FROM recipes;
EOF