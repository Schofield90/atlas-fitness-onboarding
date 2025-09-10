-- Create comprehensive nutrition system tables

-- Nutrition profiles for clients
CREATE TABLE IF NOT EXISTS nutrition_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Basic stats for BMR calculation
  height_cm INTEGER NOT NULL,
  weight_kg DECIMAL(5,2) NOT NULL,
  age INTEGER NOT NULL,
  gender VARCHAR(20) NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  activity_level VARCHAR(20) NOT NULL CHECK (activity_level IN ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active')),
  
  -- Goals
  goal VARCHAR(20) NOT NULL CHECK (goal IN ('lose_weight', 'maintain', 'gain_muscle', 'improve_health')),
  target_weight_kg DECIMAL(5,2),
  weekly_weight_change_kg DECIMAL(3,2) DEFAULT 0.5, -- For calculating deficit/surplus
  
  -- Calculated values
  bmr INTEGER NOT NULL, -- Basal Metabolic Rate
  tdee INTEGER NOT NULL, -- Total Daily Energy Expenditure
  target_calories INTEGER NOT NULL,
  
  -- Macro targets (in grams)
  protein_grams INTEGER NOT NULL,
  carbs_grams INTEGER NOT NULL,
  fat_grams INTEGER NOT NULL,
  fiber_grams INTEGER DEFAULT 25,
  
  -- Preferences
  meals_per_day INTEGER DEFAULT 3 CHECK (meals_per_day BETWEEN 1 AND 6),
  snacks_per_day INTEGER DEFAULT 2 CHECK (snacks_per_day BETWEEN 0 AND 4),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  
  UNIQUE(client_id)
);

-- Food preferences and restrictions
CREATE TABLE IF NOT EXISTS nutrition_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES nutrition_profiles(id) ON DELETE CASCADE,
  
  -- Dietary restrictions
  dietary_type VARCHAR(50), -- vegetarian, vegan, pescatarian, etc.
  allergies TEXT[], -- Array of allergens
  intolerances TEXT[], -- Array of food intolerances
  medical_conditions TEXT[], -- diabetes, hypertension, etc.
  
  -- Food preferences
  liked_foods TEXT[], -- Foods they enjoy
  disliked_foods TEXT[], -- Foods to avoid
  liked_cuisines TEXT[], -- Preferred cuisine types
  cooking_time VARCHAR(20), -- quick, moderate, extensive
  cooking_skill VARCHAR(20), -- beginner, intermediate, advanced
  
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

-- Meal plans
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
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Individual meals in a plan
CREATE TABLE IF NOT EXISTS meal_plan_meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout')),
  meal_order INTEGER NOT NULL, -- Order within the day
  
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

-- Ingredients for each meal
CREATE TABLE IF NOT EXISTS meal_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_id UUID NOT NULL REFERENCES meal_plan_meals(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(8,2) NOT NULL,
  unit VARCHAR(50) NOT NULL, -- grams, ml, cups, tbsp, etc.
  calories_per_unit DECIMAL(6,2),
  
  -- Optional nutrition data per unit
  protein_per_unit DECIMAL(5,2),
  carbs_per_unit DECIMAL(5,2),
  fat_per_unit DECIMAL(5,2),
  
  notes TEXT,
  is_optional BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meal feedback and ratings
CREATE TABLE IF NOT EXISTS meal_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_id UUID NOT NULL REFERENCES meal_plan_meals(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  taste_rating INTEGER CHECK (taste_rating BETWEEN 1 AND 5),
  ease_rating INTEGER CHECK (ease_rating BETWEEN 1 AND 5),
  satiety_rating INTEGER CHECK (satiety_rating BETWEEN 1 AND 5),
  
  would_repeat BOOLEAN,
  feedback_text TEXT,
  
  -- AI learning points
  ai_notes JSONB, -- Structured feedback for AI to learn from
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meal substitutions suggested by AI
CREATE TABLE IF NOT EXISTS meal_substitutions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_meal_id UUID NOT NULL REFERENCES meal_plan_meals(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  reason TEXT, -- Why this substitution was suggested
  
  -- Same nutrition fields as meals
  calories INTEGER NOT NULL,
  protein_grams DECIMAL(5,2) NOT NULL,
  carbs_grams DECIMAL(5,2) NOT NULL,
  fat_grams DECIMAL(5,2) NOT NULL,
  
  similarity_score DECIMAL(3,2), -- How similar to original (0-1)
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shopping lists generated from meal plans
CREATE TABLE IF NOT EXISTS shopping_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  
  items JSONB NOT NULL, -- Array of shopping items with quantities
  estimated_cost DECIMAL(6,2),
  
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'shopping', 'completed')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Progress tracking
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
  
  -- Adherence
  adherence_percentage INTEGER CHECK (adherence_percentage BETWEEN 0 AND 100),
  
  -- Measurements
  weight_kg DECIMAL(5,2),
  body_fat_percentage DECIMAL(4,2),
  
  notes TEXT,
  mood VARCHAR(20) CHECK (mood IN ('great', 'good', 'okay', 'tired', 'low')),
  energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 10),
  hunger_level INTEGER CHECK (hunger_level BETWEEN 1 AND 10),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(client_id, log_date)
);

-- Create indexes for performance
CREATE INDEX idx_nutrition_profiles_client ON nutrition_profiles(client_id);
CREATE INDEX idx_meal_plans_client ON meal_plans(client_id);
CREATE INDEX idx_meal_plans_dates ON meal_plans(start_date, end_date);
CREATE INDEX idx_meal_plan_meals_plan ON meal_plan_meals(meal_plan_id);
CREATE INDEX idx_nutrition_logs_client_date ON nutrition_logs(client_id, log_date);

-- Enable RLS
ALTER TABLE nutrition_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_substitutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clients to access their own data
CREATE POLICY "Clients can view own nutrition profile" ON nutrition_profiles
  FOR ALL USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

CREATE POLICY "Clients can view own preferences" ON nutrition_preferences
  FOR ALL USING (profile_id IN (
    SELECT id FROM nutrition_profiles WHERE client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Clients can view own meal plans" ON meal_plans
  FOR ALL USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

CREATE POLICY "Clients can view own meals" ON meal_plan_meals
  FOR SELECT USING (meal_plan_id IN (
    SELECT id FROM meal_plans WHERE client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Clients can manage meal feedback" ON meal_feedback
  FOR ALL USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

CREATE POLICY "Clients can view own logs" ON nutrition_logs
  FOR ALL USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

-- RLS Policies for coaches/staff to manage client nutrition
CREATE POLICY "Staff can manage client nutrition" ON nutrition_profiles
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_staff 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Staff can manage meal plans" ON meal_plans
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_staff 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );