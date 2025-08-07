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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_nutrition_profiles_org (organization_id),
    INDEX idx_nutrition_profiles_lead (lead_id)
);

-- ========================================
-- NUTRITION MEAL PLANS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.nutrition_meal_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.nutrition_profiles(id) ON DELETE CASCADE,
    
    -- Plan details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    weeks INTEGER NOT NULL DEFAULT 4 CHECK (weeks > 0 AND weeks <= 12),
    days_total INTEGER NOT NULL DEFAULT 28 CHECK (days_total > 0),
    
    -- Nutritional targets
    target_calories INTEGER NOT NULL CHECK (target_calories > 0),
    target_protein DECIMAL(5,2) NOT NULL CHECK (target_protein > 0),
    target_carbs DECIMAL(5,2) NOT NULL CHECK (target_carbs > 0),
    target_fat DECIMAL(5,2) NOT NULL CHECK (target_fat > 0),
    target_fiber DECIMAL(5,2) NOT NULL CHECK (target_fiber > 0),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    start_date DATE,
    end_date DATE,
    
    -- AI generation metadata
    ai_generated BOOLEAN DEFAULT false,
    ai_generation_params JSONB DEFAULT '{}', -- Parameters used for AI generation
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_nutrition_meal_plans_org (organization_id),
    INDEX idx_nutrition_meal_plans_profile (profile_id),
    INDEX idx_nutrition_meal_plans_active (is_active),
    INDEX idx_nutrition_meal_plans_dates (start_date, end_date)
);

-- ========================================
-- NUTRITION MEALS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.nutrition_meals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    meal_plan_id UUID NOT NULL REFERENCES public.nutrition_meal_plans(id) ON DELETE CASCADE,
    
    -- Meal scheduling
    day_number INTEGER NOT NULL CHECK (day_number > 0),
    meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'PRE_WORKOUT', 'POST_WORKOUT')),
    meal_order INTEGER NOT NULL DEFAULT 1, -- For multiple snacks or meals of same type
    
    -- Meal details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    recipe TEXT NOT NULL, -- Full recipe instructions
    prep_minutes INTEGER NOT NULL CHECK (prep_minutes >= 0),
    cook_minutes INTEGER CHECK (cook_minutes >= 0),
    servings INTEGER DEFAULT 1 CHECK (servings > 0),
    
    -- Nutritional content (per serving)
    calories INTEGER NOT NULL CHECK (calories >= 0),
    protein DECIMAL(5,2) NOT NULL CHECK (protein >= 0),
    carbs DECIMAL(5,2) NOT NULL CHECK (carbs >= 0),
    fat DECIMAL(5,2) NOT NULL CHECK (fat >= 0),
    fiber DECIMAL(5,2) NOT NULL CHECK (fiber >= 0),
    sugar DECIMAL(5,2) CHECK (sugar >= 0),
    sodium DECIMAL(7,2) CHECK (sodium >= 0), -- mg
    
    -- Additional metadata
    difficulty_level VARCHAR(20) DEFAULT 'MEDIUM' CHECK (difficulty_level IN ('EASY', 'MEDIUM', 'HARD')),
    cuisine_type VARCHAR(50),
    meal_tags JSONB DEFAULT '[]', -- ["high-protein", "low-carb", "vegetarian", etc.]
    
    -- User interaction
    is_favorite BOOLEAN DEFAULT false,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_nutrition_meals_org (organization_id),
    INDEX idx_nutrition_meals_plan (meal_plan_id),
    INDEX idx_nutrition_meals_day_type (day_number, meal_type),
    CONSTRAINT idx_nutrition_meals_unique_plan_day_type_order UNIQUE (meal_plan_id, day_number, meal_type, meal_order)
);

-- ========================================
-- NUTRITION INGREDIENTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.nutrition_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    meal_id UUID NOT NULL REFERENCES public.nutrition_meals(id) ON DELETE CASCADE,
    
    -- Ingredient details
    name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,3) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(50) NOT NULL, -- "grams", "ml", "cups", "tbsp", etc.
    grams DECIMAL(10,3) NOT NULL CHECK (grams > 0), -- Always store weight in grams for calculations
    
    -- Nutritional content (for the specified quantity)
    calories INTEGER NOT NULL CHECK (calories >= 0),
    protein DECIMAL(5,2) NOT NULL CHECK (protein >= 0),
    carbs DECIMAL(5,2) NOT NULL CHECK (carbs >= 0),
    fat DECIMAL(5,2) NOT NULL CHECK (fat >= 0),
    fiber DECIMAL(5,2) CHECK (fiber >= 0),
    sugar DECIMAL(5,2) CHECK (sugar >= 0),
    sodium DECIMAL(7,2) CHECK (sodium >= 0), -- mg
    
    -- Shopping and prep info
    food_category VARCHAR(50), -- "produce", "dairy", "protein", "grains", etc.
    is_optional BOOLEAN DEFAULT false,
    prep_notes VARCHAR(255), -- "diced", "cooked", "drained", etc.
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_nutrition_ingredients_org (organization_id),
    INDEX idx_nutrition_ingredients_meal (meal_id),
    INDEX idx_nutrition_ingredients_category (food_category)
);

-- ========================================
-- NUTRITION SHOPPING LIST ITEMS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.nutrition_shopping_list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.nutrition_profiles(id) ON DELETE CASCADE,
    meal_plan_id UUID REFERENCES public.nutrition_meal_plans(id) ON DELETE CASCADE,
    meal_id UUID REFERENCES public.nutrition_meals(id) ON DELETE CASCADE,
    
    -- Item details
    ingredient_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,3) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(50) NOT NULL,
    category VARCHAR(50), -- "produce", "dairy", "protein", etc.
    
    -- Shopping metadata
    week_number INTEGER NOT NULL CHECK (week_number > 0),
    is_purchased BOOLEAN DEFAULT false,
    purchased_at TIMESTAMP WITH TIME ZONE,
    
    -- Cost tracking
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    
    -- Notes
    notes TEXT,
    brand_preference VARCHAR(100),
    store_location VARCHAR(100),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_nutrition_shopping_list_org (organization_id),
    INDEX idx_nutrition_shopping_list_profile (profile_id),
    INDEX idx_nutrition_shopping_list_plan (meal_plan_id),
    INDEX idx_nutrition_shopping_list_week (week_number),
    INDEX idx_nutrition_shopping_list_purchased (is_purchased),
    INDEX idx_nutrition_shopping_list_category (category)
);

-- ========================================
-- NUTRITION CHAT SESSIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.nutrition_chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.nutrition_profiles(id) ON DELETE CASCADE,
    
    -- Session details
    session_type VARCHAR(50) NOT NULL DEFAULT 'GENERAL' CHECK (session_type IN ('ONBOARDING', 'MEAL_PLANNING', 'PROGRESS_CHECK', 'GENERAL')),
    is_complete BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Chat content
    messages JSONB NOT NULL DEFAULT '[]', -- Array of message objects with role, content, timestamp
    /* Example messages structure:
    [
        {
            "role": "assistant",
            "content": "Welcome! Let's create your personalized nutrition plan.",
            "timestamp": "2025-01-01T10:00:00Z"
        },
        {
            "role": "user",
            "content": "I want to lose weight and build muscle.",
            "timestamp": "2025-01-01T10:01:00Z"
        }
    ]
    */
    
    -- Session metadata
    context JSONB DEFAULT '{}', -- Additional context for the session
    ai_model VARCHAR(50), -- Model used for generation
    total_tokens_used INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_nutrition_chat_sessions_org (organization_id),
    INDEX idx_nutrition_chat_sessions_profile (profile_id),
    INDEX idx_nutrition_chat_sessions_type (session_type),
    INDEX idx_nutrition_chat_sessions_complete (is_complete),
    INDEX idx_nutrition_chat_sessions_last_message (last_message_at DESC)
);

-- ========================================
-- NUTRITION BODY METRICS TABLE (InBody Integration)
-- ========================================
CREATE TABLE IF NOT EXISTS public.nutrition_body_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.nutrition_profiles(id) ON DELETE CASCADE,
    
    -- Measurement metadata
    measurement_date DATE NOT NULL,
    measurement_time TIME,
    device_type VARCHAR(50) DEFAULT 'INBODY', -- INBODY, TANITA, MANUAL, etc.
    device_id VARCHAR(100),
    
    -- Basic measurements
    weight DECIMAL(5,2) NOT NULL CHECK (weight > 0), -- kg
    height DECIMAL(5,2) CHECK (height > 0), -- cm
    bmi DECIMAL(4,2) CHECK (bmi > 0),
    
    -- Body composition
    body_fat_percentage DECIMAL(4,2) CHECK (body_fat_percentage >= 0 AND body_fat_percentage <= 100),
    body_fat_mass DECIMAL(5,2) CHECK (body_fat_mass >= 0), -- kg
    lean_body_mass DECIMAL(5,2) CHECK (lean_body_mass >= 0), -- kg
    skeletal_muscle_mass DECIMAL(5,2) CHECK (skeletal_muscle_mass >= 0), -- kg
    
    -- Water and bone
    total_body_water DECIMAL(5,2) CHECK (total_body_water >= 0), -- liters
    intracellular_water DECIMAL(5,2) CHECK (intracellular_water >= 0), -- liters
    extracellular_water DECIMAL(5,2) CHECK (extracellular_water >= 0), -- liters
    bone_mineral_content DECIMAL(4,2) CHECK (bone_mineral_content >= 0), -- kg
    
    -- Segmental analysis
    right_arm_muscle DECIMAL(4,2) CHECK (right_arm_muscle >= 0), -- kg
    left_arm_muscle DECIMAL(4,2) CHECK (left_arm_muscle >= 0), -- kg
    trunk_muscle DECIMAL(5,2) CHECK (trunk_muscle >= 0), -- kg
    right_leg_muscle DECIMAL(5,2) CHECK (right_leg_muscle >= 0), -- kg
    left_leg_muscle DECIMAL(5,2) CHECK (left_leg_muscle >= 0), -- kg
    
    -- Metabolic indicators
    basal_metabolic_rate INTEGER CHECK (basal_metabolic_rate > 0), -- kcal/day
    visceral_fat_level INTEGER CHECK (visceral_fat_level >= 1 AND visceral_fat_level <= 20),
    metabolic_age INTEGER CHECK (metabolic_age > 0),
    
    -- Additional metrics
    waist_hip_ratio DECIMAL(3,2) CHECK (waist_hip_ratio > 0),
    phase_angle DECIMAL(4,2), -- Cellular health indicator
    impedance_50khz DECIMAL(6,2), -- Ohms
    
    -- Raw data storage
    raw_data JSONB DEFAULT '{}', -- Store complete InBody output
    
    -- Notes and validation
    notes TEXT,
    is_validated BOOLEAN DEFAULT false,
    validated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    validated_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_nutrition_body_metrics_org (organization_id),
    INDEX idx_nutrition_body_metrics_profile (profile_id),
    INDEX idx_nutrition_body_metrics_date (measurement_date DESC),
    CONSTRAINT idx_nutrition_body_metrics_unique_profile_date UNIQUE (profile_id, measurement_date)
);

-- ========================================
-- NUTRITION TRAINING SESSIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.nutrition_training_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.nutrition_profiles(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL, -- Link to existing booking system
    class_session_id UUID REFERENCES public.class_sessions(id) ON DELETE SET NULL,
    
    -- Session details
    session_date DATE NOT NULL,
    session_time TIME,
    session_type VARCHAR(50) NOT NULL, -- "weightlifting", "cardio", "hiit", "yoga", etc.
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    
    -- Performance metrics
    calories_burned INTEGER CHECK (calories_burned >= 0),
    average_heart_rate INTEGER CHECK (average_heart_rate > 0 AND average_heart_rate < 250),
    max_heart_rate INTEGER CHECK (max_heart_rate > 0 AND max_heart_rate < 250),
    
    -- Training specifics
    exercises JSONB DEFAULT '[]', -- Array of exercise objects with sets, reps, weight
    /* Example exercises structure:
    [
        {
            "name": "Bench Press",
            "sets": 3,
            "reps": [10, 8, 6],
            "weight": [60, 65, 70],
            "unit": "kg",
            "rest_seconds": 90
        }
    ]
    */
    
    -- Subjective measures
    perceived_exertion INTEGER CHECK (perceived_exertion >= 1 AND perceived_exertion <= 10), -- RPE scale
    energy_level VARCHAR(20) CHECK (energy_level IN ('VERY_LOW', 'LOW', 'MODERATE', 'HIGH', 'VERY_HIGH')),
    
    -- Nutrition timing
    pre_workout_meal_id UUID REFERENCES public.nutrition_meals(id) ON DELETE SET NULL,
    post_workout_meal_id UUID REFERENCES public.nutrition_meals(id) ON DELETE SET NULL,
    hydration_ml INTEGER CHECK (hydration_ml >= 0),
    
    -- Notes
    notes TEXT,
    trainer_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_nutrition_training_sessions_org (organization_id),
    INDEX idx_nutrition_training_sessions_profile (profile_id),
    INDEX idx_nutrition_training_sessions_date (session_date DESC),
    INDEX idx_nutrition_training_sessions_booking (booking_id),
    INDEX idx_nutrition_training_sessions_class (class_session_id)
);

-- ========================================
-- HELPER FUNCTIONS
-- ========================================

-- Function to calculate BMR (Basal Metabolic Rate)
CREATE OR REPLACE FUNCTION calculate_bmr(
    p_weight DECIMAL,
    p_height DECIMAL,
    p_age INTEGER,
    p_sex VARCHAR
) RETURNS DECIMAL AS $$
BEGIN
    IF p_sex = 'MALE' THEN
        -- Mifflin-St Jeor Equation for men
        RETURN ROUND((10 * p_weight + 6.25 * p_height - 5 * p_age + 5)::DECIMAL, 2);
    ELSE
        -- Mifflin-St Jeor Equation for women
        RETURN ROUND((10 * p_weight + 6.25 * p_height - 5 * p_age - 161)::DECIMAL, 2);
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate TDEE (Total Daily Energy Expenditure)
CREATE OR REPLACE FUNCTION calculate_tdee(
    p_bmr DECIMAL,
    p_activity_level VARCHAR,
    p_training_frequency INTEGER
) RETURNS DECIMAL AS $$
DECLARE
    activity_multiplier DECIMAL;
BEGIN
    -- Base activity multipliers
    CASE p_activity_level
        WHEN 'SEDENTARY' THEN activity_multiplier := 1.2;
        WHEN 'LIGHTLY_ACTIVE' THEN activity_multiplier := 1.375;
        WHEN 'MODERATELY_ACTIVE' THEN activity_multiplier := 1.55;
        WHEN 'VERY_ACTIVE' THEN activity_multiplier := 1.725;
        WHEN 'EXTRA_ACTIVE' THEN activity_multiplier := 1.9;
        ELSE activity_multiplier := 1.2;
    END CASE;
    
    -- Adjust for training frequency
    activity_multiplier := activity_multiplier + (p_training_frequency * 0.025);
    
    RETURN ROUND((p_bmr * activity_multiplier)::DECIMAL, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ========================================
-- TRIGGERS
-- ========================================

-- Trigger to automatically calculate BMR and TDEE on profile insert/update
CREATE OR REPLACE FUNCTION update_nutrition_calculations()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate BMR
    NEW.bmr := calculate_bmr(NEW.current_weight, NEW.height, NEW.age, NEW.sex);
    
    -- Calculate TDEE
    NEW.tdee := calculate_tdee(NEW.bmr, NEW.activity_level, NEW.training_frequency);
    
    -- Set default macro targets if not provided
    IF NEW.target_calories IS NULL THEN
        -- Default to slight deficit for weight loss
        NEW.target_calories := ROUND(NEW.tdee * 0.85);
    END IF;
    
    IF NEW.target_protein IS NULL THEN
        -- 2g per kg body weight for active individuals
        NEW.target_protein := ROUND(NEW.current_weight * 2);
    END IF;
    
    IF NEW.target_fat IS NULL THEN
        -- 25% of calories from fat
        NEW.target_fat := ROUND((NEW.target_calories * 0.25) / 9);
    END IF;
    
    IF NEW.target_carbs IS NULL THEN
        -- Remaining calories from carbs
        NEW.target_carbs := ROUND((NEW.target_calories - (NEW.target_protein * 4) - (NEW.target_fat * 9)) / 4);
    END IF;
    
    IF NEW.target_fiber IS NULL THEN
        -- 14g per 1000 calories
        NEW.target_fiber := ROUND((NEW.target_calories / 1000.0) * 14);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_nutrition_profile_values
    BEFORE INSERT OR UPDATE ON public.nutrition_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_nutrition_calculations();

-- Trigger to update meal plan end date
CREATE OR REPLACE FUNCTION update_meal_plan_dates()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.start_date IS NOT NULL AND NEW.weeks IS NOT NULL THEN
        NEW.end_date := NEW.start_date + (NEW.weeks * 7 - 1) * INTERVAL '1 day';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_meal_plan_end_date
    BEFORE INSERT OR UPDATE ON public.nutrition_meal_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_meal_plan_dates();

-- Standard updated_at triggers for all tables
CREATE TRIGGER update_nutrition_profiles_updated_at
    BEFORE UPDATE ON public.nutrition_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nutrition_meal_plans_updated_at
    BEFORE UPDATE ON public.nutrition_meal_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nutrition_meals_updated_at
    BEFORE UPDATE ON public.nutrition_meals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nutrition_ingredients_updated_at
    BEFORE UPDATE ON public.nutrition_ingredients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nutrition_shopping_list_items_updated_at
    BEFORE UPDATE ON public.nutrition_shopping_list_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nutrition_chat_sessions_updated_at
    BEFORE UPDATE ON public.nutrition_chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nutrition_body_metrics_updated_at
    BEFORE UPDATE ON public.nutrition_body_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nutrition_training_sessions_updated_at
    BEFORE UPDATE ON public.nutrition_training_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS on all nutrition tables
ALTER TABLE public.nutrition_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_shopping_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_body_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_training_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for nutrition_profiles
CREATE POLICY "Users can view nutrition profiles in their organization" ON public.nutrition_profiles
    FOR SELECT USING (
        organization_id = auth.get_user_organization_id()
    );

CREATE POLICY "Users can create nutrition profiles in their organization" ON public.nutrition_profiles
    FOR INSERT WITH CHECK (
        organization_id = auth.get_user_organization_id()
    );

CREATE POLICY "Users can update nutrition profiles in their organization" ON public.nutrition_profiles
    FOR UPDATE USING (
        organization_id = auth.get_user_organization_id()
    );

CREATE POLICY "Users can delete nutrition profiles in their organization" ON public.nutrition_profiles
    FOR DELETE USING (
        organization_id = auth.get_user_organization_id()
    );

-- RLS Policies for nutrition_meal_plans
CREATE POLICY "Users can view meal plans in their organization" ON public.nutrition_meal_plans
    FOR SELECT USING (
        organization_id = auth.get_user_organization_id()
    );

CREATE POLICY "Users can create meal plans in their organization" ON public.nutrition_meal_plans
    FOR INSERT WITH CHECK (
        organization_id = auth.get_user_organization_id()
    );

CREATE POLICY "Users can update meal plans in their organization" ON public.nutrition_meal_plans
    FOR UPDATE USING (
        organization_id = auth.get_user_organization_id()
    );

CREATE POLICY "Users can delete meal plans in their organization" ON public.nutrition_meal_plans
    FOR DELETE USING (
        organization_id = auth.get_user_organization_id()
    );

-- RLS Policies for nutrition_meals
CREATE POLICY "Users can view meals in their organization" ON public.nutrition_meals
    FOR SELECT USING (
        organization_id = auth.get_user_organization_id()
    );

CREATE POLICY "Users can create meals in their organization" ON public.nutrition_meals
    FOR INSERT WITH CHECK (
        organization_id = auth.get_user_organization_id()
    );

CREATE POLICY "Users can update meals in their organization" ON public.nutrition_meals
    FOR UPDATE USING (
        organization_id = auth.get_user_organization_id()
    );

CREATE POLICY "Users can delete meals in their organization" ON public.nutrition_meals
    FOR DELETE USING (
        organization_id = auth.get_user_organization_id()
    );

-- RLS Policies for nutrition_ingredients
CREATE POLICY "Users can view ingredients in their organization" ON public.nutrition_ingredients
    FOR SELECT USING (
        organization_id = auth.get_user_organization_id()
    );

CREATE POLICY "Users can create ingredients in their organization" ON public.nutrition_ingredients
    FOR INSERT WITH CHECK (
        organization_id = auth.get_user_organization_id()
    );

CREATE POLICY "Users can update ingredients in their organization" ON public.nutrition_ingredients
    FOR UPDATE USING (
        organization_id = auth.get_user_organization_id()
    );

CREATE POLICY "Users can delete ingredients in their organization" ON public.nutrition_ingredients
    FOR DELETE USING (
        organization_id = auth.get_user_organization_id()
    );

-- RLS Policies for nutrition_shopping_list_items
CREATE POLICY "Users can view shopping list items in their organization" ON public.nutrition_shopping_list_items
    FOR SELECT USING (
        organization_id = auth.get_user_organization_id()
    );

CREATE POLICY "Users can create shopping list items in their organization" ON public.nutrition_shopping_list_items
    FOR INSERT WITH CHECK (
        organization_id = auth.get_user_organization_id()
    );

CREATE POLICY "Users can update shopping list items in their organization" ON public.nutrition_shopping_list_items
    FOR UPDATE USING (
        organization_id = auth.get_user_organization_id()
    );

CREATE POLICY "Users can delete shopping list items in their organization" ON public.nutrition_shopping_list_items
    FOR DELETE USING (
        organization_id = auth.get_user_organization_id()
    );

-- RLS Policies for nutrition_chat_sessions
CREATE POLICY "Users can view chat sessions in their organization" ON public.nutrition_chat_sessions
    FOR SELECT USING (
        organization_id = auth.get_user_organization_id()
    );

CREATE POLICY "Users can create chat sessions in their organization" ON public.nutrition_chat_sessions
    FOR INSERT WITH CHECK (
        organization_id = auth.get_user_organization_id()
    );

CREATE POLICY "Users can update chat sessions in their organization" ON public.nutrition_chat_sessions
    FOR UPDATE USING (
        organization_id = auth.get_user_organization_id()
    );

CREATE POLICY "Users can delete chat sessions in their organization" ON public.nutrition_chat_sessions
    FOR DELETE USING (
        organization_id = auth.get_user_organization_id()
    );

-- RLS Policies for nutrition_body_metrics
CREATE POLICY "Users can view body metrics in their organization" ON public.nutrition_body_metrics
    FOR SELECT USING (
        organization_id = auth.get_user_organization_id()
    );

CREATE POLICY "Users can create body metrics in their organization" ON public.nutrition_body_metrics
    FOR INSERT WITH CHECK (
        organization_id = auth.get_user_organization_id()
    );

CREATE POLICY "Users can update body metrics in their organization" ON public.nutrition_body_metrics
    FOR UPDATE USING (
        organization_id = auth.get_user_organization_id()
    );

CREATE POLICY "Users can delete body metrics in their organization" ON public.nutrition_body_metrics
    FOR DELETE USING (
        organization_id = auth.get_user_organization_id()
    );

-- RLS Policies for nutrition_training_sessions
CREATE POLICY "Users can view training sessions in their organization" ON public.nutrition_training_sessions
    FOR SELECT USING (
        organization_id = auth.get_user_organization_id()
    );

CREATE POLICY "Users can create training sessions in their organization" ON public.nutrition_training_sessions
    FOR INSERT WITH CHECK (
        organization_id = auth.get_user_organization_id()
    );

CREATE POLICY "Users can update training sessions in their organization" ON public.nutrition_training_sessions
    FOR UPDATE USING (
        organization_id = auth.get_user_organization_id()
    );

CREATE POLICY "Users can delete training sessions in their organization" ON public.nutrition_training_sessions
    FOR DELETE USING (
        organization_id = auth.get_user_organization_id()
    );

-- ========================================
-- VIEWS FOR EASIER QUERYING
-- ========================================

-- View for nutrition profiles with lead information
CREATE OR REPLACE VIEW nutrition_profiles_with_leads AS
SELECT 
    np.*,
    l.name as lead_name,
    l.email as lead_email,
    l.phone as lead_phone,
    l.status as lead_status,
    l.assigned_to as lead_assigned_to
FROM nutrition_profiles np
JOIN leads l ON np.lead_id = l.id;

-- View for meal plans with profile information
CREATE OR REPLACE VIEW nutrition_meal_plans_with_profiles AS
SELECT 
    mp.*,
    np.lead_id,
    np.current_weight,
    np.goal_weight,
    np.activity_level,
    np.dietary_preferences,
    np.allergies
FROM nutrition_meal_plans mp
JOIN nutrition_profiles np ON mp.profile_id = np.id;

-- View for meals with full nutritional summary
CREATE OR REPLACE VIEW nutrition_meals_with_totals AS
SELECT 
    m.*,
    mp.name as meal_plan_name,
    mp.target_calories as plan_target_calories,
    mp.target_protein as plan_target_protein,
    mp.target_carbs as plan_target_carbs,
    mp.target_fat as plan_target_fat,
    COALESCE(SUM(i.calories), 0) as ingredients_total_calories,
    COALESCE(SUM(i.protein), 0) as ingredients_total_protein,
    COALESCE(SUM(i.carbs), 0) as ingredients_total_carbs,
    COALESCE(SUM(i.fat), 0) as ingredients_total_fat,
    COALESCE(SUM(i.fiber), 0) as ingredients_total_fiber
FROM nutrition_meals m
JOIN nutrition_meal_plans mp ON m.meal_plan_id = mp.id
LEFT JOIN nutrition_ingredients i ON m.id = i.meal_id
GROUP BY m.id, mp.id, mp.name, mp.target_calories, mp.target_protein, mp.target_carbs, mp.target_fat;

-- View for body metrics progress
CREATE OR REPLACE VIEW nutrition_body_metrics_progress AS
SELECT 
    bm.*,
    np.goal_weight,
    np.current_weight as profile_current_weight,
    LAG(bm.weight, 1) OVER (PARTITION BY bm.profile_id ORDER BY bm.measurement_date) as previous_weight,
    LAG(bm.body_fat_percentage, 1) OVER (PARTITION BY bm.profile_id ORDER BY bm.measurement_date) as previous_body_fat,
    LAG(bm.skeletal_muscle_mass, 1) OVER (PARTITION BY bm.profile_id ORDER BY bm.measurement_date) as previous_muscle_mass,
    bm.weight - LAG(bm.weight, 1) OVER (PARTITION BY bm.profile_id ORDER BY bm.measurement_date) as weight_change,
    bm.body_fat_percentage - LAG(bm.body_fat_percentage, 1) OVER (PARTITION BY bm.profile_id ORDER BY bm.measurement_date) as body_fat_change,
    bm.skeletal_muscle_mass - LAG(bm.skeletal_muscle_mass, 1) OVER (PARTITION BY bm.profile_id ORDER BY bm.measurement_date) as muscle_mass_change
FROM nutrition_body_metrics bm
JOIN nutrition_profiles np ON bm.profile_id = np.id;

-- Grant access to views
GRANT SELECT ON nutrition_profiles_with_leads TO authenticated;
GRANT SELECT ON nutrition_meal_plans_with_profiles TO authenticated;
GRANT SELECT ON nutrition_meals_with_totals TO authenticated;
GRANT SELECT ON nutrition_body_metrics_progress TO authenticated;

-- ========================================
-- COMMENTS FOR DOCUMENTATION
-- ========================================

COMMENT ON TABLE public.nutrition_profiles IS 'Stores nutritional profiles for leads/customers, including biometric data, preferences, and calculated nutritional targets';
COMMENT ON TABLE public.nutrition_meal_plans IS 'Contains meal plan definitions with nutritional targets and duration';
COMMENT ON TABLE public.nutrition_meals IS 'Individual meals within meal plans, including recipes and nutritional content';
COMMENT ON TABLE public.nutrition_ingredients IS 'Ingredients for each meal with quantities and nutritional information';
COMMENT ON TABLE public.nutrition_shopping_list_items IS 'Shopping list items generated from meal plans, organized by week';
COMMENT ON TABLE public.nutrition_chat_sessions IS 'AI chat sessions for nutrition coaching and meal planning';
COMMENT ON TABLE public.nutrition_body_metrics IS 'Body composition measurements from InBody scans or manual entry';
COMMENT ON TABLE public.nutrition_training_sessions IS 'Training session logs linked to nutrition plans and existing bookings';

COMMENT ON COLUMN public.nutrition_profiles.bmr IS 'Basal Metabolic Rate calculated using Mifflin-St Jeor equation';
COMMENT ON COLUMN public.nutrition_profiles.tdee IS 'Total Daily Energy Expenditure based on BMR and activity level';
COMMENT ON COLUMN public.nutrition_body_metrics.phase_angle IS 'Cellular health indicator from bioelectrical impedance analysis';
COMMENT ON COLUMN public.nutrition_body_metrics.visceral_fat_level IS 'InBody visceral fat rating from 1-20, where <10 is healthy';

-- ========================================
-- PERFORMANCE INDEXES SUMMARY
-- ========================================
-- All tables have indexes on:
-- - organization_id for multi-tenant queries
-- - Foreign key relationships
-- - Common query patterns (dates, status fields, etc.)
-- - Unique constraints where appropriate

-- Migration complete!