#!/bin/bash

# Database connection details
DB_HOST="db.lzlrojoaxrqvmhempnkn.supabase.co"
DB_USER="postgres"
DB_NAME="postgres"
export PGPASSWORD="OGFYlxSChyYLgQxn"

echo "Adding meal_data column to meal_plans table..."

# Create SQL file
cat > /tmp/add_meal_data_column.sql << 'EOF'
-- Add meal_data column to meal_plans
ALTER TABLE meal_plans 
ADD COLUMN IF NOT EXISTS meal_data JSONB;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_meal_plans_meal_data 
ON meal_plans USING gin (meal_data);

-- Grant permissions
GRANT ALL ON meal_plans TO authenticated;
GRANT ALL ON meal_plans TO service_role;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'meal_plans' 
AND column_name = 'meal_data';
EOF

echo "SQL file created. Please copy and paste the following SQL into your Supabase SQL editor:"
echo "----------------------------------------"
cat /tmp/add_meal_data_column.sql
echo "----------------------------------------"
echo ""
echo "Or if you have psql installed, run:"
echo "psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f /tmp/add_meal_data_column.sql"