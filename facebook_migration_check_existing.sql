-- Safe migration that checks what exists first

-- First, let's check what facebook tables already exist
DO $$
DECLARE
    tables_info TEXT := '';
BEGIN
    -- Log existing facebook tables
    SELECT string_agg(table_name, ', ') 
    INTO tables_info
    FROM information_schema.tables 
    WHERE table_name LIKE 'facebook%' AND table_schema = 'public';
    
    RAISE NOTICE 'Existing Facebook tables: %', COALESCE(tables_info, 'none');
END $$;

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Update existing facebook_integrations table
ALTER TABLE facebook_integrations 
ADD COLUMN IF NOT EXISTS facebook_user_id TEXT,
ADD COLUMN IF NOT EXISTS facebook_user_name TEXT,
ADD COLUMN IF NOT EXISTS facebook_user_email TEXT,
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS refresh_token TEXT,
ADD COLUMN IF NOT EXISTS long_lived_token TEXT,
ADD COLUMN IF NOT EXISTS granted_scopes TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS required_scopes TEXT[] DEFAULT '{leads_retrieval,pages_read_engagement,pages_manage_metadata}',
ADD COLUMN IF NOT EXISTS connection_status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sync_frequency_hours INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS webhook_config JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS error_details JSONB DEFAULT '{}';

-- Add check constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'facebook_integrations_connection_status_check'
    ) THEN
        ALTER TABLE facebook_integrations 
        ADD CONSTRAINT facebook_integrations_connection_status_check 
        CHECK (connection_status IN ('active', 'expired', 'revoked', 'error'));
    END IF;
END $$;

-- Update existing data
UPDATE facebook_integrations 
SET facebook_user_id = COALESCE(facebook_user_id, page_id),
    facebook_user_name = COALESCE(facebook_user_name, page_name)
WHERE facebook_user_id IS NULL AND page_id IS NOT NULL;

-- Handle facebook_pages table (might already exist)
DO $$
BEGIN
    -- Check if facebook_pages exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'facebook_pages') THEN
        -- Create new table
        CREATE TABLE facebook_pages (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            integration_id UUID NOT NULL REFERENCES facebook_integrations(id) ON DELETE CASCADE,
            organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            facebook_page_id TEXT NOT NULL,
            page_name TEXT NOT NULL,
            page_username TEXT,
            page_category TEXT,
            page_category_list JSONB DEFAULT '[]',
            access_token TEXT NOT NULL,
            token_expires_at TIMESTAMPTZ,
            is_active BOOLEAN DEFAULT false,
            is_primary BOOLEAN DEFAULT false,
            webhook_subscribed BOOLEAN DEFAULT false,
            page_info JSONB DEFAULT '{}',
            permissions TEXT[] DEFAULT '{}',
            page_insights JSONB DEFAULT '{}',
            lead_sync_enabled BOOLEAN DEFAULT true,
            auto_assign_leads BOOLEAN DEFAULT true,
            default_lead_status TEXT DEFAULT 'new',
            lead_assignment_rules JSONB DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            last_sync_at TIMESTAMPTZ,
            UNIQUE(organization_id, facebook_page_id)
        );
    ELSE
        -- Add missing columns to existing table
        ALTER TABLE facebook_pages
        ADD COLUMN IF NOT EXISTS integration_id UUID REFERENCES facebook_integrations(id) ON DELETE CASCADE,
        ADD COLUMN IF NOT EXISTS page_username TEXT,
        ADD COLUMN IF NOT EXISTS page_category TEXT,
        ADD COLUMN IF NOT EXISTS page_category_list JSONB DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS webhook_subscribed BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS page_info JSONB DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS page_insights JSONB DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS lead_sync_enabled BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS auto_assign_leads BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS default_lead_status TEXT DEFAULT 'new',
        ADD COLUMN IF NOT EXISTS lead_assignment_rules JSONB DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;
        
        -- Try to link existing pages to integrations if possible
        UPDATE facebook_pages fp
        SET integration_id = fi.id
        FROM facebook_integrations fi
        WHERE fp.organization_id = fi.organization_id
        AND fp.integration_id IS NULL
        AND fi.page_id = fp.facebook_page_id;
    END IF;
END $$;

-- Create remaining tables only if they don't exist
CREATE TABLE IF NOT EXISTS facebook_lead_forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID REFERENCES facebook_pages(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    facebook_form_id TEXT NOT NULL,
    form_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived', 'deleted')),
    questions JSONB DEFAULT '[]',
    field_mappings JSONB DEFAULT '{}',
    custom_field_mappings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    auto_sync_enabled BOOLEAN DEFAULT true,
    lead_qualification_rules JSONB DEFAULT '{}',
    form_description TEXT,
    thank_you_message TEXT,
    privacy_policy_url TEXT,
    created_time TIMESTAMPTZ,
    last_sync_at TIMESTAMPTZ,
    total_leads_count INTEGER DEFAULT 0,
    processed_leads_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, facebook_form_id)
);

CREATE TABLE IF NOT EXISTS facebook_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID REFERENCES facebook_lead_forms(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    facebook_lead_id TEXT NOT NULL,
    lead_data JSONB NOT NULL,
    field_data JSONB NOT NULL DEFAULT '{}',
    custom_fields JSONB DEFAULT '{}',
    crm_lead_id UUID REFERENCES leads(id),
    processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'processed', 'failed', 'duplicate')),
    qualification_score INTEGER DEFAULT 0,
    qualification_status TEXT DEFAULT 'unqualified' CHECK (qualification_status IN ('unqualified', 'qualified', 'hot', 'cold')),
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    ad_id TEXT,
    ad_name TEXT,
    campaign_id TEXT,
    campaign_name TEXT,
    created_time TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, facebook_lead_id)
);

CREATE TABLE IF NOT EXISTS facebook_webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    webhook_id TEXT,
    object_type TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_data JSONB NOT NULL,
    processed_at TIMESTAMPTZ,
    processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processed', 'failed', 'ignored')),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    facebook_page_id TEXT,
    facebook_form_id TEXT,
    facebook_lead_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT facebook_webhooks_processing_check 
        CHECK (processing_status = 'processed' OR processed_at IS NULL)
);

CREATE TABLE IF NOT EXISTS facebook_ad_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID REFERENCES facebook_integrations(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    facebook_ad_account_id TEXT NOT NULL,
    account_name TEXT NOT NULL,
    account_status TEXT,
    currency TEXT,
    timezone_name TEXT,
    is_active BOOLEAN DEFAULT true,
    permissions TEXT[] DEFAULT '{}',
    account_capabilities JSONB DEFAULT '[]',
    business_id TEXT,
    business_name TEXT,
    spend_cap INTEGER,
    last_insights_sync_at TIMESTAMPTZ,
    insights_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, facebook_ad_account_id)
);

CREATE TABLE IF NOT EXISTS facebook_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad_account_id UUID REFERENCES facebook_ad_accounts(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    facebook_campaign_id TEXT NOT NULL,
    campaign_name TEXT NOT NULL,
    objective TEXT,
    status TEXT,
    insights JSONB DEFAULT '{}',
    spend DECIMAL(10,2) DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    leads_count INTEGER DEFAULT 0,
    start_time TIMESTAMPTZ,
    stop_time TIMESTAMPTZ,
    last_insights_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, facebook_campaign_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_facebook_integrations_organization_id ON facebook_integrations(organization_id);
CREATE INDEX IF NOT EXISTS idx_facebook_integrations_user_id ON facebook_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_facebook_integrations_facebook_user_id ON facebook_integrations(facebook_user_id);
CREATE INDEX IF NOT EXISTS idx_facebook_integrations_is_active ON facebook_integrations(is_active);
CREATE INDEX IF NOT EXISTS idx_facebook_integrations_connection_status ON facebook_integrations(connection_status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_facebook_pages_primary_per_org ON facebook_pages(organization_id, is_primary) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_facebook_pages_integration_id ON facebook_pages(integration_id);
CREATE INDEX IF NOT EXISTS idx_facebook_pages_organization_id ON facebook_pages(organization_id);
CREATE INDEX IF NOT EXISTS idx_facebook_pages_facebook_page_id ON facebook_pages(facebook_page_id);

CREATE INDEX IF NOT EXISTS idx_facebook_lead_forms_page_id ON facebook_lead_forms(page_id);
CREATE INDEX IF NOT EXISTS idx_facebook_lead_forms_organization_id ON facebook_lead_forms(organization_id);

CREATE INDEX IF NOT EXISTS idx_facebook_leads_form_id ON facebook_leads(form_id);
CREATE INDEX IF NOT EXISTS idx_facebook_leads_organization_id ON facebook_leads(organization_id);

-- Enable RLS
ALTER TABLE facebook_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_lead_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_campaigns ENABLE ROW LEVEL SECURITY;

-- Create update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers where needed
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_facebook_pages_updated_at') THEN
        CREATE TRIGGER update_facebook_pages_updated_at BEFORE UPDATE ON facebook_pages
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Basic RLS policies (simplified)
DO $$
BEGIN
    -- facebook_integrations policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'facebook_integrations' AND policyname = 'Users can view facebook integrations in their organization') THEN
        CREATE POLICY "Users can view facebook integrations in their organization" ON facebook_integrations
            FOR SELECT USING (organization_id IN (
                SELECT organization_id FROM users WHERE id = auth.uid()
            ));
    END IF;
    
    -- facebook_pages policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'facebook_pages' AND policyname = 'Users can view facebook pages in their organization') THEN
        CREATE POLICY "Users can view facebook pages in their organization" ON facebook_pages
            FOR SELECT USING (organization_id IN (
                SELECT organization_id FROM users WHERE id = auth.uid()
            ));
    END IF;
END $$;

-- Summary of what was done
DO $$
DECLARE
    tables_created TEXT := '';
BEGIN
    SELECT string_agg(table_name, ', ') 
    INTO tables_created
    FROM information_schema.tables 
    WHERE table_name LIKE 'facebook%' 
    AND table_schema = 'public'
    AND created > NOW() - INTERVAL '1 minute';
    
    RAISE NOTICE 'Facebook integration migration completed. New tables created: %', COALESCE(tables_created, 'none (all tables already existed)');
END $$;