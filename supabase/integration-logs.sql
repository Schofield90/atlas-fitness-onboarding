-- Integration Logs Table for comprehensive error handling and monitoring
CREATE TABLE IF NOT EXISTS integration_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    integration_name TEXT NOT NULL, -- 'meta_ads', 'twilio', 'stripe', etc.
    integration_type TEXT NOT NULL, -- 'oauth', 'api_call', 'webhook', 'sync'
    action TEXT NOT NULL, -- Specific action like 'sync_pages', 'oauth_callback', etc.
    status TEXT NOT NULL CHECK (status IN ('success', 'error', 'warning')),
    details JSONB, -- Full error details, API response, etc.
    error_code TEXT, -- API-specific error code
    error_message TEXT, -- Human-readable error message
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    duration_ms INTEGER, -- How long the operation took
    metadata JSONB DEFAULT '{}', -- Additional context (endpoint, parameters, etc.)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_integration_logs_organization_id ON integration_logs(organization_id);
CREATE INDEX idx_integration_logs_integration_name ON integration_logs(integration_name);
CREATE INDEX idx_integration_logs_status ON integration_logs(status);
CREATE INDEX idx_integration_logs_created_at ON integration_logs(created_at);
CREATE INDEX idx_integration_logs_action ON integration_logs(action);

-- Table for storing failed webhook events that need retry
CREATE TABLE IF NOT EXISTS failed_webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    integration_name TEXT NOT NULL,
    event_data JSONB NOT NULL,
    error_message TEXT NOT NULL,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMPTZ NOT NULL,
    last_retry_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for retry processing
CREATE INDEX idx_failed_webhooks_organization_id ON failed_webhook_events(organization_id);
CREATE INDEX idx_failed_webhooks_integration_name ON failed_webhook_events(integration_name);
CREATE INDEX idx_failed_webhooks_next_retry_at ON failed_webhook_events(next_retry_at);
CREATE INDEX idx_failed_webhooks_resolved_at ON failed_webhook_events(resolved_at);

-- RLS policies
ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE failed_webhook_events ENABLE ROW LEVEL SECURITY;

-- Integration logs: Users can only view logs for their organization
CREATE POLICY "Users can view integration logs for their organization" ON integration_logs
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()));

CREATE POLICY "System can manage integration logs" ON integration_logs
    FOR ALL USING (true); -- Allow system operations

-- Failed webhooks: Users can only view failed webhooks for their organization
CREATE POLICY "Users can view failed webhooks for their organization" ON failed_webhook_events
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()));

CREATE POLICY "System can manage failed webhooks" ON failed_webhook_events
    FOR ALL USING (true); -- Allow system operations

-- Update trigger for failed_webhook_events
CREATE TRIGGER update_failed_webhook_events_updated_at 
    BEFORE UPDATE ON failed_webhook_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up old logs (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_integration_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM integration_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to retry failed webhook events
CREATE OR REPLACE FUNCTION get_webhooks_for_retry(integration_name TEXT DEFAULT NULL)
RETURNS SETOF failed_webhook_events AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM failed_webhook_events
    WHERE resolved_at IS NULL
      AND retry_count < max_retries
      AND next_retry_at <= NOW()
      AND (integration_name IS NULL OR failed_webhook_events.integration_name = integration_name)
    ORDER BY created_at
    LIMIT 100;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE integration_logs IS 'Comprehensive logging for all integration operations and errors';
COMMENT ON TABLE failed_webhook_events IS 'Webhook events that failed processing and need retry';
COMMENT ON FUNCTION cleanup_old_integration_logs() IS 'Cleans up integration logs older than 90 days';
COMMENT ON FUNCTION get_webhooks_for_retry(TEXT) IS 'Gets webhook events that are ready for retry';