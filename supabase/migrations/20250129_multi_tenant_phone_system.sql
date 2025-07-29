-- Add phone number management to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS twilio_phone_number VARCHAR(50);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS twilio_phone_sid VARCHAR(100);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS twilio_subaccount_sid VARCHAR(100);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS twilio_subaccount_auth_token TEXT; -- Will be encrypted

-- Create index for phone number lookups
CREATE INDEX IF NOT EXISTS idx_organizations_twilio_phone ON organizations(twilio_phone_number);

-- Add organization_id to all communication tables if not exists
ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE whatsapp_logs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Create indexes for organization lookups
CREATE INDEX IF NOT EXISTS idx_sms_logs_org ON sms_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_org ON whatsapp_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_org ON email_logs(organization_id);

-- Update existing logs to use the current organization (temporary - for your data)
-- Replace with your actual organization ID
UPDATE sms_logs SET organization_id = '63589490-8f55-4157-bd3a-e141594b740e' WHERE organization_id IS NULL;
UPDATE whatsapp_logs SET organization_id = '63589490-8f55-4157-bd3a-e141594b740e' WHERE organization_id IS NULL;
UPDATE email_logs SET organization_id = '63589490-8f55-4157-bd3a-e141594b740e' WHERE organization_id IS NULL;

-- Set your current Twilio number for your test organization
UPDATE organizations 
SET twilio_phone_number = '+447450308627' 
WHERE id = '63589490-8f55-4157-bd3a-e141594b740e';

-- Add organization_id to messages table if not exists
ALTER TABLE messages ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX IF NOT EXISTS idx_messages_org ON messages(organization_id);

-- Phone number provisioning log
CREATE TABLE IF NOT EXISTS phone_number_provisions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  phone_number VARCHAR(50) NOT NULL,
  phone_sid VARCHAR(100),
  status VARCHAR(50) NOT NULL, -- 'pending', 'active', 'released'
  area_code VARCHAR(10),
  country_code VARCHAR(5) DEFAULT 'GB',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for new table
ALTER TABLE phone_number_provisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org phone provisions" ON phone_number_provisions
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Service role full access phone provisions" ON phone_number_provisions
  FOR ALL USING (true);