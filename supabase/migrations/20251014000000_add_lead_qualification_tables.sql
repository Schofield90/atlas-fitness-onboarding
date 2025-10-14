-- Lead Qualification System Tables
-- Migration: 20251014000000_add_lead_qualification_tables.sql
-- Description: Adds tables for GoHighLevel integration, call booking, and task templates

-- =============================================
-- 1. WEBHOOK LOGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider VARCHAR(50) NOT NULL, -- 'gohighlevel', 'stripe', 'twilio', etc.
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'received' CHECK (status IN ('received', 'success', 'failed', 'retry')),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  error_message TEXT,
  processing_time_ms INTEGER,
  retry_count INTEGER DEFAULT 0,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_webhook_logs_provider ON webhook_logs(provider);
CREATE INDEX idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX idx_webhook_logs_org ON webhook_logs(organization_id);
CREATE INDEX idx_webhook_logs_lead ON webhook_logs(lead_id);
CREATE INDEX idx_webhook_logs_received ON webhook_logs(received_at DESC);

COMMENT ON TABLE webhook_logs IS 'Logs all incoming webhooks for debugging and monitoring';
COMMENT ON COLUMN webhook_logs.provider IS 'Source of the webhook (gohighlevel, stripe, etc.)';
COMMENT ON COLUMN webhook_logs.retry_count IS 'Number of times processing was retried';

-- =============================================
-- 2. SALES CALL BOOKINGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS sales_call_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 30 CHECK (duration_minutes > 0 AND duration_minutes <= 180),
  call_type VARCHAR(50) DEFAULT 'discovery' CHECK (call_type IN ('discovery', 'closing', 'follow_up', 'consultation')),
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'no_show', 'cancelled', 'rescheduled')),
  booked_by VARCHAR(50) DEFAULT 'ai_agent' CHECK (booked_by IN ('ai_agent', 'staff', 'self_service')),
  staff_member_id UUID REFERENCES users(id) ON DELETE SET NULL,
  meeting_link TEXT, -- Zoom, Google Meet, etc.
  phone_number VARCHAR(50), -- For phone calls
  location TEXT, -- For in-person meetings
  notes TEXT,
  reminder_sent_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  outcome VARCHAR(50), -- 'qualified', 'unqualified', 'booked_trial', 'signed_up', 'no_show'
  outcome_notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sales_call_bookings_lead ON sales_call_bookings(lead_id);
CREATE INDEX idx_sales_call_bookings_org ON sales_call_bookings(organization_id);
CREATE INDEX idx_sales_call_bookings_status ON sales_call_bookings(status);
CREATE INDEX idx_sales_call_bookings_scheduled ON sales_call_bookings(scheduled_at);
CREATE INDEX idx_sales_call_bookings_staff ON sales_call_bookings(staff_member_id);
CREATE INDEX idx_sales_call_bookings_upcoming ON sales_call_bookings(scheduled_at)
  WHERE status IN ('scheduled', 'confirmed');

COMMENT ON TABLE sales_call_bookings IS 'Scheduled discovery calls and sales appointments';
COMMENT ON COLUMN sales_call_bookings.call_type IS 'Type of call: discovery, closing, follow_up';
COMMENT ON COLUMN sales_call_bookings.booked_by IS 'Who booked the call: AI agent, staff, or lead self-service';
COMMENT ON COLUMN sales_call_bookings.outcome IS 'Result after call completion';

-- =============================================
-- 3. LEAD QUALIFICATION HISTORY TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS lead_qualification_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES ai_agent_conversations(id) ON DELETE SET NULL,
  qualification_status VARCHAR(50) NOT NULL CHECK (qualification_status IN ('qualified', 'unqualified', 'nurture', 'hot', 'warm', 'cold')),
  qualification_reason TEXT,
  qualification_score INTEGER CHECK (qualification_score >= 0 AND qualification_score <= 100), -- 0-100 score
  budget_range VARCHAR(100), -- e.g., '50-100', '100-200', '200+'
  budget_disclosed BOOLEAN DEFAULT false,
  goals TEXT, -- Their fitness goals
  experience_level VARCHAR(50), -- 'beginner', 'intermediate', 'advanced'
  pain_points TEXT[], -- Array of pain points mentioned
  objections TEXT[], -- Array of objections raised
  interest_level INTEGER CHECK (interest_level >= 1 AND interest_level <= 5), -- 1-5 scale
  ready_to_commit VARCHAR(50), -- 'now', '1-2 weeks', '2-4 weeks', 'exploring'
  call_booked BOOLEAN DEFAULT false,
  call_booking_id UUID REFERENCES sales_call_bookings(id) ON DELETE SET NULL,
  qualified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  qualified_by VARCHAR(50) DEFAULT 'ai_agent' CHECK (qualified_by IN ('ai_agent', 'staff', 'auto_score')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_lead_qualification_history_lead ON lead_qualification_history(lead_id);
CREATE INDEX idx_lead_qualification_history_org ON lead_qualification_history(organization_id);
CREATE INDEX idx_lead_qualification_history_status ON lead_qualification_history(qualification_status);
CREATE INDEX idx_lead_qualification_history_agent ON lead_qualification_history(agent_id);
CREATE INDEX idx_lead_qualification_history_conversation ON lead_qualification_history(conversation_id);
CREATE INDEX idx_lead_qualification_history_qualified ON lead_qualification_history(qualified_at DESC);

COMMENT ON TABLE lead_qualification_history IS 'Historical record of lead qualification attempts and results';
COMMENT ON COLUMN lead_qualification_history.qualification_score IS 'Calculated score 0-100 based on fit';
COMMENT ON COLUMN lead_qualification_history.interest_level IS '1=low interest, 5=very interested';
COMMENT ON COLUMN lead_qualification_history.ready_to_commit IS 'Timeline for joining';

-- =============================================
-- 4. AI AGENT TASK TEMPLATES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS ai_agent_task_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger_event VARCHAR(100) NOT NULL, -- 'no_response_24h', 'no_response_48h', 'call_booked', 'call_no_show', etc.
  task_title_template TEXT NOT NULL, -- Template with variables: {{lead_name}}, {{call_time}}, etc.
  task_instructions_template TEXT NOT NULL, -- Instructions for AI agent
  schedule_delay_minutes INTEGER DEFAULT 0, -- Delay before executing (e.g., 1440 = 24 hours)
  schedule_cron VARCHAR(100), -- Optional cron expression for recurring tasks
  priority INTEGER DEFAULT 5 CHECK (priority >= 0 AND priority <= 10),
  agent_role VARCHAR(100), -- 'lead_qualification', 'customer_support', etc. (null = all agents)
  enabled BOOLEAN DEFAULT true,
  conditions JSONB DEFAULT '{}', -- Additional conditions for triggering
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_template_trigger UNIQUE(organization_id, trigger_event, name)
);

CREATE INDEX idx_ai_agent_task_templates_org ON ai_agent_task_templates(organization_id);
CREATE INDEX idx_ai_agent_task_templates_trigger ON ai_agent_task_templates(trigger_event);
CREATE INDEX idx_ai_agent_task_templates_enabled ON ai_agent_task_templates(enabled) WHERE enabled = true;
CREATE INDEX idx_ai_agent_task_templates_role ON ai_agent_task_templates(agent_role);

COMMENT ON TABLE ai_agent_task_templates IS 'Reusable templates for automated follow-up tasks';
COMMENT ON COLUMN ai_agent_task_templates.trigger_event IS 'Event that triggers this template';
COMMENT ON COLUMN ai_agent_task_templates.schedule_delay_minutes IS 'Minutes to wait before executing after trigger';
COMMENT ON COLUMN ai_agent_task_templates.conditions IS 'JSON conditions for when to apply template';

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_call_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_qualification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_task_templates ENABLE ROW LEVEL SECURITY;

-- webhook_logs policies (admin only)
CREATE POLICY "Platform admins can view all webhook logs" ON webhook_logs
  FOR SELECT USING (
    auth.jwt() ->> 'email' IN ('sam@gymleadhub.co.uk', 'sam@atlas-gyms.co.uk')
  );

CREATE POLICY "Org users can view their webhook logs" ON webhook_logs
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

-- sales_call_bookings policies
CREATE POLICY "Users can view bookings in their org" ON sales_call_bookings
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert bookings in their org" ON sales_call_bookings
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update bookings in their org" ON sales_call_bookings
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

-- lead_qualification_history policies
CREATE POLICY "Users can view qualification history in their org" ON lead_qualification_history
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert qualification history in their org" ON lead_qualification_history
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

-- ai_agent_task_templates policies
CREATE POLICY "Users can view task templates in their org" ON ai_agent_task_templates
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert task templates in their org" ON ai_agent_task_templates
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update task templates in their org" ON ai_agent_task_templates
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete task templates in their org" ON ai_agent_task_templates
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

-- =============================================
-- TRIGGERS
-- =============================================

-- Update updated_at timestamp on sales_call_bookings
CREATE TRIGGER update_sales_call_bookings_updated_at BEFORE UPDATE ON sales_call_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at timestamp on ai_agent_task_templates
CREATE TRIGGER update_ai_agent_task_templates_updated_at BEFORE UPDATE ON ai_agent_task_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- SEED DATA: Default Task Templates
-- =============================================

INSERT INTO ai_agent_task_templates (
  organization_id,
  name,
  description,
  trigger_event,
  task_title_template,
  task_instructions_template,
  schedule_delay_minutes,
  priority,
  agent_role
)
SELECT
  o.id,
  'No Response - 24 Hour Follow-up',
  'Follow up with leads who haven\'t responded within 24 hours',
  'no_response_24h',
  'Follow up with {{lead_name}} (24h no response)',
  'Send a friendly follow-up message to {{lead_name}}. They haven\'t responded in 24 hours. Try a different approach - maybe ask about their specific fitness goals or if they have any questions.',
  1440, -- 24 hours
  7,
  'lead_qualification'
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM ai_agent_task_templates t
  WHERE t.organization_id = o.id AND t.trigger_event = 'no_response_24h'
)
ON CONFLICT (organization_id, trigger_event, name) DO NOTHING;

INSERT INTO ai_agent_task_templates (
  organization_id,
  name,
  description,
  trigger_event,
  task_title_template,
  task_instructions_template,
  schedule_delay_minutes,
  priority,
  agent_role
)
SELECT
  o.id,
  'No Response - 48 Hour Final Follow-up',
  'Final follow-up attempt after 48 hours of no response',
  'no_response_48h',
  'Final follow-up with {{lead_name}} (48h no response)',
  'Send a final follow-up message to {{lead_name}}. They haven\'t responded in 48 hours. Offer one last value proposition - mention our limited spots or upcoming program start dates. Make it easy for them to respond with a simple yes/no question.',
  2880, -- 48 hours
  6,
  'lead_qualification'
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM ai_agent_task_templates t
  WHERE t.organization_id = o.id AND t.trigger_event = 'no_response_48h'
)
ON CONFLICT (organization_id, trigger_event, name) DO NOTHING;

INSERT INTO ai_agent_task_templates (
  organization_id,
  name,
  description,
  trigger_event,
  task_title_template,
  task_instructions_template,
  schedule_delay_minutes,
  priority,
  agent_role
)
SELECT
  o.id,
  'Call Reminder - 1 Hour Before',
  'Send reminder 1 hour before scheduled discovery call',
  'call_reminder_1h',
  'Reminder: Call with {{lead_name}} in 1 hour',
  'Send a friendly reminder to {{lead_name}} about their upcoming call at {{call_time}}. Include the meeting link/phone number and let them know what to expect (duration, topics, etc.).',
  -60, -- 1 hour BEFORE call time (negative = before)
  9,
  'lead_qualification'
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM ai_agent_task_templates t
  WHERE t.organization_id = o.id AND t.trigger_event = 'call_reminder_1h'
)
ON CONFLICT (organization_id, trigger_event, name) DO NOTHING;

INSERT INTO ai_agent_task_templates (
  organization_id,
  name,
  description,
  trigger_event,
  task_title_template,
  task_instructions_template,
  schedule_delay_minutes,
  priority,
  agent_role
)
SELECT
  o.id,
  'Call No-Show Follow-up',
  'Follow up with leads who missed their scheduled call',
  'call_no_show',
  'Follow up: {{lead_name}} missed scheduled call',
  'Reach out to {{lead_name}} who missed their scheduled call at {{call_time}}. Be understanding and non-judgmental. Ask if they\'d like to reschedule and offer 2-3 new time options.',
  30, -- 30 minutes after no-show
  8,
  'lead_qualification'
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM ai_agent_task_templates t
  WHERE t.organization_id = o.id AND t.trigger_event = 'call_no_show'
)
ON CONFLICT (organization_id, trigger_event, name) DO NOTHING;

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to get latest qualification status for a lead
CREATE OR REPLACE FUNCTION get_lead_qualification_status(p_lead_id UUID)
RETURNS TABLE (
  status VARCHAR(50),
  score INTEGER,
  qualified_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    lqh.qualification_status,
    lqh.qualification_score,
    lqh.qualified_at
  FROM lead_qualification_history lqh
  WHERE lqh.lead_id = p_lead_id
  ORDER BY lqh.qualified_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_lead_qualification_status IS 'Returns latest qualification status for a lead';

-- Function to count pending sales calls for an organization
CREATE OR REPLACE FUNCTION count_pending_sales_calls(p_org_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM sales_call_bookings
    WHERE organization_id = p_org_id
    AND status IN ('scheduled', 'confirmed')
    AND scheduled_at > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION count_pending_sales_calls IS 'Returns count of upcoming sales calls for an organization';
