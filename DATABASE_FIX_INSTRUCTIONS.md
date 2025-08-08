# 🚨 Database Migration Fix Instructions

You're getting the error "column 'slug' does not exist" because the organizations table already exists in your database but without the slug column. Here's how to fix it:

## Option 1: Quick Fix (Recommended)

1. **Open Supabase SQL Editor**
   ```
   https://supabase.com/dashboard/project/[your-project-id]/sql
   ```

2. **Run this SQL to fix the slug column**:
   ```sql
   -- Fix organizations table slug column
   ALTER TABLE organizations 
   ADD COLUMN IF NOT EXISTS slug TEXT;

   -- Generate slugs from existing names
   UPDATE organizations 
   SET slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'))
   WHERE slug IS NULL;

   -- Make slug required and unique
   ALTER TABLE organizations 
   ALTER COLUMN slug SET NOT NULL;

   -- Add constraints if they don't exist
   DO $$ 
   BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organizations_slug_key') THEN
       ALTER TABLE organizations ADD CONSTRAINT organizations_slug_key UNIQUE (slug);
     END IF;
     
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organizations_slug_check') THEN
       ALTER TABLE organizations ADD CONSTRAINT organizations_slug_check CHECK (slug ~ '^[a-z0-9-]+$');
     END IF;
   END $$;
   ```

3. **Then run the full migration** (after removing the problematic lines):
   - Copy the contents of `/supabase/migrations/0001_complete_multi_tenant_schema.sql`
   - Remove lines 712-716 (the system user insert)
   - Run in SQL Editor

## Option 2: Using Supabase CLI

1. **Check what tables exist**:
   ```bash
   cd /Users/Sam/atlas-fitness-onboarding
   supabase db diff
   ```

2. **Run the fix script**:
   ```bash
   node scripts/fix-database.js
   ```
   Choose option 1 to apply the smart migration.

## Option 3: Reset Everything (Nuclear Option)

If you want to start fresh (this will DELETE ALL DATA):

```bash
supabase db reset
```

Then run the migrations normally.

## What's Happening?

Your database has partial schema from previous attempts. The organizations table exists but is missing the `slug` column that the migration expects. The fix adds this column and any other missing pieces.

## After Fixing

1. **Run the mobile app migrations**:
   ```sql
   -- In SQL Editor, run these in order:
   /supabase/migrations/20250108_mobile_app_schema.sql
   /supabase/migrations/20250108_mobile_notifications_messaging.sql
   ```

2. **Test the API**:
   ```bash
   curl http://localhost:54321/functions/v1/mobile-api/health
   ```

3. **Create test data**:
   ```sql
   -- Create test organization
   INSERT INTO organizations (slug, name, plan)
   VALUES ('atlas-london', 'Atlas Fitness London', 'pro');
   ```

## Still Having Issues?

If you're still getting errors:

1. Check the exact error message
2. Look at which table/column is causing issues
3. Use the diagnostic query to see current state:
   ```sql
   SELECT table_name, column_name, data_type
   FROM information_schema.columns
   WHERE table_schema = 'public'
   AND table_name IN ('organizations', 'users', 'organization_members')
   ORDER BY table_name, ordinal_position;
   ```

The key is to incrementally fix what's missing rather than trying to recreate everything from scratch.