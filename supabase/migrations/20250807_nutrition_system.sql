-- Nutrition System Tables
-- This migration creates the tables required for the nutrition integration

-- Create nutrition_profiles table
CREATE TABLE IF NOT EXISTS public.nutrition_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  age INTEGER NOT NULL CHECK (age > 0 AND age < 150),
  sex VARCHAR(10) NOT NULL CHECK (sex IN ('MALE', 'FEMALE')),
  height DECIMAL(5,2) NOT NULL CHECK (height > 0), -- in cm
  current_weight DECIMAL(5,2) NOT NULL CHECK (current_weight > 0), -- in kg
  goal_weight DECIMAL(5,2) NOT NULL CHECK (goal_weight > 0), -- in kg
  activity_level VARCHAR(20) NOT NULL CHECK (activity_level IN ('SEDENTARY', 'LIGHTLY_ACTIVE', 'MODERATELY_ACTIVE', 'VERY_ACTIVE', 'EXTREMELY_ACTIVE')),
  training_frequency INTEGER NOT NULL CHECK (training_frequency >= 0 AND training_frequency <= 7), -- days per week
  training_types TEXT[] DEFAULT '{}',
  dietary_preferences TEXT[] DEFAULT '{}',
  allergies TEXT[] DEFAULT '{}',
  food_likes TEXT[] DEFAULT '{}',
  food_dislikes TEXT[] DEFAULT '{}',
  cooking_time VARCHAR(20) NOT NULL CHECK (cooking_time IN ('MINIMAL', 'MODERATE', 'EXTENSIVE')),
  budget_constraint VARCHAR(10) NOT NULL CHECK (budget_constraint IN ('LOW', 'MODERATE', 'HIGH')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

-- Create body_metrics table for tracking body composition over time
CREATE TABLE IF NOT EXISTS public.body_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight DECIMAL(5,2), -- in kg
  body_fat_percentage DECIMAL(4,2),
  muscle_mass DECIMAL(5,2), -- in kg
  visceral_fat INTEGER,
  metabolic_age INTEGER,
  body_water_percentage DECIMAL(4,2),
  bone_mass DECIMAL(4,2), -- in kg
  bmr INTEGER, -- Basal Metabolic Rate in kcal
  inbody_scan_id VARCHAR(255), -- For InBody integration
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, organization_id, date)
);

-- Create meal_plans table
CREATE TABLE IF NOT EXISTS public.meal_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  weeks INTEGER NOT NULL CHECK (weeks >= 1 AND weeks <= 4),
  days INTEGER NOT NULL CHECK (days IN (7, 14, 21, 28)),
  target_calories INTEGER NOT NULL CHECK (target_calories > 0),
  target_protein INTEGER NOT NULL CHECK (target_protein > 0),
  target_carbs INTEGER NOT NULL CHECK (target_carbs > 0),
  target_fat INTEGER NOT NULL CHECK (target_fat > 0),
  target_fiber INTEGER NOT NULL CHECK (target_fiber > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create meals table
CREATE TABLE IF NOT EXISTS public.meals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_plan_id UUID NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  day INTEGER NOT NULL CHECK (day >= 1 AND day <= 28),
  name VARCHAR(20) NOT NULL CHECK (name IN ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK')),
  calories INTEGER NOT NULL CHECK (calories > 0),
  protein DECIMAL(5,2) NOT NULL CHECK (protein >= 0),
  carbs DECIMAL(5,2) NOT NULL CHECK (carbs >= 0),
  fat DECIMAL(5,2) NOT NULL CHECK (fat >= 0),
  fiber DECIMAL(5,2) NOT NULL CHECK (fiber >= 0),
  recipe TEXT NOT NULL,
  prep_minutes INTEGER NOT NULL CHECK (prep_minutes > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(meal_plan_id, day, name)
);

-- Create ingredients table
CREATE TABLE IF NOT EXISTS public.ingredients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_id UUID NOT NULL REFERENCES public.meals(id) ON DELETE CASCADE,
  item VARCHAR(255) NOT NULL,
  grams DECIMAL(8,2) NOT NULL CHECK (grams > 0),
  calories DECIMAL(8,2) NOT NULL CHECK (calories >= 0),
  protein DECIMAL(5,2) NOT NULL CHECK (protein >= 0),
  carbs DECIMAL(5,2) NOT NULL CHECK (carbs >= 0),
  fat DECIMAL(5,2) NOT NULL CHECK (fat >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create shopping_lists table
CREATE TABLE IF NOT EXISTS public.shopping_lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ingredient VARCHAR(255) NOT NULL,
  quantity DECIMAL(8,2) NOT NULL CHECK (quantity > 0),
  unit VARCHAR(50) NOT NULL,
  category VARCHAR(100) NOT NULL,
  week INTEGER NOT NULL CHECK (week >= 1 AND week <= 4),
  purchased BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_nutrition_profiles_user_org ON public.nutrition_profiles(user_id, organization_id);
CREATE INDEX idx_body_metrics_user_date ON public.body_metrics(user_id, date DESC);
CREATE INDEX idx_body_metrics_org_date ON public.body_metrics(organization_id, date DESC);
CREATE INDEX idx_meal_plans_user_org ON public.meal_plans(user_id, organization_id);
CREATE INDEX idx_meals_meal_plan_day ON public.meals(meal_plan_id, day);
CREATE INDEX idx_ingredients_meal ON public.ingredients(meal_id);
CREATE INDEX idx_shopping_lists_user_week ON public.shopping_lists(user_id, week);
CREATE INDEX idx_shopping_lists_org_week ON public.shopping_lists(organization_id, week);

-- Enable RLS for all tables
ALTER TABLE public.nutrition_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;

-- RLS Policies for nutrition_profiles
CREATE POLICY "Users can view their own nutrition profile"
  ON public.nutrition_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own nutrition profile"
  ON public.nutrition_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own nutrition profile"
  ON public.nutrition_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own nutrition profile"
  ON public.nutrition_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for body_metrics
CREATE POLICY "Users can view their own body metrics"
  ON public.body_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own body metrics"
  ON public.body_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own body metrics"
  ON public.body_metrics FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own body metrics"
  ON public.body_metrics FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for meal_plans
CREATE POLICY "Users can view their own meal plans"
  ON public.meal_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own meal plans"
  ON public.meal_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meal plans"
  ON public.meal_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meal plans"
  ON public.meal_plans FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for meals (accessible through meal_plans)
CREATE POLICY "Users can view meals from their meal plans"
  ON public.meals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.meal_plans
      WHERE meal_plans.id = meals.meal_plan_id
      AND meal_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create meals in their meal plans"
  ON public.meals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meal_plans
      WHERE meal_plans.id = meals.meal_plan_id
      AND meal_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update meals in their meal plans"
  ON public.meals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.meal_plans
      WHERE meal_plans.id = meals.meal_plan_id
      AND meal_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete meals from their meal plans"
  ON public.meals FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.meal_plans
      WHERE meal_plans.id = meals.meal_plan_id
      AND meal_plans.user_id = auth.uid()
    )
  );

-- RLS Policies for ingredients (accessible through meals)
CREATE POLICY "Users can view ingredients from their meals"
  ON public.ingredients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.meals
      JOIN public.meal_plans ON meal_plans.id = meals.meal_plan_id
      WHERE meals.id = ingredients.meal_id
      AND meal_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage ingredients in their meals"
  ON public.ingredients FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.meals
      JOIN public.meal_plans ON meal_plans.id = meals.meal_plan_id
      WHERE meals.id = ingredients.meal_id
      AND meal_plans.user_id = auth.uid()
    )
  );

-- RLS Policies for shopping_lists
CREATE POLICY "Users can view their own shopping lists"
  ON public.shopping_lists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own shopping lists"
  ON public.shopping_lists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shopping lists"
  ON public.shopping_lists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shopping lists"
  ON public.shopping_lists FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_nutrition_profiles_updated_at BEFORE UPDATE ON public.nutrition_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_body_metrics_updated_at BEFORE UPDATE ON public.body_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meal_plans_updated_at BEFORE UPDATE ON public.meal_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meals_updated_at BEFORE UPDATE ON public.meals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();