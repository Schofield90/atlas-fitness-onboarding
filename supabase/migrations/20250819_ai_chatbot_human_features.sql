-- AI Chatbot Human-like Features Migration
-- Created: 2025-08-19
-- Description: Adds human-like behavior settings for AI chatbot

-- Add human-like behavior columns to integration_settings for ai_chatbot type
-- These will be stored in the config JSONB field, but we're documenting the schema here

-- Expected config structure for ai_chatbot integration_type:
-- {
--   "response_tone": "friendly|professional|casual",
--   "auto_respond": boolean,
--   "business_hours_only": boolean,
--   "response_delay": {
--     "enabled": boolean,
--     "min_seconds": number,
--     "max_seconds": number,
--     "typing_indicator": boolean
--   },
--   "fallback_to_human": boolean,
--   "greeting_message": string,
--   "away_message": string,
--   "business_hours": {
--     "start": "HH:MM",
--     "end": "HH:MM",
--     "timezone": string,
--     "days": ["monday", "tuesday", ...]
--   },
--   "features": {
--     "appointment_booking": boolean,
--     "membership_info": boolean,
--     "class_schedules": boolean,
--     "pricing_info": boolean,
--     "gym_policies": boolean
--   },
--   "personality": {
--     "friendliness": "low|medium|high",
--     "formality": "casual|professional|formal",
--     "enthusiasm": "low|medium|high",
--     "emoji_usage": boolean,
--     "conversation_starters": string[]
--   },
--   "response_patterns": {
--     "variable_responses": boolean,
--     "context_memory": boolean,
--     "follow_up_questions": boolean,
--     "acknowledgments": boolean
--   },
--   "read_receipts": {
--     "enabled": boolean,
--     "delay_seconds": number
--   }
-- }

-- Create table for AI conversation contexts (for better human-like conversations)
CREATE TABLE IF NOT EXISTS ai_conversation_contexts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    conversation_history JSONB DEFAULT '[]'::jsonb,
    context_summary TEXT,
    last_interaction TIMESTAMPTZ DEFAULT NOW(),
    personality_profile JSONB DEFAULT '{}'::jsonb,
    preferences JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, customer_phone)
);

-- Create table for AI response templates (for varied responses)
CREATE TABLE IF NOT EXISTS ai_response_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    category TEXT NOT NULL, -- 'greeting', 'goodbye', 'booking_confirmation', etc.
    intent TEXT NOT NULL, -- 'book_class', 'ask_hours', 'pricing_inquiry', etc.
    templates TEXT[] NOT NULL, -- Array of different response variations
    personality_tone TEXT DEFAULT 'friendly' CHECK (personality_tone IN ('friendly', 'professional', 'casual')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create table for tracking AI conversation metrics
CREATE TABLE IF NOT EXISTS ai_conversation_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    conversation_id TEXT NOT NULL, -- External conversation identifier
    customer_phone TEXT,
    response_time_seconds DECIMAL(5,2),
    human_handoff BOOLEAN DEFAULT false,
    satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
    resolved_issue BOOLEAN,
    conversation_length_messages INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_conversation_contexts_org_phone ON ai_conversation_contexts(organization_id, customer_phone);
CREATE INDEX IF NOT EXISTS idx_ai_conversation_contexts_last_interaction ON ai_conversation_contexts(last_interaction);
CREATE INDEX IF NOT EXISTS idx_ai_response_templates_org_category ON ai_response_templates(organization_id, category);
CREATE INDEX IF NOT EXISTS idx_ai_response_templates_intent ON ai_response_templates(intent);
CREATE INDEX IF NOT EXISTS idx_ai_conversation_metrics_org ON ai_conversation_metrics(organization_id);

-- Enable RLS
ALTER TABLE ai_conversation_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_response_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversation_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their organization's AI contexts"
    ON ai_conversation_contexts FOR ALL
    USING (
        organization_id IN (
            SELECT uo.organization_id 
            FROM user_organizations uo 
            WHERE uo.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their organization's AI templates"
    ON ai_response_templates FOR ALL
    USING (
        organization_id IN (
            SELECT uo.organization_id 
            FROM user_organizations uo 
            WHERE uo.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their organization's AI metrics"
    ON ai_conversation_metrics FOR SELECT
    USING (
        organization_id IN (
            SELECT uo.organization_id 
            FROM user_organizations uo 
            WHERE uo.user_id = auth.uid()
        )
    );

-- Add updated_at triggers
CREATE TRIGGER update_ai_conversation_contexts_updated_at 
    BEFORE UPDATE ON ai_conversation_contexts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_response_templates_updated_at 
    BEFORE UPDATE ON ai_response_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default response templates
INSERT INTO ai_response_templates (organization_id, category, intent, templates, personality_tone) 
SELECT o.id, 'greeting', 'general', ARRAY[
    'Hi there! 👋 How can I help you today?',
    'Hello! What can I assist you with?',
    'Hey! I''m here to help. What do you need?',
    'Hi! How can I make your day better?'
], 'friendly'
FROM organizations o
WHERE o.id NOT IN (
    SELECT organization_id 
    FROM ai_response_templates 
    WHERE category = 'greeting' AND intent = 'general'
);

INSERT INTO ai_response_templates (organization_id, category, intent, templates, personality_tone) 
SELECT o.id, 'booking', 'class_inquiry', ARRAY[
    'I''d love to help you find the perfect class! What type of workout are you interested in?',
    'Great choice! Let me help you book a class. What are you looking for?',
    'I can help you with that! What kind of class would you like to book?',
    'Perfect! I''ll help you find and book a class. Any preferences?'
], 'friendly'
FROM organizations o
WHERE o.id NOT IN (
    SELECT organization_id 
    FROM ai_response_templates 
    WHERE category = 'booking' AND intent = 'class_inquiry'
);

INSERT INTO ai_response_templates (organization_id, category, intent, templates, personality_tone) 
SELECT o.id, 'hours', 'opening_times', ARRAY[
    'Our gym is open Monday to Friday 6am-10pm, Saturday 7am-8pm, and Sunday 8am-6pm. Is there a specific time you''d like to visit?',
    'We''re here for you most of the day! Monday-Friday: 6am-10pm, Saturday: 7am-8pm, Sunday: 8am-6pm. When works best for you?',
    'Great question! Our opening hours are: Mon-Fri 6am-10pm, Sat 7am-8pm, Sun 8am-6pm. Planning a visit?'
], 'friendly'
FROM organizations o
WHERE o.id NOT IN (
    SELECT organization_id 
    FROM ai_response_templates 
    WHERE category = 'hours' AND intent = 'opening_times'
);