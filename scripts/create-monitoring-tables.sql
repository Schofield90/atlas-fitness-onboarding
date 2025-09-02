-- Integration Health Logs Table
CREATE TABLE IF NOT EXISTS integration_health_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'error', 'disconnected')),
  checks JSONB NOT NULL DEFAULT '{}'::jsonb,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  message TEXT,
  checked_by UUID REFERENCES auth.users(id),
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_integration_health_logs_integration_id 
ON integration_health_logs(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_health_logs_checked_at 
ON integration_health_logs(checked_at DESC);

-- Token Refresh Logs Table
CREATE TABLE IF NOT EXISTS token_refresh_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id TEXT NOT NULL,
  results JSONB NOT NULL DEFAULT '[]'::jsonb,
  refreshed_by UUID REFERENCES auth.users(id),
  refreshed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  force_refresh BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_token_refresh_logs_integration_id 
ON token_refresh_logs(integration_id);
CREATE INDEX IF NOT EXISTS idx_token_refresh_logs_refreshed_at 
ON token_refresh_logs(refreshed_at DESC);

-- Webhook Failures Table
CREATE TABLE IF NOT EXISTS webhook_failures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES organizations(id),
  webhook_type TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  payload JSONB NOT NULL,
  headers JSONB DEFAULT '{}'::jsonb,
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  last_attempt TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_webhook_failures_tenant_id 
ON webhook_failures(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_failures_webhook_type 
ON webhook_failures(webhook_type);
CREATE INDEX IF NOT EXISTS idx_webhook_failures_resolved 
ON webhook_failures(resolved, created_at DESC);

-- Webhook Delivery Logs Table
CREATE TABLE IF NOT EXISTS webhook_delivery_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id UUID REFERENCES webhook_failures(id),
  tenant_id UUID REFERENCES organizations(id),
  endpoint TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'timeout')),
  response_code INTEGER,
  response_body TEXT,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_webhook_delivery_logs_tenant_id 
ON webhook_delivery_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_delivery_logs_status 
ON webhook_delivery_logs(status, created_at DESC);

-- Webhook Retry Logs Table
CREATE TABLE IF NOT EXISTS webhook_retry_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_type TEXT,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  retried_by UUID REFERENCES auth.users(id),
  retried_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_webhook_retry_logs_retried_at 
ON webhook_retry_logs(retried_at DESC);

-- Integration Alert Rules Table
CREATE TABLE IF NOT EXISTS integration_alert_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  integration TEXT NOT NULL,
  condition JSONB NOT NULL DEFAULT '{}'::jsonb,
  actions JSONB NOT NULL DEFAULT '{}'::jsonb,
  recipients TEXT[] DEFAULT ARRAY[]::TEXT[],
  enabled BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_integration_alert_rules_integration 
ON integration_alert_rules(integration);
CREATE INDEX IF NOT EXISTS idx_integration_alert_rules_enabled 
ON integration_alert_rules(enabled, created_at DESC);

-- Integration Alert Triggers Table
CREATE TABLE IF NOT EXISTS integration_alert_triggers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID REFERENCES integration_alert_rules(id),
  integration TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  data JSONB DEFAULT '{}'::jsonb,
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  is_test BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_integration_alert_triggers_rule_id 
ON integration_alert_triggers(rule_id);
CREATE INDEX IF NOT EXISTS idx_integration_alert_triggers_integration 
ON integration_alert_triggers(integration);
CREATE INDEX IF NOT EXISTS idx_integration_alert_triggers_triggered_at 
ON integration_alert_triggers(triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_alert_triggers_resolved 
ON integration_alert_triggers(resolved_at, triggered_at DESC);

-- Integration Metrics Table (for trend analysis)
CREATE TABLE IF NOT EXISTS integration_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  integration TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  error_rate DECIMAL(5,2) DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 100,
  response_time INTEGER DEFAULT 0, -- milliseconds
  quota_used INTEGER DEFAULT 0,
  quota_limit INTEGER DEFAULT 1000,
  quota_percentage DECIMAL(5,2) DEFAULT 0,
  rate_limit_current INTEGER DEFAULT 0,
  rate_limit_max INTEGER DEFAULT 100,
  rate_limit_percentage DECIMAL(5,2) DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'error', 'disconnected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for time-series queries
CREATE INDEX IF NOT EXISTS idx_integration_metrics_integration_timestamp 
ON integration_metrics(integration, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_integration_metrics_status 
ON integration_metrics(status, timestamp DESC);

-- Integration Logs Table (enhanced)
CREATE TABLE IF NOT EXISTS integration_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  integration_type TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'warning')),
  message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_integration_logs_organization_id 
ON integration_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_integration_logs_integration_type 
ON integration_logs(integration_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_logs_status 
ON integration_logs(status, created_at DESC);

-- Add RLS (Row Level Security) policies for admin access only
ALTER TABLE integration_health_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_refresh_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_retry_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_alert_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for admin users only
CREATE POLICY "Allow admin users full access to integration_health_logs" 
ON integration_health_logs 
FOR ALL 
TO authenticated 
USING (auth.email() IN ('sam@atlas-gyms.co.uk', 'sam@gymleadhub.co.uk'));

CREATE POLICY "Allow admin users full access to token_refresh_logs" 
ON token_refresh_logs 
FOR ALL 
TO authenticated 
USING (auth.email() IN ('sam@atlas-gyms.co.uk', 'sam@gymleadhub.co.uk'));

CREATE POLICY "Allow admin users full access to webhook_failures" 
ON webhook_failures 
FOR ALL 
TO authenticated 
USING (auth.email() IN ('sam@atlas-gyms.co.uk', 'sam@gymleadhub.co.uk'));

CREATE POLICY "Allow admin users full access to webhook_delivery_logs" 
ON webhook_delivery_logs 
FOR ALL 
TO authenticated 
USING (auth.email() IN ('sam@atlas-gyms.co.uk', 'sam@gymleadhub.co.uk'));

CREATE POLICY "Allow admin users full access to webhook_retry_logs" 
ON webhook_retry_logs 
FOR ALL 
TO authenticated 
USING (auth.email() IN ('sam@atlas-gyms.co.uk', 'sam@gymleadhub.co.uk'));

CREATE POLICY "Allow admin users full access to integration_alert_rules" 
ON integration_alert_rules 
FOR ALL 
TO authenticated 
USING (auth.email() IN ('sam@atlas-gyms.co.uk', 'sam@gymleadhub.co.uk'));

CREATE POLICY "Allow admin users full access to integration_alert_triggers" 
ON integration_alert_triggers 
FOR ALL 
TO authenticated 
USING (auth.email() IN ('sam@atlas-gyms.co.uk', 'sam@gymleadhub.co.uk'));

CREATE POLICY "Allow admin users full access to integration_metrics" 
ON integration_metrics 
FOR ALL 
TO authenticated 
USING (auth.email() IN ('sam@atlas-gyms.co.uk', 'sam@gymleadhub.co.uk'));

-- Create functions for automated cleanup
CREATE OR REPLACE FUNCTION cleanup_old_monitoring_data() RETURNS void AS $$
BEGIN
  -- Clean up health logs older than 30 days
  DELETE FROM integration_health_logs 
  WHERE created_at < now() - interval '30 days';
  
  -- Clean up metrics older than 90 days
  DELETE FROM integration_metrics 
  WHERE created_at < now() - interval '90 days';
  
  -- Clean up resolved webhook failures older than 7 days
  DELETE FROM webhook_failures 
  WHERE resolved = true 
  AND resolved_at < now() - interval '7 days';
  
  -- Clean up delivery logs older than 30 days
  DELETE FROM webhook_delivery_logs 
  WHERE created_at < now() - interval '30 days';
  
  -- Clean up resolved alert triggers older than 30 days
  DELETE FROM integration_alert_triggers 
  WHERE resolved_at IS NOT NULL 
  AND resolved_at < now() - interval '30 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup to run daily (if using pg_cron extension)
-- SELECT cron.schedule('cleanup-monitoring-data', '0 2 * * *', 'SELECT cleanup_old_monitoring_data();');

-- Create view for integration dashboard
CREATE OR REPLACE VIEW integration_dashboard_view AS
SELECT 
  i.integration,
  COUNT(CASE WHEN i.status = 'healthy' THEN 1 END) as healthy_count,
  COUNT(CASE WHEN i.status = 'degraded' THEN 1 END) as degraded_count,
  COUNT(CASE WHEN i.status = 'error' THEN 1 END) as error_count,
  COUNT(CASE WHEN i.status = 'disconnected' THEN 1 END) as disconnected_count,
  AVG(i.success_rate) as avg_success_rate,
  AVG(i.response_time) as avg_response_time,
  MAX(i.created_at) as last_check
FROM integration_metrics i
WHERE i.created_at >= now() - interval '24 hours'
GROUP BY i.integration;

COMMENT ON TABLE integration_health_logs IS 'Stores health check results for all integrations';
COMMENT ON TABLE token_refresh_logs IS 'Logs OAuth token refresh operations';
COMMENT ON TABLE webhook_failures IS 'Tracks failed webhook deliveries for retry';
COMMENT ON TABLE integration_alert_rules IS 'Alert rules for integration monitoring';
COMMENT ON TABLE integration_alert_triggers IS 'Alert trigger history';
COMMENT ON TABLE integration_metrics IS 'Time-series metrics for integration performance';