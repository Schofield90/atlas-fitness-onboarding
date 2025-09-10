# Complete Nutrition System Fix

## Problem Diagnosis

The error "Could not find the 'client_id' column of 'nutrition_profiles' in the schema cache" persists because there are **multiple conflicting schema definitions** and **inconsistent API code** in the nutrition system.

### Root Causes Identified:

1. **Three Different Schema Definitions**:
   - Original migration uses `user_id`
   - Later migration uses `client_id`
   - Some code references attempt to use `lead_id`

2. **Mixed Column References**:
   - Some API files use `user_id`
   - Some API files use `client_id`
   - Different enum cases (UPPERCASE vs lowercase)

3. **Supabase Cache Mismatch**:
   - Database has one schema structure
   - Supabase cache expects different columns
   - Code queries with yet another set of columns

## Complete Solution

### Step 1: Database Schema Fix

Run the unified schema migration:

```bash
# Apply the database fix
psql $POSTGRES_URL -f fix-nutrition-schema.sql
```

This migration:

- ✅ Creates consistent `nutrition_profiles` table with `client_id`
- ✅ Uses UPPERCASE enums (`MALE`, `FEMALE`, `SEDENTARY`, etc.)
- ✅ Standardizes column names (`height_cm`, `weight_kg`, `gender`)
- ✅ Includes all necessary related tables
- ✅ Sets up proper RLS policies
- ✅ Creates performance indexes

### Step 2: API Code Fixes

The following API files need to be updated:

**Files using `user_id` (need to change to `client_id`)**:

- `/app/api/nutrition/profile/route.ts`
- `/app/api/nutrition/meals/[id]/regenerate/route.ts`
- `/app/api/nutrition/meal-plans/route.ts`
- `/app/api/nutrition/chat/wizard/route.ts`
- `/app/api/nutrition/macros/route.ts`
- `/app/api/nutrition/body-metrics/route.ts`

**Key Changes Required**:

1. **Add client lookup logic**:

```typescript
// Get client_id from user
const { data: client, error: clientError } = await supabase
  .from("clients")
  .select("id")
  .eq("user_id", userWithOrg.id)
  .eq("organization_id", userWithOrg.organizationId)
  .single();

if (clientError || !client) {
  return NextResponse.json(
    { error: "Client not found for user" },
    { status: 404 },
  );
}

const clientId = client.id;
```

2. **Change query filters**:

```typescript
// Before
.eq('user_id', userWithOrg.id)

// After
.eq('client_id', clientId)
```

3. **Update insert/update operations**:

```typescript
// Before
user_id: userWithOrg.id,
sex: 'male',
current_weight: body.current_weight,
height: body.height

// After
client_id: clientId,
gender: 'MALE',
weight_kg: body.weight_kg,
height_cm: body.height_cm
```

### Step 3: Apply API Fixes Automatically

Run the automated fix script:

```bash
node fix-nutrition-api-code.js
```

This will:

- Update all column references
- Fix enum values to UPPERCASE
- Add client lookup logic
- Create backups of original files

### Step 4: Clear Supabase Cache

Force Supabase to refresh its schema cache:

```bash
# Option 1: Restart your application
# Option 2: Use Supabase CLI
supabase db reset --local

# Option 3: Manual cache clear via API (if available)
```

### Step 5: Manual Verification

Check these specific files for any remaining issues:

1. **Verify enum values match database**:
   - `MALE`, `FEMALE` for gender
   - `SEDENTARY`, `LIGHTLY_ACTIVE`, etc. for activity_level

2. **Confirm column names**:
   - `client_id` not `user_id` or `lead_id`
   - `height_cm` not `height`
   - `weight_kg` not `current_weight`
   - `gender` not `sex`

3. **Test all endpoints**:
   - POST `/api/nutrition/profile` - Create profile
   - GET `/api/nutrition/profile` - Get profile
   - POST `/api/nutrition/meal-plans` - Generate meal plan
   - POST `/api/nutrition/body-metrics/sync` - Sync metrics

## Final Schema Structure

```sql
CREATE TABLE nutrition_profiles (
  id UUID PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id),     -- ✅ Consistent
  organization_id UUID NOT NULL REFERENCES organizations(id),

  age INTEGER NOT NULL,
  gender VARCHAR(20) CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')), -- ✅ UPPERCASE
  height_cm INTEGER NOT NULL,                         -- ✅ Clear units
  weight_kg DECIMAL(5,2) NOT NULL,                   -- ✅ Clear units

  goal VARCHAR(20) CHECK (goal IN ('LOSE_WEIGHT', 'MAINTAIN', 'GAIN_MUSCLE', 'IMPROVE_HEALTH')),
  target_weight_kg DECIMAL(5,2),
  activity_level VARCHAR(20) CHECK (activity_level IN ('SEDENTARY', 'LIGHTLY_ACTIVE', 'MODERATELY_ACTIVE', 'VERY_ACTIVE', 'EXTRA_ACTIVE')), -- ✅ UPPERCASE

  -- Calculated values
  bmr INTEGER,
  tdee INTEGER,
  target_calories INTEGER,
  protein_grams INTEGER,
  carbs_grams INTEGER,
  fat_grams INTEGER,

  -- Preferences
  training_frequency INTEGER,
  training_types TEXT[],
  dietary_preferences TEXT[],
  allergies TEXT[],
  food_likes TEXT[],
  food_dislikes TEXT[],
  cooking_time VARCHAR(20) CHECK (cooking_time IN ('MINIMAL', 'MODERATE', 'EXTENSIVE')),
  budget_constraint VARCHAR(10) CHECK (budget_constraint IN ('LOW', 'MODERATE', 'HIGH')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),

  UNIQUE(client_id, organization_id)
);
```

## Testing Checklist

After applying fixes, verify:

- [ ] **Database migration successful**: Table structure matches expected schema
- [ ] **API endpoints work**: All nutrition endpoints return 200 without column errors
- [ ] **Profile creation**: Can create new nutrition profiles
- [ ] **Profile updates**: Can update existing profiles
- [ ] **Meal plan generation**: AI meal plans generate successfully
- [ ] **Body metrics sync**: Body composition data syncs properly
- [ ] **Frontend integration**: UI components display data correctly
- [ ] **RLS policies**: Users can only access their own data

## Rollback Plan

If issues occur:

1. **Database rollback**:

```sql
-- Restore from backup if needed
DROP TABLE nutrition_profiles CASCADE;
-- Restore previous version
```

2. **Code rollback**:

```bash
# Restore from backups created by fix script
mv app/api/nutrition/profile/route.ts.backup app/api/nutrition/profile/route.ts
# Repeat for other files
```

## Files Created/Modified

### Analysis & Documentation:

- `NUTRITION_SCHEMA_ANALYSIS.md` - Complete problem analysis
- `COMPLETE_NUTRITION_FIX.md` - This comprehensive fix guide

### Database Fixes:

- `fix-nutrition-schema.sql` - Unified database migration

### Code Fixes:

- `fix-nutrition-api-code.js` - Automated API code fixes
- `NUTRITION_FIX_SUMMARY.md` - Generated after code fixes

### Modified API Files:

- All nutrition-related route files (backups created automatically)

---

**⚠️ IMPORTANT**: Apply the database migration BEFORE testing the API endpoints to ensure schema consistency.
