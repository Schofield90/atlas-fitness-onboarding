-- Agent Test UI Tables
-- Created: October 16, 2025
--
-- Purpose: Support real-time testing and feedback system for AI agents
-- Features:
--   1. Test feedback tracking
--   2. SOP (system prompt) change history
--   3. Self-debugging error logs

-- Table: agent_test_feedback
-- Stores feedback provided during agent testing sessions
CREATE TABLE IF NOT EXISTS agent_test_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES ai_agent_messages(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES ai_agent_conversations(id) ON DELETE CASCADE,

  -- Feedback details
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('positive', 'negative', 'needs_improvement')),
  notes TEXT,

  -- Message snapshot (for historical reference)
  message_content TEXT,
  tool_calls JSONB,
  tool_results JSONB,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_agent_test_feedback_agent ON agent_test_feedback(agent_id);
CREATE INDEX idx_agent_test_feedback_message ON agent_test_feedback(message_id);
CREATE INDEX idx_agent_test_feedback_conversation ON agent_test_feedback(conversation_id);
CREATE INDEX idx_agent_test_feedback_type ON agent_test_feedback(feedback_type);
CREATE INDEX idx_agent_test_feedback_created ON agent_test_feedback(created_at DESC);

COMMENT ON TABLE agent_test_feedback IS 'Stores feedback from agent testing UI to improve agent performance';

-- Table: agent_sop_changes
-- Tracks all system prompt changes with audit trail
CREATE TABLE IF NOT EXISTS agent_sop_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- Change details
  change_type TEXT NOT NULL CHECK (change_type IN ('manual_edit', 'feedback_improvement', 'automated_refinement')),
  previous_prompt TEXT NOT NULL,
  new_prompt TEXT NOT NULL,

  -- Trigger context
  trigger_message_id UUID REFERENCES ai_agent_messages(id) ON DELETE SET NULL,
  feedback_notes TEXT,

  -- Diff summary (automatically generated)
  changes_summary TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_agent_sop_changes_agent ON agent_sop_changes(agent_id);
CREATE INDEX idx_agent_sop_changes_created ON agent_sop_changes(created_at DESC);
CREATE INDEX idx_agent_sop_changes_type ON agent_sop_changes(change_type);

COMMENT ON TABLE agent_sop_changes IS 'Audit trail for AI agent system prompt modifications';

-- Table: agent_debug_logs
-- Stores self-debugging errors and warnings from agent execution
CREATE TABLE IF NOT EXISTS agent_debug_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES ai_agent_conversations(id) ON DELETE SET NULL,
  message_id UUID REFERENCES ai_agent_messages(id) ON DELETE SET NULL,

  -- Debug info
  log_level TEXT NOT NULL CHECK (log_level IN ('info', 'warning', 'error', 'critical')),
  category TEXT NOT NULL CHECK (category IN ('tool_execution', 'prompt_validation', 'rate_limit', 'hallucination_detected', 'missing_data', 'api_error')),

  -- Error details
  error_message TEXT NOT NULL,
  error_stack TEXT,
  context JSONB,

  -- Tool-specific info
  tool_name TEXT,
  tool_input JSONB,
  tool_output JSONB,

  -- Resolution status
  status TEXT DEFAULT 'unresolved' CHECK (status IN ('unresolved', 'investigating', 'resolved', 'ignored')),
  resolution_notes TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_agent_debug_logs_agent ON agent_debug_logs(agent_id);
CREATE INDEX idx_agent_debug_logs_level ON agent_debug_logs(log_level);
CREATE INDEX idx_agent_debug_logs_category ON agent_debug_logs(category);
CREATE INDEX idx_agent_debug_logs_status ON agent_debug_logs(status);
CREATE INDEX idx_agent_debug_logs_created ON agent_debug_logs(created_at DESC);
CREATE INDEX idx_agent_debug_logs_conversation ON agent_debug_logs(conversation_id);

COMMENT ON TABLE agent_debug_logs IS 'Self-debugging logs for AI agent tool errors and issues';

-- Function: log_agent_debug_event
-- Helper function to create debug logs from tool execution
CREATE OR REPLACE FUNCTION log_agent_debug_event(
  p_agent_id UUID,
  p_conversation_id UUID,
  p_message_id UUID,
  p_log_level TEXT,
  p_category TEXT,
  p_error_message TEXT,
  p_tool_name TEXT DEFAULT NULL,
  p_tool_input JSONB DEFAULT NULL,
  p_tool_output JSONB DEFAULT NULL,
  p_context JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO agent_debug_logs (
    agent_id,
    conversation_id,
    message_id,
    log_level,
    category,
    error_message,
    tool_name,
    tool_input,
    tool_output,
    context,
    created_at
  ) VALUES (
    p_agent_id,
    p_conversation_id,
    p_message_id,
    p_log_level,
    p_category,
    p_error_message,
    p_tool_name,
    p_tool_input,
    p_tool_output,
    p_context,
    NOW()
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_agent_debug_event IS 'Create a debug log entry for agent errors and warnings';

-- RLS Policies (Admin access only for now)
ALTER TABLE agent_test_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_sop_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_debug_logs ENABLE ROW LEVEL SECURITY;

-- Allow admin access to all test feedback
CREATE POLICY admin_agent_test_feedback ON agent_test_feedback
  FOR ALL
  USING (true);

CREATE POLICY admin_agent_sop_changes ON agent_sop_changes
  FOR ALL
  USING (true);

CREATE POLICY admin_agent_debug_logs ON agent_debug_logs
  FOR ALL
  USING (true);

-- Grant permissions to service role
GRANT ALL ON agent_test_feedback TO service_role;
GRANT ALL ON agent_sop_changes TO service_role;
GRANT ALL ON agent_debug_logs TO service_role;
