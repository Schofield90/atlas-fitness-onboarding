-- Add missing columns to meal_plans table
ALTER TABLE public.meal_plans
ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES nutrition_profiles(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS total_calories INTEGER,
ADD COLUMN IF NOT EXISTS total_protein INTEGER,
ADD COLUMN IF NOT EXISTS total_carbs INTEGER,
ADD COLUMN IF NOT EXISTS total_fat INTEGER,
ADD COLUMN IF NOT EXISTS shopping_list JSONB,
ADD COLUMN IF NOT EXISTS meal_prep_tips TEXT[],
ADD COLUMN IF NOT EXISTS ai_model TEXT;

-- Create index for profile_id and client_id
CREATE INDEX IF NOT EXISTS idx_meal_plans_profile_id ON public.meal_plans(profile_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_client_id ON public.meal_plans(client_id);

-- Update RLS policies to support both profile_id and client_id
DROP POLICY IF EXISTS "Users can view their own meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can create their own meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can update their own meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can delete their own meal plans" ON meal_plans;

-- New RLS policies that support both profile_id and client_id
CREATE POLICY "Users can view their own meal plans" ON meal_plans
FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    OR
    profile_id IN (
        SELECT id FROM nutrition_profiles 
        WHERE client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    )
    OR
    nutrition_profile_id IN (
        SELECT id FROM nutrition_profiles 
        WHERE client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    )
);

CREATE POLICY "Users can create their own meal plans" ON meal_plans
FOR INSERT WITH CHECK (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    OR
    profile_id IN (
        SELECT id FROM nutrition_profiles 
        WHERE client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    )
    OR
    nutrition_profile_id IN (
        SELECT id FROM nutrition_profiles 
        WHERE client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    )
);

CREATE POLICY "Users can update their own meal plans" ON meal_plans
FOR UPDATE USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    OR
    profile_id IN (
        SELECT id FROM nutrition_profiles 
        WHERE client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    )
    OR
    nutrition_profile_id IN (
        SELECT id FROM nutrition_profiles 
        WHERE client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    )
);

CREATE POLICY "Users can delete their own meal plans" ON meal_plans
FOR DELETE USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    OR
    profile_id IN (
        SELECT id FROM nutrition_profiles 
        WHERE client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    )
    OR
    nutrition_profile_id IN (
        SELECT id FROM nutrition_profiles 
        WHERE client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    )
);