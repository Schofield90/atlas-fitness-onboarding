-- ========================================
-- ENHANCED WORKFLOW AUTOMATION SYSTEM
-- Database Schema for Atlas Fitness CRM
-- ========================================

-- Enhanced workflows table (extends existing)
ALTER TABLE workflows 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES workflow_templates(id),
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'custom',
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS template_name TEXT,
ADD COLUMN IF NOT EXISTS template_description TEXT,
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_execution_time_ms INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS error_rate DECIMAL(5,4) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS performance_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth_users(auth_id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth_users(auth_id);

-- Workflow templates table
CREATE TABLE IF NOT EXISTS workflow_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'custom',
  icon TEXT,
  preview_image TEXT,
  
  -- Template data
  workflow_data JSONB NOT NULL DEFAULT '{"nodes": [], "edges": [], "variables": []}',
  default_settings JSONB DEFAULT '{}',
  required_variables JSONB DEFAULT '[]',
  
  -- Metadata
  is_public BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0.0,
  tags TEXT[] DEFAULT '{}',
  
  -- Access control
  created_by UUID REFERENCES auth_users(auth_id),
  updated_by UUID REFERENCES auth_users(auth_id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced workflow execution steps table (extends existing if needed)
CREATE TABLE IF NOT EXISTS workflow_execution_steps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  node_type TEXT NOT NULL,
  action_type TEXT,
  
  -- Execution details
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped', 'cancelled')),
  input_data JSONB DEFAULT '{}',
  output_data JSONB DEFAULT '{}',
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  execution_time_ms INTEGER,
  
  -- Context
  context_snapshot JSONB DEFAULT '{}',
  variables_snapshot JSONB DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow triggers table (enhanced trigger management)
CREATE TABLE IF NOT EXISTS workflow_triggers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  
  -- Trigger configuration
  trigger_type TEXT NOT NULL,
  trigger_name TEXT NOT NULL,
  trigger_config JSONB DEFAULT '{}',
  
  -- Scheduling for time-based triggers
  schedule_type TEXT CHECK (schedule_type IN ('immediate', 'scheduled', 'recurring', 'cron')),
  cron_expression TEXT,
  timezone TEXT DEFAULT 'UTC',
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  
  -- Webhook configuration
  webhook_endpoint TEXT,
  webhook_secret TEXT,
  webhook_headers JSONB DEFAULT '{}',
  
  -- Status and metrics
  is_active BOOLEAN DEFAULT true,
  trigger_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_schedule CHECK (
    (schedule_type = 'cron' AND cron_expression IS NOT NULL) OR
    (schedule_type != 'cron')
  )
);

-- Workflow variables table (for global and workflow-specific variables)
CREATE TABLE IF NOT EXISTS workflow_variables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  
  -- Variable definition
  name TEXT NOT NULL,
  data_type TEXT NOT NULL DEFAULT 'string' CHECK (data_type IN ('string', 'number', 'boolean', 'date', 'array', 'object', 'any')),
  default_value JSONB,
  current_value JSONB,
  
  -- Metadata
  description TEXT,
  scope TEXT NOT NULL DEFAULT 'workflow' CHECK (scope IN ('global', 'workflow', 'execution')),
  is_secret BOOLEAN DEFAULT false,
  is_required BOOLEAN DEFAULT false,
  
  -- Validation
  validation_rules JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, workflow_id, name)
);

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
  updated_at TIMESTAMPTZ DEFAULT NOW()
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
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow conditions table (reusable condition definitions)
CREATE TABLE IF NOT EXISTS workflow_conditions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Condition metadata
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'custom',
  
  -- Condition logic
  condition_type TEXT NOT NULL,
  field_path TEXT,
  operator TEXT NOT NULL,
  value JSONB,
  data_type TEXT DEFAULT 'string',
  
  -- Advanced options
  is_negated BOOLEAN DEFAULT false,
  case_sensitive BOOLEAN DEFAULT true,
  
  -- Reusability
  is_shared BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow webhooks table (incoming webhook management)
CREATE TABLE IF NOT EXISTS workflow_webhooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  
  -- Webhook configuration
  name TEXT NOT NULL,
  endpoint_id TEXT NOT NULL UNIQUE,
  secret_key TEXT NOT NULL,
  
  -- Security
  allowed_origins TEXT[] DEFAULT '{}',
  verify_signature BOOLEAN DEFAULT true,
  rate_limit INTEGER DEFAULT 100, -- requests per minute
  
  -- Processing
  transform_payload JSONB DEFAULT '{}',
  filter_conditions JSONB DEFAULT '{}',
  
  -- Status and metrics
  is_active BOOLEAN DEFAULT true,
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Workflow indexes
CREATE INDEX IF NOT EXISTS idx_workflows_organization_status ON workflows(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_workflows_category ON workflows(category);
CREATE INDEX IF NOT EXISTS idx_workflows_template_id ON workflows(template_id);
CREATE INDEX IF NOT EXISTS idx_workflows_tags ON workflows USING GIN(tags);

-- Template indexes
CREATE INDEX IF NOT EXISTS idx_workflow_templates_category ON workflow_templates(category);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_public ON workflow_templates(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_workflow_templates_usage ON workflow_templates(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_tags ON workflow_templates USING GIN(tags);

-- Execution indexes
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_status ON workflow_executions(workflow_id, status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_started_at ON workflow_executions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_execution_steps_execution ON workflow_execution_steps(execution_id);
CREATE INDEX IF NOT EXISTS idx_workflow_execution_steps_status ON workflow_execution_steps(status);

-- Trigger indexes
CREATE INDEX IF NOT EXISTS idx_workflow_triggers_organization ON workflow_triggers(organization_id);
CREATE INDEX IF NOT EXISTS idx_workflow_triggers_workflow ON workflow_triggers(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_triggers_type_active ON workflow_triggers(trigger_type, is_active);
CREATE INDEX IF NOT EXISTS idx_workflow_triggers_next_run ON workflow_triggers(next_run_at) WHERE next_run_at IS NOT NULL;

-- Variable indexes
CREATE INDEX IF NOT EXISTS idx_workflow_variables_workflow ON workflow_variables(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_variables_scope ON workflow_variables(scope);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_workflow_analytics_workflow_date ON workflow_analytics(workflow_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_analytics_organization_date ON workflow_analytics(organization_id, date DESC);

-- Queue indexes
CREATE INDEX IF NOT EXISTS idx_workflow_queue_status_priority ON workflow_execution_queue(status, priority DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_queue_scheduled_at ON workflow_execution_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_workflow_queue_worker_lock ON workflow_execution_queue(worker_id, lock_expires_at);

-- Webhook indexes
CREATE INDEX IF NOT EXISTS idx_workflow_webhooks_endpoint ON workflow_webhooks(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_workflow_webhooks_organization_active ON workflow_webhooks(organization_id, is_active);

-- ========================================
-- ROW LEVEL SECURITY POLICIES
-- ========================================

-- Enable RLS on new tables
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_execution_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_action_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_trigger_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_execution_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_webhooks ENABLE ROW LEVEL SECURITY;

-- Templates RLS policies
CREATE POLICY "Users can view public templates" ON workflow_templates
  FOR SELECT USING (is_public = true OR organization_id IN (
    SELECT organization_id FROM auth_users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Users can manage organization templates" ON workflow_templates
  FOR ALL USING (organization_id IN (
    SELECT organization_id FROM auth_users WHERE auth_id = auth.uid()
  ));

-- Execution steps RLS policies
CREATE POLICY "Users can view execution steps in their organization" ON workflow_execution_steps
  FOR SELECT USING (
    execution_id IN (
      SELECT id FROM workflow_executions 
      WHERE organization_id IN (
        SELECT organization_id FROM auth_users WHERE auth_id = auth.uid()
      )
    )
  );

CREATE POLICY "System can manage execution steps" ON workflow_execution_steps
  FOR ALL USING (true); -- Allow system operations

-- Triggers RLS policies
CREATE POLICY "Users can manage triggers in their organization" ON workflow_triggers
  FOR ALL USING (organization_id IN (
    SELECT organization_id FROM auth_users WHERE auth_id = auth.uid()
  ));

-- Variables RLS policies
CREATE POLICY "Users can manage variables in their organization" ON workflow_variables
  FOR ALL USING (organization_id IN (
    SELECT organization_id FROM auth_users WHERE auth_id = auth.uid()
  ));

-- Action definitions RLS policies
CREATE POLICY "Users can view active action definitions" ON workflow_action_definitions
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage action definitions" ON workflow_action_definitions
  FOR ALL USING (organization_id IS NULL OR organization_id IN (
    SELECT organization_id FROM auth_users WHERE auth_id = auth.uid()
  ));

-- Trigger definitions RLS policies
CREATE POLICY "Users can view active trigger definitions" ON workflow_trigger_definitions
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage trigger definitions" ON workflow_trigger_definitions
  FOR ALL USING (organization_id IS NULL OR organization_id IN (
    SELECT organization_id FROM auth_users WHERE auth_id = auth.uid()
  ));

-- Analytics RLS policies
CREATE POLICY "Users can view analytics for their organization" ON workflow_analytics
  FOR SELECT USING (organization_id IN (
    SELECT organization_id FROM auth_users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "System can manage analytics" ON workflow_analytics
  FOR INSERT WITH CHECK (true);

-- Queue RLS policies
CREATE POLICY "System can manage execution queue" ON workflow_execution_queue
  FOR ALL USING (true);

-- Conditions RLS policies
CREATE POLICY "Users can view shared conditions" ON workflow_conditions
  FOR SELECT USING (is_shared = true OR organization_id IN (
    SELECT organization_id FROM auth_users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Users can manage organization conditions" ON workflow_conditions
  FOR ALL USING (organization_id IN (
    SELECT organization_id FROM auth_users WHERE auth_id = auth.uid()
  ));

-- Webhooks RLS policies
CREATE POLICY "Users can manage webhooks in their organization" ON workflow_webhooks
  FOR ALL USING (organization_id IN (
    SELECT organization_id FROM auth_users WHERE auth_id = auth.uid()
  ));

-- ========================================
-- TRIGGERS AND FUNCTIONS
-- ========================================

-- Function to update workflow statistics
CREATE OR REPLACE FUNCTION update_workflow_statistics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update workflow stats when execution completes
  IF NEW.status IN ('completed', 'failed') AND OLD.status = 'running' THEN
    UPDATE workflows
    SET 
      total_executions = total_executions + 1,
      successful_executions = CASE WHEN NEW.status = 'completed' THEN successful_executions + 1 ELSE successful_executions END,
      failed_executions = CASE WHEN NEW.status = 'failed' THEN failed_executions + 1 ELSE failed_executions END,
      last_run_at = NEW.completed_at,
      avg_execution_time_ms = CASE 
        WHEN NEW.completed_at IS NOT NULL AND NEW.started_at IS NOT NULL 
        THEN (avg_execution_time_ms * (total_executions - 1) + EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) * 1000) / total_executions
        ELSE avg_execution_time_ms 
      END,
      error_rate = CASE 
        WHEN total_executions > 0 
        THEN ROUND(failed_executions::DECIMAL / total_executions, 4)
        ELSE 0 
      END,
      updated_at = NOW()
    WHERE id = NEW.workflow_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply statistics trigger
DROP TRIGGER IF EXISTS update_workflow_statistics_trigger ON workflow_executions;
CREATE TRIGGER update_workflow_statistics_trigger
  AFTER UPDATE ON workflow_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_statistics();

-- Function to generate analytics data
CREATE OR REPLACE FUNCTION generate_workflow_analytics()
RETURNS TRIGGER AS $$
DECLARE
  analytics_date DATE;
  analytics_hour INTEGER;
  execution_time INTEGER;
BEGIN
  -- Only process completed or failed executions
  IF NEW.status NOT IN ('completed', 'failed') THEN
    RETURN NEW;
  END IF;
  
  -- Extract date and hour
  analytics_date := DATE(NEW.completed_at);
  analytics_hour := EXTRACT(HOUR FROM NEW.completed_at);
  
  -- Calculate execution time
  execution_time := CASE 
    WHEN NEW.completed_at IS NOT NULL AND NEW.started_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) * 1000
    ELSE 0 
  END;
  
  -- Insert or update analytics record
  INSERT INTO workflow_analytics (
    organization_id, workflow_id, date, hour,
    executions_count, successful_count, failed_count,
    total_execution_time_ms, avg_execution_time_ms,
    min_execution_time_ms, max_execution_time_ms
  ) VALUES (
    NEW.organization_id, NEW.workflow_id, analytics_date, analytics_hour,
    1, 
    CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END,
    CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END,
    execution_time, execution_time, execution_time, execution_time
  )
  ON CONFLICT (workflow_id, date, hour) DO UPDATE SET
    executions_count = workflow_analytics.executions_count + 1,
    successful_count = workflow_analytics.successful_count + CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END,
    failed_count = workflow_analytics.failed_count + CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END,
    total_execution_time_ms = workflow_analytics.total_execution_time_ms + execution_time,
    avg_execution_time_ms = (workflow_analytics.total_execution_time_ms + execution_time) / (workflow_analytics.executions_count + 1),
    min_execution_time_ms = LEAST(workflow_analytics.min_execution_time_ms, execution_time),
    max_execution_time_ms = GREATEST(workflow_analytics.max_execution_time_ms, execution_time),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply analytics trigger
CREATE TRIGGER generate_workflow_analytics_trigger
  AFTER UPDATE ON workflow_executions
  FOR EACH ROW
  EXECUTE FUNCTION generate_workflow_analytics();

-- Function to update template usage count
CREATE OR REPLACE FUNCTION update_template_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment usage count when workflow is created from template
  IF NEW.template_id IS NOT NULL THEN
    UPDATE workflow_templates
    SET usage_count = usage_count + 1,
        updated_at = NOW()
    WHERE id = NEW.template_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply template usage trigger
CREATE TRIGGER update_template_usage_trigger
  AFTER INSERT ON workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_template_usage();

-- ========================================
-- GRANT PERMISSIONS
-- ========================================

-- Grant permissions to authenticated users
GRANT ALL ON workflow_templates TO authenticated;
GRANT ALL ON workflow_execution_steps TO authenticated;
GRANT ALL ON workflow_triggers TO authenticated;
GRANT ALL ON workflow_variables TO authenticated;
GRANT SELECT ON workflow_action_definitions TO authenticated;
GRANT SELECT ON workflow_trigger_definitions TO authenticated;
GRANT SELECT ON workflow_analytics TO authenticated;
GRANT ALL ON workflow_conditions TO authenticated;
GRANT ALL ON workflow_webhooks TO authenticated;

-- Grant permissions to service role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;