-- Comprehensive Facebook Integration Migration
-- This migration creates all necessary tables for Facebook lead generation integration
-- Supporting multi-tenant access, OAuth tokens, pages, lead forms, and leads

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create facebook_integrations table for storing OAuth tokens and integration details
CREATE TABLE IF NOT EXISTS facebook_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    long_lived_token TEXT, -- Facebook long-lived user access token
    
    -- Permission and scope management
    granted_scopes TEXT[] DEFAULT '{}', -- Array of granted permissions
    required_scopes TEXT[] DEFAULT '{leads_retrieval,pages_read_engagement,pages_manage_metadata}',
    
    -- Integration status
    is_active BOOLEAN DEFAULT true,
    connection_status TEXT NOT NULL DEFAULT 'active' CHECK (connection_status IN ('active', 'expired', 'revoked', 'error')),
    last_sync_at TIMESTAMPTZ,
    sync_frequency_hours INTEGER DEFAULT 1, -- How often to sync leads
    
    -- Configuration and metadata
    settings JSONB DEFAULT '{}',
    webhook_config JSONB DEFAULT '{}', -- Webhook configuration
    error_details JSONB DEFAULT '{}', -- Store connection errors
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(organization_id, facebook_user_id)
);

-- Create facebook_pages table for storing connected Facebook pages
CREATE TABLE IF NOT EXISTS facebook_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID NOT NULL REFERENCES facebook_integrations(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Facebook page information
    facebook_page_id TEXT NOT NULL,
    page_name TEXT NOT NULL,
    page_username TEXT,
    page_category TEXT,
    page_category_list JSONB DEFAULT '[]', -- Array of category objects
    
    -- Page access token (different from user token)
    access_token TEXT NOT NULL,
    token_expires_at TIMESTAMPTZ,
    
    -- Page status and configuration
    is_active BOOLEAN DEFAULT false,
    is_primary BOOLEAN DEFAULT false, -- Primary page for the organization
    webhook_subscribed BOOLEAN DEFAULT false,
    
    -- Page metadata and permissions
    page_info JSONB DEFAULT '{}', -- Store additional page metadata (about, website, etc.)
    permissions TEXT[] DEFAULT '{}', -- Page-specific permissions
    page_insights JSONB DEFAULT '{}', -- Store page insights data
    
    -- Lead generation settings
    lead_sync_enabled BOOLEAN DEFAULT true,
    auto_assign_leads BOOLEAN DEFAULT true,
    default_lead_status TEXT DEFAULT 'new',
    lead_assignment_rules JSONB DEFAULT '{}', -- Rules for auto-assigning leads to staff
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_sync_at TIMESTAMPTZ,
    
    -- Constraints
    UNIQUE(organization_id, facebook_page_id),
    UNIQUE(organization_id, is_primary) WHERE is_primary = true -- Only one primary page per org
);

-- Create facebook_lead_forms table for storing lead forms from each page
CREATE TABLE IF NOT EXISTS facebook_lead_forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID NOT NULL REFERENCES facebook_pages(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Facebook form information
    facebook_form_id TEXT NOT NULL,
    form_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived', 'deleted')),
    
    -- Form structure and field mapping
    questions JSONB DEFAULT '[]', -- Form questions structure from Facebook
    field_mappings JSONB DEFAULT '{}', -- Mapping Facebook fields to CRM fields
    custom_field_mappings JSONB DEFAULT '{}', -- Custom field mappings
    
    -- Form configuration
    is_active BOOLEAN DEFAULT true,
    auto_sync_enabled BOOLEAN DEFAULT true,
    lead_qualification_rules JSONB DEFAULT '{}', -- Rules for qualifying leads
    
    -- Form metadata
    form_description TEXT,
    thank_you_message TEXT,
    privacy_policy_url TEXT,
    created_time TIMESTAMPTZ, -- When form was created on Facebook
    
    -- Sync and processing
    last_sync_at TIMESTAMPTZ,
    total_leads_count INTEGER DEFAULT 0,
    processed_leads_count INTEGER DEFAULT 0,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(organization_id, facebook_form_id)
);

-- Create facebook_leads table for storing actual leads from forms
CREATE TABLE IF NOT EXISTS facebook_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID NOT NULL REFERENCES facebook_lead_forms(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Facebook lead identification
    facebook_lead_id TEXT NOT NULL,
    
    -- Raw lead data from Facebook
    lead_data JSONB NOT NULL, -- Raw lead data structure from Facebook API
    field_data JSONB NOT NULL DEFAULT '{}', -- Processed field data
    custom_fields JSONB DEFAULT '{}', -- Additional custom fields
    
    -- Lead processing and CRM integration
    crm_lead_id UUID REFERENCES leads(id), -- Link to converted CRM lead
    processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'processed', 'failed', 'duplicate')),
    
    -- Lead qualification and scoring
    qualification_score INTEGER DEFAULT 0,
    qualification_status TEXT DEFAULT 'unqualified' CHECK (qualification_status IN ('unqualified', 'qualified', 'hot', 'cold')),
    
    -- Processing details
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Lead metadata
    ad_id TEXT, -- Associated ad ID if available
    ad_name TEXT, -- Associated ad name
    campaign_id TEXT, -- Associated campaign ID
    campaign_name TEXT, -- Associated campaign name
    
    -- Timestamps from Facebook
    created_time TIMESTAMPTZ NOT NULL, -- When lead was created on Facebook
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(organization_id, facebook_lead_id)
);

-- Create facebook_webhooks table for storing webhook events
CREATE TABLE IF NOT EXISTS facebook_webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Webhook identification
    webhook_id TEXT, -- Facebook webhook ID if available
    
    -- Event details
    object_type TEXT NOT NULL, -- page, user, etc.
    event_type TEXT NOT NULL, -- feed, mention, leadgen, etc.
    event_data JSONB NOT NULL, -- Raw webhook payload
    
    -- Processing status
    processed_at TIMESTAMPTZ,
    processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processed', 'failed', 'ignored')),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Event metadata
    facebook_page_id TEXT,
    facebook_form_id TEXT,
    facebook_lead_id TEXT,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes for webhook processing
    CONSTRAINT facebook_webhooks_processing_check 
        CHECK (processing_status = 'processed' OR processed_at IS NULL)
);

-- Create facebook_ad_accounts table for storing ad account information
CREATE TABLE IF NOT EXISTS facebook_ad_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID NOT NULL REFERENCES facebook_integrations(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Facebook ad account information
    facebook_ad_account_id TEXT NOT NULL,
    account_name TEXT NOT NULL,
    account_status TEXT,
    currency TEXT,
    timezone_name TEXT,
    
    -- Account capabilities and permissions
    is_active BOOLEAN DEFAULT true,
    permissions TEXT[] DEFAULT '{}', -- Ad account permissions
    account_capabilities JSONB DEFAULT '[]', -- Available capabilities
    
    -- Account metadata
    business_id TEXT, -- Associated Facebook Business ID
    business_name TEXT,
    spend_cap INTEGER, -- Account spend cap in cents
    
    -- Sync and insights
    last_insights_sync_at TIMESTAMPTZ,
    insights_data JSONB DEFAULT '{}', -- Store account insights
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(organization_id, facebook_ad_account_id)
);

-- Create facebook_campaigns table for tracking campaign performance
CREATE TABLE IF NOT EXISTS facebook_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad_account_id UUID NOT NULL REFERENCES facebook_ad_accounts(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Campaign information
    facebook_campaign_id TEXT NOT NULL,
    campaign_name TEXT NOT NULL,
    objective TEXT,
    status TEXT,
    
    -- Campaign insights and metrics
    insights JSONB DEFAULT '{}',
    spend DECIMAL(10,2) DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    leads_count INTEGER DEFAULT 0,
    
    -- Date tracking
    start_time TIMESTAMPTZ,
    stop_time TIMESTAMPTZ,
    last_insights_sync_at TIMESTAMPTZ,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(organization_id, facebook_campaign_id)
);

-- Create comprehensive indexes for performance
CREATE INDEX IF NOT EXISTS idx_facebook_integrations_organization_id ON facebook_integrations(organization_id);
CREATE INDEX IF NOT EXISTS idx_facebook_integrations_user_id ON facebook_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_facebook_integrations_facebook_user_id ON facebook_integrations(facebook_user_id);
CREATE INDEX IF NOT EXISTS idx_facebook_integrations_is_active ON facebook_integrations(is_active);
CREATE INDEX IF NOT EXISTS idx_facebook_integrations_connection_status ON facebook_integrations(connection_status);
CREATE INDEX IF NOT EXISTS idx_facebook_integrations_token_expires_at ON facebook_integrations(token_expires_at) WHERE token_expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_facebook_pages_integration_id ON facebook_pages(integration_id);
CREATE INDEX IF NOT EXISTS idx_facebook_pages_organization_id ON facebook_pages(organization_id);
CREATE INDEX IF NOT EXISTS idx_facebook_pages_facebook_page_id ON facebook_pages(facebook_page_id);
CREATE INDEX IF NOT EXISTS idx_facebook_pages_is_active ON facebook_pages(is_active);
CREATE INDEX IF NOT EXISTS idx_facebook_pages_is_primary ON facebook_pages(is_primary);
CREATE INDEX IF NOT EXISTS idx_facebook_pages_webhook_subscribed ON facebook_pages(webhook_subscribed);

CREATE INDEX IF NOT EXISTS idx_facebook_lead_forms_page_id ON facebook_lead_forms(page_id);
CREATE INDEX IF NOT EXISTS idx_facebook_lead_forms_organization_id ON facebook_lead_forms(organization_id);
CREATE INDEX IF NOT EXISTS idx_facebook_lead_forms_facebook_form_id ON facebook_lead_forms(facebook_form_id);
CREATE INDEX IF NOT EXISTS idx_facebook_lead_forms_is_active ON facebook_lead_forms(is_active);
CREATE INDEX IF NOT EXISTS idx_facebook_lead_forms_status ON facebook_lead_forms(status);

CREATE INDEX IF NOT EXISTS idx_facebook_leads_form_id ON facebook_leads(form_id);
CREATE INDEX IF NOT EXISTS idx_facebook_leads_organization_id ON facebook_leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_facebook_leads_facebook_lead_id ON facebook_leads(facebook_lead_id);
CREATE INDEX IF NOT EXISTS idx_facebook_leads_processing_status ON facebook_leads(processing_status);
CREATE INDEX IF NOT EXISTS idx_facebook_leads_crm_lead_id ON facebook_leads(crm_lead_id);
CREATE INDEX IF NOT EXISTS idx_facebook_leads_created_time ON facebook_leads(created_time);
CREATE INDEX IF NOT EXISTS idx_facebook_leads_qualification_status ON facebook_leads(qualification_status);
CREATE INDEX IF NOT EXISTS idx_facebook_leads_campaign_id ON facebook_leads(campaign_id) WHERE campaign_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_facebook_webhooks_organization_id ON facebook_webhooks(organization_id);
CREATE INDEX IF NOT EXISTS idx_facebook_webhooks_event_type ON facebook_webhooks(event_type);
CREATE INDEX IF NOT EXISTS idx_facebook_webhooks_processing_status ON facebook_webhooks(processing_status);
CREATE INDEX IF NOT EXISTS idx_facebook_webhooks_created_at ON facebook_webhooks(created_at);
CREATE INDEX IF NOT EXISTS idx_facebook_webhooks_facebook_page_id ON facebook_webhooks(facebook_page_id) WHERE facebook_page_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_facebook_webhooks_facebook_lead_id ON facebook_webhooks(facebook_lead_id) WHERE facebook_lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_facebook_ad_accounts_integration_id ON facebook_ad_accounts(integration_id);
CREATE INDEX IF NOT EXISTS idx_facebook_ad_accounts_organization_id ON facebook_ad_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_facebook_ad_accounts_facebook_ad_account_id ON facebook_ad_accounts(facebook_ad_account_id);
CREATE INDEX IF NOT EXISTS idx_facebook_ad_accounts_is_active ON facebook_ad_accounts(is_active);

CREATE INDEX IF NOT EXISTS idx_facebook_campaigns_ad_account_id ON facebook_campaigns(ad_account_id);
CREATE INDEX IF NOT EXISTS idx_facebook_campaigns_organization_id ON facebook_campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_facebook_campaigns_facebook_campaign_id ON facebook_campaigns(facebook_campaign_id);
CREATE INDEX IF NOT EXISTS idx_facebook_campaigns_status ON facebook_campaigns(status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_facebook_integrations_updated_at BEFORE UPDATE ON facebook_integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facebook_pages_updated_at BEFORE UPDATE ON facebook_pages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facebook_lead_forms_updated_at BEFORE UPDATE ON facebook_lead_forms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facebook_leads_updated_at BEFORE UPDATE ON facebook_leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facebook_ad_accounts_updated_at BEFORE UPDATE ON facebook_ad_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facebook_campaigns_updated_at BEFORE UPDATE ON facebook_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE facebook_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_lead_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_campaigns ENABLE ROW LEVEL SECURITY;

-- Create comprehensive RLS policies for multi-tenant access

-- Facebook Integrations RLS Policies
CREATE POLICY "Users can view facebook integrations in their organization" ON facebook_integrations
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert facebook integrations in their organization" ON facebook_integrations
    FOR INSERT WITH CHECK (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update facebook integrations in their organization" ON facebook_integrations
    FOR UPDATE USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete facebook integrations in their organization" ON facebook_integrations
    FOR DELETE USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- Facebook Pages RLS Policies
CREATE POLICY "Users can view facebook pages in their organization" ON facebook_pages
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert facebook pages in their organization" ON facebook_pages
    FOR INSERT WITH CHECK (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update facebook pages in their organization" ON facebook_pages
    FOR UPDATE USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete facebook pages in their organization" ON facebook_pages
    FOR DELETE USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- Facebook Lead Forms RLS Policies
CREATE POLICY "Users can view facebook lead forms in their organization" ON facebook_lead_forms
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert facebook lead forms in their organization" ON facebook_lead_forms
    FOR INSERT WITH CHECK (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update facebook lead forms in their organization" ON facebook_lead_forms
    FOR UPDATE USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete facebook lead forms in their organization" ON facebook_lead_forms
    FOR DELETE USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- Facebook Leads RLS Policies
CREATE POLICY "Users can view facebook leads in their organization" ON facebook_leads
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert facebook leads in their organization" ON facebook_leads
    FOR INSERT WITH CHECK (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update facebook leads in their organization" ON facebook_leads
    FOR UPDATE USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete facebook leads in their organization" ON facebook_leads
    FOR DELETE USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- Facebook Webhooks RLS Policies
CREATE POLICY "Users can view facebook webhooks in their organization" ON facebook_webhooks
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert facebook webhooks in their organization" ON facebook_webhooks
    FOR INSERT WITH CHECK (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update facebook webhooks in their organization" ON facebook_webhooks
    FOR UPDATE USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete facebook webhooks in their organization" ON facebook_webhooks
    FOR DELETE USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- Facebook Ad Accounts RLS Policies
CREATE POLICY "Users can view facebook ad accounts in their organization" ON facebook_ad_accounts
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert facebook ad accounts in their organization" ON facebook_ad_accounts
    FOR INSERT WITH CHECK (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update facebook ad accounts in their organization" ON facebook_ad_accounts
    FOR UPDATE USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete facebook ad accounts in their organization" ON facebook_ad_accounts
    FOR DELETE USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- Facebook Campaigns RLS Policies
CREATE POLICY "Users can view facebook campaigns in their organization" ON facebook_campaigns
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert facebook campaigns in their organization" ON facebook_campaigns
    FOR INSERT WITH CHECK (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update facebook campaigns in their organization" ON facebook_campaigns
    FOR UPDATE USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete facebook campaigns in their organization" ON facebook_campaigns
    FOR DELETE USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- Create advanced functions for Facebook lead processing

-- Function to process Facebook lead data into CRM lead
CREATE OR REPLACE FUNCTION process_facebook_lead_to_crm(
    p_facebook_lead_id UUID
)
RETURNS UUID AS $$
DECLARE
    fb_lead RECORD;
    crm_lead_id UUID;
    lead_name TEXT;
    lead_email TEXT;
    lead_phone TEXT;
    lead_source TEXT := 'facebook_lead_form';
    lead_metadata JSONB;
BEGIN
    -- Get the Facebook lead with related form and page data
    SELECT 
        fl.*, 
        flf.form_name, 
        flf.field_mappings,
        fp.page_name,
        fp.facebook_page_id,
        fc.campaign_name,
        fc.facebook_campaign_id
    INTO fb_lead
    FROM facebook_leads fl
    JOIN facebook_lead_forms flf ON fl.form_id = flf.id
    JOIN facebook_pages fp ON flf.page_id = fp.id
    LEFT JOIN facebook_campaigns fc ON fl.campaign_id = fc.facebook_campaign_id
    WHERE fl.id = p_facebook_lead_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Facebook lead not found: %', p_facebook_lead_id;
    END IF;
    
    -- Extract lead data using field mappings or fallback to common field names
    lead_name := COALESCE(
        fb_lead.field_data->>'full_name',
        fb_lead.field_data->>'name',
        CONCAT_WS(' ', 
            fb_lead.field_data->>'first_name', 
            fb_lead.field_data->>'last_name'
        )
    );
    
    lead_email := COALESCE(
        fb_lead.field_data->>'email',
        fb_lead.lead_data->>'email'
    );
    
    lead_phone := COALESCE(
        fb_lead.field_data->>'phone_number',
        fb_lead.field_data->>'phone',
        fb_lead.lead_data->>'phone_number'
    );
    
    -- Build comprehensive metadata
    lead_metadata := jsonb_build_object(
        'facebook_lead_id', fb_lead.facebook_lead_id,
        'facebook_form_name', fb_lead.form_name,
        'facebook_page_name', fb_lead.page_name,
        'facebook_page_id', fb_lead.facebook_page_id,
        'facebook_campaign_name', fb_lead.campaign_name,
        'facebook_campaign_id', fb_lead.facebook_campaign_id,
        'ad_id', fb_lead.ad_id,
        'ad_name', fb_lead.ad_name,
        'qualification_score', fb_lead.qualification_score,
        'raw_facebook_data', fb_lead.lead_data,
        'processed_field_data', fb_lead.field_data,
        'custom_fields', fb_lead.custom_fields,
        'facebook_created_time', fb_lead.created_time
    );
    
    -- Insert or update CRM lead
    INSERT INTO leads (
        organization_id,
        name,
        email,
        phone,
        source,
        status,
        metadata,
        created_at
    ) VALUES (
        fb_lead.organization_id,
        TRIM(lead_name),
        lead_email,
        lead_phone,
        lead_source,
        CASE 
            WHEN fb_lead.qualification_status = 'hot' THEN 'hot'
            WHEN fb_lead.qualification_status = 'qualified' THEN 'qualified'
            ELSE 'new'
        END,
        lead_metadata,
        fb_lead.created_time
    )
    ON CONFLICT (organization_id, email) 
    DO UPDATE SET
        metadata = leads.metadata || lead_metadata,
        updated_at = NOW()
    RETURNING id INTO crm_lead_id;
    
    -- Update the Facebook lead record with processing results
    UPDATE facebook_leads 
    SET 
        crm_lead_id = crm_lead_id,
        processed_at = NOW(),
        processing_status = 'processed'
    WHERE id = p_facebook_lead_id;
    
    RETURN crm_lead_id;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Update Facebook lead with error status
        UPDATE facebook_leads 
        SET 
            processing_status = 'failed',
            error_message = SQLERRM,
            retry_count = retry_count + 1
        WHERE id = p_facebook_lead_id;
        
        RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically process Facebook leads (trigger function)
CREATE OR REPLACE FUNCTION auto_process_facebook_lead()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process if auto-sync is enabled for the form
    IF EXISTS (
        SELECT 1 FROM facebook_lead_forms 
        WHERE id = NEW.form_id 
        AND auto_sync_enabled = true 
        AND is_active = true
    ) THEN
        -- Attempt to process the lead
        BEGIN
            PERFORM process_facebook_lead_to_crm(NEW.id);
        EXCEPTION 
            WHEN OTHERS THEN
                -- Error handling is done within the process function
                NULL;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to qualify Facebook leads based on rules
CREATE OR REPLACE FUNCTION qualify_facebook_lead(
    p_facebook_lead_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    fb_lead RECORD;
    form_rules JSONB;
    qualification_score INTEGER := 0;
    field_value TEXT;
    rule JSONB;
BEGIN
    -- Get lead and form qualification rules
    SELECT fl.*, flf.lead_qualification_rules
    INTO fb_lead
    FROM facebook_leads fl
    JOIN facebook_lead_forms flf ON fl.form_id = flf.id
    WHERE fl.id = p_facebook_lead_id;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    form_rules := fb_lead.lead_qualification_rules;
    
    -- Process qualification rules (example implementation)
    IF form_rules IS NOT NULL THEN
        FOR rule IN SELECT * FROM jsonb_array_elements(form_rules)
        LOOP
            field_value := fb_lead.field_data->>rule->>'field';
            
            -- Score based on field presence
            IF rule->>'type' = 'field_present' AND field_value IS NOT NULL AND field_value != '' THEN
                qualification_score := qualification_score + COALESCE((rule->>'score')::INTEGER, 10);
            END IF;
            
            -- Score based on field value matching
            IF rule->>'type' = 'field_contains' 
               AND field_value IS NOT NULL 
               AND field_value ILIKE '%' || (rule->>'value') || '%' THEN
                qualification_score := qualification_score + COALESCE((rule->>'score')::INTEGER, 20);
            END IF;
        END LOOP;
    END IF;
    
    -- Update lead with qualification score and status
    UPDATE facebook_leads 
    SET 
        qualification_score = qualification_score,
        qualification_status = CASE 
            WHEN qualification_score >= 80 THEN 'hot'
            WHEN qualification_score >= 50 THEN 'qualified'
            WHEN qualification_score >= 20 THEN 'cold'
            ELSE 'unqualified'
        END
    WHERE id = p_facebook_lead_id;
    
    RETURN qualification_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic Facebook lead processing
CREATE TRIGGER auto_process_facebook_lead_trigger
    AFTER INSERT ON facebook_leads
    FOR EACH ROW
    EXECUTE FUNCTION auto_process_facebook_lead();

-- Create trigger for automatic lead qualification
CREATE OR REPLACE FUNCTION auto_qualify_facebook_lead()
RETURNS TRIGGER AS $$
BEGIN
    -- Qualify the lead after field data is set
    IF NEW.field_data IS NOT NULL AND NEW.field_data != '{}' THEN
        PERFORM qualify_facebook_lead(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER auto_qualify_facebook_lead_trigger
    AFTER INSERT OR UPDATE OF field_data ON facebook_leads
    FOR EACH ROW
    EXECUTE FUNCTION auto_qualify_facebook_lead();

-- Add helpful comments for documentation
COMMENT ON TABLE facebook_integrations IS 'Stores Facebook OAuth integration data and settings for organizations';
COMMENT ON TABLE facebook_pages IS 'Stores Facebook Page information linked to integrations with lead generation settings';
COMMENT ON TABLE facebook_lead_forms IS 'Stores Facebook Lead Generation form information with field mappings and qualification rules';
COMMENT ON TABLE facebook_leads IS 'Stores actual Facebook leads with processing status and CRM integration';
COMMENT ON TABLE facebook_webhooks IS 'Stores Facebook webhook events for real-time lead processing';
COMMENT ON TABLE facebook_ad_accounts IS 'Stores Facebook Ad Account information for campaign tracking';
COMMENT ON TABLE facebook_campaigns IS 'Stores Facebook campaign data and performance metrics';

COMMENT ON FUNCTION process_facebook_lead_to_crm(UUID) IS 'Processes a Facebook lead into the CRM system with proper field mapping';
COMMENT ON FUNCTION qualify_facebook_lead(UUID) IS 'Qualifies a Facebook lead based on form-specific qualification rules';
COMMENT ON FUNCTION auto_process_facebook_lead() IS 'Trigger function to automatically process new Facebook leads';
COMMENT ON FUNCTION auto_qualify_facebook_lead() IS 'Trigger function to automatically qualify Facebook leads when field data is updated';