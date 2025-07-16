-- Atlas Fitness Automation Engine Schema Extension
-- This extends the existing CRM schema with advanced automation capabilities

-- =============================================
-- AUTOMATION ENGINE TABLES
-- =============================================

-- Create automation triggers table for more complex trigger management
CREATE TABLE automation_triggers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID REFERENCES automation_workflows(id) ON DELETE CASCADE,
  
  -- Trigger Configuration
  type TEXT NOT NULL CHECK (type IN ('webhook', 'schedule', 'event', 'database_change', 'manual')),
  name TEXT NOT NULL,
  description TEXT,
  
  -- Webhook Configuration
  webhook_url TEXT,
  webhook_secret TEXT,
  
  -- Schedule Configuration
  schedule_type TEXT CHECK (schedule_type IN ('cron', 'interval', 'once')),
  cron_expression TEXT,
  interval_minutes INTEGER,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  
  -- Event Configuration
  event_type TEXT,
  event_filters JSONB DEFAULT '{}',
  
  -- Database Change Configuration
  table_name TEXT,
  operation TEXT CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  conditions JSONB DEFAULT '{}',
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_triggered TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create automation actions table for reusable action components
CREATE TABLE automation_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Action Details
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('email', 'sms', 'whatsapp', 'webhook', 'database', 'delay', 'condition', 'ai_task', 'notification')),
  
  -- Action Configuration
  config JSONB NOT NULL DEFAULT '{}',
  
  -- Template and Validation
  input_schema JSONB DEFAULT '{}',
  output_schema JSONB DEFAULT '{}',
  
  -- Categories and Tags
  category TEXT,
  tags TEXT[],
  
  -- Usage Statistics
  usage_count INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_built_in BOOLEAN DEFAULT FALSE,
  
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create workflow nodes table for visual workflow builder
CREATE TABLE workflow_nodes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID REFERENCES automation_workflows(id) ON DELETE CASCADE,
  
  -- Node Properties
  node_id TEXT NOT NULL, -- Unique within workflow
  type TEXT NOT NULL CHECK (type IN ('trigger', 'action', 'condition', 'delay', 'merge', 'split')),
  name TEXT NOT NULL,
  description TEXT,
  
  -- Visual Properties
  position_x FLOAT NOT NULL DEFAULT 0,
  position_y FLOAT NOT NULL DEFAULT 0,
  width FLOAT DEFAULT 200,
  height FLOAT DEFAULT 80,
  
  -- Node Configuration
  config JSONB NOT NULL DEFAULT '{}',
  
  -- Execution Properties
  action_id UUID REFERENCES automation_actions(id),
  timeout_seconds INTEGER DEFAULT 300,
  retry_count INTEGER DEFAULT 0,
  retry_delay_seconds INTEGER DEFAULT 60,
  
  -- Conditions (for condition nodes)
  condition_logic TEXT CHECK (condition_logic IN ('AND', 'OR', 'NOT')),
  conditions JSONB DEFAULT '[]',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  UNIQUE(workflow_id, node_id)
);

-- Create workflow edges table for node connections
CREATE TABLE workflow_edges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID REFERENCES automation_workflows(id) ON DELETE CASCADE,
  
  -- Edge Properties
  edge_id TEXT NOT NULL, -- Unique within workflow
  source_node_id TEXT NOT NULL,
  target_node_id TEXT NOT NULL,
  
  -- Connection Points
  source_handle TEXT DEFAULT 'output',
  target_handle TEXT DEFAULT 'input',
  
  -- Conditional Edges
  condition_type TEXT DEFAULT 'always' CHECK (condition_type IN ('always', 'success', 'failure', 'conditional')),
  condition_config JSONB DEFAULT '{}',
  
  -- Visual Properties
  animated BOOLEAN DEFAULT FALSE,
  style JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  UNIQUE(workflow_id, edge_id)
);

-- Create automation execution logs table for detailed tracking
CREATE TABLE automation_execution_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id UUID REFERENCES automation_executions(id) ON DELETE CASCADE,
  
  -- Log Entry Details
  level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warning', 'error')),
  message TEXT NOT NULL,
  
  -- Execution Context
  node_id TEXT,
  step_number INTEGER,
  
  -- Log Data
  data JSONB DEFAULT '{}',
  duration_ms INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create automation schedules table for cron-based triggers
CREATE TABLE automation_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trigger_id UUID REFERENCES automation_triggers(id) ON DELETE CASCADE,
  
  -- Schedule Details
  cron_expression TEXT NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  
  -- Execution Status
  last_run TIMESTAMP WITH TIME ZONE,
  next_run TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Error Handling
  consecutive_failures INTEGER DEFAULT 0,
  max_failures INTEGER DEFAULT 3,
  last_error TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create communication channels table for unified messaging
CREATE TABLE communication_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Channel Details
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email', 'sms', 'whatsapp', 'telegram', 'slack', 'webhook')),
  
  -- Channel Configuration
  config JSONB NOT NULL DEFAULT '{}',
  
  -- API Credentials (encrypted)
  api_key TEXT,
  api_secret TEXT,
  webhook_url TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  
  -- Usage Statistics
  messages_sent INTEGER DEFAULT 0,
  last_used TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create message queue table for reliable message delivery
CREATE TABLE message_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Queue Details
  channel_id UUID REFERENCES communication_channels(id),
  
  -- Message Details
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('lead', 'client', 'user', 'external')),
  recipient_id UUID,
  recipient_email TEXT,
  recipient_phone TEXT,
  
  -- Message Content
  message_type TEXT NOT NULL CHECK (message_type IN ('email', 'sms', 'whatsapp', 'push', 'webhook')),
  subject TEXT,
  content TEXT NOT NULL,
  
  -- Delivery Configuration
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  max_retries INTEGER DEFAULT 3,
  retry_delay_seconds INTEGER DEFAULT 300,
  
  -- Status Tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'delivered', 'failed', 'cancelled')),
  attempts INTEGER DEFAULT 0,
  last_attempt TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  
  -- Automation Context
  execution_id UUID REFERENCES automation_executions(id),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create automation variables table for workflow state management
CREATE TABLE automation_variables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Scope
  scope TEXT NOT NULL CHECK (scope IN ('global', 'organization', 'workflow', 'execution')),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES automation_workflows(id) ON DELETE CASCADE,
  execution_id UUID REFERENCES automation_executions(id) ON DELETE CASCADE,
  
  -- Variable Details
  name TEXT NOT NULL,
  value JSONB,
  data_type TEXT NOT NULL CHECK (data_type IN ('string', 'number', 'boolean', 'object', 'array')),
  
  -- Constraints
  is_encrypted BOOLEAN DEFAULT FALSE,
  is_readonly BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  UNIQUE(scope, organization_id, workflow_id, execution_id, name)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Automation triggers indexes
CREATE INDEX idx_automation_triggers_workflow ON automation_triggers(workflow_id);
CREATE INDEX idx_automation_triggers_type ON automation_triggers(type);
CREATE INDEX idx_automation_triggers_active ON automation_triggers(is_active);

-- Automation actions indexes
CREATE INDEX idx_automation_actions_organization ON automation_actions(organization_id);
CREATE INDEX idx_automation_actions_type ON automation_actions(type);
CREATE INDEX idx_automation_actions_active ON automation_actions(is_active);

-- Workflow nodes indexes
CREATE INDEX idx_workflow_nodes_workflow ON workflow_nodes(workflow_id);
CREATE INDEX idx_workflow_nodes_type ON workflow_nodes(type);
CREATE INDEX idx_workflow_nodes_action ON workflow_nodes(action_id);

-- Workflow edges indexes
CREATE INDEX idx_workflow_edges_workflow ON workflow_edges(workflow_id);
CREATE INDEX idx_workflow_edges_source ON workflow_edges(source_node_id);
CREATE INDEX idx_workflow_edges_target ON workflow_edges(target_node_id);

-- Execution logs indexes
CREATE INDEX idx_execution_logs_execution ON automation_execution_logs(execution_id);
CREATE INDEX idx_execution_logs_level ON automation_execution_logs(level);
CREATE INDEX idx_execution_logs_created_at ON automation_execution_logs(created_at);

-- Schedules indexes
CREATE INDEX idx_automation_schedules_trigger ON automation_schedules(trigger_id);
CREATE INDEX idx_automation_schedules_next_run ON automation_schedules(next_run);
CREATE INDEX idx_automation_schedules_active ON automation_schedules(is_active);

-- Communication channels indexes
CREATE INDEX idx_communication_channels_organization ON communication_channels(organization_id);
CREATE INDEX idx_communication_channels_type ON communication_channels(type);
CREATE INDEX idx_communication_channels_active ON communication_channels(is_active);

-- Message queue indexes
CREATE INDEX idx_message_queue_organization ON message_queue(organization_id);
CREATE INDEX idx_message_queue_status ON message_queue(status);
CREATE INDEX idx_message_queue_scheduled_for ON message_queue(scheduled_for);
CREATE INDEX idx_message_queue_priority ON message_queue(priority);
CREATE INDEX idx_message_queue_recipient ON message_queue(recipient_type, recipient_id);

-- Variables indexes
CREATE INDEX idx_automation_variables_scope ON automation_variables(scope);
CREATE INDEX idx_automation_variables_organization ON automation_variables(organization_id);
CREATE INDEX idx_automation_variables_workflow ON automation_variables(workflow_id);
CREATE INDEX idx_automation_variables_execution ON automation_variables(execution_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on new tables
ALTER TABLE automation_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_variables ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Organization members can access automation triggers" ON automation_triggers
FOR ALL USING (
  workflow_id IN (
    SELECT aw.id FROM automation_workflows aw
    WHERE aw.organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Organization members can access automation actions" ON automation_actions
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Organization members can access workflow nodes" ON workflow_nodes
FOR ALL USING (
  workflow_id IN (
    SELECT aw.id FROM automation_workflows aw
    WHERE aw.organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Organization members can access workflow edges" ON workflow_edges
FOR ALL USING (
  workflow_id IN (
    SELECT aw.id FROM automation_workflows aw
    WHERE aw.organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Organization members can access communication channels" ON communication_channels
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Organization members can access message queue" ON message_queue
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles 
    WHERE id = auth.uid()
  )
);

-- =============================================
-- TRIGGERS FOR AUTOMATION
-- =============================================

-- Add updated_at triggers for new tables
CREATE TRIGGER update_automation_triggers_updated_at 
  BEFORE UPDATE ON automation_triggers 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_automation_actions_updated_at 
  BEFORE UPDATE ON automation_actions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_nodes_updated_at 
  BEFORE UPDATE ON workflow_nodes 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_automation_schedules_updated_at 
  BEFORE UPDATE ON automation_schedules 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_communication_channels_updated_at 
  BEFORE UPDATE ON communication_channels 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_automation_variables_updated_at 
  BEFORE UPDATE ON automation_variables 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- BUILT-IN AUTOMATION ACTIONS
-- =============================================

-- Insert built-in automation actions
INSERT INTO automation_actions (organization_id, name, description, type, config, input_schema, output_schema, category, is_built_in) VALUES
-- Email Actions
((SELECT id FROM organizations WHERE slug = 'atlas-fitness'), 'Send Email', 'Send an email to a recipient', 'email', 
  '{"template_support": true, "attachments": true}',
  '{"recipient": {"type": "string", "required": true}, "subject": {"type": "string", "required": true}, "content": {"type": "string", "required": true}}',
  '{"message_id": {"type": "string"}, "sent_at": {"type": "timestamp"}}',
  'Communication', true),

-- SMS Actions
((SELECT id FROM organizations WHERE slug = 'atlas-fitness'), 'Send SMS', 'Send an SMS message', 'sms', 
  '{"message_limit": 160, "unicode_support": true}',
  '{"recipient": {"type": "string", "required": true}, "message": {"type": "string", "required": true}}',
  '{"message_id": {"type": "string"}, "sent_at": {"type": "timestamp"}}',
  'Communication', true),

-- WhatsApp Actions
((SELECT id FROM organizations WHERE slug = 'atlas-fitness'), 'Send WhatsApp', 'Send a WhatsApp message', 'whatsapp', 
  '{"media_support": true, "template_support": true}',
  '{"recipient": {"type": "string", "required": true}, "message": {"type": "string", "required": true}}',
  '{"message_id": {"type": "string"}, "sent_at": {"type": "timestamp"}}',
  'Communication', true),

-- Database Actions
((SELECT id FROM organizations WHERE slug = 'atlas-fitness'), 'Create Lead', 'Create a new lead in the system', 'database', 
  '{"table": "leads", "operation": "insert"}',
  '{"first_name": {"type": "string", "required": true}, "last_name": {"type": "string", "required": true}, "email": {"type": "string"}}',
  '{"lead_id": {"type": "string"}, "created_at": {"type": "timestamp"}}',
  'Database', true),

((SELECT id FROM organizations WHERE slug = 'atlas-fitness'), 'Update Lead Status', 'Update the status of a lead', 'database', 
  '{"table": "leads", "operation": "update"}',
  '{"lead_id": {"type": "string", "required": true}, "status": {"type": "string", "required": true}}',
  '{"updated_at": {"type": "timestamp"}}',
  'Database', true),

-- Utility Actions
((SELECT id FROM organizations WHERE slug = 'atlas-fitness'), 'Delay', 'Wait for a specified amount of time', 'delay', 
  '{"max_delay": 86400}',
  '{"seconds": {"type": "number", "required": true}}',
  '{"delayed_until": {"type": "timestamp"}}',
  'Utility', true),

-- Webhook Actions
((SELECT id FROM organizations WHERE slug = 'atlas-fitness'), 'Send Webhook', 'Send a webhook to an external service', 'webhook', 
  '{"methods": ["GET", "POST", "PUT", "DELETE"], "auth_support": true}',
  '{"url": {"type": "string", "required": true}, "method": {"type": "string", "default": "POST"}, "data": {"type": "object"}}',
  '{"response": {"type": "object"}, "status_code": {"type": "number"}}',
  'Integration', true),

-- AI Actions
((SELECT id FROM organizations WHERE slug = 'atlas-fitness'), 'AI Content Generation', 'Generate content using AI', 'ai_task', 
  '{"models": ["gpt-4", "gpt-3.5-turbo"], "max_tokens": 4000}',
  '{"prompt": {"type": "string", "required": true}, "model": {"type": "string", "default": "gpt-4"}}',
  '{"content": {"type": "string"}, "tokens_used": {"type": "number"}}',
  'AI', true),

-- Notification Actions
((SELECT id FROM organizations WHERE slug = 'atlas-fitness'), 'Send Notification', 'Send a notification to users', 'notification', 
  '{"channels": ["email", "sms", "push", "in_app"]}',
  '{"recipient": {"type": "string", "required": true}, "message": {"type": "string", "required": true}, "channel": {"type": "string", "required": true}}',
  '{"notification_id": {"type": "string"}, "sent_at": {"type": "timestamp"}}',
  'Communication', true);