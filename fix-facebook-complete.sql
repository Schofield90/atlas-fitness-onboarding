-- Complete fix for facebook_integrations table
-- Run this in Supabase SQL Editor

-- Add missing facebook_user_id column
ALTER TABLE facebook_integrations 
ADD COLUMN IF NOT EXISTS facebook_user_id TEXT;

-- Make it NOT NULL with a default for existing rows
UPDATE facebook_integrations 
SET facebook_user_id = 'legacy_' || id::text 
WHERE facebook_user_id IS NULL;

-- Now make it required
ALTER TABLE facebook_integrations 
ALTER COLUMN facebook_user_id SET NOT NULL;

-- Add any other missing columns
ALTER TABLE facebook_integrations
ADD COLUMN IF NOT EXISTS facebook_user_name TEXT,
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS refresh_token TEXT,
ADD COLUMN IF NOT EXISTS long_lived_token TEXT,
ADD COLUMN IF NOT EXISTS granted_scopes TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS required_scopes TEXT[] DEFAULT '{leads_retrieval,pages_read_engagement,pages_manage_metadata}',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS connection_status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sync_frequency_hours INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS webhook_config JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS error_details JSONB DEFAULT '{}';

-- Add check constraint for connection_status
ALTER TABLE facebook_integrations 
DROP CONSTRAINT IF EXISTS facebook_integrations_connection_status_check;

ALTER TABLE facebook_integrations 
ADD CONSTRAINT facebook_integrations_connection_status_check 
CHECK (connection_status IN ('active', 'expired', 'revoked', 'error'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_fb_int_org_id ON facebook_integrations(organization_id);
CREATE INDEX IF NOT EXISTS idx_fb_int_user_id ON facebook_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_fb_int_fb_user_id ON facebook_integrations(facebook_user_id);

-- Add unique constraint
ALTER TABLE facebook_integrations 
DROP CONSTRAINT IF EXISTS facebook_integrations_org_fb_user_unique;

ALTER TABLE facebook_integrations 
ADD CONSTRAINT facebook_integrations_org_fb_user_unique 
UNIQUE(organization_id, facebook_user_id);