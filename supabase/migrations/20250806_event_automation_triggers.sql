-- Migration: Event Automation Triggers
-- Created: 2025-08-06
-- Description: Creates tables and triggers for event-based automation including webhooks,
-- call tracking, email events, customer replies, survey submissions, and trigger links

-- Create webhook_endpoints table
-- Purpose: Store webhook endpoint configurations for inbound automation triggers
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Endpoint details
  name text NOT NULL,
  description text,
  endpoint_url text NOT NULL, -- The webhook URL path (e.g., /webhook/lead-capture)
  secret_key text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'), -- For webhook verification
  
  -- Configuration
  is_active boolean DEFAULT true,
  allowed_methods text[] DEFAULT '{POST}', -- HTTP methods allowed
  expected_headers jsonb DEFAULT '{}', -- Expected headers for validation
  
  -- Response configuration
  response_format text DEFAULT 'json', -- 'json', 'xml', 'text'
  success_response jsonb DEFAULT '{"status": "success"}',
  error_response jsonb DEFAULT '{"status": "error"}',
  
  -- Processing
  payload_mapping jsonb DEFAULT '{}', -- Map incoming payload to internal fields
  automation_trigger_id uuid, -- Link to automation that should be triggered
  
  -- Statistics
  total_requests integer DEFAULT 0,
  successful_requests integer DEFAULT 0,
  failed_requests integer DEFAULT 0,
  last_request_at timestamptz,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT webhook_endpoints_unique_url UNIQUE (organization_id, endpoint_url)
);

-- Create webhook_requests table  
-- Purpose: Log all webhook requests for debugging and audit
CREATE TABLE IF NOT EXISTS webhook_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_endpoint_id uuid NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  
  -- Request details
  method text NOT NULL,
  headers jsonb DEFAULT '{}',
  query_params jsonb DEFAULT '{}',
  body_raw text,
  body_parsed jsonb,
  
  -- Response details
  status_code integer,
  response_body jsonb,
  processing_time_ms integer,
  
  -- Results
  success boolean DEFAULT false,
  error_message text,
  automation_triggered boolean DEFAULT false,
  triggered_automation_id uuid,
  
  -- Metadata
  source_ip inet,
  user_agent text,
  received_at timestamptz DEFAULT now()
);

-- Create call_tracking table
-- Purpose: Enhanced call tracking with automation trigger capabilities
CREATE TABLE IF NOT EXISTS call_tracking (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Call identification
  call_id text, -- External system call ID (Twilio, etc.)
  tracking_number text, -- Phone number that was called
  caller_number text, -- Caller's phone number
  
  -- Call details
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  status text NOT NULL DEFAULT 'initiated', -- 'initiated', 'ringing', 'answered', 'completed', 'failed', 'no_answer', 'busy'
  duration_seconds integer DEFAULT 0,
  
  -- Participants
  contact_id uuid REFERENCES contacts(id), -- Auto-matched contact
  staff_member_id uuid REFERENCES users(id), -- Assigned staff member
  
  -- Call outcome
  outcome text, -- 'answered', 'voicemail', 'no_answer', 'busy', 'failed'
  recording_url text,
  transcript text,
  notes text,
  
  -- Lead qualification
  lead_quality_score integer CHECK (lead_quality_score >= 0 AND lead_quality_score <= 100),
  appointment_scheduled boolean DEFAULT false,
  follow_up_required boolean DEFAULT false,
  
  -- Automation triggers
  triggered_automations jsonb DEFAULT '[]', -- Array of automation IDs triggered
  ai_analysis jsonb DEFAULT '{}', -- AI insights from call
  
  -- Timestamps
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create email_events table
-- Purpose: Track email events for automation triggers (opens, clicks, bounces, etc.)
CREATE TABLE IF NOT EXISTS email_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Email identification
  message_id text NOT NULL, -- Email service provider message ID
  email_log_id uuid REFERENCES email_logs(id), -- Link to email_logs if exists
  
  -- Recipient information
  recipient_email text NOT NULL,
  contact_id uuid REFERENCES contacts(id),
  
  -- Event details
  event_type text NOT NULL, -- 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed'
  event_data jsonb DEFAULT '{}', -- Additional event-specific data
  
  -- For click events
  clicked_url text,
  click_count integer DEFAULT 0,
  
  -- For bounce events
  bounce_reason text,
  bounce_type text, -- 'hard', 'soft'
  
  -- Metadata
  user_agent text,
  ip_address inet,
  timestamp timestamptz DEFAULT now(),
  
  -- Automation
  automation_triggered boolean DEFAULT false,
  triggered_automation_ids uuid[] DEFAULT '{}',
  
  CONSTRAINT email_events_unique_event UNIQUE (message_id, event_type, timestamp)
);

-- Create customer_reply_tracking table
-- Purpose: Track and analyze customer replies across all channels for automation
CREATE TABLE IF NOT EXISTS customer_reply_tracking (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Reply identification
  contact_id uuid REFERENCES contacts(id),
  original_message_id text, -- ID of the message this is a reply to
  
  -- Channel and content
  channel text NOT NULL, -- 'email', 'sms', 'whatsapp', 'telegram', 'phone'
  content text NOT NULL,
  subject text, -- For emails
  
  -- Analysis
  sentiment_score decimal(3,2), -- -1.00 to 1.00 (negative to positive)
  intent text, -- 'question', 'complaint', 'interest', 'unsubscribe', 'booking', 'other'
  keywords text[] DEFAULT '{}',
  language text DEFAULT 'en',
  
  -- Processing
  requires_response boolean DEFAULT true,
  priority_level text DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  assigned_to uuid REFERENCES users(id),
  status text DEFAULT 'new', -- 'new', 'in_progress', 'responded', 'closed'
  
  -- AI Analysis
  ai_analysis jsonb DEFAULT '{}',
  suggested_response text,
  confidence_score decimal(3,2), -- AI confidence in analysis
  
  -- Automation
  auto_response_sent boolean DEFAULT false,
  automation_triggered boolean DEFAULT false,
  triggered_automation_ids uuid[] DEFAULT '{}',
  
  -- Timestamps
  received_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create survey_submissions table (enhanced version of existing form_submissions for surveys)
-- Purpose: Track survey responses with detailed analytics for automation triggers
CREATE TABLE IF NOT EXISTS survey_submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Survey identification
  survey_id uuid, -- Reference to a survey form
  survey_name text NOT NULL,
  survey_type text DEFAULT 'feedback', -- 'feedback', 'satisfaction', 'lead_qualification', 'post_workout', 'custom'
  
  -- Respondent information
  contact_id uuid REFERENCES contacts(id),
  respondent_email text,
  respondent_phone text,
  respondent_name text,
  
  -- Submission details
  responses jsonb NOT NULL, -- All survey responses
  completion_percentage decimal(5,2) DEFAULT 100.00, -- Percentage of questions answered
  completion_time_seconds integer, -- Time taken to complete survey
  
  -- Analysis
  satisfaction_score integer, -- Calculated satisfaction score
  nps_score integer CHECK (nps_score >= 0 AND nps_score <= 10), -- Net Promoter Score
  key_feedback_points text[] DEFAULT '{}',
  sentiment_analysis jsonb DEFAULT '{}',
  
  -- Automation triggers
  automation_triggered boolean DEFAULT false,
  triggered_automation_ids uuid[] DEFAULT '{}',
  follow_up_required boolean DEFAULT false,
  priority_level text DEFAULT 'normal',
  
  -- Metadata
  source text DEFAULT 'web', -- 'web', 'email', 'sms', 'qr_code', 'tablet'
  ip_address inet,
  user_agent text,
  submitted_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

-- Create trigger_links table
-- Purpose: Create trackable links that trigger automations when clicked
CREATE TABLE IF NOT EXISTS trigger_links (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Link details
  name text NOT NULL,
  description text,
  short_code text NOT NULL, -- Unique short code for the link (e.g., "gym-trial")
  destination_url text NOT NULL, -- Where the link redirects to
  
  -- Trigger configuration
  automation_trigger_type text NOT NULL DEFAULT 'click', -- 'click', 'hover', 'time_on_page'
  automation_ids uuid[] DEFAULT '{}', -- Array of automation IDs to trigger
  trigger_conditions jsonb DEFAULT '{}', -- Additional conditions for triggering
  
  -- Tracking settings
  is_active boolean DEFAULT true,
  track_unique_clicks boolean DEFAULT true,
  require_contact_identification boolean DEFAULT false,
  
  -- Analytics
  total_clicks integer DEFAULT 0,
  unique_clicks integer DEFAULT 0,
  conversion_rate decimal(5,2) DEFAULT 0.00,
  
  -- Expiration
  expires_at timestamptz,
  max_clicks integer, -- Optional click limit
  
  -- Timestamps  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_clicked_at timestamptz,
  
  CONSTRAINT trigger_links_unique_short_code UNIQUE (organization_id, short_code)
);

-- Create trigger_link_clicks table
-- Purpose: Track individual clicks on trigger links
CREATE TABLE IF NOT EXISTS trigger_link_clicks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  trigger_link_id uuid NOT NULL REFERENCES trigger_links(id) ON DELETE CASCADE,
  
  -- Click details
  contact_id uuid REFERENCES contacts(id), -- Identified contact who clicked
  session_id text, -- Browser session ID for tracking
  
  -- Context
  referer_url text,
  user_agent text,
  ip_address inet,
  country text,
  region text,
  city text,
  
  -- Results
  automation_triggered boolean DEFAULT false,
  triggered_automation_ids uuid[] DEFAULT '{}',
  conversion_event boolean DEFAULT false, -- Did this click result in a conversion?
  
  -- Timestamps
  clicked_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

-- Create indexes for performance
CREATE INDEX idx_webhook_endpoints_organization ON webhook_endpoints(organization_id);
CREATE INDEX idx_webhook_endpoints_active ON webhook_endpoints(is_active) WHERE is_active = true;
CREATE INDEX idx_webhook_endpoints_url ON webhook_endpoints(endpoint_url);

CREATE INDEX idx_webhook_requests_endpoint ON webhook_requests(webhook_endpoint_id);
CREATE INDEX idx_webhook_requests_received_at ON webhook_requests(received_at DESC);
CREATE INDEX idx_webhook_requests_success ON webhook_requests(success);

CREATE INDEX idx_call_tracking_organization ON call_tracking(organization_id);
CREATE INDEX idx_call_tracking_contact ON call_tracking(contact_id);
CREATE INDEX idx_call_tracking_staff ON call_tracking(staff_member_id);
CREATE INDEX idx_call_tracking_number ON call_tracking(tracking_number);
CREATE INDEX idx_call_tracking_caller ON call_tracking(caller_number);
CREATE INDEX idx_call_tracking_status ON call_tracking(status);
CREATE INDEX idx_call_tracking_started_at ON call_tracking(started_at DESC);

CREATE INDEX idx_email_events_organization ON email_events(organization_id);
CREATE INDEX idx_email_events_contact ON email_events(contact_id);
CREATE INDEX idx_email_events_message_id ON email_events(message_id);
CREATE INDEX idx_email_events_type ON email_events(event_type);
CREATE INDEX idx_email_events_timestamp ON email_events(timestamp DESC);

CREATE INDEX idx_customer_reply_organization ON customer_reply_tracking(organization_id);
CREATE INDEX idx_customer_reply_contact ON customer_reply_tracking(contact_id);
CREATE INDEX idx_customer_reply_channel ON customer_reply_tracking(channel);
CREATE INDEX idx_customer_reply_status ON customer_reply_tracking(status);
CREATE INDEX idx_customer_reply_priority ON customer_reply_tracking(priority_level);
CREATE INDEX idx_customer_reply_assigned ON customer_reply_tracking(assigned_to);
CREATE INDEX idx_customer_reply_received_at ON customer_reply_tracking(received_at DESC);

CREATE INDEX idx_survey_submissions_organization ON survey_submissions(organization_id);
CREATE INDEX idx_survey_submissions_contact ON survey_submissions(contact_id);
CREATE INDEX idx_survey_submissions_type ON survey_submissions(survey_type);
CREATE INDEX idx_survey_submissions_score ON survey_submissions(satisfaction_score);
CREATE INDEX idx_survey_submissions_nps ON survey_submissions(nps_score);
CREATE INDEX idx_survey_submissions_submitted_at ON survey_submissions(submitted_at DESC);

CREATE INDEX idx_trigger_links_organization ON trigger_links(organization_id);
CREATE INDEX idx_trigger_links_short_code ON trigger_links(short_code);
CREATE INDEX idx_trigger_links_active ON trigger_links(is_active) WHERE is_active = true;
CREATE INDEX idx_trigger_links_expires_at ON trigger_links(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX idx_trigger_link_clicks_link ON trigger_link_clicks(trigger_link_id);
CREATE INDEX idx_trigger_link_clicks_contact ON trigger_link_clicks(contact_id);
CREATE INDEX idx_trigger_link_clicks_clicked_at ON trigger_link_clicks(clicked_at DESC);
CREATE INDEX idx_trigger_link_clicks_session ON trigger_link_clicks(session_id);

-- Create trigger functions
-- Function to update webhook statistics
CREATE OR REPLACE FUNCTION update_webhook_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE webhook_endpoints 
  SET 
    total_requests = total_requests + 1,
    successful_requests = CASE WHEN NEW.success THEN successful_requests + 1 ELSE successful_requests END,
    failed_requests = CASE WHEN NOT NEW.success THEN failed_requests + 1 ELSE failed_requests END,
    last_request_at = NEW.received_at,
    updated_at = now()
  WHERE id = NEW.webhook_endpoint_id;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update trigger link statistics
CREATE OR REPLACE FUNCTION update_trigger_link_stats()
RETURNS TRIGGER AS $$
DECLARE
  is_unique_click boolean;
BEGIN
  -- Check if this is a unique click (first time this contact clicked this link)
  SELECT NOT EXISTS (
    SELECT 1 FROM trigger_link_clicks tlc
    WHERE tlc.trigger_link_id = NEW.trigger_link_id
    AND tlc.contact_id = NEW.contact_id
    AND tlc.id != NEW.id
  ) INTO is_unique_click;
  
  -- Update statistics
  UPDATE trigger_links 
  SET 
    total_clicks = total_clicks + 1,
    unique_clicks = CASE WHEN is_unique_click THEN unique_clicks + 1 ELSE unique_clicks END,
    last_clicked_at = NEW.clicked_at,
    updated_at = now()
  WHERE id = NEW.trigger_link_id;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to auto-assign customer replies based on rules
CREATE OR REPLACE FUNCTION auto_assign_customer_reply()
RETURNS TRIGGER AS $$
DECLARE
  assignment_user_id uuid;
BEGIN
  -- Try to assign to the same person who last interacted with this contact
  SELECT DISTINCT i.created_by INTO assignment_user_id
  FROM interactions i
  WHERE i.contact_id = NEW.contact_id
  ORDER BY i.created_at DESC
  LIMIT 1;
  
  -- If no previous interaction, assign based on organization rules or round-robin
  IF assignment_user_id IS NULL THEN
    -- Simple round-robin assignment (could be made more sophisticated)
    SELECT u.id INTO assignment_user_id
    FROM users u
    WHERE u.organization_id = NEW.organization_id
    AND u.role IN ('admin', 'staff')
    ORDER BY u.id
    LIMIT 1;
  END IF;
  
  NEW.assigned_to := assignment_user_id;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to analyze survey submissions and trigger automations
CREATE OR REPLACE FUNCTION analyze_survey_submission()
RETURNS TRIGGER AS $$
DECLARE
  nps_score_val integer;
  satisfaction_val integer;
BEGIN
  -- Extract NPS score if present
  IF NEW.responses ? 'nps_score' THEN
    nps_score_val := (NEW.responses->>'nps_score')::integer;
    NEW.nps_score := nps_score_val;
  END IF;
  
  -- Extract satisfaction score if present
  IF NEW.responses ? 'satisfaction' THEN
    satisfaction_val := (NEW.responses->>'satisfaction')::integer;
    NEW.satisfaction_score := satisfaction_val;
  END IF;
  
  -- Set follow-up requirements based on scores
  IF NEW.nps_score IS NOT NULL AND NEW.nps_score <= 6 THEN
    NEW.follow_up_required := true;
    NEW.priority_level := 'high';
  ELSIF NEW.satisfaction_score IS NOT NULL AND NEW.satisfaction_score <= 2 THEN
    NEW.follow_up_required := true;
    NEW.priority_level := 'high';
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_webhook_stats_trigger
  AFTER INSERT ON webhook_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_webhook_stats();

CREATE TRIGGER update_trigger_link_stats_trigger
  AFTER INSERT ON trigger_link_clicks
  FOR EACH ROW
  EXECUTE FUNCTION update_trigger_link_stats();

CREATE TRIGGER auto_assign_reply_trigger
  BEFORE INSERT ON customer_reply_tracking
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_customer_reply();

CREATE TRIGGER analyze_survey_trigger
  BEFORE INSERT ON survey_submissions
  FOR EACH ROW
  EXECUTE FUNCTION analyze_survey_submission();

-- Create updated_at triggers
CREATE TRIGGER update_webhook_endpoints_updated_at
  BEFORE UPDATE ON webhook_endpoints
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_call_tracking_updated_at
  BEFORE UPDATE ON call_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trigger_links_updated_at
  BEFORE UPDATE ON trigger_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_reply_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trigger_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE trigger_link_clicks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Webhook Endpoints policies
CREATE POLICY "Users can view webhook endpoints from their organization"
  ON webhook_endpoints FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = webhook_endpoints.organization_id
    )
  );

CREATE POLICY "Users can manage webhook endpoints for their organization"
  ON webhook_endpoints FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = webhook_endpoints.organization_id
    )
  );

-- Webhook Requests policies (read-only for users)
CREATE POLICY "Users can view webhook requests from their organization"
  ON webhook_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM webhook_endpoints we
      JOIN users u ON u.organization_id = we.organization_id
      WHERE we.id = webhook_requests.webhook_endpoint_id
      AND u.id = auth.uid()
    )
  );

-- Call Tracking policies
CREATE POLICY "Users can view call tracking from their organization"
  ON call_tracking FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = call_tracking.organization_id
    )
  );

CREATE POLICY "Users can manage call tracking for their organization"
  ON call_tracking FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = call_tracking.organization_id
    )
  );

-- Email Events policies
CREATE POLICY "Users can view email events from their organization"
  ON email_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = email_events.organization_id
    )
  );

-- Customer Reply Tracking policies
CREATE POLICY "Users can view replies from their organization"
  ON customer_reply_tracking FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = customer_reply_tracking.organization_id
    )
  );

CREATE POLICY "Users can manage replies for their organization"
  ON customer_reply_tracking FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = customer_reply_tracking.organization_id
    )
  );

-- Survey Submissions policies
CREATE POLICY "Users can view survey submissions from their organization"
  ON survey_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = survey_submissions.organization_id
    )
  );

-- Public can submit surveys
CREATE POLICY "Anyone can submit surveys"
  ON survey_submissions FOR INSERT
  WITH CHECK (true);

-- Trigger Links policies
CREATE POLICY "Users can view trigger links from their organization"
  ON trigger_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = trigger_links.organization_id
    )
  );

CREATE POLICY "Users can manage trigger links for their organization"
  ON trigger_links FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = trigger_links.organization_id
    )
  );

-- Trigger Link Clicks policies
CREATE POLICY "Users can view trigger link clicks from their organization"
  ON trigger_link_clicks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trigger_links tl
      JOIN users u ON u.organization_id = tl.organization_id
      WHERE tl.id = trigger_link_clicks.trigger_link_id
      AND u.id = auth.uid()
    )
  );

-- Public can create clicks (for tracking)
CREATE POLICY "Anyone can create trigger link clicks"
  ON trigger_link_clicks FOR INSERT
  WITH CHECK (true);

-- Service role policies (for automation and webhooks)
CREATE POLICY "Service role can manage all webhook endpoints"
  ON webhook_endpoints FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage all webhook requests"
  ON webhook_requests FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage all call tracking"
  ON call_tracking FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage all email events"
  ON email_events FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage all customer replies"
  ON customer_reply_tracking FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage all survey submissions"
  ON survey_submissions FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage all trigger links"
  ON trigger_links FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage all trigger link clicks"
  ON trigger_link_clicks FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Add helpful comments
COMMENT ON TABLE webhook_endpoints IS 'Webhook endpoint configurations for inbound automation triggers';
COMMENT ON TABLE webhook_requests IS 'Log of all webhook requests for debugging and audit purposes';
COMMENT ON TABLE call_tracking IS 'Enhanced call tracking with automation trigger capabilities';
COMMENT ON TABLE email_events IS 'Email event tracking for automation triggers (opens, clicks, bounces)';
COMMENT ON TABLE customer_reply_tracking IS 'Track and analyze customer replies across all channels';
COMMENT ON TABLE survey_submissions IS 'Survey responses with detailed analytics for automation';
COMMENT ON TABLE trigger_links IS 'Trackable links that trigger automations when clicked';
COMMENT ON TABLE trigger_link_clicks IS 'Individual click tracking for trigger links';

COMMENT ON COLUMN webhook_endpoints.payload_mapping IS 'JSON mapping of incoming payload to internal fields';
COMMENT ON COLUMN call_tracking.ai_analysis IS 'AI insights extracted from call content';
COMMENT ON COLUMN customer_reply_tracking.sentiment_score IS 'Sentiment analysis score from -1.00 (negative) to 1.00 (positive)';
COMMENT ON COLUMN survey_submissions.nps_score IS 'Net Promoter Score from 0 to 10';
COMMENT ON COLUMN trigger_links.trigger_conditions IS 'Additional conditions required for triggering automation';