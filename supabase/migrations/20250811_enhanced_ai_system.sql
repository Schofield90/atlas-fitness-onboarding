-- Enhanced AI System Migration
-- This migration adds tables and functions for the enhanced AI lead processing system

-- Create table for AI processing jobs (background processing)
CREATE TABLE IF NOT EXISTS ai_processing_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL CHECK (job_type IN ('single_lead', 'bulk_leads', 'scheduled_refresh', 'insight_cleanup')),
    payload JSONB NOT NULL DEFAULT '{}',
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retrying')),
    attempts INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    scheduled_for TIMESTAMPTZ DEFAULT NOW(),
    processing_started TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    processing_result JSONB,
    processing_time_ms INTEGER
);

-- Create table for real-time processing logs
CREATE TABLE IF NOT EXISTS real_time_processing_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    processing_type TEXT NOT NULL,
    urgency_level INTEGER DEFAULT 5 CHECK (urgency_level >= 1 AND urgency_level <= 10),
    sentiment TEXT,
    buying_signals TEXT,
    staff_notification_sent BOOLEAN DEFAULT FALSE,
    processing_time_ms INTEGER,
    alerts_generated JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create table for AI processing logs (bulk operations)
CREATE TABLE IF NOT EXISTS ai_processing_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    processing_type TEXT NOT NULL,
    leads_processed INTEGER DEFAULT 0,
    leads_failed INTEGER DEFAULT 0,
    processing_time_ms INTEGER,
    filters_applied JSONB DEFAULT '{}',
    processing_options JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create table for AI processing errors
CREATE TABLE IF NOT EXISTS ai_processing_errors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    phone_number TEXT,
    error_type TEXT NOT NULL,
    error_message TEXT NOT NULL,
    message_content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create table for staff notifications
CREATE TABLE IF NOT EXISTS staff_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- specific user or null for all
    notification_type TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- Create table for AI-generated tasks
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    type TEXT NOT NULL DEFAULT 'manual',
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    title TEXT NOT NULL,
    description TEXT,
    suggested_actions TEXT[],
    due_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    ai_generated BOOLEAN DEFAULT FALSE,
    ai_confidence DECIMAL(3,2) DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_processing_jobs_organization_id ON ai_processing_jobs(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_processing_jobs_status ON ai_processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ai_processing_jobs_scheduled_for ON ai_processing_jobs(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_ai_processing_jobs_priority ON ai_processing_jobs(priority);

CREATE INDEX IF NOT EXISTS idx_real_time_processing_logs_organization_id ON real_time_processing_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_real_time_processing_logs_lead_id ON real_time_processing_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_real_time_processing_logs_urgency ON real_time_processing_logs(urgency_level DESC);
CREATE INDEX IF NOT EXISTS idx_real_time_processing_logs_created_at ON real_time_processing_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_processing_logs_organization_id ON ai_processing_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_processing_logs_created_at ON ai_processing_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_processing_errors_organization_id ON ai_processing_errors(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_processing_errors_created_at ON ai_processing_errors(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_staff_notifications_organization_id ON staff_notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_staff_notifications_user_id ON staff_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_notifications_read ON staff_notifications(read);
CREATE INDEX IF NOT EXISTS idx_staff_notifications_priority ON staff_notifications(priority);
CREATE INDEX IF NOT EXISTS idx_staff_notifications_created_at ON staff_notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_organization_id ON tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_lead_id ON tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_ai_generated ON tasks(ai_generated);

-- Enable Row Level Security
ALTER TABLE ai_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE real_time_processing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_processing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_processing_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view AI processing jobs in their organization" ON ai_processing_jobs
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage AI processing jobs in their organization" ON ai_processing_jobs
    FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can view real-time processing logs in their organization" ON real_time_processing_logs
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "System can insert real-time processing logs" ON real_time_processing_logs
    FOR INSERT WITH CHECK (true); -- Allow system inserts

CREATE POLICY "Users can view AI processing logs in their organization" ON ai_processing_logs
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "System can insert AI processing logs" ON ai_processing_logs
    FOR INSERT WITH CHECK (true); -- Allow system inserts

CREATE POLICY "Users can view AI processing errors in their organization" ON ai_processing_errors
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "System can insert AI processing errors" ON ai_processing_errors
    FOR INSERT WITH CHECK (true); -- Allow system inserts

CREATE POLICY "Users can view staff notifications in their organization" ON staff_notifications
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update their own notifications" ON staff_notifications
    FOR UPDATE USING (user_id = auth.uid() OR (user_id IS NULL AND organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())));

CREATE POLICY "System can insert staff notifications" ON staff_notifications
    FOR INSERT WITH CHECK (true); -- Allow system inserts

CREATE POLICY "Users can view tasks in their organization" ON tasks
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage tasks in their organization" ON tasks
    FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Create triggers for updated_at
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enhanced function to get leads needing AI analysis
CREATE OR REPLACE FUNCTION get_leads_needing_ai_analysis(
    org_id UUID,
    max_age_hours INTEGER DEFAULT 24,
    limit_count INTEGER DEFAULT 100
)
RETURNS TABLE (
    lead_id UUID,
    lead_name TEXT,
    lead_phone TEXT,
    lead_score INTEGER,
    days_since_created INTEGER,
    last_interaction_at TIMESTAMPTZ,
    last_ai_analysis_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id as lead_id,
        l.name as lead_name,
        l.phone as lead_phone,
        l.lead_score as lead_score,
        EXTRACT(DAY FROM NOW() - l.created_at)::INTEGER as days_since_created,
        latest_interaction.created_at as last_interaction_at,
        latest_insight.created_at as last_ai_analysis_at
    FROM leads l
    LEFT JOIN LATERAL (
        SELECT created_at 
        FROM interactions i 
        WHERE i.lead_id = l.id 
        ORDER BY created_at DESC 
        LIMIT 1
    ) latest_interaction ON true
    LEFT JOIN LATERAL (
        SELECT created_at 
        FROM lead_ai_insights lai 
        WHERE lai.lead_id = l.id 
        ORDER BY created_at DESC 
        LIMIT 1
    ) latest_insight ON true
    WHERE 
        l.organization_id = org_id
        AND (
            latest_insight.created_at IS NULL 
            OR latest_insight.created_at < NOW() - (max_age_hours || ' hours')::INTERVAL
        )
        AND l.status NOT IN ('converted', 'lost', 'unsubscribed')
    ORDER BY 
        l.lead_score DESC,
        latest_interaction.created_at DESC NULLS LAST,
        l.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get AI processing statistics
CREATE OR REPLACE FUNCTION get_ai_processing_stats(
    org_id UUID,
    days_back INTEGER DEFAULT 7
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'processing_jobs', (
            SELECT json_build_object(
                'total', COUNT(*),
                'completed', COUNT(*) FILTER (WHERE status = 'completed'),
                'failed', COUNT(*) FILTER (WHERE status = 'failed'),
                'pending', COUNT(*) FILTER (WHERE status = 'pending'),
                'avg_processing_time_ms', AVG(processing_time_ms) FILTER (WHERE processing_time_ms IS NOT NULL)
            )
            FROM ai_processing_jobs 
            WHERE organization_id = org_id 
            AND created_at >= NOW() - (days_back || ' days')::INTERVAL
        ),
        'real_time_processing', (
            SELECT json_build_object(
                'total_messages', COUNT(*),
                'high_urgency', COUNT(*) FILTER (WHERE urgency_level >= 8),
                'staff_notifications', COUNT(*) FILTER (WHERE staff_notification_sent = true),
                'avg_processing_time_ms', AVG(processing_time_ms)
            )
            FROM real_time_processing_logs 
            WHERE organization_id = org_id 
            AND created_at >= NOW() - (days_back || ' days')::INTERVAL
        ),
        'insights_generated', (
            SELECT json_build_object(
                'total', COUNT(*),
                'by_type', json_object_agg(insight_type, cnt)
            )
            FROM (
                SELECT insight_type, COUNT(*) as cnt
                FROM lead_ai_insights
                WHERE organization_id = org_id 
                AND created_at >= NOW() - (days_back || ' days')::INTERVAL
                GROUP BY insight_type
            ) insights_by_type
        ),
        'lead_score_improvements', (
            SELECT COUNT(*) 
            FROM lead_score_history 
            WHERE organization_id = org_id 
            AND triggered_by IN ('ai_analysis', 'enhanced_ai_analysis')
            AND score_change > 0
            AND created_at >= NOW() - (days_back || ' days')::INTERVAL
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old processing data
CREATE OR REPLACE FUNCTION cleanup_old_ai_processing_data(
    days_to_keep INTEGER DEFAULT 30
)
RETURNS JSON AS $$
DECLARE
    deleted_jobs INTEGER;
    deleted_logs INTEGER;
    deleted_errors INTEGER;
    cutoff_date TIMESTAMPTZ;
BEGIN
    cutoff_date := NOW() - (days_to_keep || ' days')::INTERVAL;
    
    -- Clean up completed/failed processing jobs older than cutoff
    DELETE FROM ai_processing_jobs 
    WHERE status IN ('completed', 'failed') 
    AND completed_at < cutoff_date;
    
    GET DIAGNOSTICS deleted_jobs = ROW_COUNT;
    
    -- Clean up old real-time processing logs
    DELETE FROM real_time_processing_logs 
    WHERE created_at < cutoff_date;
    
    GET DIAGNOSTICS deleted_logs = ROW_COUNT;
    
    -- Clean up old processing errors
    DELETE FROM ai_processing_errors 
    WHERE created_at < cutoff_date;
    
    GET DIAGNOSTICS deleted_errors = ROW_COUNT;
    
    RETURN json_build_object(
        'cleanup_date', cutoff_date,
        'deleted_jobs', deleted_jobs,
        'deleted_logs', deleted_logs,
        'deleted_errors', deleted_errors
    );
END;
$$ LANGUAGE plpgsql;

-- Create a view for AI processing dashboard
CREATE OR REPLACE VIEW ai_processing_dashboard AS
SELECT 
    org.name as organization_name,
    org.id as organization_id,
    
    -- Current processing status
    (SELECT COUNT(*) FROM ai_processing_jobs apj WHERE apj.organization_id = org.id AND apj.status = 'pending') as pending_jobs,
    (SELECT COUNT(*) FROM ai_processing_jobs apj WHERE apj.organization_id = org.id AND apj.status = 'processing') as processing_jobs,
    
    -- Recent activity (last 24 hours)
    (SELECT COUNT(*) FROM real_time_processing_logs rtpl WHERE rtpl.organization_id = org.id AND rtpl.created_at >= NOW() - INTERVAL '24 hours') as messages_processed_24h,
    (SELECT COUNT(*) FROM real_time_processing_logs rtpl WHERE rtpl.organization_id = org.id AND rtpl.urgency_level >= 8 AND rtpl.created_at >= NOW() - INTERVAL '24 hours') as high_urgency_24h,
    
    -- Lead insights stats
    (SELECT COUNT(*) FROM lead_ai_insights lai JOIN leads l ON lai.lead_id = l.id WHERE l.organization_id = org.id AND lai.created_at >= NOW() - INTERVAL '24 hours') as insights_generated_24h,
    
    -- Staff notifications
    (SELECT COUNT(*) FROM staff_notifications sn WHERE sn.organization_id = org.id AND sn.read = false) as unread_notifications,
    (SELECT COUNT(*) FROM staff_notifications sn WHERE sn.organization_id = org.id AND sn.priority = 'urgent' AND sn.read = false) as urgent_notifications,
    
    -- AI-generated tasks
    (SELECT COUNT(*) FROM tasks t WHERE t.organization_id = org.id AND t.ai_generated = true AND t.status = 'pending') as pending_ai_tasks
    
FROM organizations org;

-- Grant permissions for the new tables and functions
-- Note: Adjust these permissions based on your specific roles and security requirements

-- Allow anon role to insert for webhook processing
GRANT INSERT ON ai_processing_jobs TO anon;
GRANT INSERT ON real_time_processing_logs TO anon;
GRANT INSERT ON ai_processing_logs TO anon;
GRANT INSERT ON ai_processing_errors TO anon;
GRANT INSERT ON staff_notifications TO anon;
GRANT INSERT ON tasks TO anon;

-- Allow service role full access
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;