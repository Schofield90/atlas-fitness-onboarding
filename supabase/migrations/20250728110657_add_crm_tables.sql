-- Migration: Add CRM tables for campaigns, automations, activities, and tasks
-- Description: Creates essential tables for the gym CRM system to track marketing campaigns,
-- workflow automations, lead activities, and staff tasks

-- Create campaigns table
-- Purpose: Tracks marketing campaigns from Meta Ads and other sources
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Campaign identification
  name text NOT NULL,
  description text,
  platform text NOT NULL DEFAULT 'meta_ads', -- 'meta_ads', 'google_ads', 'email', 'sms'
  external_campaign_id text, -- Meta Ads campaign ID or other platform ID
  status text NOT NULL DEFAULT 'draft', -- 'draft', 'active', 'paused', 'completed'
  
  -- Performance metrics
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  leads_generated integer DEFAULT 0,
  conversions integer DEFAULT 0,
  spend_amount decimal(10, 2) DEFAULT 0.00,
  budget_amount decimal(10, 2),
  
  -- Campaign settings
  start_date timestamptz,
  end_date timestamptz,
  target_audience jsonb DEFAULT '{}', -- Stores targeting criteria
  
  -- AI analysis and insights
  ai_insights jsonb DEFAULT '{}', -- Stores AI-generated insights about campaign performance
  ai_recommendations jsonb DEFAULT '[]', -- Array of AI recommendations
  last_ai_analysis timestamptz,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Indexes for performance
  CONSTRAINT campaigns_name_org_unique UNIQUE (organization_id, name)
);

-- Create indexes for campaigns
CREATE INDEX idx_campaigns_organization_id ON campaigns(organization_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_platform ON campaigns(platform);
CREATE INDEX idx_campaigns_external_id ON campaigns(external_campaign_id);
CREATE INDEX idx_campaigns_dates ON campaigns(start_date, end_date);

-- Create automations table
-- Purpose: Stores workflow automation definitions for lead nurturing and task automation
CREATE TABLE IF NOT EXISTS automations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Automation details
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT false,
  
  -- Trigger configuration
  trigger_type text NOT NULL, -- 'new_lead', 'lead_score_change', 'schedule', 'webhook', 'form_submission'
  trigger_config jsonb DEFAULT '{}', -- Stores trigger-specific configuration
  
  -- Workflow definition
  actions jsonb NOT NULL DEFAULT '[]', -- Array of action objects with type, config, delay
  /* Example actions array:
  [
    {
      "id": "action_1",
      "type": "send_email",
      "config": {
        "template_id": "welcome_email",
        "subject": "Welcome to our gym!"
      },
      "delay_minutes": 0
    },
    {
      "id": "action_2",
      "type": "send_sms",
      "config": {
        "message": "Thanks for joining! Reply YES to confirm."
      },
      "delay_minutes": 60
    }
  ]
  */
  
  -- Execution tracking
  execution_count integer DEFAULT 0,
  last_executed_at timestamptz,
  last_error text,
  
  -- Performance metrics
  success_count integer DEFAULT 0,
  failure_count integer DEFAULT 0,
  average_completion_time interval,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure unique automation names per organization
  CONSTRAINT automations_name_org_unique UNIQUE (organization_id, name)
);

-- Create indexes for automations
CREATE INDEX idx_automations_organization_id ON automations(organization_id);
CREATE INDEX idx_automations_is_active ON automations(is_active);
CREATE INDEX idx_automations_trigger_type ON automations(trigger_type);

-- Create lead_activities table
-- Purpose: Tracks all interactions and activities with leads for complete history
CREATE TABLE IF NOT EXISTS lead_activities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL, -- Staff member who performed the activity
  
  -- Activity details
  activity_type text NOT NULL, -- 'call', 'email', 'sms', 'whatsapp', 'meeting', 'note', 'status_change'
  channel text, -- 'phone', 'email', 'sms', 'whatsapp', 'in_person', 'video_call'
  direction text, -- 'inbound', 'outbound', null for notes
  
  -- Content and outcome
  subject text,
  content text,
  outcome text, -- 'answered', 'no_answer', 'voicemail', 'email_opened', 'email_clicked', etc.
  duration_seconds integer, -- For calls and meetings
  
  -- Related entities
  related_campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  related_automation_id uuid REFERENCES automations(id) ON DELETE SET NULL,
  
  -- Metadata
  metadata jsonb DEFAULT '{}', -- Additional data like call recording URL, email headers, etc.
  
  -- Timestamps
  activity_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  
  -- For quick lookups
  INDEX idx_lead_activities_lead_id (lead_id),
  INDEX idx_lead_activities_user_id (user_id),
  INDEX idx_lead_activities_type (activity_type),
  INDEX idx_lead_activities_date (activity_date DESC)
);

-- Create staff_tasks table
-- Purpose: Task management for staff members with AI-generated and manual tasks
CREATE TABLE IF NOT EXISTS staff_tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  
  -- Task details
  title text NOT NULL,
  description text,
  task_type text NOT NULL DEFAULT 'manual', -- 'manual', 'ai_generated', 'automated'
  category text, -- 'follow_up', 'meeting', 'document', 'call', 'email', 'other'
  
  -- Priority and timing
  priority text NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  due_date timestamptz,
  reminder_date timestamptz,
  
  -- Status tracking
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
  completed_at timestamptz,
  completion_notes text,
  
  -- Related entities
  related_lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  related_client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  related_campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  
  -- AI context
  ai_generated boolean DEFAULT false,
  ai_context jsonb DEFAULT '{}', -- Stores why AI created this task
  ai_priority_score decimal(3, 2), -- 0.00 to 1.00 priority score from AI
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure tasks are linked to a lead or client
  CONSTRAINT staff_tasks_has_related CHECK (
    related_lead_id IS NOT NULL OR related_client_id IS NOT NULL
  )
);

-- Create indexes for staff_tasks
CREATE INDEX idx_staff_tasks_organization_id ON staff_tasks(organization_id);
CREATE INDEX idx_staff_tasks_assigned_to ON staff_tasks(assigned_to);
CREATE INDEX idx_staff_tasks_status ON staff_tasks(status);
CREATE INDEX idx_staff_tasks_priority ON staff_tasks(priority);
CREATE INDEX idx_staff_tasks_due_date ON staff_tasks(due_date);
CREATE INDEX idx_staff_tasks_related_lead ON staff_tasks(related_lead_id);
CREATE INDEX idx_staff_tasks_related_client ON staff_tasks(related_client_id);

-- Create updated_at triggers for all tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to new tables
CREATE TRIGGER update_campaigns_updated_at 
  BEFORE UPDATE ON campaigns 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_automations_updated_at 
  BEFORE UPDATE ON automations 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_tasks_updated_at 
  BEFORE UPDATE ON staff_tasks 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add helpful comments
COMMENT ON TABLE campaigns IS 'Tracks marketing campaigns across different platforms with performance metrics and AI insights';
COMMENT ON TABLE automations IS 'Stores workflow automation definitions for lead nurturing and task automation';
COMMENT ON TABLE lead_activities IS 'Complete activity history for all lead interactions across all channels';
COMMENT ON TABLE staff_tasks IS 'Task management system for staff with support for AI-generated tasks';

COMMENT ON COLUMN campaigns.ai_insights IS 'JSON object containing AI-generated insights about campaign performance';
COMMENT ON COLUMN automations.actions IS 'JSON array of action objects defining the workflow steps';
COMMENT ON COLUMN lead_activities.metadata IS 'Additional data like call recordings, email tracking, etc.';
COMMENT ON COLUMN staff_tasks.ai_priority_score IS 'AI-calculated priority score between 0.00 and 1.00';