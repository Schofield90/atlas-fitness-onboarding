#!/bin/bash

echo "🔧 Applying meal plans date field fix via Supabase..."
echo "=================================================="

# Database connection details
DB_HOST="db.lzlrojoaxrqvmhempnkn.supabase.co"
DB_USER="postgres"
DB_NAME="postgres"
DB_PASSWORD="@Aa80236661"

# Apply the SQL directly
cat << 'EOF' | PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME
-- Add date field to meal_plans table if not exists
ALTER TABLE public.meal_plans
ADD COLUMN IF NOT EXISTS date DATE;

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

-- Show results
SELECT COUNT(*) as total_plans, 
       COUNT(date) as plans_with_date,
       COUNT(start_date) as plans_with_start_date
FROM public.meal_plans;
EOF

echo "✅ Migration complete!"