-- Add date field to meal_plans table if not exists
ALTER TABLE public.meal_plans
ADD COLUMN IF NOT EXISTS date DATE;

-- Create unique constraint for profile and date combination
-- This ensures only one meal plan per profile per date
ALTER TABLE public.meal_plans
DROP CONSTRAINT IF EXISTS unique_meal_plan_per_date;

ALTER TABLE public.meal_plans
ADD CONSTRAINT unique_meal_plan_per_date 
UNIQUE (nutrition_profile_id, date);

-- Create index for faster date-based queries
CREATE INDEX IF NOT EXISTS idx_meal_plans_date ON public.meal_plans(date);
CREATE INDEX IF NOT EXISTS idx_meal_plans_profile_date ON public.meal_plans(nutrition_profile_id, date);

-- Update existing meal plans to extract date from meal_data if available
UPDATE public.meal_plans
SET date = (meal_data->>'date')::DATE
WHERE date IS NULL 
  AND meal_data ? 'date' 
  AND meal_data->>'date' IS NOT NULL;

-- If start_date is populated but date is not, use start_date
UPDATE public.meal_plans
SET date = start_date
WHERE date IS NULL AND start_date IS NOT NULL;