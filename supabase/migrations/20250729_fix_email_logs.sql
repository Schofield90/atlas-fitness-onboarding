-- Drop the existing table if it exists
DROP TABLE IF EXISTS email_logs CASCADE;

-- Create the update_updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create email logs table to match sms_logs and whatsapp_logs structure
CREATE TABLE email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id VARCHAR(255),
  to_email VARCHAR(255) NOT NULL,
  from_email VARCHAR(255),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(50) NOT NULL,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_email_logs_to ON email_logs(to_email);
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

-- Allow authenticated users to insert (for completeness)
CREATE POLICY "Users can insert email logs" ON email_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);