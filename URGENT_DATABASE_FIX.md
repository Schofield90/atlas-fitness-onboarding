# URGENT: Fix Contacts Table Structure

## Issue
The contacts table is missing the `organization_id` column, which prevents contacts from being displayed properly.

## Quick Fix via Supabase Dashboard

Run this SQL in the Supabase SQL Editor:

```sql
-- Add organization_id column if it doesn't exist
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Update existing contacts with default organization
UPDATE contacts 
SET organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
WHERE organization_id IS NULL;

-- Make column NOT NULL
ALTER TABLE contacts 
ALTER COLUMN organization_id SET NOT NULL;

-- Add foreign key constraint if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'contacts' 
        AND constraint_name = 'contacts_organization_id_fkey'
    ) THEN
        ALTER TABLE contacts 
        ADD CONSTRAINT contacts_organization_id_fkey 
        FOREIGN KEY (organization_id) 
        REFERENCES organizations(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_contacts_organization ON contacts(organization_id);

-- Verify the fix
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'contacts'
AND column_name = 'organization_id';
```

## Alternative: Run Full Migration

If you want to run the complete migration with all additional fields:

```bash
# From the project root
psql $DATABASE_URL < scripts/fix-contacts-table.sql
```

## What Was Fixed

1. **Added fallback logic** in `/app/contacts/page.tsx` to handle missing `organization_id` column
2. **Updated contact creation** in `/app/contacts/new/page.tsx` to work with or without the column
3. **Created migration script** at `/scripts/fix-contacts-table.sql` for database fix
4. **Added debug endpoint** at `/api/debug/contacts` to check database state

## Deployed Changes

The code fixes have been deployed to: https://atlas-fitness-onboarding.vercel.app

The application will now work even if the database column is missing, but for best performance and proper data isolation, please run the SQL migration above.

## Testing

After running the migration:
1. Go to https://atlas-fitness-onboarding.vercel.app/contacts
2. Create a new contact
3. Verify contacts are displayed in the list
4. Check https://atlas-fitness-onboarding.vercel.app/api/debug/contacts for diagnostics