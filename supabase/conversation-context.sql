-- Create conversation context table
CREATE TABLE IF NOT EXISTS conversation_contexts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  phone_number TEXT NOT NULL,
  channel TEXT NOT NULL,
  messages JSONB[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, phone_number, channel)
);

-- Create index for faster lookups
CREATE INDEX idx_conversation_contexts_lookup ON conversation_contexts(organization_id, phone_number, channel);

-- Function to get conversation context
CREATE OR REPLACE FUNCTION get_conversation_context(
  p_organization_id UUID,
  p_phone_number TEXT,
  p_channel TEXT
)
RETURNS JSONB[]
LANGUAGE plpgsql
AS $$
DECLARE
  v_messages JSONB[];
BEGIN
  SELECT messages INTO v_messages
  FROM conversation_contexts
  WHERE organization_id = p_organization_id
    AND phone_number = p_phone_number
    AND channel = p_channel;
    
  -- Return empty array if no context found
  IF v_messages IS NULL THEN
    RETURN ARRAY[]::JSONB[];
  END IF;
  
  -- Return only the last 10 messages for context
  RETURN v_messages[array_upper(v_messages, 1) - 9:array_upper(v_messages, 1)];
END;
$$;

-- Function to append to conversation context
CREATE OR REPLACE FUNCTION append_to_conversation(
  p_organization_id UUID,
  p_phone_number TEXT,
  p_channel TEXT,
  p_message JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing_messages JSONB[];
  v_new_messages JSONB[];
BEGIN
  -- Get existing messages
  SELECT messages INTO v_existing_messages
  FROM conversation_contexts
  WHERE organization_id = p_organization_id
    AND phone_number = p_phone_number
    AND channel = p_channel;
    
  IF v_existing_messages IS NULL THEN
    -- Create new conversation context
    INSERT INTO conversation_contexts (organization_id, phone_number, channel, messages)
    VALUES (p_organization_id, p_phone_number, p_channel, ARRAY[p_message]::JSONB[]);
  ELSE
    -- Append to existing messages (keep last 20 messages)
    v_new_messages := v_existing_messages || ARRAY[p_message]::JSONB[];
    
    -- Keep only the last 20 messages
    IF array_length(v_new_messages, 1) > 20 THEN
      v_new_messages := v_new_messages[array_length(v_new_messages, 1) - 19:array_length(v_new_messages, 1)];
    END IF;
    
    -- Update the conversation context
    UPDATE conversation_contexts
    SET messages = v_new_messages,
        updated_at = NOW()
    WHERE organization_id = p_organization_id
      AND phone_number = p_phone_number
      AND channel = p_channel;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Grant permissions
GRANT ALL ON conversation_contexts TO authenticated;
GRANT ALL ON conversation_contexts TO service_role;

-- RLS policies
ALTER TABLE conversation_contexts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can do everything" ON conversation_contexts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can read their organization's conversations" ON conversation_contexts
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Create an updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversation_contexts_updated_at BEFORE UPDATE ON conversation_contexts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();