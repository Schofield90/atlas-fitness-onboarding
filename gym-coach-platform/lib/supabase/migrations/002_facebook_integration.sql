-- Facebook Integration Tables
-- This migration adds support for Facebook OAuth integration, Pages, and Lead Generation

-- Create facebook_integrations table
CREATE TABLE facebook_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    facebook_user_id TEXT NOT NULL,
    facebook_user_name TEXT NOT NULL,
    facebook_user_email TEXT,
    access_token TEXT NOT NULL,
    token_expires_at TIMESTAMPTZ,
    refresh_token TEXT,
    granted_scopes TEXT[], -- Array of granted permissions
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, facebook_user_id)
);

-- Create facebook_pages table (referenced in error)
CREATE TABLE facebook_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID NOT NULL REFERENCES facebook_integrations(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    facebook_page_id TEXT NOT NULL,
    page_name TEXT NOT NULL,
    page_username TEXT,
    page_category TEXT,
    access_token TEXT NOT NULL,
    token_expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT false, -- The column mentioned in the error
    is_primary BOOLEAN DEFAULT false, -- Primary page for the organization
    page_info JSONB DEFAULT '{}', -- Store additional page metadata
    permissions TEXT[], -- Page-specific permissions
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, facebook_page_id),
    UNIQUE(organization_id, is_primary) WHERE is_primary = true -- Only one primary page per org
);

-- Create facebook_lead_forms table
CREATE TABLE facebook_lead_forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID NOT NULL REFERENCES facebook_pages(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    facebook_form_id TEXT NOT NULL,
    form_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
    questions JSONB DEFAULT '[]', -- Form questions structure
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, facebook_form_id)
);

-- Create facebook_leads table (raw Facebook leads before CRM conversion)
CREATE TABLE facebook_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID NOT NULL REFERENCES facebook_lead_forms(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    facebook_lead_id TEXT NOT NULL,
    lead_data JSONB NOT NULL, -- Raw lead data from Facebook
    processed_at TIMESTAMPTZ,
    crm_lead_id UUID REFERENCES leads(id), -- Link to converted CRM lead
    processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, facebook_lead_id)
);

-- Create facebook_webhooks table
CREATE TABLE facebook_webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    webhook_id TEXT,
    object_type TEXT NOT NULL, -- page, user, etc.
    event_type TEXT NOT NULL, -- feed, mention, leadgen, etc.
    event_data JSONB NOT NULL,
    processed_at TIMESTAMPTZ,
    processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create facebook_ad_accounts table
CREATE TABLE facebook_ad_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID NOT NULL REFERENCES facebook_integrations(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    facebook_ad_account_id TEXT NOT NULL,
    account_name TEXT NOT NULL,
    account_status TEXT,
    currency TEXT,
    timezone_name TEXT,
    is_active BOOLEAN DEFAULT true,
    permissions TEXT[], -- Ad account permissions
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, facebook_ad_account_id)
);

-- Create indexes for better performance
CREATE INDEX idx_facebook_integrations_organization_id ON facebook_integrations(organization_id);
CREATE INDEX idx_facebook_integrations_user_id ON facebook_integrations(user_id);
CREATE INDEX idx_facebook_integrations_facebook_user_id ON facebook_integrations(facebook_user_id);
CREATE INDEX idx_facebook_integrations_is_active ON facebook_integrations(is_active);

CREATE INDEX idx_facebook_pages_integration_id ON facebook_pages(integration_id);
CREATE INDEX idx_facebook_pages_organization_id ON facebook_pages(organization_id);
CREATE INDEX idx_facebook_pages_facebook_page_id ON facebook_pages(facebook_page_id);
CREATE INDEX idx_facebook_pages_is_active ON facebook_pages(is_active);
CREATE INDEX idx_facebook_pages_is_primary ON facebook_pages(is_primary);

CREATE INDEX idx_facebook_lead_forms_page_id ON facebook_lead_forms(page_id);
CREATE INDEX idx_facebook_lead_forms_organization_id ON facebook_lead_forms(organization_id);
CREATE INDEX idx_facebook_lead_forms_facebook_form_id ON facebook_lead_forms(facebook_form_id);
CREATE INDEX idx_facebook_lead_forms_is_active ON facebook_lead_forms(is_active);

CREATE INDEX idx_facebook_leads_form_id ON facebook_leads(form_id);
CREATE INDEX idx_facebook_leads_organization_id ON facebook_leads(organization_id);
CREATE INDEX idx_facebook_leads_facebook_lead_id ON facebook_leads(facebook_lead_id);
CREATE INDEX idx_facebook_leads_processing_status ON facebook_leads(processing_status);
CREATE INDEX idx_facebook_leads_crm_lead_id ON facebook_leads(crm_lead_id);
CREATE INDEX idx_facebook_leads_created_at ON facebook_leads(created_at);

CREATE INDEX idx_facebook_webhooks_organization_id ON facebook_webhooks(organization_id);
CREATE INDEX idx_facebook_webhooks_event_type ON facebook_webhooks(event_type);
CREATE INDEX idx_facebook_webhooks_processing_status ON facebook_webhooks(processing_status);
CREATE INDEX idx_facebook_webhooks_created_at ON facebook_webhooks(created_at);

CREATE INDEX idx_facebook_ad_accounts_integration_id ON facebook_ad_accounts(integration_id);
CREATE INDEX idx_facebook_ad_accounts_organization_id ON facebook_ad_accounts(organization_id);
CREATE INDEX idx_facebook_ad_accounts_facebook_ad_account_id ON facebook_ad_accounts(facebook_ad_account_id);

-- Create triggers for updated_at
CREATE TRIGGER update_facebook_integrations_updated_at BEFORE UPDATE ON facebook_integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facebook_pages_updated_at BEFORE UPDATE ON facebook_pages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facebook_lead_forms_updated_at BEFORE UPDATE ON facebook_lead_forms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facebook_ad_accounts_updated_at BEFORE UPDATE ON facebook_ad_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE facebook_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_lead_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_ad_accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Facebook Integrations: Users can only see integrations in their organization
CREATE POLICY "Users can view facebook integrations in their organization" ON facebook_integrations
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage facebook integrations in their organization" ON facebook_integrations
    FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Facebook Pages: Users can only see pages in their organization
CREATE POLICY "Users can view facebook pages in their organization" ON facebook_pages
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage facebook pages in their organization" ON facebook_pages
    FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Facebook Lead Forms: Users can only see forms in their organization
CREATE POLICY "Users can view facebook lead forms in their organization" ON facebook_lead_forms
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage facebook lead forms in their organization" ON facebook_lead_forms
    FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Facebook Leads: Users can only see leads in their organization
CREATE POLICY "Users can view facebook leads in their organization" ON facebook_leads
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage facebook leads in their organization" ON facebook_leads
    FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Facebook Webhooks: Users can only see webhooks in their organization
CREATE POLICY "Users can view facebook webhooks in their organization" ON facebook_webhooks
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage facebook webhooks in their organization" ON facebook_webhooks
    FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Facebook Ad Accounts: Users can only see ad accounts in their organization
CREATE POLICY "Users can view facebook ad accounts in their organization" ON facebook_ad_accounts
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage facebook ad accounts in their organization" ON facebook_ad_accounts
    FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Create function to process Facebook lead to CRM lead
CREATE OR REPLACE FUNCTION process_facebook_lead(facebook_lead_id UUID)
RETURNS UUID AS $$
DECLARE
    fb_lead RECORD;
    crm_lead_id UUID;
    lead_name TEXT;
    lead_email TEXT;
    lead_phone TEXT;
    lead_source TEXT := 'facebook';
BEGIN
    -- Get the Facebook lead
    SELECT fl.*, flf.form_name, fp.page_name 
    INTO fb_lead
    FROM facebook_leads fl
    JOIN facebook_lead_forms flf ON fl.form_id = flf.id
    JOIN facebook_pages fp ON flf.page_id = fp.id
    WHERE fl.id = facebook_lead_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Facebook lead not found: %', facebook_lead_id;
    END IF;
    
    -- Extract lead data from JSON
    lead_name := fb_lead.lead_data->>'full_name';
    IF lead_name IS NULL THEN
        lead_name := COALESCE(fb_lead.lead_data->>'first_name', '') || ' ' || COALESCE(fb_lead.lead_data->>'last_name', '');
    END IF;
    
    lead_email := fb_lead.lead_data->>'email';
    lead_phone := fb_lead.lead_data->>'phone_number';
    
    -- Create or update CRM lead
    INSERT INTO leads (
        organization_id,
        name,
        email,
        phone,
        source,
        metadata,
        created_at
    ) VALUES (
        fb_lead.organization_id,
        TRIM(lead_name),
        lead_email,
        lead_phone,
        lead_source,
        jsonb_build_object(
            'facebook_lead_id', fb_lead.facebook_lead_id,
            'facebook_form_name', fb_lead.form_name,
            'facebook_page_name', fb_lead.page_name,
            'raw_data', fb_lead.lead_data
        ),
        fb_lead.created_at
    )
    ON CONFLICT (organization_id, email) 
    DO UPDATE SET
        metadata = leads.metadata || jsonb_build_object(
            'facebook_lead_id', fb_lead.facebook_lead_id,
            'facebook_form_name', fb_lead.form_name,
            'facebook_page_name', fb_lead.page_name,
            'raw_data', fb_lead.lead_data
        ),
        updated_at = NOW()
    RETURNING id INTO crm_lead_id;
    
    -- Update the Facebook lead record
    UPDATE facebook_leads 
    SET 
        crm_lead_id = crm_lead_id,
        processed_at = NOW(),
        processing_status = 'processed'
    WHERE id = facebook_lead_id;
    
    RETURN crm_lead_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to automatically process Facebook leads
CREATE OR REPLACE FUNCTION auto_process_facebook_lead()
RETURNS TRIGGER AS $$
BEGIN
    -- Process the lead asynchronously (in a real implementation, you might queue this)
    BEGIN
        PERFORM process_facebook_lead(NEW.id);
    EXCEPTION WHEN OTHERS THEN
        -- Log error and continue
        UPDATE facebook_leads 
        SET 
            processing_status = 'failed',
            error_message = SQLERRM
        WHERE id = NEW.id;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-process new Facebook leads
CREATE TRIGGER auto_process_facebook_lead_trigger
    AFTER INSERT ON facebook_leads
    FOR EACH ROW
    EXECUTE FUNCTION auto_process_facebook_lead();

COMMENT ON TABLE facebook_integrations IS 'Stores Facebook OAuth integration data for organizations';
COMMENT ON TABLE facebook_pages IS 'Stores Facebook Page information linked to integrations';
COMMENT ON TABLE facebook_lead_forms IS 'Stores Facebook Lead Generation form information';
COMMENT ON TABLE facebook_leads IS 'Stores raw Facebook leads before CRM conversion';
COMMENT ON TABLE facebook_webhooks IS 'Stores Facebook webhook events for processing';
COMMENT ON TABLE facebook_ad_accounts IS 'Stores Facebook Ad Account information';