-- Migration: Opportunity and Pipeline Automation Triggers
-- Created: 2025-08-06
-- Description: Creates comprehensive opportunity/pipeline management with automation triggers
-- including opportunities table, pipeline stages, status changes, and stale opportunity tracking

-- Create pipeline_stages table
-- Purpose: Define customizable sales pipeline stages for each organization
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Stage details
  name text NOT NULL,
  description text,
  stage_order integer NOT NULL, -- Order in the pipeline (1, 2, 3, etc.)
  
  -- Stage configuration
  stage_type text NOT NULL DEFAULT 'active', -- 'active', 'won', 'lost', 'nurture'
  is_active boolean DEFAULT true,
  color text DEFAULT '#6B7280', -- Hex color for UI display
  
  -- Automation settings
  auto_move_after_days integer, -- Automatically move to next stage after X days
  next_stage_id uuid, -- Next stage in pipeline
  automation_triggers jsonb DEFAULT '[]', -- Array of automation IDs to trigger when entering this stage
  
  -- Requirements and validation
  required_fields text[] DEFAULT '{}', -- Required fields to move to this stage
  required_activities text[] DEFAULT '{}', -- Required activity types
  min_activities_count integer DEFAULT 0,
  
  -- Performance tracking
  opportunities_count integer DEFAULT 0,
  average_time_in_stage_days decimal(10,2) DEFAULT 0.00,
  conversion_rate_to_next decimal(5,2) DEFAULT 0.00,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT pipeline_stages_unique_name UNIQUE (organization_id, name),
  CONSTRAINT pipeline_stages_unique_order UNIQUE (organization_id, stage_order)
);

-- Create opportunities table
-- Purpose: Track sales opportunities through the pipeline with detailed automation support
CREATE TABLE IF NOT EXISTS opportunities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Basic opportunity details
  title text NOT NULL,
  description text,
  opportunity_type text DEFAULT 'membership', -- 'membership', 'personal_training', 'program', 'retail', 'other'
  
  -- Associated contacts and leads
  contact_id uuid REFERENCES contacts(id),
  lead_id uuid REFERENCES leads(id),
  client_id uuid REFERENCES clients(id), -- If converted to client
  
  -- Financial details
  estimated_value decimal(12,2) NOT NULL DEFAULT 0.00,
  probability_percentage integer DEFAULT 50 CHECK (probability_percentage >= 0 AND probability_percentage <= 100),
  expected_close_date date,
  actual_close_date date,
  
  -- Pipeline tracking
  current_stage_id uuid NOT NULL REFERENCES pipeline_stages(id),
  previous_stage_id uuid REFERENCES pipeline_stages(id),
  stage_entered_at timestamptz DEFAULT now(),
  
  -- Status and outcome
  status text NOT NULL DEFAULT 'open', -- 'open', 'won', 'lost', 'on_hold', 'nurturing'
  won_reason text, -- Reason for winning
  lost_reason text, -- Reason for losing
  competitor_name text, -- If lost to competitor
  
  -- Assignment and ownership
  assigned_to uuid REFERENCES users(id),
  created_by uuid NOT NULL REFERENCES users(id),
  
  -- Source tracking
  source text, -- Where the opportunity came from
  campaign_id uuid REFERENCES campaigns(id),
  referral_source text,
  
  -- Engagement tracking
  last_activity_date timestamptz,
  next_follow_up_date timestamptz,
  activities_count integer DEFAULT 0,
  emails_sent integer DEFAULT 0,
  calls_made integer DEFAULT 0,
  meetings_held integer DEFAULT 0,
  
  -- Automation and AI
  automation_rules_applied jsonb DEFAULT '[]', -- Which automations have been applied
  ai_insights jsonb DEFAULT '{}', -- AI-generated insights about the opportunity
  priority_score decimal(3,2) DEFAULT 0.50, -- AI-calculated priority (0.00 to 1.00)
  health_score decimal(3,2) DEFAULT 0.50, -- Opportunity health score (0.00 to 1.00)
  
  -- Stale opportunity detection
  days_in_current_stage integer DEFAULT 0,
  days_since_last_activity integer DEFAULT 0,
  is_stale boolean DEFAULT false,
  stale_reason text,
  
  -- Custom fields
  custom_fields jsonb DEFAULT '{}',
  tags text[] DEFAULT '{}',
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure at least one contact reference
  CONSTRAINT opportunities_has_contact CHECK (
    contact_id IS NOT NULL OR lead_id IS NOT NULL
  )
);

-- Create opportunity_stage_changes table
-- Purpose: Track all stage changes in opportunities for automation triggers
CREATE TABLE IF NOT EXISTS opportunity_stage_changes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  opportunity_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  
  -- Stage change details
  from_stage_id uuid REFERENCES pipeline_stages(id),
  to_stage_id uuid NOT NULL REFERENCES pipeline_stages(id),
  change_reason text,
  change_type text DEFAULT 'manual', -- 'manual', 'automatic', 'rule_based'
  
  -- Context
  changed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  time_in_previous_stage_hours decimal(10,2),
  
  -- Automation results
  automation_triggered boolean DEFAULT false,
  triggered_automation_ids uuid[] DEFAULT '{}',
  tasks_created integer DEFAULT 0,
  notifications_sent integer DEFAULT 0,
  
  -- Performance impact
  probability_before integer,
  probability_after integer,
  value_before decimal(12,2),
  value_after decimal(12,2),
  
  -- Timestamps
  changed_at timestamptz DEFAULT now(),
  
  CONSTRAINT stage_changes_different_stages CHECK (from_stage_id IS DISTINCT FROM to_stage_id)
);

-- Create opportunity_activities table
-- Purpose: Track activities related to opportunities for engagement scoring
CREATE TABLE IF NOT EXISTS opportunity_activities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  opportunity_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  
  -- Activity details
  activity_type text NOT NULL, -- 'call', 'email', 'meeting', 'proposal_sent', 'demo', 'follow_up', 'note'
  subject text,
  description text NOT NULL,
  outcome text,
  
  -- Participants
  performed_by uuid NOT NULL REFERENCES users(id),
  contact_participants uuid[] DEFAULT '{}', -- Array of contact IDs who participated
  
  -- Activity metadata
  duration_minutes integer,
  channel text, -- 'phone', 'email', 'in_person', 'video_call', 'text'
  direction text DEFAULT 'outbound', -- 'inbound', 'outbound'
  
  -- Results and follow-up
  next_action_required text,
  next_action_date timestamptz,
  impact_score decimal(3,2) DEFAULT 0.00, -- Impact on opportunity (0.00 to 1.00)
  
  -- Related records
  related_email_id uuid,
  related_call_id uuid,
  related_meeting_id uuid,
  
  -- Automation
  auto_generated boolean DEFAULT false,
  triggered_by_automation_id uuid,
  
  -- Timestamps
  activity_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create stale_opportunity_rules table
-- Purpose: Define rules for identifying stale opportunities
CREATE TABLE IF NOT EXISTS stale_opportunity_rules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Rule details
  rule_name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  priority integer DEFAULT 1, -- Higher numbers = higher priority
  
  -- Conditions
  stages_to_monitor uuid[] DEFAULT '{}', -- Specific stages to monitor (empty = all)
  max_days_in_stage integer, -- Max days allowed in current stage
  max_days_since_activity integer, -- Max days since last activity
  min_probability_threshold integer, -- Flag if probability drops below this
  
  -- Value-based conditions
  min_value_threshold decimal(12,2), -- Only monitor opportunities above this value
  max_value_threshold decimal(12,2), -- Only monitor opportunities below this value
  
  -- Actions when rule is triggered
  auto_assign_to uuid REFERENCES users(id), -- Auto-assign to specific user
  auto_create_task boolean DEFAULT true,
  auto_send_notification boolean DEFAULT true,
  auto_trigger_automation_ids uuid[] DEFAULT '{}',
  
  -- Escalation
  escalate_after_days integer, -- Days before escalating
  escalate_to uuid REFERENCES users(id), -- User to escalate to
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT stale_rules_unique_name UNIQUE (organization_id, rule_name)
);

-- Create opportunity_alerts table
-- Purpose: Track alerts generated for opportunities
CREATE TABLE IF NOT EXISTS opportunity_alerts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  opportunity_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  
  -- Alert details
  alert_type text NOT NULL, -- 'stale', 'high_value', 'close_date_approaching', 'no_activity', 'stage_regression'
  severity text DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  message text NOT NULL,
  
  -- Context
  triggered_by_rule_id uuid REFERENCES stale_opportunity_rules(id),
  current_stage_id uuid REFERENCES pipeline_stages(id),
  days_in_stage integer,
  days_since_activity integer,
  
  -- Resolution
  is_resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES users(id),
  resolution_notes text,
  
  -- Actions taken
  task_created boolean DEFAULT false,
  notification_sent boolean DEFAULT false,
  automation_triggered boolean DEFAULT false,
  escalated boolean DEFAULT false,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_pipeline_stages_organization ON pipeline_stages(organization_id);
CREATE INDEX idx_pipeline_stages_order ON pipeline_stages(organization_id, stage_order);
CREATE INDEX idx_pipeline_stages_type ON pipeline_stages(stage_type);

CREATE INDEX idx_opportunities_organization ON opportunities(organization_id);
CREATE INDEX idx_opportunities_contact ON opportunities(contact_id);
CREATE INDEX idx_opportunities_lead ON opportunities(lead_id);
CREATE INDEX idx_opportunities_client ON opportunities(client_id);
CREATE INDEX idx_opportunities_stage ON opportunities(current_stage_id);
CREATE INDEX idx_opportunities_assigned_to ON opportunities(assigned_to);
CREATE INDEX idx_opportunities_status ON opportunities(status);
CREATE INDEX idx_opportunities_close_date ON opportunities(expected_close_date);
CREATE INDEX idx_opportunities_value ON opportunities(estimated_value DESC);
CREATE INDEX idx_opportunities_stale ON opportunities(is_stale) WHERE is_stale = true;
CREATE INDEX idx_opportunities_follow_up ON opportunities(next_follow_up_date) WHERE next_follow_up_date IS NOT NULL;
CREATE INDEX idx_opportunities_priority ON opportunities(priority_score DESC);

CREATE INDEX idx_opportunity_stage_changes_opportunity ON opportunity_stage_changes(opportunity_id);
CREATE INDEX idx_opportunity_stage_changes_organization ON opportunity_stage_changes(organization_id);
CREATE INDEX idx_opportunity_stage_changes_to_stage ON opportunity_stage_changes(to_stage_id);
CREATE INDEX idx_opportunity_stage_changes_date ON opportunity_stage_changes(changed_at DESC);

CREATE INDEX idx_opportunity_activities_opportunity ON opportunity_activities(opportunity_id);
CREATE INDEX idx_opportunity_activities_organization ON opportunity_activities(organization_id);
CREATE INDEX idx_opportunity_activities_type ON opportunity_activities(activity_type);
CREATE INDEX idx_opportunity_activities_performed_by ON opportunity_activities(performed_by);
CREATE INDEX idx_opportunity_activities_date ON opportunity_activities(activity_date DESC);

CREATE INDEX idx_stale_opportunity_rules_organization ON stale_opportunity_rules(organization_id);
CREATE INDEX idx_stale_opportunity_rules_active ON stale_opportunity_rules(is_active) WHERE is_active = true;
CREATE INDEX idx_stale_opportunity_rules_priority ON stale_opportunity_rules(priority DESC);

CREATE INDEX idx_opportunity_alerts_organization ON opportunity_alerts(organization_id);
CREATE INDEX idx_opportunity_alerts_opportunity ON opportunity_alerts(opportunity_id);
CREATE INDEX idx_opportunity_alerts_type ON opportunity_alerts(alert_type);
CREATE INDEX idx_opportunity_alerts_unresolved ON opportunity_alerts(is_resolved) WHERE is_resolved = false;
CREATE INDEX idx_opportunity_alerts_created_at ON opportunity_alerts(created_at DESC);

-- Create trigger functions
-- Function to update pipeline stage statistics
CREATE OR REPLACE FUNCTION update_pipeline_stage_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update opportunity count for stages
  IF TG_OP = 'INSERT' THEN
    UPDATE pipeline_stages 
    SET opportunities_count = opportunities_count + 1
    WHERE id = NEW.current_stage_id;
    
  ELSIF TG_OP = 'UPDATE' AND OLD.current_stage_id IS DISTINCT FROM NEW.current_stage_id THEN
    -- Decrease count from old stage
    UPDATE pipeline_stages 
    SET opportunities_count = GREATEST(0, opportunities_count - 1)
    WHERE id = OLD.current_stage_id;
    
    -- Increase count for new stage
    UPDATE pipeline_stages 
    SET opportunities_count = opportunities_count + 1
    WHERE id = NEW.current_stage_id;
    
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE pipeline_stages 
    SET opportunities_count = GREATEST(0, opportunities_count - 1)
    WHERE id = OLD.current_stage_id;
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to log stage changes
CREATE OR REPLACE FUNCTION log_opportunity_stage_change()
RETURNS TRIGGER AS $$
DECLARE
  time_in_previous_stage decimal(10,2);
BEGIN
  -- Only log if stage actually changed
  IF OLD.current_stage_id IS DISTINCT FROM NEW.current_stage_id THEN
    -- Calculate time in previous stage
    time_in_previous_stage := EXTRACT(EPOCH FROM (now() - OLD.stage_entered_at)) / 3600.0;
    
    -- Log the stage change
    INSERT INTO opportunity_stage_changes (
      organization_id,
      opportunity_id,
      from_stage_id,
      to_stage_id,
      changed_by,
      time_in_previous_stage_hours,
      probability_before,
      probability_after,
      value_before,
      value_after
    ) VALUES (
      NEW.organization_id,
      NEW.id,
      OLD.current_stage_id,
      NEW.current_stage_id,
      auth.uid(),
      time_in_previous_stage,
      OLD.probability_percentage,
      NEW.probability_percentage,
      OLD.estimated_value,
      NEW.estimated_value
    );
    
    -- Update stage_entered_at timestamp
    NEW.stage_entered_at := now();
    NEW.previous_stage_id := OLD.current_stage_id;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update opportunity engagement metrics
CREATE OR REPLACE FUNCTION update_opportunity_engagement()
RETURNS TRIGGER AS $$
BEGIN
  -- Update last activity date and reset staleness
  UPDATE opportunities 
  SET 
    last_activity_date = NEW.activity_date,
    activities_count = activities_count + 1,
    emails_sent = CASE WHEN NEW.activity_type = 'email' THEN emails_sent + 1 ELSE emails_sent END,
    calls_made = CASE WHEN NEW.activity_type = 'call' THEN calls_made + 1 ELSE calls_made END,
    meetings_held = CASE WHEN NEW.activity_type = 'meeting' THEN meetings_held + 1 ELSE meetings_held END,
    is_stale = false,
    stale_reason = null,
    updated_at = now()
  WHERE id = NEW.opportunity_id;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to check for stale opportunities
CREATE OR REPLACE FUNCTION check_stale_opportunities()
RETURNS TRIGGER AS $$
DECLARE
  stage_days integer;
  activity_days integer;
  stale_rules RECORD;
  should_flag_stale boolean := false;
  stale_reason_text text := '';
BEGIN
  -- Calculate days in current stage and since last activity
  stage_days := EXTRACT(DAY FROM (now() - NEW.stage_entered_at));
  activity_days := CASE 
    WHEN NEW.last_activity_date IS NULL THEN EXTRACT(DAY FROM (now() - NEW.created_at))
    ELSE EXTRACT(DAY FROM (now() - NEW.last_activity_date))
  END;
  
  -- Update calculated fields
  NEW.days_in_current_stage := stage_days;
  NEW.days_since_last_activity := activity_days;
  
  -- Check against stale opportunity rules
  FOR stale_rules IN 
    SELECT * FROM stale_opportunity_rules 
    WHERE organization_id = NEW.organization_id 
    AND is_active = true
    AND (
      array_length(stages_to_monitor, 1) IS NULL OR 
      NEW.current_stage_id = ANY(stages_to_monitor)
    )
    ORDER BY priority DESC
  LOOP
    -- Check stage duration rule
    IF stale_rules.max_days_in_stage IS NOT NULL AND stage_days > stale_rules.max_days_in_stage THEN
      should_flag_stale := true;
      stale_reason_text := format('In stage for %s days (max: %s)', stage_days, stale_rules.max_days_in_stage);
      EXIT;
    END IF;
    
    -- Check activity duration rule
    IF stale_rules.max_days_since_activity IS NOT NULL AND activity_days > stale_rules.max_days_since_activity THEN
      should_flag_stale := true;
      stale_reason_text := format('No activity for %s days (max: %s)', activity_days, stale_rules.max_days_since_activity);
      EXIT;
    END IF;
    
    -- Check probability threshold
    IF stale_rules.min_probability_threshold IS NOT NULL AND NEW.probability_percentage < stale_rules.min_probability_threshold THEN
      should_flag_stale := true;
      stale_reason_text := format('Probability below threshold (%s%% < %s%%)', NEW.probability_percentage, stale_rules.min_probability_threshold);
      EXIT;
    END IF;
  END LOOP;
  
  -- Update stale status
  NEW.is_stale := should_flag_stale;
  NEW.stale_reason := CASE WHEN should_flag_stale THEN stale_reason_text ELSE NULL END;
  
  -- Create alert if newly stale
  IF should_flag_stale AND (OLD.is_stale IS NULL OR OLD.is_stale = false) THEN
    INSERT INTO opportunity_alerts (
      organization_id,
      opportunity_id,
      alert_type,
      severity,
      message,
      current_stage_id,
      days_in_stage,
      days_since_activity
    ) VALUES (
      NEW.organization_id,
      NEW.id,
      'stale',
      'medium',
      format('Opportunity "%s" has become stale: %s', NEW.title, stale_reason_text),
      NEW.current_stage_id,
      stage_days,
      activity_days
    );
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_pipeline_stage_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_pipeline_stage_stats();

CREATE TRIGGER log_opportunity_stage_change_trigger
  AFTER UPDATE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION log_opportunity_stage_change();

CREATE TRIGGER update_opportunity_engagement_trigger
  AFTER INSERT ON opportunity_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_opportunity_engagement();

CREATE TRIGGER check_stale_opportunities_trigger
  BEFORE UPDATE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION check_stale_opportunities();

-- Updated_at triggers
CREATE TRIGGER update_pipeline_stages_updated_at
  BEFORE UPDATE ON pipeline_stages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_opportunities_updated_at
  BEFORE UPDATE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stale_opportunity_rules_updated_at
  BEFORE UPDATE ON stale_opportunity_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_opportunity_alerts_updated_at
  BEFORE UPDATE ON opportunity_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_stage_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE stale_opportunity_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Pipeline Stages policies
CREATE POLICY "Users can view pipeline stages from their organization"
  ON pipeline_stages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = pipeline_stages.organization_id
    )
  );

CREATE POLICY "Users can manage pipeline stages for their organization"
  ON pipeline_stages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = pipeline_stages.organization_id
    )
  );

-- Opportunities policies
CREATE POLICY "Users can view opportunities from their organization"
  ON opportunities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = opportunities.organization_id
    )
  );

CREATE POLICY "Users can manage opportunities for their organization"
  ON opportunities FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = opportunities.organization_id
    )
  );

-- Opportunity Stage Changes policies
CREATE POLICY "Users can view stage changes from their organization"
  ON opportunity_stage_changes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = opportunity_stage_changes.organization_id
    )
  );

-- Opportunity Activities policies
CREATE POLICY "Users can view activities from their organization"
  ON opportunity_activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = opportunity_activities.organization_id
    )
  );

CREATE POLICY "Users can manage activities for their organization"
  ON opportunity_activities FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = opportunity_activities.organization_id
    )
  );

-- Stale Opportunity Rules policies
CREATE POLICY "Users can view stale rules from their organization"
  ON stale_opportunity_rules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = stale_opportunity_rules.organization_id
    )
  );

CREATE POLICY "Users can manage stale rules for their organization"
  ON stale_opportunity_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = stale_opportunity_rules.organization_id
    )
  );

-- Opportunity Alerts policies
CREATE POLICY "Users can view alerts from their organization"
  ON opportunity_alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = opportunity_alerts.organization_id
    )
  );

CREATE POLICY "Users can manage alerts for their organization"
  ON opportunity_alerts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = opportunity_alerts.organization_id
    )
  );

-- Service role policies (for automation)
CREATE POLICY "Service role can manage all pipeline stages"
  ON pipeline_stages FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage all opportunities"
  ON opportunities FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage all stage changes"
  ON opportunity_stage_changes FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage all activities"
  ON opportunity_activities FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage all stale rules"
  ON stale_opportunity_rules FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage all alerts"
  ON opportunity_alerts FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Insert default pipeline stages for new organizations
-- This would typically be done through a separate seed migration or application logic
-- but including here as an example

-- Add helpful comments
COMMENT ON TABLE pipeline_stages IS 'Customizable sales pipeline stages with automation triggers';
COMMENT ON TABLE opportunities IS 'Comprehensive opportunity tracking through sales pipeline';
COMMENT ON TABLE opportunity_stage_changes IS 'Audit log of all opportunity stage changes for automation';
COMMENT ON TABLE opportunity_activities IS 'Track all activities related to opportunities for engagement scoring';
COMMENT ON TABLE stale_opportunity_rules IS 'Configurable rules for identifying stale opportunities';
COMMENT ON TABLE opportunity_alerts IS 'Alerts generated for opportunities requiring attention';

COMMENT ON COLUMN opportunities.health_score IS 'Calculated health score (0-1) based on activity, progression, and engagement';
COMMENT ON COLUMN opportunities.priority_score IS 'AI-calculated priority score (0-1) for focus and automation';
COMMENT ON COLUMN pipeline_stages.automation_triggers IS 'Array of automation IDs to trigger when opportunities enter this stage';
COMMENT ON COLUMN stale_opportunity_rules.escalate_to IS 'User ID to escalate stale opportunities to after specified days';