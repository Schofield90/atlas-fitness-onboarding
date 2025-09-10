-- Add missing macro columns to nutrition_profiles table
ALTER TABLE nutrition_profiles 
ADD COLUMN IF NOT EXISTS protein_grams INTEGER,
ADD COLUMN IF NOT EXISTS carbs_grams INTEGER,
ADD COLUMN IF NOT EXISTS fat_grams INTEGER;

-- Update the columns to have proper constraints
ALTER TABLE nutrition_profiles 
ALTER COLUMN protein_grams SET NOT NULL,
ALTER COLUMN carbs_grams SET NOT NULL,
ALTER COLUMN fat_grams SET NOT NULL;