-- ========================================
-- ENHANCED WORKFLOW SYSTEM - CORE TABLES
-- Migration: 20250812_enhanced_workflow_tables.sql
-- ========================================

-- Add enhanced columns to existing workflows table
ALTER TABLE workflows 
ADD COLUMN IF NOT EXISTS template_id UUID,
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
ADD COLUMN IF NOT EXISTS created_by UUID,
ADD COLUMN IF NOT EXISTS updated_by UUID,
ADD COLUMN IF NOT EXISTS total_executions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS successful_executions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS failed_executions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ;

-- Add comments to enhanced workflow columns
COMMENT ON COLUMN workflows.template_id IS 'Reference to workflow template used to create this workflow';
COMMENT ON COLUMN workflows.category IS 'Workflow category for organization (lead_management, communication, booking, etc.)';
COMMENT ON COLUMN workflows.is_template IS 'Whether this workflow is a template for reuse';
COMMENT ON COLUMN workflows.usage_count IS 'Number of times this workflow has been executed';
COMMENT ON COLUMN workflows.avg_execution_time_ms IS 'Average execution time in milliseconds';
COMMENT ON COLUMN workflows.error_rate IS 'Percentage of failed executions (0-1)';
COMMENT ON COLUMN workflows.performance_score IS 'Overall performance score (0-100)';
COMMENT ON COLUMN workflows.tags IS 'Array of tags for categorization and filtering';

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
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_rating CHECK (rating >= 0 AND rating <= 5)
);

-- Add foreign key constraint to workflows table (after template table exists)
ALTER TABLE workflows 
ADD CONSTRAINT fk_workflows_template_id 
FOREIGN KEY (template_id) REFERENCES workflow_templates(id) ON DELETE SET NULL;

-- Enhanced workflow execution steps table
CREATE TABLE IF NOT EXISTS workflow_execution_steps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id UUID NOT NULL,
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
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_retry_count CHECK (retry_count >= 0 AND retry_count <= max_retries)
);

-- Add foreign key constraint for execution steps (workflow_executions might exist)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'workflow_executions') THEN
        ALTER TABLE workflow_execution_steps 
        ADD CONSTRAINT fk_execution_steps_execution_id 
        FOREIGN KEY (execution_id) REFERENCES workflow_executions(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Workflow triggers table
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
    (schedule_type != 'cron') OR
    (schedule_type IS NULL)
  )
);

-- Workflow variables table
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

-- Workflow conditions table
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

-- Workflow webhooks table
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
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_rate_limit CHECK (rate_limit > 0)
);

-- Add comments to tables
COMMENT ON TABLE workflow_templates IS 'Reusable workflow templates for different automation patterns';
COMMENT ON TABLE workflow_execution_steps IS 'Detailed execution logs for each step in workflow execution';
COMMENT ON TABLE workflow_triggers IS 'Advanced trigger configurations for workflows';
COMMENT ON TABLE workflow_variables IS 'Global and workflow-specific variables';
COMMENT ON TABLE workflow_conditions IS 'Reusable condition definitions';
COMMENT ON TABLE workflow_webhooks IS 'Incoming webhook management for workflow triggers';

-- Update updated_at timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to new tables
CREATE TRIGGER update_workflow_templates_updated_at 
    BEFORE UPDATE ON workflow_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_execution_steps_updated_at 
    BEFORE UPDATE ON workflow_execution_steps 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_triggers_updated_at 
    BEFORE UPDATE ON workflow_triggers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_variables_updated_at 
    BEFORE UPDATE ON workflow_variables 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_conditions_updated_at 
    BEFORE UPDATE ON workflow_conditions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_webhooks_updated_at 
    BEFORE UPDATE ON workflow_webhooks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Also add trigger to workflows table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_workflows_updated_at' 
        AND event_object_table = 'workflows'
    ) THEN
        -- Add updated_at column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'workflows' AND column_name = 'updated_at'
        ) THEN
            ALTER TABLE workflows ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
        
        CREATE TRIGGER update_workflows_updated_at 
            BEFORE UPDATE ON workflows 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;