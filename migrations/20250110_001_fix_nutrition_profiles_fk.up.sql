-- ATLAS FITNESS ONBOARDING - NUTRITION PROFILES FOREIGN KEY FIX
-- Migration: 20250110_001_fix_nutrition_profiles_fk.up.sql
-- Purpose: Fix foreign key constraint violations in nutrition_profiles table
-- Author: DB Migrator
-- Date: 2025-01-10

-- Step 1: Create backup table with timestamp
CREATE TEMP TABLE IF NOT EXISTS nutrition_profiles_backup_20250110 AS 
SELECT * FROM nutrition_profiles WHERE 1=0; -- Create empty backup table first

-- Only backup if table exists and has data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nutrition_profiles') THEN
        INSERT INTO nutrition_profiles_backup_20250110 SELECT * FROM nutrition_profiles;
        RAISE NOTICE 'Backed up % rows from nutrition_profiles', (SELECT COUNT(*) FROM nutrition_profiles_backup_20250110);
    END IF;
END
$$;

-- Step 2: Check current schema and adapt accordingly
DO $$
DECLARE
    has_lead_id boolean := false;
    has_client_id boolean := false;
BEGIN
    -- Check if lead_id column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'nutrition_profiles' AND column_name = 'lead_id'
    ) INTO has_lead_id;
    
    -- Check if client_id column exists  
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'nutrition_profiles' AND column_name = 'client_id'
    ) INTO has_client_id;
    
    RAISE NOTICE 'Current schema - lead_id exists: %, client_id exists: %', has_lead_id, has_client_id;
END
$$;

-- Step 3: Drop existing nutrition_profiles table if it exists (cascade to remove dependent objects)
DROP TABLE IF EXISTS nutrition_profiles CASCADE;

-- Step 4: Create the corrected nutrition_profiles table with proper foreign key relationships
-- This version supports both client_id and lead_id relationships for maximum compatibility
CREATE TABLE nutrition_profiles (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign key relationships - both client_id and lead_id for flexibility
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Basic demographics (UPPERCASE enums for database consistency)
    age INTEGER NOT NULL CHECK (age > 0 AND age <= 150),
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
    
    -- Physical measurements
    height_cm INTEGER CHECK (height_cm > 0 AND height_cm <= 300),
    height INTEGER CHECK (height > 0 AND height <= 300), -- Alternative column name support
    weight_kg DECIMAL(5,2) CHECK (weight_kg > 0 AND weight_kg <= 500),
    current_weight DECIMAL(5,2) CHECK (current_weight > 0 AND current_weight <= 500), -- Alternative column name
    target_weight_kg DECIMAL(5,2) CHECK (target_weight_kg > 0 AND target_weight_kg <= 500),
    goal_weight DECIMAL(5,2) CHECK (goal_weight > 0 AND goal_weight <= 500), -- Alternative column name
    weekly_weight_change_kg DECIMAL(3,2) DEFAULT 0.5,
    
    -- Goals and activity (UPPERCASE enums)
    goal VARCHAR(20) NOT NULL DEFAULT 'MAINTAIN' CHECK (goal IN ('LOSE_WEIGHT', 'MAINTAIN', 'GAIN_MUSCLE', 'IMPROVE_HEALTH')),
    activity_level VARCHAR(20) NOT NULL DEFAULT 'MODERATELY_ACTIVE' 
        CHECK (activity_level IN ('SEDENTARY', 'LIGHTLY_ACTIVE', 'MODERATELY_ACTIVE', 'VERY_ACTIVE', 'EXTRA_ACTIVE')),
    sex VARCHAR(10) CHECK (sex IN ('MALE', 'FEMALE', 'OTHER')), -- Alternative to gender column
    
    -- Calculated nutrition values (integers for calories, decimals for grams)
    bmr INTEGER CHECK (bmr > 0),
    tdee INTEGER CHECK (tdee > 0), 
    target_calories INTEGER CHECK (target_calories > 0),
    
    -- Macro targets - support both naming conventions
    protein_grams INTEGER CHECK (protein_grams >= 0),
    target_protein INTEGER CHECK (target_protein >= 0),
    carbs_grams INTEGER CHECK (carbs_grams >= 0), 
    target_carbs INTEGER CHECK (target_carbs >= 0),
    fat_grams INTEGER CHECK (fat_grams >= 0),
    target_fat INTEGER CHECK (target_fat >= 0),
    fiber_grams INTEGER DEFAULT 25 CHECK (fiber_grams >= 0),
    target_fiber INTEGER DEFAULT 25 CHECK (target_fiber >= 0),
    
    -- Training and lifestyle preferences
    training_frequency INTEGER DEFAULT 0 CHECK (training_frequency >= 0 AND training_frequency <= 7),
    training_types TEXT[] DEFAULT '{}',
    
    -- Dietary preferences and restrictions
    dietary_preferences TEXT[] DEFAULT '{}',
    dietary_type VARCHAR(50), -- Single dietary type like vegetarian, vegan, etc.
    allergies TEXT[] DEFAULT '{}',
    food_likes TEXT[] DEFAULT '{}',
    food_dislikes TEXT[] DEFAULT '{}',
    cultural_restrictions TEXT[] DEFAULT '{}',
    
    -- Lifestyle preferences (UPPERCASE enums)
    cooking_time VARCHAR(20) DEFAULT 'MODERATE' CHECK (cooking_time IN ('MINIMAL', 'MODERATE', 'EXTENSIVE')),
    budget_constraint VARCHAR(10) DEFAULT 'MODERATE' CHECK (budget_constraint IN ('LOW', 'MODERATE', 'HIGH')),
    
    -- Meal planning
    meals_per_day INTEGER DEFAULT 3 CHECK (meals_per_day BETWEEN 1 AND 6),
    snacks_per_day INTEGER DEFAULT 2 CHECK (snacks_per_day BETWEEN 0 AND 4),
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(), 
    updated_by UUID REFERENCES auth.users(id),
    
    -- Data integrity constraints
    CONSTRAINT nutrition_profiles_person_ref_check CHECK (
        (client_id IS NOT NULL AND lead_id IS NULL) OR 
        (client_id IS NULL AND lead_id IS NOT NULL)
    ),
    -- Ensure one profile per person per organization
    CONSTRAINT nutrition_profiles_unique_client_org UNIQUE(client_id, organization_id),
    CONSTRAINT nutrition_profiles_unique_lead_org UNIQUE(lead_id, organization_id)
);

-- Step 5: Create performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nutrition_profiles_client_id 
    ON nutrition_profiles(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nutrition_profiles_lead_id 
    ON nutrition_profiles(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nutrition_profiles_organization_id 
    ON nutrition_profiles(organization_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nutrition_profiles_created_at 
    ON nutrition_profiles(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nutrition_profiles_goal_activity 
    ON nutrition_profiles(goal, activity_level);

-- Step 6: Enable Row Level Security
ALTER TABLE nutrition_profiles ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS Policies for data security
-- Policy for clients to view their own nutrition profiles
CREATE POLICY "Clients can view own nutrition profile" ON nutrition_profiles
    FOR SELECT USING (
        client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()) OR
        lead_id IN (SELECT id FROM leads WHERE user_id = auth.uid())
    );

-- Policy for staff to manage nutrition profiles in their organization
CREATE POLICY "Staff can manage nutrition profiles" ON nutrition_profiles
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_staff 
            WHERE user_id = auth.uid() AND is_active = true
        ) OR
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Step 8: Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON nutrition_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON nutrition_profiles TO anon;

-- Step 9: Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger
DROP TRIGGER IF EXISTS update_nutrition_profiles_updated_at ON nutrition_profiles;
CREATE TRIGGER update_nutrition_profiles_updated_at 
    BEFORE UPDATE ON nutrition_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 10: Attempt to restore backed up data with schema adaptation
DO $$
DECLARE
    backup_count integer;
BEGIN
    SELECT COUNT(*) FROM nutrition_profiles_backup_20250110 INTO backup_count;
    
    IF backup_count > 0 THEN
        RAISE NOTICE 'Attempting to restore % rows from backup', backup_count;
        
        -- Insert with dynamic column mapping to handle different schemas
        INSERT INTO nutrition_profiles (
            client_id, lead_id, organization_id, age, gender, 
            height_cm, weight_kg, goal, activity_level,
            bmr, tdee, target_calories, protein_grams, carbs_grams, fat_grams,
            dietary_preferences, allergies, food_likes, food_dislikes,
            cooking_time, budget_constraint, meals_per_day, snacks_per_day,
            created_at, updated_at
        )
        SELECT 
            COALESCE(client_id, NULL),
            COALESCE(lead_id, NULL), 
            organization_id,
            age,
            UPPER(COALESCE(gender, sex, 'OTHER')),
            COALESCE(height_cm, height, 170),
            COALESCE(weight_kg, current_weight, 70),
            UPPER(COALESCE(goal, 'MAINTAIN')),
            UPPER(COALESCE(activity_level, 'MODERATELY_ACTIVE')),
            bmr, tdee, target_calories,
            COALESCE(protein_grams, target_protein, 100),
            COALESCE(carbs_grams, target_carbs, 200), 
            COALESCE(fat_grams, target_fat, 65),
            COALESCE(dietary_preferences, ARRAY[]::text[]),
            COALESCE(allergies, ARRAY[]::text[]),
            COALESCE(food_likes, ARRAY[]::text[]),
            COALESCE(food_dislikes, ARRAY[]::text[]),
            UPPER(COALESCE(cooking_time, 'MODERATE')),
            UPPER(COALESCE(budget_constraint, 'MODERATE')),
            COALESCE(meals_per_day, 3),
            COALESCE(snacks_per_day, 2),
            COALESCE(created_at, NOW()),
            COALESCE(updated_at, NOW())
        FROM nutrition_profiles_backup_20250110
        WHERE (client_id IS NOT NULL OR lead_id IS NOT NULL)
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Restored data from backup successfully';
    ELSE
        RAISE NOTICE 'No backup data to restore';
    END IF;
END
$$;

-- Step 11: Add helpful comments for documentation
COMMENT ON TABLE nutrition_profiles IS 'Unified nutrition profiles table supporting both client_id and lead_id foreign keys - Fixed FK constraints';
COMMENT ON COLUMN nutrition_profiles.client_id IS 'References clients.id - for authenticated users';
COMMENT ON COLUMN nutrition_profiles.lead_id IS 'References leads.id - for lead-based profiles'; 
COMMENT ON COLUMN nutrition_profiles.gender IS 'UPPERCASE enums for consistency: MALE, FEMALE, OTHER';
COMMENT ON COLUMN nutrition_profiles.activity_level IS 'UPPERCASE enums: SEDENTARY, LIGHTLY_ACTIVE, MODERATELY_ACTIVE, VERY_ACTIVE, EXTRA_ACTIVE';
COMMENT ON CONSTRAINT nutrition_profiles_person_ref_check ON nutrition_profiles IS 'Ensures exactly one of client_id or lead_id is set, not both';

-- Step 12: Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Migration 20250110_001_fix_nutrition_profiles_fk completed successfully';
    RAISE NOTICE 'Created nutrition_profiles table with dual FK support (client_id and lead_id)';
    RAISE NOTICE 'Added performance indexes and RLS policies';
    RAISE NOTICE 'Table ready for both client and lead-based nutrition profiles';
END
$$;