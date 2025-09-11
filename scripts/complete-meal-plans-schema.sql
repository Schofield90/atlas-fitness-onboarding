-- Complete meal_plans table schema fix
-- This script adds all missing columns to the meal_plans table

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

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_meal_plans_nutrition_profile_id 
ON meal_plans(nutrition_profile_id);

CREATE INDEX IF NOT EXISTS idx_meal_plans_organization_id 
ON meal_plans(organization_id);

CREATE INDEX IF NOT EXISTS idx_meal_plans_dates 
ON meal_plans(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_meal_plans_meal_data 
ON meal_plans USING gin (meal_data);

-- Add comments for documentation
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