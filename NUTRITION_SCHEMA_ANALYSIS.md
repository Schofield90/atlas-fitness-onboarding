# Nutrition System Database Schema Analysis

## Problem Summary

The error "Could not find the 'client_id' column of 'nutrition_profiles' in the schema cache" persists despite code changes. This analysis identifies the root causes and provides a complete fix.

## Root Cause Analysis

### 1. Multiple Conflicting Schema Definitions

There are **THREE DIFFERENT** nutrition_profiles table schemas in the codebase:

#### Schema 1: Original (20250807_nutrition_system.sql)

```sql
CREATE TABLE IF NOT EXISTS public.nutrition_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,  -- ❌ Uses user_id
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  age INTEGER NOT NULL CHECK (age > 0 AND age < 150),
  sex VARCHAR(10) NOT NULL CHECK (sex IN ('MALE', 'FEMALE')),
  -- ... other columns
);
```

#### Schema 2: Later Version (20250110_nutrition_system.sql)

```sql
CREATE TABLE IF NOT EXISTS nutrition_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,  -- ❌ Uses client_id
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  height_cm INTEGER NOT NULL,
  weight_kg DECIMAL(5,2) NOT NULL,
  age INTEGER NOT NULL,
  gender VARCHAR(20) NOT NULL CHECK (gender IN ('male', 'female', 'other')),  -- ❌ Lowercase enums
  activity_level VARCHAR(20) NOT NULL CHECK (activity_level IN ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active')),  -- ❌ Lowercase enums
  -- ... different column structure
);
```

#### Schema 3: Code References

- Some API code uses `user_id` (following Schema 1)
- Some API code uses `client_id` (following Schema 2)
- The user mentioned code was changed to use `lead_id` (not found in current codebase)

### 2. API Code Inconsistencies

**Files using user_id:**

- `/app/api/nutrition/profile/route.ts` (lines 40, 93, 135)
- `/app/api/nutrition/meals/[id]/regenerate/route.ts` (line 69)
- `/app/api/nutrition/meal-plans/route.ts` (line 103)
- `/app/api/nutrition/chat/wizard/route.ts` (lines 241, 259)
- `/app/api/nutrition/macros/route.ts` (line 18)
- `/app/api/nutrition/body-metrics/route.ts` (line 191)

**Files using client_id:**

- `/app/hooks/useNutritionData.ts` (line 120)

### 3. Enum Value Inconsistencies

**Schema 1 (Original):** UPPERCASE enums

- `sex IN ('MALE', 'FEMALE')`
- `activity_level IN ('SEDENTARY', 'LIGHTLY_ACTIVE', 'MODERATELY_ACTIVE', 'VERY_ACTIVE', 'EXTREMELY_ACTIVE')`

**Schema 2 (Later):** lowercase enums

- `gender IN ('male', 'female', 'other')`
- `activity_level IN ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active')`

**API Code:** Uses UPPERCASE values, which would fail with Schema 2

### 4. Column Name Mismatches

| Schema 1         | Schema 2                         | Purpose                     |
| ---------------- | -------------------------------- | --------------------------- |
| `sex`            | `gender`                         | Gender field                |
| `height`         | `height_cm`                      | Height measurement          |
| `current_weight` | `weight_kg`                      | Current weight              |
| N/A              | `bmr`, `tdee`, `target_calories` | Calculated nutrition values |

## Current Database State

Based on the migration files and error message:

- The table likely exists with **Schema 2** structure (`client_id`)
- Supabase schema cache is looking for `client_id` column
- But most API code is trying to use `user_id`
- This causes the cache mismatch error

## Complete Fix Plan

### Step 1: Determine Current Table Structure

Run this SQL to check actual database schema:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'nutrition_profiles'
ORDER BY ordinal_position;
```

### Step 2: Create Unified Migration

Create a new migration that:

1. Drops existing nutrition_profiles table
2. Creates a consistent schema aligned with the application's needs
3. Migrates any existing data

### Step 3: Update All API Code

Standardize all API endpoints to use the same column references and enum values.

### Step 4: Clear Supabase Cache

Force Supabase to refresh its schema cache.

## Recommended Schema (Final)

```sql
CREATE TABLE IF NOT EXISTS nutrition_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Basic demographics
  age INTEGER NOT NULL CHECK (age > 0 AND age < 150),
  gender VARCHAR(20) NOT NULL CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
  height_cm INTEGER NOT NULL CHECK (height_cm > 0),
  weight_kg DECIMAL(5,2) NOT NULL CHECK (weight_kg > 0),

  -- Goals
  goal VARCHAR(20) NOT NULL CHECK (goal IN ('LOSE_WEIGHT', 'MAINTAIN', 'GAIN_MUSCLE', 'IMPROVE_HEALTH')),
  target_weight_kg DECIMAL(5,2),
  activity_level VARCHAR(20) NOT NULL CHECK (activity_level IN ('SEDENTARY', 'LIGHTLY_ACTIVE', 'MODERATELY_ACTIVE', 'VERY_ACTIVE', 'EXTRA_ACTIVE')),

  -- Calculated values
  bmr INTEGER,
  tdee INTEGER,
  target_calories INTEGER,
  protein_grams INTEGER,
  carbs_grams INTEGER,
  fat_grams INTEGER,
  fiber_grams INTEGER DEFAULT 25,

  -- Preferences
  training_frequency INTEGER DEFAULT 0 CHECK (training_frequency >= 0 AND training_frequency <= 7),
  training_types TEXT[] DEFAULT '{}',
  dietary_preferences TEXT[] DEFAULT '{}',
  allergies TEXT[] DEFAULT '{}',
  food_likes TEXT[] DEFAULT '{}',
  food_dislikes TEXT[] DEFAULT '{}',
  cooking_time VARCHAR(20) DEFAULT 'MODERATE' CHECK (cooking_time IN ('MINIMAL', 'MODERATE', 'EXTENSIVE')),
  budget_constraint VARCHAR(10) DEFAULT 'MODERATE' CHECK (budget_constraint IN ('LOW', 'MODERATE', 'HIGH')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),

  UNIQUE(client_id, organization_id)
);
```

## Action Items

1. **Database Inspection**: Connect to database and verify current schema
2. **Schema Migration**: Create unified migration script
3. **API Code Updates**: Standardize all column references
4. **Cache Refresh**: Clear Supabase schema cache
5. **Testing**: Verify all nutrition endpoints work correctly
6. **Documentation**: Update any API documentation

## Files Requiring Updates

### API Routes to Fix:

- `/app/api/nutrition/profile/route.ts` - Change user_id to client_id
- `/app/api/nutrition/meals/[id]/regenerate/route.ts` - Change user_id to client_id
- `/app/api/nutrition/meal-plans/route.ts` - Change user_id to client_id
- `/app/api/nutrition/chat/wizard/route.ts` - Change user_id to client_id
- `/app/api/nutrition/macros/route.ts` - Change user_id to client_id
- `/app/api/nutrition/body-metrics/route.ts` - Change user_id to client_id

### Hooks to Verify:

- `/app/hooks/useNutritionData.ts` - Already uses client_id ✓

### Migration Files:

- Create new unified migration
- Potentially rollback conflicting migrations
