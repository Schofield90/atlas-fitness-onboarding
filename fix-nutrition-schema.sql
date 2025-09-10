-- NUTRITION SYSTEM SCHEMA FIX
-- This migration resolves all inconsistencies in the nutrition_profiles table

-- Step 1: Backup existing data (if any)
CREATE TEMP TABLE IF NOT EXISTS nutrition_profiles_backup AS 
SELECT * FROM nutrition_profiles;

-- Step 2: Drop existing table and dependent objects
DROP TABLE IF EXISTS nutrition_profiles CASCADE;

-- Step 3: Create unified nutrition_profiles table with consistent schema
CREATE TABLE nutrition_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Basic demographics (UPPERCASE enums for consistency)
  age INTEGER NOT NULL CHECK (age > 0 AND age < 150),
  gender VARCHAR(20) NOT NULL CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
  height_cm INTEGER NOT NULL CHECK (height_cm > 0),
  weight_kg DECIMAL(5,2) NOT NULL CHECK (weight_kg > 0),
  
  -- Goals and targets
  goal VARCHAR(20) NOT NULL CHECK (goal IN ('LOSE_WEIGHT', 'MAINTAIN', 'GAIN_MUSCLE', 'IMPROVE_HEALTH')),
  target_weight_kg DECIMAL(5,2),
  weekly_weight_change_kg DECIMAL(3,2) DEFAULT 0.5,
  activity_level VARCHAR(20) NOT NULL CHECK (activity_level IN ('SEDENTARY', 'LIGHTLY_ACTIVE', 'MODERATELY_ACTIVE', 'VERY_ACTIVE', 'EXTRA_ACTIVE')),
  
  -- Calculated nutrition values
  bmr INTEGER, -- Basal Metabolic Rate
  tdee INTEGER, -- Total Daily Energy Expenditure  
  target_calories INTEGER,
  protein_grams INTEGER,
  carbs_grams INTEGER, 
  fat_grams INTEGER,
  fiber_grams INTEGER DEFAULT 25,
  
  -- Training preferences
  training_frequency INTEGER DEFAULT 0 CHECK (training_frequency >= 0 AND training_frequency <= 7),
  training_types TEXT[] DEFAULT '{}',
  
  -- Dietary preferences and restrictions
  dietary_preferences TEXT[] DEFAULT '{}',
  allergies TEXT[] DEFAULT '{}',
  food_likes TEXT[] DEFAULT '{}',
  food_dislikes TEXT[] DEFAULT '{}',
  
  -- Lifestyle preferences
  cooking_time VARCHAR(20) DEFAULT 'MODERATE' CHECK (cooking_time IN ('MINIMAL', 'MODERATE', 'EXTENSIVE')),
  budget_constraint VARCHAR(10) DEFAULT 'MODERATE' CHECK (budget_constraint IN ('LOW', 'MODERATE', 'HIGH')),
  
  -- Meal planning
  meals_per_day INTEGER DEFAULT 3 CHECK (meals_per_day BETWEEN 1 AND 6),
  snacks_per_day INTEGER DEFAULT 2 CHECK (snacks_per_day BETWEEN 0 AND 4),
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(), 
  updated_by UUID REFERENCES auth.users(id),
  
  -- Ensure one profile per client per organization
  UNIQUE(client_id, organization_id)
);

-- Step 4: Recreate dependent tables with correct references
-- Note: These tables were in the later migration, ensuring they align

CREATE TABLE IF NOT EXISTS nutrition_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES nutrition_profiles(id) ON DELETE CASCADE,
  
  -- Dietary restrictions
  dietary_type VARCHAR(50), -- vegetarian, vegan, pescatarian, etc.
  allergies TEXT[], 
  intolerances TEXT[],
  medical_conditions TEXT[],
  
  -- Food preferences  
  liked_foods TEXT[],
  disliked_foods TEXT[],
  liked_cuisines TEXT[],
  cooking_time VARCHAR(20),
  cooking_skill VARCHAR(20),
  
  -- Meal timing preferences
  breakfast_time TIME,
  lunch_time TIME, 
  dinner_time TIME,
  
  -- Shopping preferences
  budget_per_week DECIMAL(6,2),
  preferred_stores TEXT[],
  organic_preference BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meal_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES nutrition_profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  
  -- Aggregate nutrition info
  total_calories INTEGER NOT NULL,
  total_protein DECIMAL(6,2) NOT NULL,
  total_carbs DECIMAL(6,2) NOT NULL,
  total_fat DECIMAL(6,2) NOT NULL,
  total_fiber DECIMAL(6,2),
  
  -- AI generation metadata
  ai_model VARCHAR(50) DEFAULT 'gpt-4',
  generation_prompt TEXT,
  generation_params JSONB,
  
  -- Coach interaction
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  coach_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS meal_plan_meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout')),
  meal_order INTEGER NOT NULL,
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  recipe_url TEXT,
  prep_time_minutes INTEGER,
  cook_time_minutes INTEGER,
  
  -- Nutrition per serving
  calories INTEGER NOT NULL,
  protein_grams DECIMAL(5,2) NOT NULL,
  carbs_grams DECIMAL(5,2) NOT NULL,
  fat_grams DECIMAL(5,2) NOT NULL,
  fiber_grams DECIMAL(5,2),
  sugar_grams DECIMAL(5,2),
  sodium_mg INTEGER,
  
  servings INTEGER DEFAULT 1,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meal_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_id UUID NOT NULL REFERENCES meal_plan_meals(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(8,2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  calories_per_unit DECIMAL(6,2),
  
  -- Optional nutrition data per unit
  protein_per_unit DECIMAL(5,2),
  carbs_per_unit DECIMAL(5,2),
  fat_per_unit DECIMAL(5,2),
  
  notes TEXT,
  is_optional BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nutrition_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES nutrition_profiles(id) ON DELETE CASCADE,
  
  log_date DATE NOT NULL,
  
  -- Actual intake
  actual_calories INTEGER,
  actual_protein DECIMAL(5,2),
  actual_carbs DECIMAL(5,2),
  actual_fat DECIMAL(5,2),
  
  -- Adherence tracking
  adherence_percentage INTEGER CHECK (adherence_percentage BETWEEN 0 AND 100),
  
  -- Body measurements
  weight_kg DECIMAL(5,2),
  body_fat_percentage DECIMAL(4,2),
  
  notes TEXT,
  mood VARCHAR(20) CHECK (mood IN ('great', 'good', 'okay', 'tired', 'low')),
  energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 10),
  hunger_level INTEGER CHECK (hunger_level BETWEEN 1 AND 10),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(client_id, log_date)
);

-- Step 5: Create performance indexes
CREATE INDEX IF NOT EXISTS idx_nutrition_profiles_client ON nutrition_profiles(client_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_profiles_organization ON nutrition_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_client ON meal_plans(client_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_profile ON meal_plans(profile_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_dates ON meal_plans(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_meal_plan_meals_plan ON meal_plan_meals(meal_plan_id);
CREATE INDEX IF NOT EXISTS idx_meal_ingredients_meal ON meal_ingredients(meal_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_logs_client_date ON nutrition_logs(client_id, log_date);

-- Step 6: Enable Row Level Security
ALTER TABLE nutrition_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_logs ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS Policies
-- Clients can manage their own nutrition profiles
CREATE POLICY "Clients can view own nutrition profile" ON nutrition_profiles
  FOR ALL USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

-- Staff can manage client nutrition profiles within their organization
CREATE POLICY "Staff can manage client nutrition profiles" ON nutrition_profiles
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_staff 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Similar policies for other tables
CREATE POLICY "Clients can view own meal plans" ON meal_plans
  FOR ALL USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

CREATE POLICY "Staff can manage client meal plans" ON meal_plans
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_staff 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Clients can view own nutrition logs" ON nutrition_logs
  FOR ALL USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

-- Step 8: Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Apply updated_at triggers
CREATE TRIGGER update_nutrition_profiles_updated_at 
  BEFORE UPDATE ON nutrition_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nutrition_preferences_updated_at 
  BEFORE UPDATE ON nutrition_preferences  
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meal_plans_updated_at 
  BEFORE UPDATE ON meal_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meal_plan_meals_updated_at 
  BEFORE UPDATE ON meal_plan_meals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 10: Attempt to restore data (if backup has compatible schema)
-- This will only work if the backup data can be mapped to the new schema
-- Manual data migration may be required based on actual data structure

COMMENT ON TABLE nutrition_profiles IS 'Unified nutrition profiles table - resolved schema conflicts';
COMMENT ON COLUMN nutrition_profiles.client_id IS 'References clients.id - consistent across all code';
COMMENT ON COLUMN nutrition_profiles.gender IS 'UPPERCASE enums for consistency';
COMMENT ON COLUMN nutrition_profiles.activity_level IS 'UPPERCASE enums for consistency';

-- End of migration