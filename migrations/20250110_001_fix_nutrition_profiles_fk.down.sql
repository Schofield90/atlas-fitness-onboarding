-- ATLAS FITNESS ONBOARDING - NUTRITION PROFILES FOREIGN KEY FIX ROLLBACK
-- Migration: 20250110_001_fix_nutrition_profiles_fk.down.sql
-- Purpose: Rollback the nutrition_profiles foreign key fix migration
-- Author: DB Migrator
-- Date: 2025-01-10

-- Step 1: Create backup of current data before rollback
CREATE TEMP TABLE IF NOT EXISTS nutrition_profiles_rollback_backup AS 
SELECT * FROM nutrition_profiles;

DO $$
DECLARE
    backup_count integer;
BEGIN
    SELECT COUNT(*) FROM nutrition_profiles_rollback_backup INTO backup_count;
    RAISE NOTICE 'Created rollback backup with % rows', backup_count;
END
$$;

-- Step 2: Drop the current nutrition_profiles table and all dependent objects
DROP TABLE IF EXISTS nutrition_profiles CASCADE;

-- Step 3: Restore the original table structure (based on fix-nutrition-schema.sql)
-- This recreates the original schema that was in use before the migration
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
  bmr INTEGER,
  tdee INTEGER,
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

-- Step 4: Recreate the original indexes
CREATE INDEX IF NOT EXISTS idx_nutrition_profiles_client ON nutrition_profiles(client_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_profiles_organization ON nutrition_profiles(organization_id);

-- Step 5: Enable Row Level Security (restore original RLS)
ALTER TABLE nutrition_profiles ENABLE ROW LEVEL SECURITY;

-- Step 6: Recreate original RLS Policies
CREATE POLICY "Clients can view own nutrition profile" ON nutrition_profiles
  FOR ALL USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

CREATE POLICY "Staff can manage client nutrition profiles" ON nutrition_profiles
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_staff 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Step 7: Grant original permissions
GRANT ALL ON nutrition_profiles TO authenticated;

-- Step 8: Recreate updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_nutrition_profiles_updated_at 
  BEFORE UPDATE ON nutrition_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 9: Attempt to restore data from rollback backup
DO $$
DECLARE
    backup_count integer;
    restored_count integer := 0;
BEGIN
    SELECT COUNT(*) FROM nutrition_profiles_rollback_backup INTO backup_count;
    
    IF backup_count > 0 THEN
        RAISE NOTICE 'Attempting to restore % rows from rollback backup', backup_count;
        
        -- Restore data, filtering to only include records that match the original schema
        INSERT INTO nutrition_profiles (
            client_id, organization_id, age, gender, height_cm, weight_kg,
            goal, target_weight_kg, weekly_weight_change_kg, activity_level,
            bmr, tdee, target_calories, protein_grams, carbs_grams, fat_grams, fiber_grams,
            training_frequency, training_types, dietary_preferences, allergies,
            food_likes, food_dislikes, cooking_time, budget_constraint,
            meals_per_day, snacks_per_day, created_at, updated_at, updated_by
        )
        SELECT 
            client_id,
            organization_id,
            age,
            gender,
            height_cm,
            weight_kg,
            goal,
            target_weight_kg,
            weekly_weight_change_kg,
            activity_level,
            bmr,
            tdee,
            target_calories,
            protein_grams,
            carbs_grams,
            fat_grams,
            COALESCE(fiber_grams, 25),
            COALESCE(training_frequency, 0),
            COALESCE(training_types, ARRAY[]::text[]),
            COALESCE(dietary_preferences, ARRAY[]::text[]),
            COALESCE(allergies, ARRAY[]::text[]),
            COALESCE(food_likes, ARRAY[]::text[]),
            COALESCE(food_dislikes, ARRAY[]::text[]),
            cooking_time,
            budget_constraint,
            COALESCE(meals_per_day, 3),
            COALESCE(snacks_per_day, 2),
            created_at,
            updated_at,
            updated_by
        FROM nutrition_profiles_rollback_backup
        WHERE client_id IS NOT NULL -- Only restore client_id based records for original schema
        ON CONFLICT (client_id, organization_id) DO UPDATE SET
            age = EXCLUDED.age,
            gender = EXCLUDED.gender,
            height_cm = EXCLUDED.height_cm,
            weight_kg = EXCLUDED.weight_kg,
            goal = EXCLUDED.goal,
            updated_at = NOW();
        
        GET DIAGNOSTICS restored_count = ROW_COUNT;
        RAISE NOTICE 'Successfully restored % rows to original schema', restored_count;
        
        -- Log any records that couldn't be restored (those with lead_id instead of client_id)
        DECLARE
            orphaned_count integer;
        BEGIN
            SELECT COUNT(*) FROM nutrition_profiles_rollback_backup 
            WHERE client_id IS NULL AND lead_id IS NOT NULL INTO orphaned_count;
            
            IF orphaned_count > 0 THEN
                RAISE WARNING 'Could not restore % lead_id-based records to client_id-only schema', orphaned_count;
                RAISE WARNING 'Manual data migration may be required for these records';
            END IF;
        END;
        
    ELSE
        RAISE NOTICE 'No rollback backup data to restore';
    END IF;
END
$$;

-- Step 10: Add documentation comments
COMMENT ON TABLE nutrition_profiles IS 'Original nutrition profiles table - rolled back from FK fix migration';
COMMENT ON COLUMN nutrition_profiles.client_id IS 'References clients.id - original schema (no lead_id support)';

-- Step 11: Log rollback completion
DO $$
BEGIN
    RAISE NOTICE 'Rollback migration 20250110_001_fix_nutrition_profiles_fk completed';
    RAISE NOTICE 'Restored original nutrition_profiles table schema with client_id FK only';
    RAISE NOTICE 'WARNING: Any lead_id-based profiles may have been lost in rollback';
    RAISE NOTICE 'Consider running data recovery if lead_id profiles are needed';
END
$$;