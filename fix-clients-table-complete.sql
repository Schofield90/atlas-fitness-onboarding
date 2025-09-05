-- Complete fix for clients table to ensure all required columns exist
-- This addresses the 500 error when creating new members

DO $$ 
BEGIN
    -- Ensure clients table exists
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'clients') THEN
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
            created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
            date_of_birth DATE,
            address TEXT,
            emergency_contact_name TEXT,
            emergency_contact_phone TEXT,
            goals TEXT,
            medical_conditions TEXT,
            source TEXT DEFAULT 'manual',
            membership_tier TEXT,
            stripe_customer_id TEXT,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        RAISE NOTICE 'Created clients table';
    END IF;

    -- Add missing columns if they don't exist
    
    -- created_by column
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_name = 'clients' AND column_name = 'created_by') THEN
        ALTER TABLE clients ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added created_by column';
    END IF;
    
    -- date_of_birth column
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_name = 'clients' AND column_name = 'date_of_birth') THEN
        ALTER TABLE clients ADD COLUMN date_of_birth DATE;
        RAISE NOTICE 'Added date_of_birth column';
    END IF;
    
    -- address column
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_name = 'clients' AND column_name = 'address') THEN
        ALTER TABLE clients ADD COLUMN address TEXT;
        RAISE NOTICE 'Added address column';
    END IF;
    
    -- emergency_contact_name column
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_name = 'clients' AND column_name = 'emergency_contact_name') THEN
        ALTER TABLE clients ADD COLUMN emergency_contact_name TEXT;
        RAISE NOTICE 'Added emergency_contact_name column';
    END IF;
    
    -- emergency_contact_phone column
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_name = 'clients' AND column_name = 'emergency_contact_phone') THEN
        ALTER TABLE clients ADD COLUMN emergency_contact_phone TEXT;
        RAISE NOTICE 'Added emergency_contact_phone column';
    END IF;
    
    -- goals column
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_name = 'clients' AND column_name = 'goals') THEN
        ALTER TABLE clients ADD COLUMN goals TEXT;
        RAISE NOTICE 'Added goals column';
    END IF;
    
    -- medical_conditions column
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_name = 'clients' AND column_name = 'medical_conditions') THEN
        ALTER TABLE clients ADD COLUMN medical_conditions TEXT;
        RAISE NOTICE 'Added medical_conditions column';
    END IF;
    
    -- source column
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_name = 'clients' AND column_name = 'source') THEN
        ALTER TABLE clients ADD COLUMN source TEXT DEFAULT 'manual';
        RAISE NOTICE 'Added source column';
    END IF;

    -- Ensure org_id column exists (in case of organization_id -> org_id rename)
    IF EXISTS (SELECT FROM information_schema.columns 
               WHERE table_name = 'clients' AND column_name = 'organization_id')
       AND NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_name = 'clients' AND column_name = 'org_id') THEN
        ALTER TABLE clients RENAME COLUMN organization_id TO org_id;
        RAISE NOTICE 'Renamed organization_id to org_id';
    ELSIF NOT EXISTS (SELECT FROM information_schema.columns 
                     WHERE table_name = 'clients' AND column_name = 'org_id') THEN
        ALTER TABLE clients 
        ADD COLUMN org_id UUID NOT NULL DEFAULT '63589490-8f55-4157-bd3a-e141594b748e' 
        REFERENCES organizations(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added org_id column';
    END IF;

    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_clients_org_id ON clients(org_id);
    CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
    CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);
    CREATE INDEX IF NOT EXISTS idx_clients_created_by ON clients(created_by);
    CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at);
    
    RAISE NOTICE 'Clients table fix completed successfully';
END $$;

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view clients in their organization" ON clients;
DROP POLICY IF EXISTS "Users can create clients in their organization" ON clients;
DROP POLICY IF EXISTS "Users can update clients in their organization" ON clients;
DROP POLICY IF EXISTS "Users can delete clients in their organization" ON clients;

-- Create RLS policies
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

-- Refresh schema
NOTIFY pgrst, 'reload schema';