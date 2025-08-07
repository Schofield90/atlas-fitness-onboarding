-- Add AI chatbot toggle functionality to automation system

-- Add AI chatbot settings to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS ai_chatbot_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS ai_chatbot_settings JSONB DEFAULT '{"global_enabled": true, "business_hours_only": false, "response_delay_seconds": 0, "fallback_message": "Thanks for your message! Our team will get back to you shortly."}';

-- Add AI toggle fields to workflows table  
ALTER TABLE workflows 
ADD COLUMN IF NOT EXISTS ai_chatbot_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS ai_fallback_to_human BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ai_business_hours_only BOOLEAN DEFAULT FALSE;

-- Create AI chatbot toggle logs table for tracking when AI is turned on/off
CREATE TABLE IF NOT EXISTS ai_chatbot_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  action_type VARCHAR NOT NULL CHECK (action_type IN ('enabled', 'disabled', 'fallback_to_human')),
  triggered_by VARCHAR, -- user_id or 'system'
  trigger_reason TEXT, -- reason for the toggle
  phone_number VARCHAR, -- which conversation triggered this
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create conversation states table to track per-conversation AI state
CREATE TABLE IF NOT EXISTS conversation_ai_state (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  phone_number VARCHAR NOT NULL,
  channel VARCHAR NOT NULL CHECK (channel IN ('sms', 'whatsapp', 'email')),
  ai_enabled BOOLEAN DEFAULT TRUE,
  handoff_to_human BOOLEAN DEFAULT FALSE,
  handoff_reason TEXT,
  handoff_timestamp TIMESTAMPTZ,
  last_ai_response_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, phone_number, channel)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_ai_chatbot_logs_org_workflow ON ai_chatbot_logs(organization_id, workflow_id);
CREATE INDEX IF NOT EXISTS idx_ai_chatbot_logs_created_at ON ai_chatbot_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_ai_state_org_phone ON conversation_ai_state(organization_id, phone_number);
CREATE INDEX IF NOT EXISTS idx_conversation_ai_state_handoff ON conversation_ai_state(handoff_to_human, handoff_timestamp);

-- Enable RLS
ALTER TABLE ai_chatbot_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_ai_state ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Enable all for authenticated users" ON ai_chatbot_logs
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable all for authenticated users" ON conversation_ai_state
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create function to toggle AI for conversation
CREATE OR REPLACE FUNCTION toggle_conversation_ai(
  p_organization_id UUID,
  p_phone_number VARCHAR,
  p_channel VARCHAR,
  p_ai_enabled BOOLEAN,
  p_handoff_reason TEXT DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO conversation_ai_state (
    organization_id,
    phone_number,
    channel,
    ai_enabled,
    handoff_to_human,
    handoff_reason,
    handoff_timestamp,
    updated_at
  ) VALUES (
    p_organization_id,
    p_phone_number,
    p_channel,
    p_ai_enabled,
    NOT p_ai_enabled,
    p_handoff_reason,
    CASE WHEN NOT p_ai_enabled THEN NOW() ELSE NULL END,
    NOW()
  )
  ON CONFLICT (organization_id, phone_number, channel) 
  DO UPDATE SET
    ai_enabled = p_ai_enabled,
    handoff_to_human = NOT p_ai_enabled,
    handoff_reason = CASE WHEN NOT p_ai_enabled THEN p_handoff_reason ELSE NULL END,
    handoff_timestamp = CASE WHEN NOT p_ai_enabled THEN NOW() ELSE NULL END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Create function to check if AI should respond for a conversation
CREATE OR REPLACE FUNCTION should_ai_respond(
  p_organization_id UUID,
  p_phone_number VARCHAR,
  p_channel VARCHAR
) RETURNS boolean AS $$
DECLARE
  v_org_ai_enabled BOOLEAN;
  v_conversation_ai_enabled BOOLEAN;
  v_handoff_to_human BOOLEAN;
BEGIN
  -- Check organization-level AI setting
  SELECT ai_chatbot_enabled INTO v_org_ai_enabled
  FROM organizations 
  WHERE id = p_organization_id;
  
  -- If organization AI is disabled, return false
  IF NOT COALESCE(v_org_ai_enabled, true) THEN
    RETURN false;
  END IF;
  
  -- Check conversation-level AI state
  SELECT ai_enabled, handoff_to_human 
  INTO v_conversation_ai_enabled, v_handoff_to_human
  FROM conversation_ai_state
  WHERE organization_id = p_organization_id 
    AND phone_number = p_phone_number 
    AND channel = p_channel;
  
  -- If no conversation state exists, default to enabled
  IF v_conversation_ai_enabled IS NULL THEN
    RETURN true;
  END IF;
  
  -- Return false if conversation AI is disabled or handed off to human
  IF NOT v_conversation_ai_enabled OR COALESCE(v_handoff_to_human, false) THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Update trigger for conversation_ai_state
CREATE TRIGGER update_conversation_ai_state_updated_at
  BEFORE UPDATE ON conversation_ai_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample AI settings for existing organizations
UPDATE organizations 
SET ai_chatbot_settings = '{
  "global_enabled": true,
  "business_hours_only": false, 
  "business_hours": {"start": "09:00", "end": "18:00", "timezone": "Europe/London"},
  "response_delay_seconds": 2,
  "fallback_message": "Thanks for your message! Our team will get back to you shortly.",
  "auto_handoff_keywords": ["human", "speak to someone", "real person", "agent"],
  "max_ai_messages_per_conversation": 20
}'
WHERE ai_chatbot_settings IS NULL;

COMMENT ON TABLE ai_chatbot_logs IS 'Tracks when AI chatbot is enabled/disabled and why';
COMMENT ON TABLE conversation_ai_state IS 'Per-conversation AI state and human handoff tracking';
COMMENT ON FUNCTION should_ai_respond IS 'Determines if AI should respond to a message based on organization and conversation settings';
COMMENT ON FUNCTION toggle_conversation_ai IS 'Toggles AI on/off for a specific conversation with reason tracking';