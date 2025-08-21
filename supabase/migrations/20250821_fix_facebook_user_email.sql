-- Fix Facebook Integration Schema
-- This migration ensures the facebook_user_email column exists in facebook_integrations table

-- First, check if the table exists and add the column if missing
DO $$ 
BEGIN
    -- Check if facebook_integrations table exists
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'facebook_integrations'
    ) THEN
        -- Add facebook_user_email column if it doesn't exist
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'facebook_integrations' 
            AND column_name = 'facebook_user_email'
        ) THEN
            ALTER TABLE facebook_integrations 
            ADD COLUMN facebook_user_email TEXT;
            
            RAISE NOTICE 'Added facebook_user_email column to facebook_integrations table';
        ELSE
            RAISE NOTICE 'facebook_user_email column already exists';
        END IF;
    ELSE
        -- Create the entire table if it doesn't exist
        CREATE TABLE facebook_integrations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            
            -- Facebook user information
            facebook_user_id TEXT NOT NULL,
            facebook_user_name TEXT NOT NULL,
            facebook_user_email TEXT,
            
            -- OAuth token management
            access_token TEXT NOT NULL,
            token_expires_at TIMESTAMPTZ,
            refresh_token TEXT,
            long_lived_token TEXT,
            
            -- Permission and scope management
            granted_scopes TEXT[] DEFAULT '{}',
            required_scopes TEXT[] DEFAULT '{leads_retrieval,pages_read_engagement,pages_manage_metadata}',
            
            -- Integration status
            is_active BOOLEAN DEFAULT true,
            connection_status TEXT NOT NULL DEFAULT 'active' CHECK (connection_status IN ('active', 'expired', 'revoked', 'error')),
            last_sync_at TIMESTAMPTZ,
            sync_frequency_hours INTEGER DEFAULT 1,
            
            -- Configuration and metadata
            settings JSONB DEFAULT '{}',
            webhook_config JSONB DEFAULT '{}',
            error_details JSONB DEFAULT '{}',
            
            -- Audit fields
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            
            -- Constraints
            UNIQUE(organization_id, facebook_user_id)
        );
        
        RAISE NOTICE 'Created facebook_integrations table with facebook_user_email column';
    END IF;
END $$;

-- Also ensure RLS is enabled
ALTER TABLE facebook_integrations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies if they don't exist
DO $$
BEGIN
    -- Drop existing policies if they exist (to avoid conflicts)
    DROP POLICY IF EXISTS "facebook_integrations_org_isolation" ON facebook_integrations;
    
    -- Create new policy
    CREATE POLICY "facebook_integrations_org_isolation" ON facebook_integrations
        FOR ALL
        USING (
            organization_id IN (
                SELECT organization_id 
                FROM users 
                WHERE id = auth.uid()
            )
        )
        WITH CHECK (
            organization_id IN (
                SELECT organization_id 
                FROM users 
                WHERE id = auth.uid()
            )
        );
        
    RAISE NOTICE 'Created RLS policy for facebook_integrations';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'RLS policy already exists';
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_facebook_integrations_org_id 
ON facebook_integrations(organization_id);

CREATE INDEX IF NOT EXISTS idx_facebook_integrations_user_id 
ON facebook_integrations(user_id);

CREATE INDEX IF NOT EXISTS idx_facebook_integrations_facebook_user_id 
ON facebook_integrations(facebook_user_id);

-- Update the updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_facebook_integrations_updated_at ON facebook_integrations;

CREATE TRIGGER update_facebook_integrations_updated_at
    BEFORE UPDATE ON facebook_integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();