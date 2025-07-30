-- Create conversation contexts table for AI chat history
CREATE TABLE IF NOT EXISTS conversation_contexts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms')),
  messages JSONB[] DEFAULT '{}',
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique conversation per phone/org/channel
  UNIQUE(organization_id, phone_number, channel)
);

-- Create indexes for performance
CREATE INDEX idx_conversation_contexts_org_phone ON conversation_contexts(organization_id, phone_number);
CREATE INDEX idx_conversation_contexts_last_message ON conversation_contexts(last_message_at);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_conversation_contexts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_contexts_updated_at
BEFORE UPDATE ON conversation_contexts
FOR EACH ROW
EXECUTE FUNCTION update_conversation_contexts_updated_at();

-- Enable RLS
ALTER TABLE conversation_contexts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Organizations can manage their conversation contexts"
  ON conversation_contexts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_organizations.user_id = auth.uid()
      AND user_organizations.organization_id = conversation_contexts.organization_id
      AND user_organizations.is_active = true
    )
  );

-- Service role can access all
CREATE POLICY "Service role can access all conversation contexts"
  ON conversation_contexts
  FOR ALL
  TO service_role
  USING (true);

-- Function to append message to conversation context
CREATE OR REPLACE FUNCTION append_to_conversation(
  p_organization_id UUID,
  p_phone_number TEXT,
  p_channel TEXT,
  p_message JSONB
) RETURNS UUID AS $$
DECLARE
  v_context_id UUID;
  v_messages JSONB[];
BEGIN
  -- Get or create conversation context
  INSERT INTO conversation_contexts (organization_id, phone_number, channel, messages, last_message_at)
  VALUES (p_organization_id, p_phone_number, p_channel, ARRAY[p_message]::JSONB[], NOW())
  ON CONFLICT (organization_id, phone_number, channel)
  DO UPDATE SET
    messages = CASE
      -- Keep only last 10 messages (sliding window)
      WHEN array_length(conversation_contexts.messages, 1) >= 10 THEN
        array_append(conversation_contexts.messages[2:10], p_message)
      ELSE
        array_append(conversation_contexts.messages, p_message)
    END,
    last_message_at = NOW(),
    updated_at = NOW()
  RETURNING id INTO v_context_id;
  
  RETURN v_context_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get conversation context
CREATE OR REPLACE FUNCTION get_conversation_context(
  p_organization_id UUID,
  p_phone_number TEXT,
  p_channel TEXT
) RETURNS JSONB AS $$
DECLARE
  v_messages JSONB[];
BEGIN
  SELECT messages INTO v_messages
  FROM conversation_contexts
  WHERE organization_id = p_organization_id
    AND phone_number = p_phone_number
    AND channel = p_channel;
  
  IF v_messages IS NULL THEN
    RETURN '[]'::JSONB;
  END IF;
  
  RETURN to_jsonb(v_messages);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION append_to_conversation TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_conversation_context TO authenticated, service_role;