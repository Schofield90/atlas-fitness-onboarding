-- Create client push tokens table
CREATE TABLE IF NOT EXISTS client_push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    push_token TEXT NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('fcm', 'expo', 'apns')),
    device_id TEXT,
    device_type TEXT, -- 'ios', 'android', 'web'
    app_version TEXT,
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, push_token)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_client_push_tokens_client_id ON client_push_tokens(client_id);
CREATE INDEX IF NOT EXISTS idx_client_push_tokens_organization_id ON client_push_tokens(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_push_tokens_is_active ON client_push_tokens(is_active);
CREATE INDEX IF NOT EXISTS idx_client_push_tokens_provider ON client_push_tokens(provider);

-- Create updated_at trigger
CREATE TRIGGER update_client_push_tokens_updated_at 
    BEFORE UPDATE ON client_push_tokens 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE client_push_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for client_push_tokens
CREATE POLICY "Users can view client push tokens in their organization" ON client_push_tokens
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can manage client push tokens in their organization" ON client_push_tokens
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Service role has full access to client push tokens" ON client_push_tokens
    FOR ALL USING (auth.role() = 'service_role');

-- Comments
COMMENT ON TABLE client_push_tokens IS 'Push notification tokens for mobile app clients';