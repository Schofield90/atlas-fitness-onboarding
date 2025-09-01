-- Fix clients table to ensure org_id column exists
-- This migration adds org_id if missing or renames organization_id to org_id

-- First, check if the table exists and what columns it has
DO $$ 
BEGIN
    -- Check if clients table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'clients') THEN
        -- Check if organization_id column exists but org_id doesn't
        IF EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_name = 'clients' AND column_name = 'organization_id')
           AND NOT EXISTS (SELECT FROM information_schema.columns 
                          WHERE table_name = 'clients' AND column_name = 'org_id') THEN
            -- Rename organization_id to org_id
            ALTER TABLE clients RENAME COLUMN organization_id TO org_id;
            RAISE NOTICE 'Renamed organization_id to org_id in clients table';
        
        -- Check if neither column exists
        ELSIF NOT EXISTS (SELECT FROM information_schema.columns 
                         WHERE table_name = 'clients' AND column_name = 'org_id') THEN
            -- Add org_id column
            -- WARNING: This uses a hardcoded default organization ID for migration purposes only
            -- In production, organization IDs should be dynamically assigned based on user context
            ALTER TABLE clients 
            ADD COLUMN org_id UUID NOT NULL DEFAULT '63589490-8f55-4157-bd3a-e141594b748e' REFERENCES organizations(id) ON DELETE CASCADE;
            RAISE NOTICE 'Added org_id column to clients table';
        END IF;

        -- Ensure other essential columns exist
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_name = 'clients' AND column_name = 'first_name') THEN
            ALTER TABLE clients ADD COLUMN first_name TEXT;
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_name = 'clients' AND column_name = 'last_name') THEN
            ALTER TABLE clients ADD COLUMN last_name TEXT;
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_name = 'clients' AND column_name = 'email') THEN
            ALTER TABLE clients ADD COLUMN email TEXT;
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_name = 'clients' AND column_name = 'phone') THEN
            ALTER TABLE clients ADD COLUMN phone TEXT;
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_name = 'clients' AND column_name = 'status') THEN
            ALTER TABLE clients ADD COLUMN status TEXT DEFAULT 'active';
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_name = 'clients' AND column_name = 'metadata') THEN
            ALTER TABLE clients ADD COLUMN metadata JSONB DEFAULT '{}';
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_name = 'clients' AND column_name = 'created_at') THEN
            ALTER TABLE clients ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_name = 'clients' AND column_name = 'updated_at') THEN
            ALTER TABLE clients ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        END IF;

    ELSE
        -- Create the clients table if it doesn't exist
        CREATE TABLE clients (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
            lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
            first_name TEXT,
            last_name TEXT,
            email TEXT,
            phone TEXT,
            status TEXT DEFAULT 'active',
            membership_tier TEXT,
            stripe_customer_id TEXT,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_clients_org_id ON clients(org_id);
        CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
        CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
        
        RAISE NOTICE 'Created clients table with org_id column';
    END IF;
END $$;

-- Add RLS policies if they don't exist
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view clients in their organization" ON clients;
DROP POLICY IF EXISTS "Users can create clients in their organization" ON clients;
DROP POLICY IF EXISTS "Users can update clients in their organization" ON clients;
DROP POLICY IF EXISTS "Users can delete clients in their organization" ON clients;

-- Create new RLS policies using org_id
CREATE POLICY "Users can view clients in their organization"
    ON clients FOR SELECT
    TO authenticated
    USING (
        org_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid()
            UNION
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can create clients in their organization"
    ON clients FOR INSERT
    TO authenticated
    WITH CHECK (
        org_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid()
            UNION
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can update clients in their organization"
    ON clients FOR UPDATE
    TO authenticated
    USING (
        org_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid()
            UNION
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can delete clients in their organization"
    ON clients FOR DELETE
    TO authenticated
    USING (
        org_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid()
            UNION
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';