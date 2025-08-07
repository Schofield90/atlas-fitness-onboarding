-- Facebook Integration Migration - Works with existing tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 1: Update existing facebook_integrations table
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

-- Update existing data - use page_id as facebook_user_id if needed
UPDATE facebook_integrations 
SET facebook_user_id = COALESCE(facebook_user_id, page_id),
    facebook_user_name = COALESCE(facebook_user_name, page_name)
WHERE facebook_user_id IS NULL AND page_id IS NOT NULL;

-- Step 2: Update existing facebook_pages table
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

-- Make organization_id NOT NULL if it isn't already
ALTER TABLE facebook_pages ALTER COLUMN organization_id SET NOT NULL;

-- Link existing pages to integrations
UPDATE facebook_pages fp
SET integration_id = fi.id
FROM facebook_integrations fi
WHERE fp.organization_id = fi.organization_id
AND fp.integration_id IS NULL
AND fi.page_id = fp.page_id;

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'facebook_pages_organization_id_page_id_key'
    ) THEN
        ALTER TABLE facebook_pages 
        ADD CONSTRAINT facebook_pages_organization_id_page_id_key 
        UNIQUE(organization_id, page_id);
    END IF;
END $$;

-- Step 3: Create remaining tables
CREATE TABLE IF NOT EXISTS facebook_lead_forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID NOT NULL REFERENCES facebook_pages(id) ON DELETE CASCADE,
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
    form_id UUID NOT NULL REFERENCES facebook_lead_forms(id) ON DELETE CASCADE,
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
    integration_id UUID NOT NULL REFERENCES facebook_integrations(id) ON DELETE CASCADE,
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
    ad_account_id UUID NOT NULL REFERENCES facebook_ad_accounts(id) ON DELETE CASCADE,
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

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_facebook_integrations_organization_id ON facebook_integrations(organization_id);
CREATE INDEX IF NOT EXISTS idx_facebook_integrations_user_id ON facebook_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_facebook_integrations_is_active ON facebook_integrations(is_active);

CREATE UNIQUE INDEX IF NOT EXISTS idx_facebook_pages_primary_per_org ON facebook_pages(organization_id, is_primary) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_facebook_pages_integration_id ON facebook_pages(integration_id);
CREATE INDEX IF NOT EXISTS idx_facebook_pages_organization_id ON facebook_pages(organization_id);
CREATE INDEX IF NOT EXISTS idx_facebook_pages_page_id ON facebook_pages(page_id);

CREATE INDEX IF NOT EXISTS idx_facebook_lead_forms_page_id ON facebook_lead_forms(page_id);
CREATE INDEX IF NOT EXISTS idx_facebook_lead_forms_organization_id ON facebook_lead_forms(organization_id);

CREATE INDEX IF NOT EXISTS idx_facebook_leads_form_id ON facebook_leads(form_id);
CREATE INDEX IF NOT EXISTS idx_facebook_leads_organization_id ON facebook_leads(organization_id);

-- Step 5: Enable RLS
ALTER TABLE facebook_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_lead_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_campaigns ENABLE ROW LEVEL SECURITY;

-- Step 6: Create update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Add update triggers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_facebook_integrations_updated_at') THEN
        CREATE TRIGGER update_facebook_integrations_updated_at BEFORE UPDATE ON facebook_integrations
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_facebook_pages_updated_at') THEN
        CREATE TRIGGER update_facebook_pages_updated_at BEFORE UPDATE ON facebook_pages
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

CREATE TRIGGER update_facebook_lead_forms_updated_at BEFORE UPDATE ON facebook_lead_forms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facebook_leads_updated_at BEFORE UPDATE ON facebook_leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facebook_ad_accounts_updated_at BEFORE UPDATE ON facebook_ad_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facebook_campaigns_updated_at BEFORE UPDATE ON facebook_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 8: Create basic RLS policies
-- Facebook integrations
CREATE POLICY "Users can view facebook integrations in their organization" ON facebook_integrations
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can manage facebook integrations in their organization" ON facebook_integrations
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- Facebook pages
CREATE POLICY "Users can view facebook pages in their organization" ON facebook_pages
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can manage facebook pages in their organization" ON facebook_pages
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- Facebook lead forms
CREATE POLICY "Users can view facebook lead forms in their organization" ON facebook_lead_forms
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can manage facebook lead forms in their organization" ON facebook_lead_forms
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- Facebook leads
CREATE POLICY "Users can view facebook leads in their organization" ON facebook_leads
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can manage facebook leads in their organization" ON facebook_leads
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- Facebook webhooks
CREATE POLICY "Users can view facebook webhooks in their organization" ON facebook_webhooks
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can manage facebook webhooks in their organization" ON facebook_webhooks
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- Facebook ad accounts
CREATE POLICY "Users can view facebook ad accounts in their organization" ON facebook_ad_accounts
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can manage facebook ad accounts in their organization" ON facebook_ad_accounts
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- Facebook campaigns
CREATE POLICY "Users can view facebook campaigns in their organization" ON facebook_campaigns
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can manage facebook campaigns in their organization" ON facebook_campaigns
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Facebook integration migration completed successfully!';
END $$;