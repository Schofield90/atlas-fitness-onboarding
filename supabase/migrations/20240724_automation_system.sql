-- Automation System Database Schema

-- Workflow Templates
CREATE TABLE IF NOT EXISTS workflow_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'lead_nurture', 'client_onboarding', 'retention', 'sales', 'custom'
  icon TEXT,
  workflow_data JSONB NOT NULL, -- Full workflow definition
  preview_image TEXT,
  is_public BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflows
CREATE TABLE IF NOT EXISTS workflows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  version INTEGER DEFAULT 1,
  workflow_data JSONB NOT NULL, -- Nodes, edges, settings
  trigger_type TEXT NOT NULL,
  trigger_config JSONB,
  settings JSONB DEFAULT '{
    "errorHandling": "continue",
    "maxExecutionTime": 300,
    "timezone": "America/New_York",
    "notifications": {
      "onError": true,
      "onComplete": false
    }
  }'::jsonb,
  stats JSONB DEFAULT '{
    "totalExecutions": 0,
    "successfulExecutions": 0,
    "failedExecutions": 0,
    "avgExecutionTime": 0,
    "lastExecutedAt": null
  }'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  template_id UUID REFERENCES workflow_templates(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow Versions (for version control)
CREATE TABLE IF NOT EXISTS workflow_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  workflow_data JSONB NOT NULL,
  changes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workflow_id, version)
);

-- Workflow Nodes (for faster querying)
CREATE TABLE IF NOT EXISTS workflow_nodes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL, -- ID within the workflow
  node_type TEXT NOT NULL, -- 'trigger', 'action', 'condition', 'wait', 'loop'
  action_type TEXT, -- Specific action: 'send_email', 'update_lead', etc.
  position JSONB NOT NULL, -- {x, y}
  data JSONB NOT NULL, -- Node configuration
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workflow_id, node_id)
);

-- Workflow Executions
CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  trigger_data JSONB, -- Data that triggered the workflow
  context JSONB DEFAULT '{}'::jsonb, -- Variables and data during execution
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Execution Steps (detailed log of each node execution)
CREATE TABLE IF NOT EXISTS workflow_execution_steps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  node_type TEXT NOT NULL,
  action_type TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
  input_data JSONB,
  output_data JSONB,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger Definitions
CREATE TABLE IF NOT EXISTS trigger_definitions (
  id TEXT PRIMARY KEY, -- 'new_lead', 'lead_updated', etc.
  category TEXT NOT NULL, -- 'lead', 'client', 'communication', 'calendar', 'schedule'
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  config_schema JSONB NOT NULL, -- JSON Schema for configuration
  output_schema JSONB NOT NULL, -- What data the trigger provides
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Action Definitions
CREATE TABLE IF NOT EXISTS action_definitions (
  id TEXT PRIMARY KEY, -- 'send_email', 'update_lead', etc.
  category TEXT NOT NULL, -- 'communication', 'crm', 'tasks', 'ai', 'data'
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  input_schema JSONB NOT NULL, -- JSON Schema for inputs
  output_schema JSONB NOT NULL, -- What data the action returns
  config_schema JSONB, -- Configuration options
  is_premium BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow Triggers (active trigger subscriptions)
CREATE TABLE IF NOT EXISTS workflow_triggers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workflow_id, trigger_type)
);

-- Webhook Triggers
CREATE TABLE IF NOT EXISTS webhook_triggers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  endpoint_id TEXT NOT NULL UNIQUE, -- URL path component
  secret TEXT NOT NULL, -- For webhook verification
  is_active BOOLEAN DEFAULT true,
  request_count INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schedule Triggers
CREATE TABLE IF NOT EXISTS schedule_triggers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('once', 'recurring', 'cron')),
  schedule_config JSONB NOT NULL, -- Cron expression or interval config
  timezone TEXT DEFAULT 'America/New_York',
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom Code Snippets
CREATE TABLE IF NOT EXISTS workflow_code_snippets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  code TEXT NOT NULL,
  language TEXT DEFAULT 'javascript',
  input_variables JSONB, -- Expected inputs
  output_variables JSONB, -- Expected outputs
  is_shared BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow Variables
CREATE TABLE IF NOT EXISTS workflow_variables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('string', 'number', 'boolean', 'date', 'array', 'object')),
  default_value JSONB,
  is_secret BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- Execution Queue (for BullMQ integration)
CREATE TABLE IF NOT EXISTS workflow_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  execution_id UUID REFERENCES workflow_executions(id),
  priority INTEGER DEFAULT 0,
  data JSONB NOT NULL,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed', 'failed', 'delayed')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow Analytics
CREATE TABLE IF NOT EXISTS workflow_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  executions_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  avg_execution_time_ms INTEGER,
  total_execution_time_ms BIGINT DEFAULT 0,
  unique_triggers INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workflow_id, date)
);

-- Add indexes for performance
CREATE INDEX idx_workflows_organization_id ON workflows(organization_id);
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_workflow_nodes_workflow_id ON workflow_nodes(workflow_id);
CREATE INDEX idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX idx_workflow_executions_started_at ON workflow_executions(started_at DESC);
CREATE INDEX idx_workflow_execution_steps_execution_id ON workflow_execution_steps(execution_id);
CREATE INDEX idx_workflow_triggers_workflow_id ON workflow_triggers(workflow_id);
CREATE INDEX idx_webhook_triggers_endpoint_id ON webhook_triggers(endpoint_id);
CREATE INDEX idx_schedule_triggers_next_run_at ON schedule_triggers(next_run_at);
CREATE INDEX idx_workflow_queue_status ON workflow_queue(status);
CREATE INDEX idx_workflow_queue_scheduled_at ON workflow_queue(scheduled_at);
CREATE INDEX idx_workflow_analytics_workflow_date ON workflow_analytics(workflow_id, date);

-- Enable RLS
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_execution_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_code_snippets ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Workflow Templates (public templates visible to all, private to organization)
CREATE POLICY "Public templates visible to all" ON workflow_templates
  FOR SELECT USING (is_public = true);

CREATE POLICY "Organization templates" ON workflow_templates
  FOR ALL USING (
    organization_id IN (
      SELECT COALESCE(
        (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid,
        auth.uid()
      )
    )
  );

-- Workflows (organization-based access)
CREATE POLICY "Organization workflows" ON workflows
  FOR ALL USING (
    organization_id IN (
      SELECT COALESCE(
        (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid,
        auth.uid()
      )
    )
  );

-- Similar policies for other tables
CREATE POLICY "Organization workflow versions" ON workflow_versions
  FOR ALL USING (
    workflow_id IN (
      SELECT id FROM workflows WHERE organization_id IN (
        SELECT COALESCE(
          (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid,
          auth.uid()
        )
      )
    )
  );

CREATE POLICY "Organization workflow nodes" ON workflow_nodes
  FOR ALL USING (
    workflow_id IN (
      SELECT id FROM workflows WHERE organization_id IN (
        SELECT COALESCE(
          (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid,
          auth.uid()
        )
      )
    )
  );

CREATE POLICY "Organization workflow executions" ON workflow_executions
  FOR ALL USING (
    organization_id IN (
      SELECT COALESCE(
        (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid,
        auth.uid()
      )
    )
  );

CREATE POLICY "Organization execution steps" ON workflow_execution_steps
  FOR ALL USING (
    execution_id IN (
      SELECT id FROM workflow_executions WHERE organization_id IN (
        SELECT COALESCE(
          (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid,
          auth.uid()
        )
      )
    )
  );

CREATE POLICY "Organization triggers" ON workflow_triggers
  FOR ALL USING (
    workflow_id IN (
      SELECT id FROM workflows WHERE organization_id IN (
        SELECT COALESCE(
          (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid,
          auth.uid()
        )
      )
    )
  );

CREATE POLICY "Organization webhooks" ON webhook_triggers
  FOR ALL USING (
    organization_id IN (
      SELECT COALESCE(
        (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid,
        auth.uid()
      )
    )
  );

CREATE POLICY "Organization schedules" ON schedule_triggers
  FOR ALL USING (
    workflow_id IN (
      SELECT id FROM workflows WHERE organization_id IN (
        SELECT COALESCE(
          (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid,
          auth.uid()
        )
      )
    )
  );

CREATE POLICY "Organization code snippets" ON workflow_code_snippets
  FOR ALL USING (
    organization_id IN (
      SELECT COALESCE(
        (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid,
        auth.uid()
      )
    ) OR is_shared = true
  );

CREATE POLICY "Organization variables" ON workflow_variables
  FOR ALL USING (
    organization_id IN (
      SELECT COALESCE(
        (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid,
        auth.uid()
      )
    )
  );

CREATE POLICY "Organization queue" ON workflow_queue
  FOR ALL USING (
    workflow_id IN (
      SELECT id FROM workflows WHERE organization_id IN (
        SELECT COALESCE(
          (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid,
          auth.uid()
        )
      )
    )
  );

CREATE POLICY "Organization analytics" ON workflow_analytics
  FOR ALL USING (
    workflow_id IN (
      SELECT id FROM workflows WHERE organization_id IN (
        SELECT COALESCE(
          (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid,
          auth.uid()
        )
      )
    )
  );

-- Insert default trigger definitions
INSERT INTO trigger_definitions (id, category, name, description, icon, config_schema, output_schema) VALUES
-- Lead Triggers
('new_lead', 'lead', 'New Lead', 'Triggers when a new lead is created', 'UserPlus', 
  '{"type": "object", "properties": {"source": {"type": "string"}, "tags": {"type": "array"}}}',
  '{"type": "object", "properties": {"lead": {"type": "object"}, "source": {"type": "string"}}}'),
('lead_updated', 'lead', 'Lead Updated', 'Triggers when a lead is updated', 'UserCheck',
  '{"type": "object", "properties": {"fields": {"type": "array"}, "conditions": {"type": "object"}}}',
  '{"type": "object", "properties": {"lead": {"type": "object"}, "changes": {"type": "object"}}}'),
('lead_stage_changed', 'lead', 'Lead Stage Changed', 'Triggers when lead stage changes', 'GitBranch',
  '{"type": "object", "properties": {"fromStage": {"type": "string"}, "toStage": {"type": "string"}}}',
  '{"type": "object", "properties": {"lead": {"type": "object"}, "previousStage": {"type": "string"}, "newStage": {"type": "string"}}}'),

-- Client Triggers  
('new_client', 'client', 'New Client', 'Triggers when a new client is created', 'UserPlus',
  '{"type": "object", "properties": {}}',
  '{"type": "object", "properties": {"client": {"type": "object"}}}'),
('membership_expiring', 'client', 'Membership Expiring', 'Triggers when membership is about to expire', 'Clock',
  '{"type": "object", "properties": {"daysBefore": {"type": "number", "default": 7}}}',
  '{"type": "object", "properties": {"client": {"type": "object"}, "expiryDate": {"type": "string"}}}'),

-- Communication Triggers
('email_opened', 'communication', 'Email Opened', 'Triggers when an email is opened', 'Mail',
  '{"type": "object", "properties": {"campaignId": {"type": "string"}}}',
  '{"type": "object", "properties": {"email": {"type": "string"}, "openedAt": {"type": "string"}}}'),
('form_submitted', 'communication', 'Form Submitted', 'Triggers when a form is submitted', 'FileText',
  '{"type": "object", "properties": {"formId": {"type": "string"}}}',
  '{"type": "object", "properties": {"formData": {"type": "object"}, "formId": {"type": "string"}}}'),

-- Calendar Triggers
('appointment_booked', 'calendar', 'Appointment Booked', 'Triggers when appointment is booked', 'Calendar',
  '{"type": "object", "properties": {"appointmentType": {"type": "string"}}}',
  '{"type": "object", "properties": {"appointment": {"type": "object"}, "client": {"type": "object"}}}'),

-- Schedule Triggers
('scheduled', 'schedule', 'Scheduled', 'Triggers at scheduled times', 'Clock',
  '{"type": "object", "properties": {"schedule": {"type": "string"}, "timezone": {"type": "string"}}}',
  '{"type": "object", "properties": {"scheduledTime": {"type": "string"}}}'),

-- Webhook Triggers
('webhook', 'integration', 'Webhook', 'Triggers on webhook calls', 'Globe',
  '{"type": "object", "properties": {"method": {"type": "string"}, "headers": {"type": "object"}}}',
  '{"type": "object", "properties": {"body": {"type": "object"}, "headers": {"type": "object"}}}'),

-- AI Triggers
('ai_churn_risk', 'ai', 'Churn Risk Detected', 'Triggers when AI detects churn risk', 'AlertTriangle',
  '{"type": "object", "properties": {"threshold": {"type": "number", "default": 0.7}}}',
  '{"type": "object", "properties": {"client": {"type": "object"}, "riskScore": {"type": "number"}}}');

-- Insert default action definitions
INSERT INTO action_definitions (id, category, name, description, icon, input_schema, output_schema) VALUES
-- Communication Actions
('send_email', 'communication', 'Send Email', 'Send an email to a contact', 'Mail',
  '{"type": "object", "properties": {"to": {"type": "string"}, "subject": {"type": "string"}, "body": {"type": "string"}, "templateId": {"type": "string"}}}',
  '{"type": "object", "properties": {"messageId": {"type": "string"}, "status": {"type": "string"}}}'),
('send_sms', 'communication', 'Send SMS', 'Send an SMS message', 'MessageSquare',
  '{"type": "object", "properties": {"to": {"type": "string"}, "message": {"type": "string"}}}',
  '{"type": "object", "properties": {"messageId": {"type": "string"}, "status": {"type": "string"}}}'),
('send_whatsapp', 'communication', 'Send WhatsApp', 'Send a WhatsApp message', 'MessageCircle',
  '{"type": "object", "properties": {"to": {"type": "string"}, "message": {"type": "string"}, "mediaUrl": {"type": "string"}}}',
  '{"type": "object", "properties": {"messageId": {"type": "string"}, "status": {"type": "string"}}}'),

-- CRM Actions
('update_lead', 'crm', 'Update Lead', 'Update lead information', 'UserCheck',
  '{"type": "object", "properties": {"leadId": {"type": "string"}, "updates": {"type": "object"}}}',
  '{"type": "object", "properties": {"lead": {"type": "object"}, "updated": {"type": "boolean"}}}'),
('add_tag', 'crm', 'Add Tag', 'Add a tag to a lead or client', 'Tag',
  '{"type": "object", "properties": {"entityId": {"type": "string"}, "entityType": {"type": "string"}, "tag": {"type": "string"}}}',
  '{"type": "object", "properties": {"success": {"type": "boolean"}}}'),
('change_stage', 'crm', 'Change Stage', 'Change lead pipeline stage', 'GitBranch',
  '{"type": "object", "properties": {"leadId": {"type": "string"}, "stage": {"type": "string"}}}',
  '{"type": "object", "properties": {"previousStage": {"type": "string"}, "newStage": {"type": "string"}}}'),

-- Task Actions
('create_task', 'tasks', 'Create Task', 'Create a new task', 'CheckSquare',
  '{"type": "object", "properties": {"title": {"type": "string"}, "description": {"type": "string"}, "assignTo": {"type": "string"}, "dueDate": {"type": "string"}}}',
  '{"type": "object", "properties": {"taskId": {"type": "string"}, "task": {"type": "object"}}}'),

-- AI Actions
('ai_analyze', 'ai', 'AI Analysis', 'Analyze data with AI', 'Brain',
  '{"type": "object", "properties": {"data": {"type": "object"}, "analysisType": {"type": "string"}}}',
  '{"type": "object", "properties": {"analysis": {"type": "object"}, "insights": {"type": "array"}}}'),
('ai_generate_content', 'ai', 'Generate Content', 'Generate content with AI', 'Sparkles',
  '{"type": "object", "properties": {"prompt": {"type": "string"}, "contentType": {"type": "string"}, "variables": {"type": "object"}}}',
  '{"type": "object", "properties": {"content": {"type": "string"}, "metadata": {"type": "object"}}}'),

-- Data Actions
('http_request', 'data', 'HTTP Request', 'Make an HTTP request', 'Globe',
  '{"type": "object", "properties": {"url": {"type": "string"}, "method": {"type": "string"}, "headers": {"type": "object"}, "body": {"type": "object"}}}',
  '{"type": "object", "properties": {"status": {"type": "number"}, "body": {"type": "object"}, "headers": {"type": "object"}}}'),
('transform_data', 'data', 'Transform Data', 'Transform data using JavaScript', 'Code',
  '{"type": "object", "properties": {"input": {"type": "object"}, "code": {"type": "string"}}}',
  '{"type": "object", "properties": {"output": {"type": "object"}}}'),

-- Wait Actions
('wait_delay', 'control', 'Wait', 'Wait for a specified time', 'Clock',
  '{"type": "object", "properties": {"duration": {"type": "number"}, "unit": {"type": "string", "enum": ["seconds", "minutes", "hours", "days"]}}}',
  '{"type": "object", "properties": {"waited": {"type": "boolean"}}}'),

-- Logic Actions
('condition', 'control', 'If/Else Condition', 'Conditional branching', 'GitBranch',
  '{"type": "object", "properties": {"conditions": {"type": "array"}, "operator": {"type": "string", "enum": ["AND", "OR"]}}}',
  '{"type": "object", "properties": {"result": {"type": "boolean"}, "branch": {"type": "string"}}}'),
('loop', 'control', 'Loop', 'Loop through items', 'Repeat',
  '{"type": "object", "properties": {"items": {"type": "array"}, "maxIterations": {"type": "number"}}}',
  '{"type": "object", "properties": {"iterations": {"type": "number"}, "results": {"type": "array"}}}');

-- Create functions for workflow management
CREATE OR REPLACE FUNCTION increment_workflow_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = COALESCE((
    SELECT MAX(version) + 1 
    FROM workflows 
    WHERE id = NEW.id
  ), 1);
  
  -- Save version history
  INSERT INTO workflow_versions (workflow_id, version, workflow_data, changes, created_by)
  VALUES (NEW.id, NEW.version, NEW.workflow_data, NEW.description, NEW.created_by);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workflow_version_trigger
BEFORE UPDATE ON workflows
FOR EACH ROW
WHEN (OLD.workflow_data IS DISTINCT FROM NEW.workflow_data)
EXECUTE FUNCTION increment_workflow_version();

-- Function to update workflow analytics
CREATE OR REPLACE FUNCTION update_workflow_analytics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' OR NEW.status = 'failed' THEN
    INSERT INTO workflow_analytics (
      workflow_id,
      date,
      executions_count,
      success_count,
      failure_count,
      total_execution_time_ms
    ) VALUES (
      NEW.workflow_id,
      DATE(NEW.started_at),
      1,
      CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END,
      CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END,
      NEW.execution_time_ms
    )
    ON CONFLICT (workflow_id, date) DO UPDATE SET
      executions_count = workflow_analytics.executions_count + 1,
      success_count = workflow_analytics.success_count + CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END,
      failure_count = workflow_analytics.failure_count + CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END,
      total_execution_time_ms = workflow_analytics.total_execution_time_ms + EXCLUDED.total_execution_time_ms,
      avg_execution_time_ms = (workflow_analytics.total_execution_time_ms + EXCLUDED.total_execution_time_ms) / (workflow_analytics.executions_count + 1);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workflow_analytics_trigger
AFTER UPDATE ON workflow_executions
FOR EACH ROW
EXECUTE FUNCTION update_workflow_analytics();

-- Add updated_at triggers
CREATE TRIGGER update_workflow_templates_updated_at BEFORE UPDATE ON workflow_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_code_snippets_updated_at BEFORE UPDATE ON workflow_code_snippets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_variables_updated_at BEFORE UPDATE ON workflow_variables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();