-- Create meal_plans table for storing AI-generated meal plans

CREATE TABLE IF NOT EXISTS meal_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nutrition_profile_id UUID NOT NULL REFERENCES nutrition_profiles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    duration_days INTEGER DEFAULT 7,
    meals_per_day INTEGER DEFAULT 5,
    daily_calories INTEGER,
    daily_protein INTEGER,
    daily_carbs INTEGER,
    daily_fat INTEGER,
    daily_fiber INTEGER DEFAULT 25,
    meal_data JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_meal_plans_nutrition_profile_id ON meal_plans(nutrition_profile_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_organization_id ON meal_plans(organization_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_is_active ON meal_plans(is_active);

-- Enable RLS
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can create their own meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can update their own meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can delete their own meal plans" ON meal_plans;

-- Create RLS policies
CREATE POLICY "Users can view their own meal plans" ON meal_plans
FOR SELECT USING (
    nutrition_profile_id IN (
        SELECT id FROM nutrition_profiles 
        WHERE client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    )
);

CREATE POLICY "Users can create their own meal plans" ON meal_plans
FOR INSERT WITH CHECK (
    nutrition_profile_id IN (
        SELECT id FROM nutrition_profiles 
        WHERE client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    )
);

CREATE POLICY "Users can update their own meal plans" ON meal_plans
FOR UPDATE USING (
    nutrition_profile_id IN (
        SELECT id FROM nutrition_profiles 
        WHERE client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    )
);

CREATE POLICY "Users can delete their own meal plans" ON meal_plans
FOR DELETE USING (
    nutrition_profile_id IN (
        SELECT id FROM nutrition_profiles 
        WHERE client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    )
);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';