-- Create messaging system tables
-- This migration adds support for in-app messaging between coaches and clients

-- Conversations table to group messages
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'closed')),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table to store individual messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('coach', 'client')),
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_organization_id ON conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_client_id ON conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_coach_id ON conversations(coach_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_read_at ON messages(read_at);

-- RLS (Row Level Security) policies
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY "Users can view conversations in their organization" ON conversations
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create conversations in their organization" ON conversations
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update conversations in their organization" ON conversations
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid()
    )
  );

-- Messages policies
CREATE POLICY "Users can view messages in conversations they have access to" ON messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM conversations 
      WHERE organization_id IN (
        SELECT organization_id FROM user_organizations 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create messages in conversations they have access to" ON messages
  FOR INSERT WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations 
      WHERE organization_id IN (
        SELECT organization_id FROM user_organizations 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE USING (
    sender_id = auth.uid()
  );

-- Function to update conversation's last_message_at when a new message is added
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations 
  SET last_message_at = NEW.created_at, updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update conversation timestamp
CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- Function to get or create conversation between coach and client
CREATE OR REPLACE FUNCTION get_or_create_conversation(
  p_organization_id UUID,
  p_client_id UUID,
  p_coach_id UUID
) RETURNS UUID AS $$
DECLARE
  conversation_id UUID;
BEGIN
  -- Try to find existing conversation
  SELECT id INTO conversation_id
  FROM conversations
  WHERE organization_id = p_organization_id
    AND client_id = p_client_id
    AND coach_id = p_coach_id
    AND status = 'active';
  
  -- If no conversation exists, create one
  IF conversation_id IS NULL THEN
    INSERT INTO conversations (organization_id, client_id, coach_id, title)
    VALUES (
      p_organization_id,
      p_client_id,
      p_coach_id,
      (SELECT name FROM clients WHERE id = p_client_id LIMIT 1)
    )
    RETURNING id INTO conversation_id;
  END IF;
  
  RETURN conversation_id;
END;
$$ LANGUAGE plpgsql;