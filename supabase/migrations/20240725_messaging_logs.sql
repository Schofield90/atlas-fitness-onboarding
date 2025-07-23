-- Create SMS logs table
CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id VARCHAR(255),
  to VARCHAR(255) NOT NULL,
  from_number VARCHAR(255),
  message TEXT NOT NULL,
  status VARCHAR(50) NOT NULL,
  error TEXT,
  workflow_execution_id UUID REFERENCES workflow_executions(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create WhatsApp logs table
CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id VARCHAR(255),
  to VARCHAR(255) NOT NULL,
  from_number VARCHAR(255),
  message TEXT NOT NULL,
  status VARCHAR(50) NOT NULL,
  error TEXT,
  has_media BOOLEAN DEFAULT false,
  media_urls TEXT[],
  workflow_execution_id UUID REFERENCES workflow_executions(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_sms_logs_to ON sms_logs(to);
CREATE INDEX idx_sms_logs_workflow_execution ON sms_logs(workflow_execution_id);
CREATE INDEX idx_sms_logs_created_at ON sms_logs(created_at);

CREATE INDEX idx_whatsapp_logs_to ON whatsapp_logs(to);
CREATE INDEX idx_whatsapp_logs_workflow_execution ON whatsapp_logs(workflow_execution_id);
CREATE INDEX idx_whatsapp_logs_created_at ON whatsapp_logs(created_at);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sms_logs_updated_at
  BEFORE UPDATE ON sms_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_whatsapp_logs_updated_at
  BEFORE UPDATE ON whatsapp_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Add RLS policies
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their organization's logs
CREATE POLICY "Users can view their organization's SMS logs" ON sms_logs
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their organization's WhatsApp logs" ON whatsapp_logs
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Allow service role full access
CREATE POLICY "Service role can manage SMS logs" ON sms_logs
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage WhatsApp logs" ON whatsapp_logs
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');