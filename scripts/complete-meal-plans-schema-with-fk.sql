-- Complete meal_plans table schema fix INCLUDING foreign key columns
-- This script adds ALL missing columns to the meal_plans table

-- First, add the foreign key columns if they don't exist
ALTER TABLE meal_plans 
ADD COLUMN IF NOT EXISTS nutrition_profile_id UUID,
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Add basic columns if missing
ALTER TABLE meal_plans 
ADD COLUMN IF NOT EXISTS name VARCHAR(255),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add nutrition columns if missing
ALTER TABLE meal_plans 
ADD COLUMN IF NOT EXISTS daily_calories INTEGER,
ADD COLUMN IF NOT EXISTS daily_protein NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS daily_carbs NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS daily_fat NUMERIC(10,2);

-- Add date columns if missing
ALTER TABLE meal_plans 
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE;

-- Add meal_data JSONB column if missing
ALTER TABLE meal_plans 
ADD COLUMN IF NOT EXISTS meal_data JSONB;

-- Add timestamp columns if missing
ALTER TABLE meal_plans 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add indexes for better performance (only if columns exist)
CREATE INDEX IF NOT EXISTS idx_meal_plans_nutrition_profile_id 
ON meal_plans(nutrition_profile_id);

CREATE INDEX IF NOT EXISTS idx_meal_plans_organization_id 
ON meal_plans(organization_id);

CREATE INDEX IF NOT EXISTS idx_meal_plans_dates 
ON meal_plans(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_meal_plans_meal_data 
ON meal_plans USING gin (meal_data);

-- Add foreign key constraints if the related tables exist
-- Note: These may fail if the referenced tables don't exist, which is okay
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nutrition_profiles') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'meal_plans_nutrition_profile_id_fkey' 
            AND table_name = 'meal_plans'
        ) THEN
            ALTER TABLE meal_plans 
            ADD CONSTRAINT meal_plans_nutrition_profile_id_fkey 
            FOREIGN KEY (nutrition_profile_id) 
            REFERENCES nutrition_profiles(id) ON DELETE CASCADE;
        END IF;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'meal_plans_organization_id_fkey' 
            AND table_name = 'meal_plans'
        ) THEN
            ALTER TABLE meal_plans 
            ADD CONSTRAINT meal_plans_organization_id_fkey 
            FOREIGN KEY (organization_id) 
            REFERENCES organizations(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN meal_plans.nutrition_profile_id IS 'Reference to the nutrition profile';
COMMENT ON COLUMN meal_plans.organization_id IS 'Reference to the organization';
COMMENT ON COLUMN meal_plans.name IS 'Name of the meal plan';
COMMENT ON COLUMN meal_plans.description IS 'Description of the meal plan';
COMMENT ON COLUMN meal_plans.is_active IS 'Whether the meal plan is currently active';
COMMENT ON COLUMN meal_plans.daily_calories IS 'Total daily calorie target';
COMMENT ON COLUMN meal_plans.daily_protein IS 'Total daily protein in grams';
COMMENT ON COLUMN meal_plans.daily_carbs IS 'Total daily carbohydrates in grams';
COMMENT ON COLUMN meal_plans.daily_fat IS 'Total daily fat in grams';
COMMENT ON COLUMN meal_plans.start_date IS 'Start date of the meal plan';
COMMENT ON COLUMN meal_plans.end_date IS 'End date of the meal plan';
COMMENT ON COLUMN meal_plans.meal_data IS 'JSONB data containing detailed meal information';

-- Grant permissions
GRANT ALL ON meal_plans TO authenticated;
GRANT ALL ON meal_plans TO service_role;

-- Verify all columns exist
SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'meal_plans'
ORDER BY ordinal_position;