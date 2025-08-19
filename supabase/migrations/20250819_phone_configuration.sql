-- Create phone_configurations table for storing phone setup details
CREATE TABLE IF NOT EXISTS phone_configurations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Phone details
    phone_number TEXT NOT NULL,
    phone_sid TEXT,
    
    -- Account type tracking
    is_external_account BOOLEAN DEFAULT false,
    twilio_account_sid TEXT,
    twilio_auth_token TEXT, -- Encrypted in production
    
    -- Billing
    monthly_charge DECIMAL(10, 2),
    currency TEXT DEFAULT 'GBP',
    
    -- Features and capabilities
    capabilities TEXT[] DEFAULT ARRAY['voice', 'sms'],
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one configuration per organization
    UNIQUE(organization_id)
);

-- Add phone configuration fields to organizations table if not exists
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS phone_configured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_setup_method TEXT CHECK (phone_setup_method IN ('platform', 'external', NULL));

-- Create webhook logs table for debugging
CREATE TABLE IF NOT EXISTS phone_webhook_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    webhook_type TEXT NOT NULL,
    phone_number TEXT,
    from_number TEXT,
    to_number TEXT,
    message_sid TEXT,
    call_sid TEXT,
    status TEXT,
    direction TEXT,
    raw_data JSONB,
    processed BOOLEAN DEFAULT false,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_phone_configurations_org 
    ON phone_configurations(organization_id);

CREATE INDEX IF NOT EXISTS idx_phone_configurations_status 
    ON phone_configurations(status);

CREATE INDEX IF NOT EXISTS idx_phone_webhook_logs_org 
    ON phone_webhook_logs(organization_id);

CREATE INDEX IF NOT EXISTS idx_phone_webhook_logs_created 
    ON phone_webhook_logs(created_at DESC);

-- RLS Policies
ALTER TABLE phone_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Policy for phone_configurations
CREATE POLICY "Users can view their organization's phone config"
    ON phone_configurations
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM user_organizations 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage phone config"
    ON phone_configurations
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM user_organizations 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- Policy for webhook logs (read-only for debugging)
CREATE POLICY "Users can view their organization's webhook logs"
    ON phone_webhook_logs
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM user_organizations 
            WHERE user_id = auth.uid()
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_phone_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_phone_configurations_updated_at
    BEFORE UPDATE ON phone_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_phone_config_updated_at();

-- Add comment for documentation
COMMENT ON TABLE phone_configurations IS 'Stores phone number configuration for each organization, supporting both platform-provisioned and external Twilio accounts';
COMMENT ON COLUMN phone_configurations.is_external_account IS 'TRUE if using own Twilio account, FALSE if provisioned through platform';
COMMENT ON COLUMN phone_configurations.twilio_auth_token IS 'Encrypted auth token for external Twilio accounts';