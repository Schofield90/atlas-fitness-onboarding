-- Create email logs table to match sms_logs and whatsapp_logs structure
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id VARCHAR(255),
  to VARCHAR(255) NOT NULL,
  from_email VARCHAR(255),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(50) NOT NULL,
  error TEXT,
  workflow_execution_id UUID REFERENCES workflow_executions(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_email_logs_to ON email_logs(to);
CREATE INDEX idx_email_logs_workflow_execution ON email_logs(workflow_execution_id);
CREATE INDEX idx_email_logs_created_at ON email_logs(created_at);

-- Create updated_at trigger
CREATE TRIGGER update_email_logs_updated_at
  BEFORE UPDATE ON email_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Add RLS policies
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read email logs
CREATE POLICY "Users can view email logs" ON email_logs
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Allow service role full access
CREATE POLICY "Service role can manage email logs" ON email_logs
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');