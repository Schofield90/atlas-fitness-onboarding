-- Error Logging System Tables for Atlas Fitness CRM
-- This file creates all necessary tables for comprehensive error logging and monitoring

-- Enable RLS by default
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Error Logs Table (server-side errors)
CREATE TABLE IF NOT EXISTS error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    level TEXT NOT NULL CHECK (level IN ('error', 'warn', 'info', 'debug')),
    message TEXT NOT NULL,
    error_code TEXT NOT NULL,
    status_code INTEGER,
    
    -- User and organization context
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id TEXT,
    request_id TEXT,
    correlation_id TEXT,
    
    -- Request context
    method TEXT,
    endpoint TEXT,
    user_agent TEXT,
    ip_address INET,
    
    -- Error details
    stack_trace TEXT,
    context JSONB DEFAULT '{}',
    
    -- Performance metrics
    response_time INTEGER, -- milliseconds
    memory_usage BIGINT,
    
    -- System metadata
    environment TEXT DEFAULT 'production',
    version TEXT,
    service TEXT DEFAULT 'atlas-fitness-crm',
    tags TEXT[] DEFAULT '{}',
    
    -- Indexes
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Client Error Reports Table (client-side errors)
CREATE TABLE IF NOT EXISTS client_error_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Error details
    message TEXT NOT NULL,
    error_code TEXT DEFAULT 'CLIENT_ERROR',
    stack_trace TEXT,
    
    -- Location details
    url TEXT NOT NULL,
    line_number INTEGER,
    column_number INTEGER,
    component TEXT,
    
    -- Client context
    user_agent TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    category TEXT NOT NULL CHECK (category IN ('javascript', 'network', 'ui', 'performance', 'security')),
    
    -- User context
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    session_id TEXT,
    ip_address INET,
    
    -- Additional data
    props JSONB DEFAULT '{}',
    context JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    client_timestamp TIMESTAMPTZ NOT NULL,
    server_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Alert History Table
CREATE TABLE IF NOT EXISTS alert_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Alert details
    type TEXT NOT NULL CHECK (type IN ('critical_error', 'error_rate', 'performance', 'organization_threshold')),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    
    -- Context
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    error_code TEXT,
    
    -- Metrics
    threshold NUMERIC,
    current_value NUMERIC,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Real-time Metrics Table (for circuit breakers and monitoring)
CREATE TABLE IF NOT EXISTS realtime_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Metrics
    error_count INTEGER DEFAULT 0,
    error_rate NUMERIC DEFAULT 0,
    critical_errors INTEGER DEFAULT 0,
    avg_response_time NUMERIC DEFAULT 0,
    
    -- Breakdown
    error_codes JSONB DEFAULT '{}',
    endpoints JSONB DEFAULT '{}',
    
    -- Aggregation period (minute, hour, day)
    period TEXT NOT NULL DEFAULT 'minute',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicates
    UNIQUE(timestamp, organization_id, period)
);

-- Daily Reports Table
CREATE TABLE IF NOT EXISTS daily_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    report_type TEXT NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Report data
    data JSONB NOT NULL DEFAULT '{}',
    
    -- Metadata
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(date, report_type, organization_id)
);

-- Error Statistics View (materialized for performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS error_statistics AS
SELECT 
    DATE_TRUNC('hour', timestamp) as hour,
    DATE_TRUNC('day', timestamp) as day,
    organization_id,
    error_code,
    COUNT(*) as error_count,
    COUNT(CASE WHEN status_code >= 500 THEN 1 END) as server_errors,
    COUNT(CASE WHEN status_code >= 400 AND status_code < 500 THEN 1 END) as client_errors,
    AVG(response_time) as avg_response_time,
    MAX(response_time) as max_response_time,
    COUNT(DISTINCT user_id) as affected_users
FROM error_logs
WHERE level = 'error'
GROUP BY hour, day, organization_id, error_code;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_organization ON error_logs(organization_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_level ON error_logs(level, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_code ON error_logs(error_code, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_user ON error_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_endpoint ON error_logs(endpoint, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_request_id ON error_logs(request_id);

CREATE INDEX IF NOT EXISTS idx_client_error_reports_timestamp ON client_error_reports(server_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_client_error_reports_organization ON client_error_reports(organization_id, server_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_client_error_reports_severity ON client_error_reports(severity, server_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_client_error_reports_category ON client_error_reports(category, server_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_client_error_reports_url ON client_error_reports(url, server_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_alert_history_timestamp ON alert_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alert_history_organization ON alert_history(organization_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alert_history_type ON alert_history(type, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_realtime_metrics_timestamp ON realtime_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_realtime_metrics_organization ON realtime_metrics(organization_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_realtime_metrics_period ON realtime_metrics(period, timestamp DESC);

-- RLS Policies

-- Error logs - users can only see their organization's errors
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's error logs"
ON error_logs FOR SELECT
TO authenticated
USING (
    organization_id IN (
        SELECT organization_id 
        FROM users 
        WHERE id = auth.uid()
    )
    OR 
    -- Allow owners to see all errors
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'owner'
    )
);

-- Only system can insert error logs (via service role)
CREATE POLICY "System can insert error logs"
ON error_logs FOR INSERT
TO service_role
WITH CHECK (true);

-- Client error reports - users can only see their organization's reports
ALTER TABLE client_error_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's client error reports"
ON client_error_reports FOR SELECT
TO authenticated
USING (
    organization_id IN (
        SELECT organization_id 
        FROM users 
        WHERE id = auth.uid()
    )
    OR 
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'owner'
    )
);

-- Anyone can insert client error reports (they're filtered by organization)
CREATE POLICY "Anyone can report client errors"
ON client_error_reports FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Alert history - same as error logs
ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's alerts"
ON alert_history FOR SELECT
TO authenticated
USING (
    organization_id IN (
        SELECT organization_id 
        FROM users 
        WHERE id = auth.uid()
    )
    OR 
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'owner'
    )
);

CREATE POLICY "System can insert alerts"
ON alert_history FOR INSERT
TO service_role
WITH CHECK (true);

-- Realtime metrics - organization scoped
ALTER TABLE realtime_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's metrics"
ON realtime_metrics FOR SELECT
TO authenticated
USING (
    organization_id IN (
        SELECT organization_id 
        FROM users 
        WHERE id = auth.uid()
    )
    OR 
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'owner'
    )
);

CREATE POLICY "System can manage metrics"
ON realtime_metrics FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Daily reports - organization scoped
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's reports"
ON daily_reports FOR SELECT
TO authenticated
USING (
    organization_id IN (
        SELECT organization_id 
        FROM users 
        WHERE id = auth.uid()
    )
    OR 
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'owner'
    )
);

CREATE POLICY "System can manage reports"
ON daily_reports FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Functions for error statistics

-- Function to update error statistics
CREATE OR REPLACE FUNCTION update_error_stats(
    p_date DATE,
    p_organization_id UUID,
    p_error_code TEXT,
    p_endpoint TEXT,
    p_status_code INTEGER,
    p_response_time INTEGER
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- This would typically update aggregated statistics
    -- For now, we'll just insert into realtime_metrics
    INSERT INTO realtime_metrics (
        timestamp,
        organization_id,
        error_count,
        avg_response_time,
        error_codes,
        endpoints,
        period
    )
    VALUES (
        DATE_TRUNC('minute', NOW()),
        p_organization_id,
        1,
        p_response_time,
        jsonb_build_object(p_error_code, 1),
        jsonb_build_object(p_endpoint, 1),
        'minute'
    )
    ON CONFLICT (timestamp, organization_id, period) DO UPDATE SET
        error_count = realtime_metrics.error_count + 1,
        avg_response_time = (realtime_metrics.avg_response_time + p_response_time) / 2,
        error_codes = realtime_metrics.error_codes || jsonb_build_object(p_error_code, 
            COALESCE((realtime_metrics.error_codes->p_error_code)::INTEGER, 0) + 1),
        endpoints = realtime_metrics.endpoints || jsonb_build_object(p_endpoint,
            COALESCE((realtime_metrics.endpoints->p_endpoint)::INTEGER, 0) + 1);
END;
$$;

-- Function to update realtime metrics
CREATE OR REPLACE FUNCTION update_realtime_metrics(
    p_timestamp TIMESTAMPTZ,
    p_organization_id UUID,
    p_error_code TEXT,
    p_is_critical BOOLEAN
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO realtime_metrics (
        timestamp,
        organization_id,
        error_count,
        critical_errors,
        error_codes,
        period
    )
    VALUES (
        DATE_TRUNC('minute', p_timestamp),
        p_organization_id,
        1,
        CASE WHEN p_is_critical THEN 1 ELSE 0 END,
        jsonb_build_object(p_error_code, 1),
        'minute'
    )
    ON CONFLICT (timestamp, organization_id, period) DO UPDATE SET
        error_count = realtime_metrics.error_count + 1,
        critical_errors = realtime_metrics.critical_errors + CASE WHEN p_is_critical THEN 1 ELSE 0 END,
        error_codes = realtime_metrics.error_codes || jsonb_build_object(p_error_code,
            COALESCE((realtime_metrics.error_codes->p_error_code)::INTEGER, 0) + 1);
END;
$$;

-- Refresh materialized view function
CREATE OR REPLACE FUNCTION refresh_error_statistics()
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW error_statistics;
END;
$$;

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Add trigger to error_logs
DROP TRIGGER IF EXISTS update_error_logs_updated_at ON error_logs;
CREATE TRIGGER update_error_logs_updated_at
    BEFORE UPDATE ON error_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT ON error_logs TO authenticated;
GRANT SELECT ON client_error_reports TO authenticated;
GRANT SELECT ON alert_history TO authenticated;
GRANT SELECT ON realtime_metrics TO authenticated;
GRANT SELECT ON daily_reports TO authenticated;
GRANT SELECT ON error_statistics TO authenticated;

GRANT INSERT ON client_error_reports TO anon, authenticated;

-- Service role has full access for system operations
GRANT ALL ON error_logs TO service_role;
GRANT ALL ON client_error_reports TO service_role;
GRANT ALL ON alert_history TO service_role;
GRANT ALL ON realtime_metrics TO service_role;
GRANT ALL ON daily_reports TO service_role;
GRANT ALL ON error_statistics TO service_role;

GRANT EXECUTE ON FUNCTION update_error_stats TO service_role;
GRANT EXECUTE ON FUNCTION update_realtime_metrics TO service_role;
GRANT EXECUTE ON FUNCTION refresh_error_statistics TO service_role;

-- Comments for documentation
COMMENT ON TABLE error_logs IS 'Server-side error logs with full context and metadata';
COMMENT ON TABLE client_error_reports IS 'Client-side JavaScript error reports';
COMMENT ON TABLE alert_history IS 'History of all error alerts sent';
COMMENT ON TABLE realtime_metrics IS 'Real-time error metrics for monitoring and circuit breakers';
COMMENT ON TABLE daily_reports IS 'Daily error reports and statistics';
COMMENT ON MATERIALIZED VIEW error_statistics IS 'Aggregated error statistics for reporting';

COMMENT ON FUNCTION update_error_stats IS 'Updates error statistics and metrics';
COMMENT ON FUNCTION update_realtime_metrics IS 'Updates real-time error metrics';
COMMENT ON FUNCTION refresh_error_statistics IS 'Refreshes the materialized error statistics view';