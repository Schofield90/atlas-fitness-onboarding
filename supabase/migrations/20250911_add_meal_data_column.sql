-- Add meal_data column to meal_plans if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'meal_plans' 
        AND column_name = 'meal_data'
    ) THEN
        ALTER TABLE meal_plans 
        ADD COLUMN meal_data JSONB;
        
        COMMENT ON COLUMN meal_plans.meal_data IS 'Stores detailed meal plan data including meals, recipes, and totals';
    END IF;
END $$;

-- Create index on meal_data for better query performance
CREATE INDEX IF NOT EXISTS idx_meal_plans_meal_data 
ON meal_plans USING gin (meal_data);

-- Update any existing meal plans that might have data in wrong columns
UPDATE meal_plans
SET meal_data = COALESCE(
    meal_data,
    meals::jsonb,
    data::jsonb,
    meal_plan_data::jsonb,
    '{}'::jsonb
)
WHERE meal_data IS NULL
AND (meals IS NOT NULL OR data IS NOT NULL OR meal_plan_data IS NOT NULL);