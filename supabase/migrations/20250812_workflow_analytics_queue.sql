-- ========================================
-- ENHANCED WORKFLOW SYSTEM - ANALYTICS & QUEUE
-- Migration: 20250812_workflow_analytics_queue.sql
-- ========================================

-- Action definitions table (extensible action system)
CREATE TABLE IF NOT EXISTS workflow_action_definitions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Action metadata
  action_type TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'custom',
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  
  -- Configuration schemas
  input_schema JSONB NOT NULL DEFAULT '{}',
  output_schema JSONB NOT NULL DEFAULT '{}',
  config_schema JSONB DEFAULT '{}',
  
  -- Feature flags
  is_premium BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  requires_auth BOOLEAN DEFAULT true,
  
  -- Implementation details
  handler_function TEXT,
  external_service_url TEXT,
  timeout_seconds INTEGER DEFAULT 30,
  max_retries INTEGER DEFAULT 3,
  
  -- Versioning
  version TEXT DEFAULT '1.0.0',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_timeout CHECK (timeout_seconds > 0 AND timeout_seconds <= 300)
);

-- Trigger definitions table (extensible trigger system)
CREATE TABLE IF NOT EXISTS workflow_trigger_definitions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Trigger metadata
  trigger_type TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'custom',
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  
  -- Configuration schemas
  config_schema JSONB NOT NULL DEFAULT '{}',
  output_schema JSONB NOT NULL DEFAULT '{}',
  
  -- Feature flags
  is_active BOOLEAN DEFAULT true,
  supports_scheduling BOOLEAN DEFAULT false,
  supports_webhook BOOLEAN DEFAULT false,
  
  -- Implementation details
  handler_function TEXT,
  webhook_endpoint_template TEXT,
  
  -- Versioning
  version TEXT DEFAULT '1.0.0',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow analytics table (performance tracking)
CREATE TABLE IF NOT EXISTS workflow_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  
  -- Time period
  date DATE NOT NULL,
  hour INTEGER CHECK (hour >= 0 AND hour <= 23),
  
  -- Execution metrics
  executions_count INTEGER DEFAULT 0,
  successful_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  cancelled_count INTEGER DEFAULT 0,
  
  -- Performance metrics
  total_execution_time_ms BIGINT DEFAULT 0,
  avg_execution_time_ms INTEGER DEFAULT 0,
  min_execution_time_ms INTEGER DEFAULT 0,
  max_execution_time_ms INTEGER DEFAULT 0,
  
  -- Resource usage
  total_nodes_executed INTEGER DEFAULT 0,
  total_actions_performed INTEGER DEFAULT 0,
  total_conditions_evaluated INTEGER DEFAULT 0,
  
  -- Error analysis
  error_categories JSONB DEFAULT '{}',
  most_common_errors JSONB DEFAULT '[]',
  
  -- User engagement
  unique_triggers INTEGER DEFAULT 0,
  unique_users_affected INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(workflow_id, date, hour)
);

-- Workflow execution queue (for async processing)
CREATE TABLE IF NOT EXISTS workflow_execution_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  
  -- Queue metadata
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  
  -- Execution data
  trigger_data JSONB DEFAULT '{}',
  context_data JSONB DEFAULT '{}',
  input_variables JSONB DEFAULT '{}',
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  
  -- Worker assignment
  worker_id TEXT,
  locked_at TIMESTAMPTZ,
  lock_expires_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_retry_count CHECK (retry_count >= 0 AND retry_count <= max_retries)
);

-- Workflow execution logs (detailed logging)
CREATE TABLE IF NOT EXISTS workflow_execution_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Log details
  log_level TEXT NOT NULL DEFAULT 'info' CHECK (log_level IN ('debug', 'info', 'warn', 'error')),
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  
  -- Context
  node_id TEXT,
  step_id UUID,
  action_type TEXT,
  
  -- Timing
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  execution_time_ms INTEGER,
  
  -- Source
  source TEXT DEFAULT 'system',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint for execution logs (if workflow_executions exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'workflow_executions') THEN
        ALTER TABLE workflow_execution_logs 
        ADD CONSTRAINT fk_execution_logs_execution_id 
        FOREIGN KEY (execution_id) REFERENCES workflow_executions(id) ON DELETE CASCADE;
    END IF;
    
    -- Also add step_id FK if execution steps table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'workflow_execution_steps') THEN
        ALTER TABLE workflow_execution_logs 
        ADD CONSTRAINT fk_execution_logs_step_id 
        FOREIGN KEY (step_id) REFERENCES workflow_execution_steps(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Workflow performance metrics (aggregated)
CREATE TABLE IF NOT EXISTS workflow_performance_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  
  -- Metric type and period
  metric_type TEXT NOT NULL CHECK (metric_type IN ('hourly', 'daily', 'weekly', 'monthly')),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  
  -- Performance metrics
  total_executions INTEGER DEFAULT 0,
  successful_executions INTEGER DEFAULT 0,
  failed_executions INTEGER DEFAULT 0,
  avg_execution_time_ms INTEGER DEFAULT 0,
  median_execution_time_ms INTEGER DEFAULT 0,
  p95_execution_time_ms INTEGER DEFAULT 0,
  p99_execution_time_ms INTEGER DEFAULT 0,
  
  -- Resource utilization
  total_cpu_time_ms BIGINT DEFAULT 0,
  total_memory_mb INTEGER DEFAULT 0,
  total_api_calls INTEGER DEFAULT 0,
  total_external_requests INTEGER DEFAULT 0,
  
  -- Error analysis
  error_rate DECIMAL(5,4) DEFAULT 0.0,
  most_common_errors JSONB DEFAULT '[]',
  error_categories JSONB DEFAULT '{}',
  
  -- User impact
  unique_users_affected INTEGER DEFAULT 0,
  total_notifications_sent INTEGER DEFAULT 0,
  total_data_processed_mb INTEGER DEFAULT 0,
  
  -- Quality metrics
  performance_score INTEGER DEFAULT 0, -- 0-100
  reliability_score INTEGER DEFAULT 0, -- 0-100
  efficiency_score INTEGER DEFAULT 0,  -- 0-100
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(workflow_id, metric_type, period_start)
);

-- Workflow rate limiting table
CREATE TABLE IF NOT EXISTS workflow_rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  
  -- Rate limit configuration
  limit_type TEXT NOT NULL CHECK (limit_type IN ('executions_per_minute', 'executions_per_hour', 'executions_per_day')),
  limit_value INTEGER NOT NULL,
  
  -- Current usage
  current_count INTEGER DEFAULT 0,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  window_end TIMESTAMPTZ,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  exceeded_at TIMESTAMPTZ,
  reset_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_limit_value CHECK (limit_value > 0)
);

-- Add comments to new tables
COMMENT ON TABLE workflow_action_definitions IS 'Extensible system for defining custom workflow actions';
COMMENT ON TABLE workflow_trigger_definitions IS 'Extensible system for defining custom workflow triggers';
COMMENT ON TABLE workflow_analytics IS 'Hourly aggregated analytics for workflow performance';
COMMENT ON TABLE workflow_execution_queue IS 'Queue system for managing async workflow execution';
COMMENT ON TABLE workflow_execution_logs IS 'Detailed execution logs for debugging and monitoring';
COMMENT ON TABLE workflow_performance_metrics IS 'Aggregated performance metrics over time periods';
COMMENT ON TABLE workflow_rate_limits IS 'Rate limiting configuration and tracking for workflows';

-- Add updated_at triggers
CREATE TRIGGER update_workflow_action_definitions_updated_at 
    BEFORE UPDATE ON workflow_action_definitions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_trigger_definitions_updated_at 
    BEFORE UPDATE ON workflow_trigger_definitions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_analytics_updated_at 
    BEFORE UPDATE ON workflow_analytics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_execution_queue_updated_at 
    BEFORE UPDATE ON workflow_execution_queue 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_performance_metrics_updated_at 
    BEFORE UPDATE ON workflow_performance_metrics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_rate_limits_updated_at 
    BEFORE UPDATE ON workflow_rate_limits 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();