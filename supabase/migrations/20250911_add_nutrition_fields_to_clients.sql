-- Add nutrition and fitness fields to clients table
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS height_cm INTEGER,
ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS fitness_goal TEXT CHECK (fitness_goal IN ('lose_weight', 'maintain', 'gain_muscle', 'improve_fitness', 'athletic_performance')),
ADD COLUMN IF NOT EXISTS activity_level TEXT CHECK (activity_level IN ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active')),
ADD COLUMN IF NOT EXISTS dietary_type TEXT CHECK (dietary_type IN ('balanced', 'vegetarian', 'vegan', 'keto', 'paleo', 'mediterranean', 'low_carb', 'high_protein')),
ADD COLUMN IF NOT EXISTS allergies TEXT[],
ADD COLUMN IF NOT EXISTS cooking_time TEXT CHECK (cooking_time IN ('minimal', 'moderate', 'extensive')),
ADD COLUMN IF NOT EXISTS meals_per_day INTEGER DEFAULT 3 CHECK (meals_per_day BETWEEN 2 AND 6),
ADD COLUMN IF NOT EXISTS target_calories INTEGER,
ADD COLUMN IF NOT EXISTS protein_grams INTEGER,
ADD COLUMN IF NOT EXISTS carbs_grams INTEGER,
ADD COLUMN IF NOT EXISTS fat_grams INTEGER,
ADD COLUMN IF NOT EXISTS bmr DECIMAL(7,2),
ADD COLUMN IF NOT EXISTS tdee DECIMAL(7,2),
ADD COLUMN IF NOT EXISTS bmi DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS nutrition_profile_completed BOOLEAN DEFAULT FALSE;

-- Create an index for faster queries
CREATE INDEX IF NOT EXISTS idx_clients_nutrition_completed ON public.clients(nutrition_profile_completed);

-- Update existing clients to have nutrition_profile_completed = false
UPDATE public.clients SET nutrition_profile_completed = FALSE WHERE nutrition_profile_completed IS NULL;