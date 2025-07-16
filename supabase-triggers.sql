-- Trigger for instant lead response automation
-- This will call our webhook whenever a new lead is created

-- Create function to trigger lead automation webhook
CREATE OR REPLACE FUNCTION trigger_lead_automation()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url TEXT;
BEGIN
  -- Only trigger for new leads (INSERT)
  IF TG_OP = 'INSERT' THEN
    -- Set the webhook URL (you'll need to update this with your actual domain)
    webhook_url := 'https://your-domain.com/api/webhooks/lead-created';
    
    -- Call the webhook asynchronously using pg_net extension
    -- Note: This requires the pg_net extension to be enabled in Supabase
    PERFORM
      net.http_post(
        url := webhook_url,
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := json_build_object(
          'lead_id', NEW.id,
          'event_type', 'INSERT',
          'organization_id', NEW.organization_id,
          'lead_data', row_to_json(NEW)
        )::text
      );
    
    -- Log the trigger for debugging
    INSERT INTO automation_logs (
      organization_id,
      event_type,
      entity_type,
      entity_id,
      message,
      created_at
    ) VALUES (
      NEW.organization_id,
      'webhook_triggered',
      'lead',
      NEW.id,
      'Lead automation webhook triggered for new lead',
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS lead_automation_trigger ON leads;
CREATE TRIGGER lead_automation_trigger
  AFTER INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_lead_automation();

-- Create automation logs table for debugging
CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'lead', 'client', etc.
  entity_id UUID NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable RLS on automation logs
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their automation logs" ON automation_logs
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles 
    WHERE id = auth.uid()
  )
);

-- Index for performance
CREATE INDEX idx_automation_logs_org_created ON automation_logs(organization_id, created_at DESC);

-- Alternative approach: Direct database function call
-- This doesn't require external webhooks but runs in the database
CREATE OR REPLACE FUNCTION process_lead_automation_direct(lead_id UUID)
RETURNS JSONB AS $$
DECLARE
  lead_record RECORD;
  automation_record RECORD;
  result JSONB;
BEGIN
  -- Get lead details
  SELECT * INTO lead_record FROM leads WHERE id = lead_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Lead not found');
  END IF;
  
  -- Check if lead follow-up automation is active
  SELECT ga.*, at.default_config 
  INTO automation_record
  FROM gym_automations ga
  JOIN automation_templates at ON ga.template_id = at.id
  WHERE ga.organization_id = lead_record.organization_id
    AND at.template_key = 'lead_follow_up'
    AND ga.is_active = true;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', true, 'message', 'No active lead automation found');
  END IF;
  
  -- Create execution record
  INSERT INTO automation_executions (
    organization_id,
    automation_id,
    template_key,
    lead_id,
    status,
    total_steps,
    context
  ) VALUES (
    lead_record.organization_id,
    automation_record.id,
    'lead_follow_up',
    lead_id,
    'completed',
    3,
    json_build_object('lead', lead_record, 'config', automation_record.config)
  );
  
  -- Schedule SMS (immediate - within 5 minutes)
  INSERT INTO automation_jobs (
    organization_id,
    job_type,
    template_key,
    lead_id,
    scheduled_for,
    job_data
  ) VALUES (
    lead_record.organization_id,
    'sms_immediate',
    'lead_follow_up',
    lead_id,
    NOW() + INTERVAL '5 minutes',
    json_build_object(
      'action', 'sms',
      'phone', lead_record.phone,
      'message', 'Hi ' || lead_record.first_name || '! Thanks for your interest. We''ll be in touch shortly!',
      'lead_id', lead_id
    )
  );
  
  -- Schedule follow-up email
  INSERT INTO automation_jobs (
    organization_id,
    job_type,
    template_key,
    lead_id,
    scheduled_for,
    job_data
  ) VALUES (
    lead_record.organization_id,
    'email_follow_up',
    'lead_follow_up',
    lead_id,
    NOW() + INTERVAL '2 hours',
    json_build_object(
      'action', 'email',
      'email', lead_record.email,
      'subject', 'Welcome! Let''s get you started',
      'lead_id', lead_id
    )
  );
  
  -- Create lead response tracking record
  INSERT INTO lead_response_tracking (
    organization_id,
    lead_id,
    lead_created_at,
    basic_score
  ) VALUES (
    lead_record.organization_id,
    lead_id,
    lead_record.created_at,
    50 + CASE 
      WHEN lead_record.source = 'facebook' THEN 20
      WHEN lead_record.source = 'google' THEN 15
      WHEN lead_record.source = 'website' THEN 25
      WHEN lead_record.source = 'referral' THEN 30
      ELSE 0
    END + CASE 
      WHEN lead_record.phone IS NOT NULL THEN 15 
      ELSE 0 
    END + CASE 
      WHEN lead_record.email IS NOT NULL THEN 10 
      ELSE 0 
    END
  );
  
  -- Update automation stats
  UPDATE gym_automations 
  SET 
    triggered_count = triggered_count + 1,
    successful_count = successful_count + 1,
    last_triggered = NOW()
  WHERE id = automation_record.id;
  
  RETURN json_build_object(
    'success', true,
    'actions_completed', 3,
    'sms_scheduled', true,
    'email_scheduled', true,
    'tracking_created', true
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Simplified trigger that calls the direct function
CREATE OR REPLACE FUNCTION trigger_lead_automation_simple()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the direct automation function
  PERFORM process_lead_automation_direct(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Replace the webhook trigger with the direct function trigger
DROP TRIGGER IF EXISTS lead_automation_trigger ON leads;
CREATE TRIGGER lead_automation_trigger
  AFTER INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_lead_automation_simple();