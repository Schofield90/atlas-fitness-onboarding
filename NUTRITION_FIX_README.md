# Nutrition Coach Database Fix

## Problem

The nutrition coach was failing with multiple database errors (400 and 406 status codes) due to:

1. Missing tables (`bookings`, `class_credits`, `leads`)
2. Missing columns in `nutrition_profiles` table
3. Incorrect column references in queries
4. Missing columns in `organization_staff` table

## Solution

Created a comprehensive database migration and supporting infrastructure to fix all issues.

## Files Created/Modified

### 1. Database Migration

- **File**: `supabase/migrations/20250910_fix_nutrition_and_related_tables.sql`
- **Purpose**: Comprehensive SQL migration that:
  - Creates missing tables (`bookings`, `class_credits`, `leads`)
  - Adds missing columns to `nutrition_profiles`
  - Supports both `client_id` and `lead_id` foreign keys
  - Sets up proper RLS policies
  - Creates client-lead mappings

### 2. API Endpoint

- **File**: `app/api/admin/apply-nutrition-migration/route.ts`
- **Purpose**: REST API endpoint to apply migration programmatically
- **Endpoints**:
  - `GET`: Check migration status
  - `POST`: Apply migration

### 3. Test Page

- **File**: `app/test-nutrition/page.tsx`
- **URL**: `/test-nutrition`
- **Purpose**: Visual interface to check status and run migration

### 4. Frontend Fixes

- **File**: `app/client/dashboard/page.tsx`
- **Change**: Updated bookings query to handle both `client_id` and `customer_id`

## Deployment Instructions

### Option 1: Via Test Page (Recommended for Development)

1. Start the development server:

   ```bash
   npm run dev
   ```

2. Navigate to: `http://localhost:3000/test-nutrition`

3. Click "Apply Database Migration" button

4. Verify all tables show green checkmarks

5. Test with "Create Test Profile" button

### Option 2: Via Supabase Dashboard (Recommended for Production)

1. Log into Supabase Dashboard

2. Go to SQL Editor

3. Copy contents of `supabase/migrations/20250910_fix_nutrition_and_related_tables.sql`

4. Paste and execute in SQL Editor

5. Verify tables are created in Table Editor

### Option 3: Via PostgreSQL Client (If Available)

```bash
# If you have psql installed:
PGPASSWORD=OGFYlxSChyYLgQxn psql \
  -h db.lzlrojoaxrqvmhempnkn.supabase.co \
  -U postgres \
  -d postgres \
  -f supabase/migrations/20250910_fix_nutrition_and_related_tables.sql
```

## Verification Steps

1. **Check Database Status**:
   - Navigate to `/test-nutrition`
   - All tables should show green checkmarks

2. **Test Nutrition Profile Creation**:
   - Log in as a user
   - Navigate to nutrition coach
   - Complete the nutrition setup form
   - Should save without errors

3. **Verify in Console**:
   - Open browser console (F12)
   - Should see no 400 or 406 errors
   - Should see successful API calls

## Tables Modified

### `nutrition_profiles`

- Added `client_id` column (optional)
- Added `lead_id` column (optional)
- Added multiple alias columns for compatibility
- Flexible constraint: requires either `client_id` OR `lead_id`

### `bookings` (Created if missing)

- Supports both `client_id` and `customer_id`
- Proper foreign key relationships
- RLS policies for security

### `class_credits` (Created if missing)

- Tracks class credits for clients
- Supports both `client_id` and `customer_id`

### `leads` (Created if missing)

- Stores lead information
- Links to clients via `client_id`
- Used as fallback for nutrition profiles

### `organization_staff`

- Added missing columns: `role`, `is_active`, `permissions`, `system_mode`, `visible_systems`

## Troubleshooting

### If migration fails via API:

1. Check you're logged in as an admin user
2. Try running directly in Supabase SQL Editor
3. Check browser console for detailed errors

### If nutrition coach still shows errors:

1. Clear browser cache
2. Check `/test-nutrition` page for table status
3. Verify user has proper organization association
4. Check browser console for specific error messages

### Common Issues:

- **"client_id not supported"**: Migration hasn't been applied yet
- **"406 Not Acceptable"**: Table or column doesn't exist
- **"400 Bad Request"**: Query syntax error or missing table

## Next Steps

After applying the migration:

1. Test nutrition coach functionality
2. Verify meal plan generation works
3. Check shopping list generation
4. Monitor for any remaining errors

## Support

If issues persist after migration:

1. Check Supabase logs for database errors
2. Review browser console for API errors
3. Verify all migration steps completed successfully
4. Contact support with specific error messages
