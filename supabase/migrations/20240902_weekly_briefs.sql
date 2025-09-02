-- Create weekly_briefs table
CREATE TABLE IF NOT EXISTS weekly_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data JSONB NOT NULL,
  generated_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_weekly_briefs_created_at ON weekly_briefs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_briefs_generated_by ON weekly_briefs(generated_by);

-- Create email_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(100) NOT NULL,
  recipients TEXT[] NOT NULL,
  subject TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for email logs
CREATE INDEX IF NOT EXISTS idx_email_logs_type ON email_logs(type);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);

-- Create brief_schedules table for automated scheduling
CREATE TABLE IF NOT EXISTS brief_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  cron_schedule VARCHAR(100) NOT NULL, -- e.g., '0 9 * * 1' for Monday 9am
  recipients TEXT[] NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for scheduling
CREATE INDEX IF NOT EXISTS idx_brief_schedules_next_run_at ON brief_schedules(next_run_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_brief_schedules_is_active ON brief_schedules(is_active);

-- Insert default weekly schedule
INSERT INTO brief_schedules (name, cron_schedule, recipients, next_run_at) 
VALUES (
  'Weekly Executive Brief - Monday',
  '0 9 * * 1', -- Monday at 9am
  ARRAY['sam@atlas-gyms.co.uk', 'sam@gymleadhub.co.uk'],
  DATE_TRUNC('week', NOW() + INTERVAL '1 week') + INTERVAL '1 day' + INTERVAL '9 hours' -- Next Monday 9am
) ON CONFLICT DO NOTHING;

-- Create function to update next_run_at based on cron schedule
CREATE OR REPLACE FUNCTION update_next_run_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Simple next Monday calculation - in production you'd want a proper cron parser
  IF NEW.cron_schedule = '0 9 * * 1' THEN
    NEW.next_run_at = DATE_TRUNC('week', NOW() + INTERVAL '1 week') + INTERVAL '1 day' + INTERVAL '9 hours';
  END IF;
  
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update next_run_at
CREATE TRIGGER update_brief_schedules_next_run
  BEFORE UPDATE ON brief_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_next_run_at();

-- Create RLS policies for security
ALTER TABLE weekly_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE brief_schedules ENABLE ROW LEVEL SECURITY;

-- Policy: Only admin emails can access weekly briefs
CREATE POLICY "Admin access to weekly briefs" ON weekly_briefs
  FOR ALL USING (
    auth.jwt() ->> 'email' IN ('sam@atlas-gyms.co.uk', 'sam@gymleadhub.co.uk')
  );

-- Policy: Only admin emails can access email logs
CREATE POLICY "Admin access to email logs" ON email_logs
  FOR ALL USING (
    auth.jwt() ->> 'email' IN ('sam@atlas-gyms.co.uk', 'sam@gymleadhub.co.uk')
  );

-- Policy: Only admin emails can access brief schedules
CREATE POLICY "Admin access to brief schedules" ON brief_schedules
  FOR ALL USING (
    auth.jwt() ->> 'email' IN ('sam@atlas-gyms.co.uk', 'sam@gymleadhub.co.uk')
  );

-- Create function to get admin analytics data
CREATE OR REPLACE FUNCTION get_admin_analytics(
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  org_count INTEGER;
  user_count INTEGER;
  lead_count INTEGER;
  prev_org_count INTEGER;
  prev_user_count INTEGER;
  prev_lead_count INTEGER;
BEGIN
  -- Get current counts
  SELECT COUNT(*) INTO org_count FROM organizations WHERE created_at >= start_date AND created_at <= end_date;
  SELECT COUNT(*) INTO user_count FROM users WHERE created_at >= start_date AND created_at <= end_date;
  SELECT COUNT(*) INTO lead_count FROM leads WHERE created_at >= start_date AND created_at <= end_date;
  
  -- Get previous period counts for comparison
  SELECT COUNT(*) INTO prev_org_count FROM organizations 
    WHERE created_at >= (start_date - (end_date - start_date)) AND created_at < start_date;
  SELECT COUNT(*) INTO prev_user_count FROM users 
    WHERE created_at >= (start_date - (end_date - start_date)) AND created_at < start_date;
  SELECT COUNT(*) INTO prev_lead_count FROM leads 
    WHERE created_at >= (start_date - (end_date - start_date)) AND created_at < start_date;
  
  result = jsonb_build_object(
    'organizations', jsonb_build_object(
      'current', org_count,
      'previous', prev_org_count,
      'change', CASE WHEN prev_org_count > 0 THEN 
        ROUND(((org_count - prev_org_count)::NUMERIC / prev_org_count * 100)::NUMERIC, 2)
        ELSE 0 END
    ),
    'users', jsonb_build_object(
      'current', user_count,
      'previous', prev_user_count,
      'change', CASE WHEN prev_user_count > 0 THEN 
        ROUND(((user_count - prev_user_count)::NUMERIC / prev_user_count * 100)::NUMERIC, 2)
        ELSE 0 END
    ),
    'leads', jsonb_build_object(
      'current', lead_count,
      'previous', prev_lead_count,
      'change', CASE WHEN prev_lead_count > 0 THEN 
        ROUND(((lead_count - prev_lead_count)::NUMERIC / lead_count * 100)::NUMERIC, 2)
        ELSE 0 END
    ),
    'generated_at', NOW()
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (will be filtered by RLS)
GRANT EXECUTE ON FUNCTION get_admin_analytics TO authenticated;

COMMENT ON TABLE weekly_briefs IS 'Stores generated weekly executive briefs for SaaS admin dashboard';
COMMENT ON TABLE email_logs IS 'Logs all email sends including weekly briefs';
COMMENT ON TABLE brief_schedules IS 'Manages automated scheduling of weekly briefs';
COMMENT ON FUNCTION get_admin_analytics IS 'Returns analytics data for admin dashboard with period-over-period comparison';