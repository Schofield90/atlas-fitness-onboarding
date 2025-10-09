-- AI Agent Orchestration System
-- Migration: 20251008000000_create_ai_agents_system.sql
-- Description: Creates complete schema for multi-agent AI system with cost tracking

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. AI AGENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS ai_agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  avatar_url TEXT,
  role VARCHAR(100) NOT NULL, -- 'customer_support', 'financial', 'social_media', 'custom'
  system_prompt TEXT NOT NULL,
  model VARCHAR(50) NOT NULL DEFAULT 'gpt-4o', -- 'gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'
  temperature DECIMAL(3,2) DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
  max_tokens INTEGER DEFAULT 4096,
  enabled BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false, -- System-provided default agents
  allowed_tools TEXT[] DEFAULT '{}', -- Array of tool IDs agent can use
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_agent_name_per_org UNIQUE(organization_id, name)
);

-- =============================================
-- 2. AI AGENT CONVERSATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS ai_agent_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Staff member chatting with agent
  title VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  last_message_at TIMESTAMP WITH TIME ZONE,
  message_count INTEGER DEFAULT 0,
  total_tokens_used INTEGER DEFAULT 0,
  total_cost_usd DECIMAL(10,6) DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 3. AI AGENT MESSAGES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS ai_agent_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES ai_agent_conversations(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT,
  tool_calls JSONB, -- Function/tool calls made by agent
  tool_results JSONB, -- Results from function/tool calls
  tokens_used INTEGER DEFAULT 0,
  cost_usd DECIMAL(10,6) DEFAULT 0,
  model VARCHAR(50), -- Model used for this specific message
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 4. AI AGENT TASKS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS ai_agent_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  task_type VARCHAR(50) NOT NULL CHECK (task_type IN ('adhoc', 'scheduled', 'automation')),
  schedule_cron VARCHAR(100), -- Cron expression for scheduled tasks (e.g., '0 9 * * 1' = Every Monday at 9am)
  schedule_timezone VARCHAR(50) DEFAULT 'UTC',
  next_run_at TIMESTAMP WITH TIME ZONE,
  last_run_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'running', 'completed', 'failed', 'cancelled')),
  priority INTEGER DEFAULT 0 CHECK (priority >= 0 AND priority <= 10),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  context JSONB DEFAULT '{}', -- Additional context/instructions for the task
  result JSONB, -- Task execution result
  error_message TEXT,
  execution_time_ms INTEGER,
  tokens_used INTEGER DEFAULT 0,
  cost_usd DECIMAL(10,6) DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- =============================================
-- 5. AI AGENT TOOLS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS ai_agent_tools (
  id VARCHAR(100) PRIMARY KEY, -- 'search_clients', 'generate_report', etc.
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('reports', 'messaging', 'analytics', 'data', 'automation', 'crm')),
  parameters_schema JSONB NOT NULL, -- JSON Schema for parameters (OpenAI format)
  requires_permission VARCHAR(100), -- Permission slug required to use tool
  is_system BOOLEAN DEFAULT true, -- System tools vs custom tools
  enabled BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 6. AI AGENT ACTIVITY LOG TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS ai_agent_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  task_id UUID REFERENCES ai_agent_tasks(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES ai_agent_conversations(id) ON DELETE SET NULL,
  action_type VARCHAR(100) NOT NULL, -- 'tool_execution', 'message_sent', 'report_generated', 'task_completed'
  action_data JSONB DEFAULT '{}',
  tokens_used INTEGER DEFAULT 0,
  cost_usd DECIMAL(10,6) DEFAULT 0,
  cost_billed_usd DECIMAL(10,6) DEFAULT 0, -- Cost with 20% markup
  execution_time_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 7. AI USAGE BILLING TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS ai_usage_billing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  total_tokens_used INTEGER DEFAULT 0,
  total_cost_base_usd DECIMAL(10,6) DEFAULT 0, -- Base cost from providers
  total_cost_billed_usd DECIMAL(10,6) DEFAULT 0, -- Cost with 20% markup
  markup_percentage DECIMAL(5,2) DEFAULT 20.00,
  breakdown_by_agent JSONB DEFAULT '{}', -- { agent_id: { tokens, cost } }
  breakdown_by_model JSONB DEFAULT '{}', -- { model: { tokens, cost } }
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'invoiced', 'paid')),
  invoice_id VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_billing_period UNIQUE(organization_id, billing_period_start, billing_period_end)
);

-- =============================================
-- 8. AI MODEL PRICING TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS ai_model_pricing (
  id VARCHAR(100) PRIMARY KEY, -- 'gpt-4o', 'claude-3-5-sonnet-20241022', etc.
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('openai', 'anthropic')),
  name VARCHAR(255) NOT NULL,
  cost_per_1k_input_tokens DECIMAL(10,6) NOT NULL,
  cost_per_1k_output_tokens DECIMAL(10,6) NOT NULL,
  context_window INTEGER NOT NULL,
  supports_vision BOOLEAN DEFAULT false,
  supports_function_calling BOOLEAN DEFAULT false,
  enabled BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

-- ai_agents indexes
CREATE INDEX idx_ai_agents_org ON ai_agents(organization_id);
CREATE INDEX idx_ai_agents_role ON ai_agents(role);
CREATE INDEX idx_ai_agents_enabled ON ai_agents(enabled) WHERE enabled = true;

-- ai_agent_conversations indexes
CREATE INDEX idx_ai_agent_conversations_agent ON ai_agent_conversations(agent_id);
CREATE INDEX idx_ai_agent_conversations_org ON ai_agent_conversations(organization_id);
CREATE INDEX idx_ai_agent_conversations_user ON ai_agent_conversations(user_id);
CREATE INDEX idx_ai_agent_conversations_status ON ai_agent_conversations(status);

-- ai_agent_messages indexes
CREATE INDEX idx_ai_agent_messages_conversation ON ai_agent_messages(conversation_id);
CREATE INDEX idx_ai_agent_messages_created ON ai_agent_messages(created_at DESC);

-- ai_agent_tasks indexes
CREATE INDEX idx_ai_agent_tasks_agent ON ai_agent_tasks(agent_id);
CREATE INDEX idx_ai_agent_tasks_org ON ai_agent_tasks(organization_id);
CREATE INDEX idx_ai_agent_tasks_status ON ai_agent_tasks(status);
CREATE INDEX idx_ai_agent_tasks_next_run ON ai_agent_tasks(next_run_at) WHERE status = 'pending';
CREATE INDEX idx_ai_agent_tasks_type ON ai_agent_tasks(task_type);

-- ai_agent_tools indexes
CREATE INDEX idx_ai_agent_tools_category ON ai_agent_tools(category);
CREATE INDEX idx_ai_agent_tools_enabled ON ai_agent_tools(enabled) WHERE enabled = true;

-- ai_agent_activity_log indexes
CREATE INDEX idx_ai_agent_activity_log_agent ON ai_agent_activity_log(agent_id);
CREATE INDEX idx_ai_agent_activity_log_org ON ai_agent_activity_log(organization_id);
CREATE INDEX idx_ai_agent_activity_log_created ON ai_agent_activity_log(created_at DESC);
CREATE INDEX idx_ai_agent_activity_log_task ON ai_agent_activity_log(task_id);
CREATE INDEX idx_ai_agent_activity_log_conversation ON ai_agent_activity_log(conversation_id);

-- ai_usage_billing indexes
CREATE INDEX idx_ai_usage_billing_org ON ai_usage_billing(organization_id);
CREATE INDEX idx_ai_usage_billing_period ON ai_usage_billing(billing_period_start, billing_period_end);
CREATE INDEX idx_ai_usage_billing_status ON ai_usage_billing(status);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_pricing ENABLE ROW LEVEL SECURITY;

-- ai_agents policies
CREATE POLICY "Users can view agents in their org" ON ai_agents
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert agents in their org" ON ai_agents
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update agents in their org" ON ai_agents
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete custom agents in their org" ON ai_agents
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
    AND is_default = false
  );

-- ai_agent_conversations policies
CREATE POLICY "Users can view conversations in their org" ON ai_agent_conversations
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert conversations in their org" ON ai_agent_conversations
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their conversations" ON ai_agent_conversations
  FOR UPDATE USING (
    user_id = auth.uid() OR
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ai_agent_messages policies
CREATE POLICY "Users can view messages in their org conversations" ON ai_agent_messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM ai_agent_conversations WHERE organization_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert messages in their org conversations" ON ai_agent_messages
  FOR INSERT WITH CHECK (
    conversation_id IN (
      SELECT id FROM ai_agent_conversations WHERE organization_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
      )
    )
  );

-- ai_agent_tasks policies
CREATE POLICY "Users can view tasks in their org" ON ai_agent_tasks
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert tasks in their org" ON ai_agent_tasks
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update tasks in their org" ON ai_agent_tasks
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

-- ai_agent_tools policies (public read for all authenticated users)
CREATE POLICY "Authenticated users can view enabled tools" ON ai_agent_tools
  FOR SELECT USING (enabled = true AND auth.role() = 'authenticated');

-- ai_agent_activity_log policies
CREATE POLICY "Users can view activity in their org" ON ai_agent_activity_log
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

-- ai_usage_billing policies
CREATE POLICY "Org owners can view billing" ON ai_usage_billing
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ai_model_pricing policies (public read)
CREATE POLICY "Authenticated users can view model pricing" ON ai_model_pricing
  FOR SELECT USING (enabled = true AND auth.role() = 'authenticated');

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update_updated_at trigger to relevant tables
CREATE TRIGGER update_ai_agents_updated_at BEFORE UPDATE ON ai_agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_agent_conversations_updated_at BEFORE UPDATE ON ai_agent_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_agent_tasks_updated_at BEFORE UPDATE ON ai_agent_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_agent_tools_updated_at BEFORE UPDATE ON ai_agent_tools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_usage_billing_updated_at BEFORE UPDATE ON ai_usage_billing
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_model_pricing_updated_at BEFORE UPDATE ON ai_model_pricing
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update conversation stats when messages are added
CREATE OR REPLACE FUNCTION update_conversation_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ai_agent_conversations
  SET
    message_count = message_count + 1,
    last_message_at = NEW.created_at,
    total_tokens_used = total_tokens_used + COALESCE(NEW.tokens_used, 0),
    total_cost_usd = total_cost_usd + COALESCE(NEW.cost_usd, 0),
    updated_at = NOW()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_stats_on_message AFTER INSERT ON ai_agent_messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_stats();

-- =============================================
-- SEED DATA: AI Model Pricing
-- =============================================

INSERT INTO ai_model_pricing (id, provider, name, cost_per_1k_input_tokens, cost_per_1k_output_tokens, context_window, supports_vision, supports_function_calling) VALUES
-- OpenAI Models
('gpt-4o', 'openai', 'GPT-4o', 0.0025, 0.0100, 128000, true, true),
('gpt-4o-mini', 'openai', 'GPT-4o Mini', 0.000150, 0.000600, 128000, true, true),
('gpt-4-turbo', 'openai', 'GPT-4 Turbo', 0.0100, 0.0300, 128000, true, true),
('gpt-3.5-turbo', 'openai', 'GPT-3.5 Turbo', 0.0005, 0.0015, 16385, false, true),

-- Anthropic Models (October 2024 pricing)
('claude-3-5-sonnet-20241022', 'anthropic', 'Claude 3.5 Sonnet', 0.0030, 0.0150, 200000, true, true),
('claude-3-5-haiku-20241022', 'anthropic', 'Claude 3.5 Haiku', 0.0008, 0.0040, 200000, false, true),
('claude-3-opus-20240229', 'anthropic', 'Claude 3 Opus', 0.0150, 0.0750, 200000, true, true)
ON CONFLICT (id) DO UPDATE SET
  cost_per_1k_input_tokens = EXCLUDED.cost_per_1k_input_tokens,
  cost_per_1k_output_tokens = EXCLUDED.cost_per_1k_output_tokens,
  context_window = EXCLUDED.context_window,
  supports_vision = EXCLUDED.supports_vision,
  supports_function_calling = EXCLUDED.supports_function_calling,
  updated_at = NOW();

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE ai_agents IS 'AI agent definitions with configuration and permissions';
COMMENT ON TABLE ai_agent_conversations IS 'Chat conversations between users and AI agents';
COMMENT ON TABLE ai_agent_messages IS 'Individual messages within conversations';
COMMENT ON TABLE ai_agent_tasks IS 'Scheduled and ad-hoc tasks assigned to agents';
COMMENT ON TABLE ai_agent_tools IS 'Available tools/functions that agents can execute';
COMMENT ON TABLE ai_agent_activity_log IS 'Audit log of all agent actions and tool executions';
COMMENT ON TABLE ai_usage_billing IS 'Monthly billing records for AI usage with markup';
COMMENT ON TABLE ai_model_pricing IS 'Current pricing for AI models from various providers';

COMMENT ON COLUMN ai_agents.allowed_tools IS 'Array of tool IDs this agent is permitted to use';
COMMENT ON COLUMN ai_agents.is_default IS 'System-provided agents that cannot be deleted';
COMMENT ON COLUMN ai_agent_tasks.schedule_cron IS 'Cron expression for recurring tasks (e.g., "0 9 * * MON" = Every Monday 9am)';
COMMENT ON COLUMN ai_usage_billing.markup_percentage IS 'Percentage markup applied to base costs (default 20%)';
COMMENT ON COLUMN ai_usage_billing.total_cost_billed_usd IS 'Cost charged to customer (base cost + markup)';
