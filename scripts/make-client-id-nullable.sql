-- Make client_id nullable in meal_plans table
-- This allows meal plans to be created without a client record

-- Drop the foreign key constraint if it exists
ALTER TABLE meal_plans 
DROP CONSTRAINT IF EXISTS meal_plans_client_id_fkey;

-- Make the column nullable
ALTER TABLE meal_plans 
ALTER COLUMN client_id DROP NOT NULL;

-- Add a comment explaining the field
COMMENT ON COLUMN meal_plans.client_id IS 'Optional reference to clients table - can be NULL for AI-generated plans';

-- Verify the change
SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'meal_plans' 
AND column_name = 'client_id';