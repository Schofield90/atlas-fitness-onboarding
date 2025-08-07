-- Migration: NutriCoach Integration with Atlas Fitness CRM
-- Description: Integrates nutrition coaching functionality into the existing multi-tenant gym CRM system
-- Date: 2025-08-07

-- ========================================
-- NUTRITION PROFILES TABLE
-- ========================================
-- Links nutrition profiles to existing leads/customers
CREATE TABLE IF NOT EXISTS public.nutrition_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    lead_id UUID UNIQUE NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    
    -- Biometric data
    age INTEGER NOT NULL CHECK (age > 0 AND age < 150),
    sex VARCHAR(10) NOT NULL CHECK (sex IN ('MALE', 'FEMALE')),
    height DECIMAL(5,2) NOT NULL CHECK (height > 0), -- in cm
    current_weight DECIMAL(5,2) NOT NULL CHECK (current_weight > 0), -- in kg
    goal_weight DECIMAL(5,2) NOT NULL CHECK (goal_weight > 0), -- in kg
    
    -- Activity and training
    activity_level VARCHAR(20) NOT NULL CHECK (activity_level IN ('SEDENTARY', 'LIGHTLY_ACTIVE', 'MODERATELY_ACTIVE', 'VERY_ACTIVE', 'EXTRA_ACTIVE')),
    training_frequency INTEGER NOT NULL DEFAULT 0 CHECK (training_frequency >= 0 AND training_frequency <= 14), -- sessions per week
    training_types JSONB DEFAULT '[]', -- Array of training types: ["weightlifting", "cardio", "hiit", etc.]
    
    -- Dietary preferences and restrictions
    dietary_preferences JSONB DEFAULT '[]', -- ["vegetarian", "vegan", "keto", "paleo", etc.]
    allergies JSONB DEFAULT '[]', -- ["nuts", "dairy", "gluten", etc.]
    food_likes JSONB DEFAULT '[]', -- Favorite foods
    food_dislikes JSONB DEFAULT '[]', -- Foods to avoid
    
    -- Lifestyle factors
    cooking_time VARCHAR(20) NOT NULL DEFAULT 'MODERATE' CHECK (cooking_time IN ('MINIMAL', 'MODERATE', 'EXTENSIVE')),
    budget_constraint VARCHAR(20) NOT NULL DEFAULT 'MODERATE' CHECK (budget_constraint IN ('LOW', 'MODERATE', 'HIGH')),
    cultural_restrictions JSONB DEFAULT '[]', -- Religious or cultural dietary restrictions
    
    -- Calculated fields
    bmr DECIMAL(7,2), -- Basal Metabolic Rate
    tdee DECIMAL(7,2), -- Total Daily Energy Expenditure
    target_calories INTEGER,
    target_protein DECIMAL(5,2), -- grams
    target_carbs DECIMAL(5,2), -- grams
    target_fat DECIMAL(5,2), -- grams
    target_fiber DECIMAL(5,2), -- grams
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for nutrition_profiles
CREATE INDEX idx_nutrition_profiles_org ON nutrition_profiles (organization_id);
CREATE INDEX idx_nutrition_profiles_lead ON nutrition_profiles (lead_id);

-- ========================================
-- NUTRITION MEAL PLANS TABLE
-- ========================================
-- Stores generated meal plans for users
CREATE TABLE IF NOT EXISTS public.nutrition_meal_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.nutrition_profiles(id) ON DELETE CASCADE,
    
    -- Plan details
    name VARCHAR(255) NOT NULL,
    duration_days INTEGER NOT NULL CHECK (duration_days IN (7, 14, 21, 28)),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    -- Nutritional targets (daily)
    daily_calories INTEGER NOT NULL,
    daily_protein DECIMAL(5,2) NOT NULL, -- grams
    daily_carbs DECIMAL(5,2) NOT NULL, -- grams
    daily_fat DECIMAL(5,2) NOT NULL, -- grams
    daily_fiber DECIMAL(5,2) NOT NULL, -- grams
    
    -- Generation metadata
    generation_method VARCHAR(50) DEFAULT 'AI',
    ai_model VARCHAR(100),
    generation_parameters JSONB, -- Store the parameters used to generate this plan
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for nutrition_meal_plans
CREATE INDEX idx_nutrition_meal_plans_org ON nutrition_meal_plans (organization_id);
CREATE INDEX idx_nutrition_meal_plans_profile ON nutrition_meal_plans (profile_id);
CREATE INDEX idx_nutrition_meal_plans_active ON nutrition_meal_plans (is_active);
CREATE INDEX idx_nutrition_meal_plans_dates ON nutrition_meal_plans (start_date, end_date);

-- ========================================
-- NUTRITION MEALS TABLE
-- ========================================
-- Individual meals within meal plans
CREATE TABLE IF NOT EXISTS public.nutrition_meals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    meal_plan_id UUID NOT NULL REFERENCES public.nutrition_meal_plans(id) ON DELETE CASCADE,
    
    -- Meal identification
    day_number INTEGER NOT NULL CHECK (day_number >= 1 AND day_number <= 28),
    meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'PRE_WORKOUT', 'POST_WORKOUT')),
    meal_order INTEGER NOT NULL DEFAULT 1, -- For multiple snacks or split meals
    
    -- Meal details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    recipe JSONB NOT NULL, -- Detailed recipe with ingredients and instructions
    prep_time INTEGER, -- minutes
    cook_time INTEGER, -- minutes
    servings INTEGER DEFAULT 1,
    
    -- Nutritional content (per serving)
    calories INTEGER NOT NULL,
    protein DECIMAL(5,2) NOT NULL, -- grams
    carbs DECIMAL(5,2) NOT NULL, -- grams
    fat DECIMAL(5,2) NOT NULL, -- grams
    fiber DECIMAL(5,2) NOT NULL, -- grams
    sugar DECIMAL(5,2), -- grams
    sodium DECIMAL(7,2), -- mg
    
    -- Additional metadata
    tags JSONB DEFAULT '[]', -- ["high-protein", "quick", "meal-prep-friendly", etc.]
    meal_image_url TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT idx_nutrition_meals_unique_plan_day_type_order UNIQUE (meal_plan_id, day_number, meal_type, meal_order)
);

-- Create indexes for nutrition_meals
CREATE INDEX idx_nutrition_meals_org ON nutrition_meals (organization_id);
CREATE INDEX idx_nutrition_meals_plan ON nutrition_meals (meal_plan_id);
CREATE INDEX idx_nutrition_meals_day_type ON nutrition_meals (day_number, meal_type);

-- ========================================
-- NUTRITION INGREDIENTS TABLE
-- ========================================
-- Detailed ingredients for each meal
CREATE TABLE IF NOT EXISTS public.nutrition_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    meal_id UUID NOT NULL REFERENCES public.nutrition_meals(id) ON DELETE CASCADE,
    
    -- Ingredient details
    name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50) NOT NULL, -- grams, ml, cups, tbsp, etc.
    food_category VARCHAR(50), -- protein, vegetable, grain, dairy, etc.
    
    -- Nutritional breakdown (optional, for detailed tracking)
    calories DECIMAL(7,2),
    protein DECIMAL(5,2),
    carbs DECIMAL(5,2),
    fat DECIMAL(5,2),
    fiber DECIMAL(5,2),
    
    -- Shopping list information
    is_pantry_staple BOOLEAN DEFAULT FALSE,
    estimated_cost DECIMAL(10,2),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for nutrition_ingredients
CREATE INDEX idx_nutrition_ingredients_org ON nutrition_ingredients (organization_id);
CREATE INDEX idx_nutrition_ingredients_meal ON nutrition_ingredients (meal_id);
CREATE INDEX idx_nutrition_ingredients_category ON nutrition_ingredients (food_category);

-- ========================================
-- NUTRITION SHOPPING LISTS TABLE
-- ========================================
-- Generated shopping lists from meal plans
CREATE TABLE IF NOT EXISTS public.nutrition_shopping_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.nutrition_profiles(id) ON DELETE CASCADE,
    meal_plan_id UUID REFERENCES public.nutrition_meal_plans(id) ON DELETE CASCADE,
    
    -- Shopping list details
    week_number INTEGER, -- For weekly breakdown of longer plans
    item_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    category VARCHAR(50), -- produce, meat, dairy, etc.
    
    -- Status tracking
    is_purchased BOOLEAN DEFAULT FALSE,
    purchased_at TIMESTAMP WITH TIME ZONE,
    
    -- Additional info
    notes TEXT,
    estimated_cost DECIMAL(10,2),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for nutrition_shopping_lists
CREATE INDEX idx_nutrition_shopping_list_org ON nutrition_shopping_lists (organization_id);
CREATE INDEX idx_nutrition_shopping_list_profile ON nutrition_shopping_lists (profile_id);
CREATE INDEX idx_nutrition_shopping_list_plan ON nutrition_shopping_lists (meal_plan_id);
CREATE INDEX idx_nutrition_shopping_list_week ON nutrition_shopping_lists (week_number);
CREATE INDEX idx_nutrition_shopping_list_purchased ON nutrition_shopping_lists (is_purchased);
CREATE INDEX idx_nutrition_shopping_list_category ON nutrition_shopping_lists (category);

-- ========================================
-- NUTRITION CHAT SESSIONS TABLE
-- ========================================
-- Stores AI chat sessions for nutrition profile creation and consultations
CREATE TABLE IF NOT EXISTS public.nutrition_chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.nutrition_profiles(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    
    -- Session details
    session_type VARCHAR(50) NOT NULL CHECK (session_type IN ('PROFILE_CREATION', 'MEAL_PLANNING', 'CONSULTATION', 'CHECK_IN')),
    messages JSONB NOT NULL DEFAULT '[]', -- Array of {role: 'user'|'assistant', content: string, timestamp: ISO}
    
    -- Extracted data (for profile creation)
    extracted_data JSONB, -- Structured data extracted from the conversation
    
    -- Session metadata
    is_complete BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    last_message_at TIMESTAMP WITH TIME ZONE,
    
    -- AI details
    ai_model VARCHAR(100),
    total_tokens_used INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for nutrition_chat_sessions
CREATE INDEX idx_nutrition_chat_sessions_org ON nutrition_chat_sessions (organization_id);
CREATE INDEX idx_nutrition_chat_sessions_profile ON nutrition_chat_sessions (profile_id);
CREATE INDEX idx_nutrition_chat_sessions_type ON nutrition_chat_sessions (session_type);
CREATE INDEX idx_nutrition_chat_sessions_complete ON nutrition_chat_sessions (is_complete);
CREATE INDEX idx_nutrition_chat_sessions_last_message ON nutrition_chat_sessions (last_message_at DESC);

-- ========================================
-- NUTRITION BODY METRICS TABLE
-- ========================================
-- Tracks body composition changes over time
CREATE TABLE IF NOT EXISTS public.nutrition_body_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.nutrition_profiles(id) ON DELETE CASCADE,
    
    -- Measurement date
    measurement_date DATE NOT NULL,
    
    -- Basic metrics
    weight DECIMAL(5,2) NOT NULL, -- kg
    body_fat_percentage DECIMAL(4,2),
    muscle_mass DECIMAL(5,2), -- kg
    
    -- InBody scan data (if available)
    inbody_scan_id VARCHAR(255), -- Reference to external InBody system
    skeletal_muscle_mass DECIMAL(5,2), -- kg
    body_water DECIMAL(5,2), -- liters
    protein_mass DECIMAL(5,2), -- kg
    mineral_mass DECIMAL(5,2), -- kg
    body_fat_mass DECIMAL(5,2), -- kg
    
    -- Segmental analysis
    right_arm_muscle DECIMAL(5,2),
    left_arm_muscle DECIMAL(5,2),
    trunk_muscle DECIMAL(5,2),
    right_leg_muscle DECIMAL(5,2),
    left_leg_muscle DECIMAL(5,2),
    
    -- Additional metrics
    visceral_fat_level INTEGER,
    bmr_measured DECIMAL(7,2), -- kcal
    waist_circumference DECIMAL(5,2), -- cm
    hip_circumference DECIMAL(5,2), -- cm
    
    -- Progress indicators
    phase_angle DECIMAL(4,2),
    inbody_score INTEGER,
    
    -- Data source
    data_source VARCHAR(50) DEFAULT 'MANUAL', -- MANUAL, INBODY, OTHER
    
    -- Notes
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT idx_nutrition_body_metrics_unique_profile_date UNIQUE (profile_id, measurement_date)
);

-- Create indexes for nutrition_body_metrics
CREATE INDEX idx_nutrition_body_metrics_org ON nutrition_body_metrics (organization_id);
CREATE INDEX idx_nutrition_body_metrics_profile ON nutrition_body_metrics (profile_id);
CREATE INDEX idx_nutrition_body_metrics_date ON nutrition_body_metrics (measurement_date DESC);

-- ========================================
-- NUTRITION TRAINING SESSIONS TABLE
-- ========================================
-- Links actual training sessions to nutrition planning
CREATE TABLE IF NOT EXISTS public.nutrition_training_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.nutrition_profiles(id) ON DELETE CASCADE,
    
    -- Link to booking system
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    class_session_id UUID REFERENCES public.class_sessions(id) ON DELETE SET NULL,
    
    -- Session details
    session_date DATE NOT NULL,
    session_type VARCHAR(50) NOT NULL, -- strength, cardio, hiit, yoga, etc.
    duration_minutes INTEGER NOT NULL,
    
    -- Energy expenditure
    estimated_calories_burned INTEGER,
    avg_heart_rate INTEGER,
    max_heart_rate INTEGER,
    
    -- Performance metrics
    total_weight_lifted DECIMAL(10,2), -- kg
    total_reps INTEGER,
    distance_covered DECIMAL(10,2), -- km
    
    -- RPE and fatigue
    rpe_score INTEGER CHECK (rpe_score >= 1 AND rpe_score <= 10), -- Rate of Perceived Exertion
    fatigue_level VARCHAR(20), -- low, moderate, high
    
    -- Recovery needs
    recommended_protein_intake DECIMAL(5,2), -- grams
    recommended_carb_intake DECIMAL(5,2), -- grams
    hydration_needs DECIMAL(5,2), -- liters
    
    -- Notes
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for nutrition_training_sessions
CREATE INDEX idx_nutrition_training_sessions_org ON nutrition_training_sessions (organization_id);
CREATE INDEX idx_nutrition_training_sessions_profile ON nutrition_training_sessions (profile_id);
CREATE INDEX idx_nutrition_training_sessions_date ON nutrition_training_sessions (session_date DESC);
CREATE INDEX idx_nutrition_training_sessions_booking ON nutrition_training_sessions (booking_id);
CREATE INDEX idx_nutrition_training_sessions_class ON nutrition_training_sessions (class_session_id);

-- ========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================

-- Enable RLS on all tables
ALTER TABLE nutrition_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_body_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_training_sessions ENABLE ROW LEVEL SECURITY;

-- Helper function to check organization membership
CREATE OR REPLACE FUNCTION user_has_organization_access(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_organizations
        WHERE user_id = auth.uid()
        AND organization_id = org_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for nutrition_profiles
CREATE POLICY "Users can view nutrition profiles in their organization"
    ON nutrition_profiles FOR SELECT
    TO authenticated
    USING (user_has_organization_access(organization_id));

CREATE POLICY "Users can create nutrition profiles in their organization"
    ON nutrition_profiles FOR INSERT
    TO authenticated
    WITH CHECK (user_has_organization_access(organization_id));

CREATE POLICY "Users can update nutrition profiles in their organization"
    ON nutrition_profiles FOR UPDATE
    TO authenticated
    USING (user_has_organization_access(organization_id))
    WITH CHECK (user_has_organization_access(organization_id));

CREATE POLICY "Users can delete nutrition profiles in their organization"
    ON nutrition_profiles FOR DELETE
    TO authenticated
    USING (user_has_organization_access(organization_id));

-- Similar policies for all other tables (following the same pattern)
-- ... (repeat for each table)

-- ========================================
-- FUNCTIONS AND TRIGGERS
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_nutrition_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers to all tables with updated_at
CREATE TRIGGER update_nutrition_profiles_updated_at
    BEFORE UPDATE ON nutrition_profiles
    FOR EACH ROW EXECUTE FUNCTION update_nutrition_updated_at();

CREATE TRIGGER update_nutrition_meal_plans_updated_at
    BEFORE UPDATE ON nutrition_meal_plans
    FOR EACH ROW EXECUTE FUNCTION update_nutrition_updated_at();

CREATE TRIGGER update_nutrition_meals_updated_at
    BEFORE UPDATE ON nutrition_meals
    FOR EACH ROW EXECUTE FUNCTION update_nutrition_updated_at();

CREATE TRIGGER update_nutrition_shopping_lists_updated_at
    BEFORE UPDATE ON nutrition_shopping_lists
    FOR EACH ROW EXECUTE FUNCTION update_nutrition_updated_at();

CREATE TRIGGER update_nutrition_chat_sessions_updated_at
    BEFORE UPDATE ON nutrition_chat_sessions
    FOR EACH ROW EXECUTE FUNCTION update_nutrition_updated_at();

CREATE TRIGGER update_nutrition_body_metrics_updated_at
    BEFORE UPDATE ON nutrition_body_metrics
    FOR EACH ROW EXECUTE FUNCTION update_nutrition_updated_at();

CREATE TRIGGER update_nutrition_training_sessions_updated_at
    BEFORE UPDATE ON nutrition_training_sessions
    FOR EACH ROW EXECUTE FUNCTION update_nutrition_updated_at();

-- Function to calculate macros based on profile
CREATE OR REPLACE FUNCTION calculate_nutrition_macros(profile_id UUID)
RETURNS TABLE (
    calories INTEGER,
    protein DECIMAL(5,2),
    carbs DECIMAL(5,2),
    fat DECIMAL(5,2),
    fiber DECIMAL(5,2)
) AS $$
DECLARE
    profile_record RECORD;
    bmr_calc DECIMAL;
    tdee_calc DECIMAL;
    activity_multiplier DECIMAL;
BEGIN
    -- Get profile data
    SELECT * INTO profile_record FROM nutrition_profiles WHERE id = profile_id;
    
    -- Calculate BMR using Mifflin-St Jeor equation
    IF profile_record.sex = 'MALE' THEN
        bmr_calc := (10 * profile_record.current_weight) + (6.25 * profile_record.height) - (5 * profile_record.age) + 5;
    ELSE
        bmr_calc := (10 * profile_record.current_weight) + (6.25 * profile_record.height) - (5 * profile_record.age) - 161;
    END IF;
    
    -- Determine activity multiplier
    activity_multiplier := CASE profile_record.activity_level
        WHEN 'SEDENTARY' THEN 1.2
        WHEN 'LIGHTLY_ACTIVE' THEN 1.375
        WHEN 'MODERATELY_ACTIVE' THEN 1.55
        WHEN 'VERY_ACTIVE' THEN 1.725
        WHEN 'EXTRA_ACTIVE' THEN 1.9
        ELSE 1.2
    END;
    
    -- Calculate TDEE
    tdee_calc := bmr_calc * activity_multiplier;
    
    -- Adjust for weight goals
    IF profile_record.goal_weight < profile_record.current_weight THEN
        -- Weight loss: create deficit
        calories := GREATEST(tdee_calc - 500, 1200)::INTEGER;
    ELSIF profile_record.goal_weight > profile_record.current_weight THEN
        -- Weight gain: create surplus
        calories := (tdee_calc + 300)::INTEGER;
    ELSE
        -- Maintenance
        calories := tdee_calc::INTEGER;
    END IF;
    
    -- Calculate macros (can be customized based on preferences)
    protein := profile_record.current_weight * 2.2; -- 2.2g per kg for active individuals
    fat := (calories * 0.25) / 9; -- 25% of calories from fat
    fiber := 30; -- Standard recommendation
    carbs := (calories - (protein * 4) - (fat * 9)) / 4; -- Remaining calories from carbs
    
    RETURN QUERY SELECT calories, protein, carbs, fat, fiber;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- INITIAL DATA AND PERMISSIONS
-- ========================================

-- Grant permissions to authenticated users
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ========================================
-- COMMENTS FOR DOCUMENTATION
-- ========================================

COMMENT ON TABLE nutrition_profiles IS 'Stores comprehensive nutrition profiles for gym members including biometrics, preferences, and calculated macro targets';
COMMENT ON TABLE nutrition_meal_plans IS 'Contains generated meal plans with duration, nutritional targets, and generation metadata';
COMMENT ON TABLE nutrition_meals IS 'Individual meals within meal plans including recipes, nutritional content, and timing';
COMMENT ON TABLE nutrition_ingredients IS 'Detailed ingredient breakdown for each meal for shopping list generation';
COMMENT ON TABLE nutrition_shopping_lists IS 'Generated shopping lists from meal plans with purchase tracking';
COMMENT ON TABLE nutrition_chat_sessions IS 'AI chat session history for nutrition consultations and profile creation';
COMMENT ON TABLE nutrition_body_metrics IS 'Body composition tracking including InBody scan integration';
COMMENT ON TABLE nutrition_training_sessions IS 'Links actual training sessions to nutrition planning for better calorie/macro adjustments';