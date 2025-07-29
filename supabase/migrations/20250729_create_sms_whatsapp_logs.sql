-- Create SMS logs table
CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id VARCHAR(255),
  "to" VARCHAR(255) NOT NULL,  -- Using quotes because 'to' is a reserved word
  from_number VARCHAR(255),
  message TEXT NOT NULL,
  status VARCHAR(50) NOT NULL,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create WhatsApp logs table
CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id VARCHAR(255),
  "to" VARCHAR(255) NOT NULL,  -- Using quotes because 'to' is a reserved word
  from_number VARCHAR(255),
  message TEXT NOT NULL,
  status VARCHAR(50) NOT NULL,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for SMS logs
CREATE INDEX IF NOT EXISTS idx_sms_logs_to ON sms_logs("to");
CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON sms_logs(created_at);

-- Create indexes for WhatsApp logs
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_to ON whatsapp_logs("to");
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_created_at ON whatsapp_logs(created_at);

-- Create update_updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at triggers
CREATE TRIGGER update_sms_logs_updated_at
  BEFORE UPDATE ON sms_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_whatsapp_logs_updated_at
  BEFORE UPDATE ON whatsapp_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Enable RLS with permissive policies
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
CREATE POLICY "Anyone can read sms logs" ON sms_logs
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read whatsapp logs" ON whatsapp_logs
  FOR SELECT USING (true);

-- Allow service role to do everything
CREATE POLICY "Service role full access sms" ON sms_logs
  FOR ALL USING (true);

CREATE POLICY "Service role full access whatsapp" ON whatsapp_logs
  FOR ALL USING (true);