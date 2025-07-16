-- Simplified Automation System Schema
-- Focus on proven gym automation templates that drive ROI

-- =============================================
-- AUTOMATION TEMPLATES
-- =============================================

-- Pre-built automation templates that solve real gym problems
CREATE TABLE automation_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  template_key TEXT UNIQUE NOT NULL, -- 'lead_follow_up', 'dormant_member', etc.
  category TEXT NOT NULL CHECK (category IN ('lead_management', 'member_retention', 'engagement', 'recovery')),
  
  -- Template configuration
  default_config JSONB NOT NULL DEFAULT '{}',
  
  -- Business metrics
  expected_impact TEXT, -- "Increase lead conversion by 30%"
  setup_time_minutes INTEGER DEFAULT 5,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Gym-specific automation instances
CREATE TABLE gym_automations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID REFERENCES automation_templates(id) ON DELETE CASCADE,
  
  -- Configuration
  is_active BOOLEAN DEFAULT FALSE,
  config JSONB NOT NULL DEFAULT '{}', -- Customized settings
  
  -- Performance tracking
  triggered_count INTEGER DEFAULT 0,
  successful_count INTEGER DEFAULT 0,
  last_triggered TIMESTAMP WITH TIME ZONE,
  
  -- Settings
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  UNIQUE(organization_id, template_id)
);

-- =============================================
-- AUTOMATION EXECUTIONS (Simplified)
-- =============================================

-- Track automation executions for analytics
CREATE TABLE automation_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  automation_id UUID REFERENCES gym_automations(id) ON DELETE CASCADE,
  template_key TEXT NOT NULL,
  
  -- Context
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  
  -- Execution details
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  step_number INTEGER DEFAULT 1,
  total_steps INTEGER DEFAULT 1,
  
  -- Results
  actions_completed INTEGER DEFAULT 0,
  sms_sent INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  tasks_created INTEGER DEFAULT 0,
  
  -- Timing
  started_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Context data
  context JSONB DEFAULT '{}'
);

-- =============================================
-- SMS DELIVERY TRACKING
-- =============================================

-- Track SMS delivery for performance monitoring
CREATE TABLE sms_deliveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  execution_id UUID REFERENCES automation_executions(id) ON DELETE SET NULL,
  
  -- Recipient
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  
  -- Message
  message_content TEXT NOT NULL,
  template_key TEXT, -- Which automation template sent this
  
  -- Delivery status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  provider_message_id TEXT, -- Twilio message SID for tracking
  provider_response JSONB,
  
  -- Timing (critical for lead response tracking)
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  
  -- Cost tracking
  cost_pence INTEGER, -- Cost in pence for ROI calculation
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- =============================================
-- LEAD RESPONSE TRACKING
-- =============================================

-- Track how quickly we respond to new leads
CREATE TABLE lead_response_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  
  -- Timing metrics (the most important KPI for gyms)
  lead_created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  first_sms_sent_at TIMESTAMP WITH TIME ZONE,
  first_email_sent_at TIMESTAMP WITH TIME ZONE,
  first_human_contact_at TIMESTAMP WITH TIME ZONE,
  
  -- Response times in minutes
  sms_response_time_minutes INTEGER,
  email_response_time_minutes INTEGER,
  human_response_time_minutes INTEGER,
  
  -- Lead scoring (simplified, no AI)
  basic_score INTEGER CHECK (basic_score >= 0 AND basic_score <= 100),
  score_factors JSONB DEFAULT '{}', -- What contributed to the score
  
  -- Outcomes
  responded_to_sms BOOLEAN DEFAULT FALSE,
  responded_to_email BOOLEAN DEFAULT FALSE,
  converted_to_trial BOOLEAN DEFAULT FALSE,
  converted_to_member BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- =============================================
-- SCHEDULED JOBS (Simple)
-- =============================================

-- Simple job queue for follow-ups
CREATE TABLE automation_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Job details
  job_type TEXT NOT NULL, -- '2_hour_follow_up', '24_hour_follow_up', etc.
  template_key TEXT NOT NULL,
  
  -- Target
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Scheduling
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  
  -- Execution
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_attempted TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  
  -- Context
  job_data JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Critical indexes for automation performance
CREATE INDEX idx_gym_automations_org_active ON gym_automations(organization_id, is_active);
CREATE INDEX idx_automation_executions_org_status ON automation_executions(organization_id, status);
CREATE INDEX idx_sms_deliveries_triggered_at ON sms_deliveries(triggered_at);
CREATE INDEX idx_lead_response_tracking_org ON lead_response_tracking(organization_id);
CREATE INDEX idx_lead_response_sms_time ON lead_response_tracking(sms_response_time_minutes);
CREATE INDEX idx_automation_jobs_scheduled ON automation_jobs(scheduled_for, status);
CREATE INDEX idx_automation_jobs_org_pending ON automation_jobs(organization_id, status) WHERE status = 'pending';

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS
ALTER TABLE automation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_response_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Automation templates are public" ON automation_templates
FOR ALL USING (TRUE);

CREATE POLICY "Users can manage their gym automations" ON gym_automations
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can view their automation executions" ON automation_executions
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can view their SMS deliveries" ON sms_deliveries
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can view their lead response tracking" ON lead_response_tracking
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can manage their automation jobs" ON automation_jobs
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles 
    WHERE id = auth.uid()
  )
);

-- =============================================
-- INSERT AUTOMATION TEMPLATES
-- =============================================

-- Insert the 5 core automation templates
INSERT INTO automation_templates (name, description, template_key, category, default_config, expected_impact, setup_time_minutes) VALUES

('Never Miss a Lead', 
 'Instantly respond to new leads from Meta Ads with SMS, email follow-ups, and staff tasks. Never lose a potential member due to slow response times.',
 'lead_follow_up',
 'lead_management',
 '{
   "sms_delay_minutes": 5,
   "sms_message": "Hi {{lead.first_name}}! Thanks for your interest in {{gym.name}}. I''m {{staff.name}} from the team. When would be a good time for a quick chat about your fitness goals?",
   "email_delay_hours": 2,
   "email_subject": "Welcome to {{gym.name}} - Let''s get you started!",
   "task_delay_hours": 24,
   "task_message": "Follow up with {{lead.first_name}} - no response to initial outreach"
 }',
 'Increase lead conversion by 30-50%',
 5),

('Win Back Dormant Members',
 'Automatically re-engage members who haven''t visited in 14+ days with friendly check-ins and special offers.',
 'dormant_member',
 'member_retention', 
 '{
   "inactive_days": 14,
   "checkin_sms": "Hi {{member.first_name}}! We''ve missed you at {{gym.name}}. Everything okay? Reply STOP to opt out.",
   "offer_days": 21,
   "offer_sms": "{{member.first_name}}, we''d love to see you back! Claim your FREE personal training session: {{link}}",
   "final_days": 30,
   "final_message": "Last chance {{member.first_name}} - we don''t want to lose you! Call us: {{gym.phone}}"
 }',
 'Reduce member churn by 20%',
 3),

('Birthday Engagement',
 'Send personalized birthday messages with special offers to strengthen member relationships.',
 'birthday_engagement',
 'engagement',
 '{
   "birthday_sms": "Happy Birthday {{member.first_name}}! 🎉 Celebrate with a FREE guest pass at {{gym.name}}. Show this message at reception!",
   "staff_task": "Call {{member.first_name}} personally to wish happy birthday",
   "offer_valid_days": 7
 }',
 'Increase member satisfaction and referrals',
 2),

('Trial to Member Conversion',
 'Convert trial members into paying members with perfectly timed follow-ups and offers.',
 'trial_conversion',
 'lead_management',
 '{
   "reminder_days_before": 3,
   "reminder_sms": "{{member.first_name}}, your trial at {{gym.name}} ends in 3 days! Ready to continue your fitness journey?",
   "offer_sms": "Special offer for {{member.first_name}}: Join today and save 50% on your first month! Valid until {{trial_end_date}}",
   "followup_task": "Personal follow-up call for trial conversion"
 }',
 'Increase trial conversion by 40%',
 3),

('Payment Failed Recovery',
 'Politely handle failed payments with automated notifications and recovery sequences.',
 'payment_recovery',
 'recovery',
 '{
   "immediate_sms": "Hi {{member.first_name}}, there was an issue processing your payment for {{gym.name}}. Please update your payment method: {{link}}",
   "reminder_delay_days": 3,
   "reminder_sms": "Friendly reminder {{member.first_name}} - please update your payment details to avoid service interruption: {{link}}",
   "staff_task_days": 7,
   "staff_task": "Personal call needed for {{member.first_name}} - payment still outstanding"
 }',
 'Recover 80% of failed payments within 7 days',
 3);

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_automation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers
CREATE TRIGGER update_gym_automations_updated_at 
  BEFORE UPDATE ON gym_automations 
  FOR EACH ROW EXECUTE FUNCTION update_automation_updated_at();

CREATE TRIGGER update_lead_response_tracking_updated_at 
  BEFORE UPDATE ON lead_response_tracking 
  FOR EACH ROW EXECUTE FUNCTION update_automation_updated_at();