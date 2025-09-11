#!/bin/bash

# Database connection details
DB_HOST="db.lzlrojoaxrqvmhempnkn.supabase.co"
DB_USER="postgres"
DB_NAME="postgres"
export PGPASSWORD="OGFYlxSChyYLgQxn"

echo "Adding nutrition columns to meal_plans table..."

# Create SQL file
cat > /tmp/add_nutrition_columns.sql << 'EOF'
-- Add nutrition columns to meal_plans table
ALTER TABLE meal_plans 
ADD COLUMN IF NOT EXISTS daily_calories INTEGER,
ADD COLUMN IF NOT EXISTS daily_protein NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS daily_carbs NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS daily_fat NUMERIC(10,2);

-- Add comments for clarity
COMMENT ON COLUMN meal_plans.daily_calories IS 'Total daily calorie target';
COMMENT ON COLUMN meal_plans.daily_protein IS 'Total daily protein in grams';
COMMENT ON COLUMN meal_plans.daily_carbs IS 'Total daily carbohydrates in grams';
COMMENT ON COLUMN meal_plans.daily_fat IS 'Total daily fat in grams';

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'meal_plans' 
AND column_name IN ('daily_calories', 'daily_protein', 'daily_carbs', 'daily_fat');
EOF

echo "SQL file created. Please copy and paste the following SQL into your Supabase SQL editor:"
echo "----------------------------------------"
cat /tmp/add_nutrition_columns.sql
echo "----------------------------------------"