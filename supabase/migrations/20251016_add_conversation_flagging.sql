-- Conversation Flagging System for Human Review
-- Created: October 16, 2025
--
-- Purpose: Detect negative sentiment and flag conversations for human review
-- Features:
--   1. Automatic sentiment detection
--   2. Conversation flagging with severity levels
--   3. Daily digest preparation
--   4. Human review workflow
--   5. Training feedback loop

-- Table: ai_agent_conversation_flags
-- Stores flagged conversations requiring human review
CREATE TABLE IF NOT EXISTS ai_agent_conversation_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES ai_agent_conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES ai_agent_messages(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Flag details
  flag_type TEXT NOT NULL CHECK (flag_type IN (
    'negative_sentiment',
    'extreme_response',
    'agent_error',
    'tool_failure',
    'inappropriate_content',
    'confusion_loop',
    'escalation_needed'
  )),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),

  -- Detection details
  trigger_message TEXT, -- The user message that triggered the flag
  agent_response TEXT, -- What the agent said
  sentiment_score DECIMAL(3,2), -- -1.0 to 1.0 (negative to positive)
  detection_method TEXT, -- 'keyword', 'sentiment_api', 'tool_error', 'manual'
  detection_metadata JSONB, -- Additional context (keywords found, API response, etc.)

  -- Review workflow
  review_status TEXT DEFAULT 'pending' CHECK (review_status IN ('pending', 'reviewing', 'resolved', 'false_positive', 'escalated')),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),

  -- Human feedback
  reviewer_notes TEXT,
  improvement_instructions TEXT, -- What should agent do differently?
  sop_update_applied BOOLEAN DEFAULT false,
  sop_change_id UUID REFERENCES agent_sop_changes(id),

  -- Digest tracking
  included_in_digest_at TIMESTAMP WITH TIME ZONE,
  digest_sent BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for conversation flags
CREATE INDEX idx_conversation_flags_agent ON ai_agent_conversation_flags(agent_id);
CREATE INDEX idx_conversation_flags_conversation ON ai_agent_conversation_flags(conversation_id);
CREATE INDEX idx_conversation_flags_organization ON ai_agent_conversation_flags(organization_id);
CREATE INDEX idx_conversation_flags_review_status ON ai_agent_conversation_flags(review_status);
CREATE INDEX idx_conversation_flags_severity ON ai_agent_conversation_flags(severity);
CREATE INDEX idx_conversation_flags_created ON ai_agent_conversation_flags(created_at DESC);
CREATE INDEX idx_conversation_flags_digest ON ai_agent_conversation_flags(included_in_digest_at, digest_sent) WHERE review_status = 'pending';

COMMENT ON TABLE ai_agent_conversation_flags IS 'Flags conversations requiring human review for training and improvement';

-- Table: ai_agent_sentiment_keywords
-- Configurable keywords that trigger sentiment detection
CREATE TABLE IF NOT EXISTS ai_agent_sentiment_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Keyword configuration
  keyword TEXT NOT NULL,
  sentiment_type TEXT NOT NULL CHECK (sentiment_type IN ('negative', 'extreme', 'positive', 'neutral')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),

  -- Matching rules
  match_type TEXT DEFAULT 'contains' CHECK (match_type IN ('exact', 'contains', 'starts_with', 'regex')),
  case_sensitive BOOLEAN DEFAULT false,

  -- Context
  category TEXT, -- e.g., 'anger', 'confusion', 'frustration', 'satisfaction'
  description TEXT,

  -- Status
  enabled BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for sentiment keywords
CREATE INDEX idx_sentiment_keywords_org ON ai_agent_sentiment_keywords(organization_id);
CREATE INDEX idx_sentiment_keywords_enabled ON ai_agent_sentiment_keywords(enabled) WHERE enabled = true;
CREATE INDEX idx_sentiment_keywords_sentiment ON ai_agent_sentiment_keywords(sentiment_type, severity);

COMMENT ON TABLE ai_agent_sentiment_keywords IS 'Configurable keywords for automatic sentiment detection';

-- Seed default negative sentiment keywords
INSERT INTO ai_agent_sentiment_keywords (keyword, sentiment_type, severity, category, description) VALUES
  ('this is terrible', 'negative', 'high', 'frustration', 'Strong negative feedback'),
  ('worst service', 'negative', 'high', 'frustration', 'Strong dissatisfaction'),
  ('completely useless', 'negative', 'high', 'frustration', 'Complete rejection'),
  ('waste of time', 'negative', 'medium', 'frustration', 'Time complaint'),
  ('not helpful', 'negative', 'medium', 'frustration', 'Unhelpful response'),
  ('doesn''t work', 'negative', 'medium', 'technical', 'Technical issue'),
  ('broken', 'negative', 'medium', 'technical', 'System failure'),
  ('scam', 'extreme', 'critical', 'anger', 'Fraud accusation'),
  ('fraud', 'extreme', 'critical', 'anger', 'Fraud accusation'),
  ('lawsuit', 'extreme', 'critical', 'anger', 'Legal threat'),
  ('lawyer', 'extreme', 'critical', 'anger', 'Legal threat'),
  ('furious', 'extreme', 'high', 'anger', 'Extreme anger'),
  ('disgusting', 'extreme', 'high', 'anger', 'Strong disgust'),
  ('pathetic', 'extreme', 'high', 'anger', 'Strong insult'),
  ('incompetent', 'negative', 'high', 'anger', 'Competence criticism'),
  ('stupid', 'negative', 'medium', 'anger', 'Insult'),
  ('confused', 'negative', 'low', 'confusion', 'User confusion'),
  ('don''t understand', 'negative', 'low', 'confusion', 'Comprehension issue'),
  ('makes no sense', 'negative', 'medium', 'confusion', 'Clarity issue'),
  ('give up', 'negative', 'high', 'frustration', 'Abandonment signal'),
  ('cancel', 'negative', 'medium', 'frustration', 'Cancellation intent'),
  ('unsubscribe', 'negative', 'medium', 'frustration', 'Opt-out intent'),
  ('stop messaging', 'negative', 'high', 'frustration', 'Harassment complaint'),
  ('leave me alone', 'negative', 'high', 'frustration', 'Harassment complaint');

-- Function: detect_sentiment_in_message
-- Analyzes a message for sentiment keywords and returns detection results
CREATE OR REPLACE FUNCTION detect_sentiment_in_message(
  p_message_text TEXT,
  p_organization_id UUID DEFAULT NULL
)
RETURNS TABLE (
  matched_keywords TEXT[],
  sentiment_type TEXT,
  max_severity TEXT,
  should_flag BOOLEAN,
  detection_metadata JSONB
) AS $$
DECLARE
  v_keywords RECORD;
  v_matched_keywords TEXT[] := '{}';
  v_worst_sentiment TEXT := 'neutral';
  v_max_severity TEXT := 'low';
  v_should_flag BOOLEAN := false;
  v_message_lower TEXT := LOWER(p_message_text);
BEGIN
  -- Get all enabled keywords (org-specific or global)
  FOR v_keywords IN
    SELECT keyword, sentiment_type, severity, category, match_type, case_sensitive
    FROM ai_agent_sentiment_keywords
    WHERE enabled = true
      AND (organization_id = p_organization_id OR organization_id IS NULL)
    ORDER BY severity DESC, sentiment_type DESC
  LOOP
    -- Check if keyword matches
    DECLARE
      v_check_text TEXT := CASE WHEN v_keywords.case_sensitive THEN p_message_text ELSE v_message_lower END;
      v_check_keyword TEXT := CASE WHEN v_keywords.case_sensitive THEN v_keywords.keyword ELSE LOWER(v_keywords.keyword) END;
      v_matches BOOLEAN := false;
    BEGIN
      CASE v_keywords.match_type
        WHEN 'exact' THEN
          v_matches := v_check_text = v_check_keyword;
        WHEN 'contains' THEN
          v_matches := v_check_text LIKE '%' || v_check_keyword || '%';
        WHEN 'starts_with' THEN
          v_matches := v_check_text LIKE v_check_keyword || '%';
        WHEN 'regex' THEN
          v_matches := v_check_text ~ v_check_keyword;
      END CASE;

      IF v_matches THEN
        v_matched_keywords := array_append(v_matched_keywords, v_keywords.keyword);

        -- Update worst sentiment if this is worse
        IF v_keywords.sentiment_type IN ('extreme', 'negative') THEN
          v_worst_sentiment := v_keywords.sentiment_type;
        END IF;

        -- Update max severity
        IF (v_keywords.severity = 'critical' AND v_max_severity != 'critical') OR
           (v_keywords.severity = 'high' AND v_max_severity NOT IN ('critical', 'high')) OR
           (v_keywords.severity = 'medium' AND v_max_severity = 'low') THEN
          v_max_severity := v_keywords.severity;
        END IF;

        -- Flag if negative/extreme or high+ severity
        IF v_keywords.sentiment_type IN ('negative', 'extreme') OR
           v_keywords.severity IN ('high', 'critical') THEN
          v_should_flag := true;
        END IF;
      END IF;
    END;
  END LOOP;

  -- Return results
  RETURN QUERY SELECT
    v_matched_keywords,
    v_worst_sentiment,
    v_max_severity,
    v_should_flag,
    jsonb_build_object(
      'matched_count', array_length(v_matched_keywords, 1),
      'message_preview', LEFT(p_message_text, 100)
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION detect_sentiment_in_message IS 'Detect sentiment keywords in a message and determine if it should be flagged';

-- Function: auto_flag_conversation
-- Automatically creates a flag for a conversation based on sentiment detection
CREATE OR REPLACE FUNCTION auto_flag_conversation(
  p_agent_id UUID,
  p_conversation_id UUID,
  p_message_id UUID,
  p_organization_id UUID,
  p_trigger_message TEXT,
  p_agent_response TEXT,
  p_detection_results JSONB
)
RETURNS UUID AS $$
DECLARE
  v_flag_id UUID;
  v_flag_type TEXT;
  v_severity TEXT;
BEGIN
  -- Determine flag type and severity from detection results
  v_flag_type := CASE
    WHEN (p_detection_results->>'sentiment_type')::TEXT = 'extreme' THEN 'extreme_response'
    WHEN (p_detection_results->>'sentiment_type')::TEXT = 'negative' THEN 'negative_sentiment'
    ELSE 'negative_sentiment'
  END;

  v_severity := COALESCE((p_detection_results->>'max_severity')::TEXT, 'medium');

  -- Create flag
  INSERT INTO ai_agent_conversation_flags (
    agent_id,
    conversation_id,
    message_id,
    organization_id,
    flag_type,
    severity,
    trigger_message,
    agent_response,
    detection_method,
    detection_metadata,
    review_status,
    created_at
  ) VALUES (
    p_agent_id,
    p_conversation_id,
    p_message_id,
    p_organization_id,
    v_flag_type,
    v_severity,
    p_trigger_message,
    p_agent_response,
    'keyword',
    jsonb_build_object(
      'matched_keywords', p_detection_results->'matched_keywords',
      'sentiment_type', p_detection_results->>'sentiment_type',
      'severity', v_severity
    ),
    'pending',
    NOW()
  )
  RETURNING id INTO v_flag_id;

  RETURN v_flag_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_flag_conversation IS 'Create a conversation flag based on sentiment detection results';

-- RLS Policies
ALTER TABLE ai_agent_conversation_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_sentiment_keywords ENABLE ROW LEVEL SECURITY;

-- Admin access to flags and keywords
CREATE POLICY admin_conversation_flags ON ai_agent_conversation_flags
  FOR ALL
  USING (true);

CREATE POLICY admin_sentiment_keywords ON ai_agent_sentiment_keywords
  FOR ALL
  USING (true);

-- Grant permissions to service role
GRANT ALL ON ai_agent_conversation_flags TO service_role;
GRANT ALL ON ai_agent_sentiment_keywords TO service_role;
