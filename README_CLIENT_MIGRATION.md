# Client Profile Migration - Manual Application Required

## ⚠️ Issue Summary

The GoTeamUp client import failed with **182 errors** because the `clients` table is missing required columns for storing customer profile data.

**Error**: `Could not find the 'address' column of 'clients' in the schema cache`

## 🔧 Fix Required

Apply the database migration to add the missing columns:

- `name` (TEXT) - Full name
- `gender` (VARCHAR) - Gender
- `date_of_birth` (DATE) - Date of birth
- `address` (JSONB) - Address object
- `emergency_contact` (JSONB) - Emergency contact object
- `emergency_contact_name` (TEXT) - Legacy field
- `emergency_contact_phone` (TEXT) - Legacy field

## 📝 How to Apply the Migration

### Option 1: Supabase Dashboard (Recommended)

1. **Open Supabase SQL Editor**:
   https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql

2. **Copy the migration SQL**:
   - Open file: `/Users/Sam/atlas-fitness-onboarding/APPLY_CLIENT_PROFILE_MIGRATION.sql`
   - Copy all contents

3. **Paste and run**:
   - Paste the SQL into the Supabase SQL Editor
   - Click "Run"
   - Verify success message appears

4. **Verify columns were added**:
   Run this query to confirm:
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'clients'
   AND column_name IN ('name', 'gender', 'date_of_birth', 'address', 'emergency_contact')
   ORDER BY column_name;
   ```

### Option 2: Command Line (If you have direct database access)

```bash
# Navigate to project directory
cd /Users/Sam/atlas-fitness-onboarding

# Run migration script
node scripts/run-client-migration.js
```

## 🔄 After Migration

Once the migration is applied, you can re-import the GoTeamUp customer data:

1. Go to: https://login.gymleadhub.co.uk/dashboard/import
2. Select the same CSV file: `/Users/Sam/Downloads/teamup-customer-list-atlas-fitness-2025-10-04.csv`
3. File type will auto-detect as "Clients"
4. Click "Import"
5. All 207 customers should import successfully this time

## 📊 Expected Results

- **Before migration**: 16 success, 182 errors, 6 skipped
- **After migration**: 201 success, 0 errors, 6 skipped (duplicates)

## 🐛 Why This Happened

The import code was updated to support full customer profiles (name, address, emergency contacts) but the database schema wasn't updated to match. This migration adds the required columns.

## 📞 Support

If you encounter any issues:

1. Check the migration was applied successfully
2. Verify all columns exist in the clients table
3. Check for any error messages in the Supabase logs
