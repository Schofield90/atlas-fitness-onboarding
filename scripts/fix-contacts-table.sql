-- Fix contacts table to ensure it has organization_id column
-- This migration adds the missing organization_id column if it doesn't exist

-- First, check if the organization_id column exists and add it if not
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Update any existing contacts that don't have an organization_id
-- Use the default Atlas Fitness organization ID
UPDATE contacts 
SET organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
WHERE organization_id IS NULL;

-- Now make the column NOT NULL and add the foreign key constraint
-- We need to check if the constraint already exists first
DO $$ 
BEGIN
    -- Make column NOT NULL if it's not already
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'contacts' 
        AND column_name = 'organization_id' 
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE contacts 
        ALTER COLUMN organization_id SET NOT NULL;
    END IF;
    
    -- Add foreign key constraint if it doesn't exist
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

-- Add the missing columns from the new schema if they don't exist
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS company TEXT,
ADD COLUMN IF NOT EXISTS position TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS zip TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS birthday DATE,
ADD COLUMN IF NOT EXISTS social_media JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for organization_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_contacts_organization ON contacts(organization_id);

-- Update any leads that were created as contacts
-- to ensure they have the proper organization_id
UPDATE leads l
SET organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
WHERE l.organization_id IS NULL
AND EXISTS (
    SELECT 1 FROM contacts c 
    WHERE c.lead_id = l.id
);

-- Grant proper permissions
GRANT ALL ON contacts TO authenticated;
GRANT ALL ON contacts TO service_role;

-- Enable RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies if they don't exist
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view contacts from their organization" ON contacts;
    DROP POLICY IF EXISTS "Users can create contacts for their organization" ON contacts;
    DROP POLICY IF EXISTS "Users can update contacts from their organization" ON contacts;
    DROP POLICY IF EXISTS "Users can delete contacts from their organization" ON contacts;
    
    -- Create new policies
    CREATE POLICY "Users can view contacts from their organization"
    ON contacts FOR SELECT
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid()
            UNION
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

    CREATE POLICY "Users can create contacts for their organization"
    ON contacts FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid()
            UNION
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

    CREATE POLICY "Users can update contacts from their organization"
    ON contacts FOR UPDATE
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid()
            UNION
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

    CREATE POLICY "Users can delete contacts from their organization"
    ON contacts FOR DELETE
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid()
            UNION
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );
END $$;

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'contacts'
ORDER BY ordinal_position;