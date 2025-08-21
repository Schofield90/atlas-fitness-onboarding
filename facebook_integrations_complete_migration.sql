-- =====================================================
-- Facebook Integrations Complete Migration
-- =====================================================
-- This migration ensures the facebook_integrations table has all required columns
-- and can be run safely multiple times without losing data

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Start transaction for safety
BEGIN;

-- Create or update facebook_integrations table with all required columns
DO $$ 
DECLARE
    table_exists BOOLEAN;
    column_exists BOOLEAN;
BEGIN
    -- Check if table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'facebook_integrations'
    ) INTO table_exists;

    IF NOT table_exists THEN
        -- Create the complete table
        RAISE NOTICE 'Creating facebook_integrations table...';
        
        CREATE TABLE facebook_integrations (
            -- Primary key
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            
            -- Foreign keys
            organization_id UUID NOT NULL,
            user_id UUID NOT NULL,
            
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
            
            -- Unique constraint
            UNIQUE(organization_id, facebook_user_id)
        );
        
        RAISE NOTICE 'Facebook integrations table created successfully';
    ELSE
        RAISE NOTICE 'Facebook integrations table already exists. Checking for missing columns...';
        
        -- Add missing columns if they don't exist
        
        -- Check and add facebook_user_id
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'facebook_integrations' 
            AND column_name = 'facebook_user_id'
        ) INTO column_exists;
        
        IF NOT column_exists THEN
            ALTER TABLE facebook_integrations ADD COLUMN facebook_user_id TEXT;
            RAISE NOTICE 'Added facebook_user_id column';
        END IF;
        
        -- Check and add facebook_user_name
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'facebook_integrations' 
            AND column_name = 'facebook_user_name'
        ) INTO column_exists;
        
        IF NOT column_exists THEN
            ALTER TABLE facebook_integrations ADD COLUMN facebook_user_name TEXT;
            RAISE NOTICE 'Added facebook_user_name column';
        END IF;
        
        -- Check and add facebook_user_email
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'facebook_integrations' 
            AND column_name = 'facebook_user_email'
        ) INTO column_exists;
        
        IF NOT column_exists THEN
            ALTER TABLE facebook_integrations ADD COLUMN facebook_user_email TEXT;
            RAISE NOTICE 'Added facebook_user_email column';
        END IF;
        
        -- Check and add access_token
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'facebook_integrations' 
            AND column_name = 'access_token'
        ) INTO column_exists;
        
        IF NOT column_exists THEN
            ALTER TABLE facebook_integrations ADD COLUMN access_token TEXT;
            RAISE NOTICE 'Added access_token column';
        END IF;
        
        -- Check and add token_expires_at
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'facebook_integrations' 
            AND column_name = 'token_expires_at'
        ) INTO column_exists;
        
        IF NOT column_exists THEN
            ALTER TABLE facebook_integrations ADD COLUMN token_expires_at TIMESTAMPTZ;
            RAISE NOTICE 'Added token_expires_at column';
        END IF;
        
        -- Check and add refresh_token
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'facebook_integrations' 
            AND column_name = 'refresh_token'
        ) INTO column_exists;
        
        IF NOT column_exists THEN
            ALTER TABLE facebook_integrations ADD COLUMN refresh_token TEXT;
            RAISE NOTICE 'Added refresh_token column';
        END IF;
        
        -- Check and add long_lived_token
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'facebook_integrations' 
            AND column_name = 'long_lived_token'
        ) INTO column_exists;
        
        IF NOT column_exists THEN
            ALTER TABLE facebook_integrations ADD COLUMN long_lived_token TEXT;
            RAISE NOTICE 'Added long_lived_token column';
        END IF;
        
        -- Check and add granted_scopes
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'facebook_integrations' 
            AND column_name = 'granted_scopes'
        ) INTO column_exists;
        
        IF NOT column_exists THEN
            ALTER TABLE facebook_integrations ADD COLUMN granted_scopes TEXT[] DEFAULT '{}';
            RAISE NOTICE 'Added granted_scopes column';
        END IF;
        
        -- Check and add required_scopes
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'facebook_integrations' 
            AND column_name = 'required_scopes'
        ) INTO column_exists;
        
        IF NOT column_exists THEN
            ALTER TABLE facebook_integrations ADD COLUMN required_scopes TEXT[] DEFAULT '{leads_retrieval,pages_read_engagement,pages_manage_metadata}';
            RAISE NOTICE 'Added required_scopes column';
        END IF;
        
        -- Check and add is_active
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'facebook_integrations' 
            AND column_name = 'is_active'
        ) INTO column_exists;
        
        IF NOT column_exists THEN
            ALTER TABLE facebook_integrations ADD COLUMN is_active BOOLEAN DEFAULT true;
            RAISE NOTICE 'Added is_active column';
        END IF;
        
        -- Check and add connection_status
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'facebook_integrations' 
            AND column_name = 'connection_status'
        ) INTO column_exists;
        
        IF NOT column_exists THEN
            ALTER TABLE facebook_integrations ADD COLUMN connection_status TEXT DEFAULT 'active';
            RAISE NOTICE 'Added connection_status column';
        END IF;
        
        -- Check and add last_sync_at
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'facebook_integrations' 
            AND column_name = 'last_sync_at'
        ) INTO column_exists;
        
        IF NOT column_exists THEN
            ALTER TABLE facebook_integrations ADD COLUMN last_sync_at TIMESTAMPTZ;
            RAISE NOTICE 'Added last_sync_at column';
        END IF;
        
        -- Check and add sync_frequency_hours
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'facebook_integrations' 
            AND column_name = 'sync_frequency_hours'
        ) INTO column_exists;
        
        IF NOT column_exists THEN
            ALTER TABLE facebook_integrations ADD COLUMN sync_frequency_hours INTEGER DEFAULT 1;
            RAISE NOTICE 'Added sync_frequency_hours column';
        END IF;
        
        -- Check and add settings
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'facebook_integrations' 
            AND column_name = 'settings'
        ) INTO column_exists;
        
        IF NOT column_exists THEN
            ALTER TABLE facebook_integrations ADD COLUMN settings JSONB DEFAULT '{}';
            RAISE NOTICE 'Added settings column';
        END IF;
        
        -- Check and add webhook_config
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'facebook_integrations' 
            AND column_name = 'webhook_config'
        ) INTO column_exists;
        
        IF NOT column_exists THEN
            ALTER TABLE facebook_integrations ADD COLUMN webhook_config JSONB DEFAULT '{}';
            RAISE NOTICE 'Added webhook_config column';
        END IF;
        
        -- Check and add error_details
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'facebook_integrations' 
            AND column_name = 'error_details'
        ) INTO column_exists;
        
        IF NOT column_exists THEN
            ALTER TABLE facebook_integrations ADD COLUMN error_details JSONB DEFAULT '{}';
            RAISE NOTICE 'Added error_details column';
        END IF;
        
        -- Check and add created_at
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'facebook_integrations' 
            AND column_name = 'created_at'
        ) INTO column_exists;
        
        IF NOT column_exists THEN
            ALTER TABLE facebook_integrations ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
            RAISE NOTICE 'Added created_at column';
        END IF;
        
        -- Check and add updated_at
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'facebook_integrations' 
            AND column_name = 'updated_at'
        ) INTO column_exists;
        
        IF NOT column_exists THEN
            ALTER TABLE facebook_integrations ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
            RAISE NOTICE 'Added updated_at column';
        END IF;
        
        RAISE NOTICE 'Column additions completed';
    END IF;
    
END $$;

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
    -- Add foreign key to organizations if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'facebook_integrations_organization_id_fkey'
        AND table_name = 'facebook_integrations'
    ) THEN
        ALTER TABLE facebook_integrations 
        ADD CONSTRAINT facebook_integrations_organization_id_fkey 
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Added organization_id foreign key constraint';
    END IF;
    
    -- Add foreign key to users if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'facebook_integrations_user_id_fkey'
        AND table_name = 'facebook_integrations'
    ) THEN
        -- Check if users table exists first
        IF EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'users'
        ) THEN
            ALTER TABLE facebook_integrations 
            ADD CONSTRAINT facebook_integrations_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
            
            RAISE NOTICE 'Added user_id foreign key constraint';
        ELSE
            RAISE NOTICE 'Users table does not exist - skipping user_id foreign key';
        END IF;
    END IF;
    
    -- Add connection_status check constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'facebook_integrations_connection_status_check'
    ) THEN
        ALTER TABLE facebook_integrations 
        ADD CONSTRAINT facebook_integrations_connection_status_check 
        CHECK (connection_status IN ('active', 'expired', 'revoked', 'error'));
        
        RAISE NOTICE 'Added connection_status check constraint';
    END IF;
    
    -- Add unique constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'facebook_integrations_organization_id_facebook_user_id_key'
        AND table_name = 'facebook_integrations'
    ) THEN
        -- First, handle any potential duplicate data
        DELETE FROM facebook_integrations a USING facebook_integrations b 
        WHERE a.id < b.id 
        AND a.organization_id = b.organization_id 
        AND a.facebook_user_id = b.facebook_user_id;
        
        ALTER TABLE facebook_integrations 
        ADD CONSTRAINT facebook_integrations_organization_id_facebook_user_id_key 
        UNIQUE (organization_id, facebook_user_id);
        
        RAISE NOTICE 'Added unique constraint for organization_id and facebook_user_id';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding constraints: %', SQLERRM;
        -- Continue with the migration even if constraints fail
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_facebook_integrations_organization_id 
ON facebook_integrations(organization_id);

CREATE INDEX IF NOT EXISTS idx_facebook_integrations_user_id 
ON facebook_integrations(user_id);

CREATE INDEX IF NOT EXISTS idx_facebook_integrations_facebook_user_id 
ON facebook_integrations(facebook_user_id);

CREATE INDEX IF NOT EXISTS idx_facebook_integrations_is_active 
ON facebook_integrations(is_active);

CREATE INDEX IF NOT EXISTS idx_facebook_integrations_connection_status 
ON facebook_integrations(connection_status);

CREATE INDEX IF NOT EXISTS idx_facebook_integrations_token_expires_at 
ON facebook_integrations(token_expires_at) WHERE token_expires_at IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE facebook_integrations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$
BEGIN
    -- Drop existing policies if they exist to avoid conflicts
    DROP POLICY IF EXISTS "facebook_integrations_org_isolation" ON facebook_integrations;
    DROP POLICY IF EXISTS "Users can view facebook integrations in their organization" ON facebook_integrations;
    DROP POLICY IF EXISTS "Users can insert facebook integrations in their organization" ON facebook_integrations;
    DROP POLICY IF EXISTS "Users can update facebook integrations in their organization" ON facebook_integrations;
    DROP POLICY IF EXISTS "Users can delete facebook integrations in their organization" ON facebook_integrations;
    
    -- Create comprehensive RLS policy
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
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating RLS policy: %', SQLERRM;
        -- Continue even if RLS policy creation fails
END $$;

-- Create or replace the updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create the trigger for automatic updated_at timestamps
DROP TRIGGER IF EXISTS update_facebook_integrations_updated_at ON facebook_integrations;

CREATE TRIGGER update_facebook_integrations_updated_at
    BEFORE UPDATE ON facebook_integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update any missing NOT NULL constraints that are required
DO $$
BEGIN
    -- Make facebook_user_id NOT NULL if it isn't already
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'facebook_integrations' 
        AND column_name = 'facebook_user_id' 
        AND is_nullable = 'YES'
    ) THEN
        -- First update any NULL values with a default
        UPDATE facebook_integrations 
        SET facebook_user_id = 'unknown_' || id::text 
        WHERE facebook_user_id IS NULL;
        
        ALTER TABLE facebook_integrations 
        ALTER COLUMN facebook_user_id SET NOT NULL;
        
        RAISE NOTICE 'Set facebook_user_id to NOT NULL';
    END IF;
    
    -- Make facebook_user_name NOT NULL if it isn't already  
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'facebook_integrations' 
        AND column_name = 'facebook_user_name' 
        AND is_nullable = 'YES'
    ) THEN
        -- First update any NULL values with a default
        UPDATE facebook_integrations 
        SET facebook_user_name = 'Unknown User' 
        WHERE facebook_user_name IS NULL;
        
        ALTER TABLE facebook_integrations 
        ALTER COLUMN facebook_user_name SET NOT NULL;
        
        RAISE NOTICE 'Set facebook_user_name to NOT NULL';
    END IF;
    
    -- Make access_token NOT NULL if it isn't already
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'facebook_integrations' 
        AND column_name = 'access_token' 
        AND is_nullable = 'YES'
    ) THEN
        -- Delete any rows with NULL access_token as they are invalid
        DELETE FROM facebook_integrations WHERE access_token IS NULL;
        
        ALTER TABLE facebook_integrations 
        ALTER COLUMN access_token SET NOT NULL;
        
        RAISE NOTICE 'Set access_token to NOT NULL';
    END IF;
    
    -- Make connection_status NOT NULL if it isn't already
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'facebook_integrations' 
        AND column_name = 'connection_status' 
        AND is_nullable = 'YES'
    ) THEN
        -- First update any NULL values with default
        UPDATE facebook_integrations 
        SET connection_status = 'active' 
        WHERE connection_status IS NULL;
        
        ALTER TABLE facebook_integrations 
        ALTER COLUMN connection_status SET NOT NULL;
        
        RAISE NOTICE 'Set connection_status to NOT NULL';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error setting NOT NULL constraints: %', SQLERRM;
        -- Continue even if NOT NULL constraints fail
END $$;

-- Add helpful comments
COMMENT ON TABLE facebook_integrations IS 'Stores Facebook OAuth integration data and settings for organizations';
COMMENT ON COLUMN facebook_integrations.facebook_user_id IS 'Facebook user ID for the integrated account';
COMMENT ON COLUMN facebook_integrations.facebook_user_name IS 'Display name of the Facebook user';
COMMENT ON COLUMN facebook_integrations.facebook_user_email IS 'Email address of the Facebook user (optional)';
COMMENT ON COLUMN facebook_integrations.access_token IS 'Facebook access token for API calls';
COMMENT ON COLUMN facebook_integrations.token_expires_at IS 'When the access token expires';
COMMENT ON COLUMN facebook_integrations.long_lived_token IS 'Long-lived Facebook access token';
COMMENT ON COLUMN facebook_integrations.granted_scopes IS 'Array of Facebook permissions granted';
COMMENT ON COLUMN facebook_integrations.required_scopes IS 'Array of Facebook permissions required';
COMMENT ON COLUMN facebook_integrations.connection_status IS 'Status of the Facebook connection';
COMMENT ON COLUMN facebook_integrations.settings IS 'JSON configuration settings';
COMMENT ON COLUMN facebook_integrations.webhook_config IS 'Facebook webhook configuration';
COMMENT ON COLUMN facebook_integrations.error_details IS 'JSON error details if connection failed';

-- Commit the transaction
COMMIT;

-- Final verification
SELECT 'Migration completed successfully! Facebook integrations table is ready.' as status;