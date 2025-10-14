-- Add missing columns to ai_agent_conversations for GHL webhook integration
-- Migration: 20251014_add_ghl_webhook_columns.sql

-- Add lead_id column (foreign key to leads table)
ALTER TABLE ai_agent_conversations
ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE CASCADE;

-- Add channel column (sms, email, gohighlevel, etc.)
ALTER TABLE ai_agent_conversations
ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'gohighlevel';

-- Add index for lead lookups
CREATE INDEX IF NOT EXISTS idx_ai_agent_conversations_lead_id
ON ai_agent_conversations(lead_id);

-- Add index for channel filtering
CREATE INDEX IF NOT EXISTS idx_ai_agent_conversations_channel
ON ai_agent_conversations(channel);

-- Add comment
COMMENT ON COLUMN ai_agent_conversations.lead_id IS 'Foreign key to leads table - which lead this conversation is with';
COMMENT ON COLUMN ai_agent_conversations.channel IS 'Communication channel: sms, email, gohighlevel, whatsapp, etc.';
