-- UK SMS/Phone System Database Schema
-- This schema handles UK regulatory compliance for SMS services

-- Phone number management
CREATE TABLE IF NOT EXISTS phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  phone_number VARCHAR NOT NULL,
  country_code VARCHAR DEFAULT 'GB',
  number_type VARCHAR CHECK (number_type IN ('uk_local', 'uk_mobile', 'international', 'alphanumeric')),
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'suspended', 'cancelled')),
  provider VARCHAR DEFAULT 'twilio',
  twilio_sid VARCHAR UNIQUE,
  capabilities JSONB DEFAULT '{"sms": true, "voice": false, "whatsapp": false}'::jsonb,
  is_primary BOOLEAN DEFAULT FALSE,
  monthly_cost_pence INTEGER DEFAULT 0,
  setup_cost_pence INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_primary_per_org UNIQUE (organization_id, is_primary) DEFERRABLE INITIALLY DEFERRED
);

-- Create indexes for phone numbers
CREATE INDEX idx_phone_numbers_organization ON phone_numbers(organization_id);
CREATE INDEX idx_phone_numbers_status ON phone_numbers(status);
CREATE INDEX idx_phone_numbers_twilio_sid ON phone_numbers(twilio_sid);

-- Enable RLS for phone numbers
ALTER TABLE phone_numbers ENABLE ROW LEVEL SECURITY;

-- RLS policies for phone numbers
CREATE POLICY "Users can view their organization's phone numbers" ON phone_numbers
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Admins can manage their organization's phone numbers" ON phone_numbers
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true AND role IN ('owner', 'admin')
    )
  );

-- Regulatory compliance tracking
CREATE TABLE IF NOT EXISTS regulatory_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  bundle_sid VARCHAR UNIQUE,
  bundle_status VARCHAR DEFAULT 'draft' CHECK (bundle_status IN ('draft', 'pending-review', 'in-review', 'twilio-approved', 'twilio-rejected', 'provisionally-approved', 'rejected')),
  submission_date TIMESTAMP WITH TIME ZONE,
  approval_date TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  last_status_check TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Business information
  business_info JSONB NOT NULL DEFAULT '{
    "company_name": "",
    "company_number": "",
    "business_type": "",
    "address": {
      "line1": "",
      "line2": "",
      "city": "",
      "postal_code": "",
      "country": "GB"
    },
    "contact": {
      "first_name": "",
      "last_name": "",
      "email": "",
      "phone": ""
    },
    "website": "",
    "vat_number": ""
  }'::jsonb,
  
  -- Document references
  documents JSONB DEFAULT '[]'::jsonb,
  
  -- Use cases for SMS
  use_cases JSONB DEFAULT '[]'::jsonb,
  
  -- Webhook tracking
  webhook_events JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT one_bundle_per_org UNIQUE (organization_id)
);

-- Create indexes for regulatory bundles
CREATE INDEX idx_regulatory_bundles_organization ON regulatory_bundles(organization_id);
CREATE INDEX idx_regulatory_bundles_status ON regulatory_bundles(bundle_status);
CREATE INDEX idx_regulatory_bundles_bundle_sid ON regulatory_bundles(bundle_sid);

-- Enable RLS for regulatory bundles
ALTER TABLE regulatory_bundles ENABLE ROW LEVEL SECURITY;

-- RLS policies for regulatory bundles
CREATE POLICY "Users can view their organization's regulatory bundle" ON regulatory_bundles
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Admins can manage their organization's regulatory bundle" ON regulatory_bundles
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true AND role IN ('owner', 'admin')
    )
  );

-- SMS configuration and settings
CREATE TABLE IF NOT EXISTS sms_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  provider VARCHAR DEFAULT 'twilio',
  provider_config JSONB DEFAULT '{
    "account_sid": "",
    "auth_token_encrypted": "",
    "webhook_url": "",
    "status_callback_url": ""
  }'::jsonb,
  
  -- Sender configuration
  sender_id VARCHAR,
  default_country VARCHAR DEFAULT 'GB',
  
  -- Message templates
  message_templates JSONB DEFAULT '{
    "welcome": {
      "name": "Welcome Message",
      "content": "Welcome to {{gym_name}}! We''re excited to help you achieve your fitness goals.",
      "variables": ["gym_name"]
    },
    "booking_confirmation": {
      "name": "Booking Confirmation",
      "content": "Hi {{customer_name}}, your {{class_name}} class on {{date}} at {{time}} is confirmed!",
      "variables": ["customer_name", "class_name", "date", "time"]
    },
    "payment_reminder": {
      "name": "Payment Reminder",
      "content": "Hi {{customer_name}}, your membership payment of £{{amount}} is due on {{due_date}}.",
      "variables": ["customer_name", "amount", "due_date"]
    }
  }'::jsonb,
  
  -- Auto-response configuration
  auto_responses JSONB DEFAULT '{
    "STOP": {
      "enabled": true,
      "response": "You have been unsubscribed from SMS messages. Reply START to opt back in.",
      "action": "unsubscribe"
    },
    "START": {
      "enabled": true,
      "response": "Welcome back! You will now receive SMS messages from us.",
      "action": "subscribe"
    },
    "HELP": {
      "enabled": true,
      "response": "For support, call us or visit our website. Reply STOP to unsubscribe.",
      "action": "info"
    }
  }'::jsonb,
  
  -- Quiet hours (UK timezone)
  quiet_hours JSONB DEFAULT '{
    "enabled": true,
    "start_time": "22:00",
    "end_time": "08:00",
    "timezone": "Europe/London",
    "days": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
  }'::jsonb,
  
  -- Compliance settings
  compliance_settings JSONB DEFAULT '{
    "consent_required": true,
    "opt_out_enabled": true,
    "message_frequency_limit": 10,
    "frequency_period": "daily",
    "sender_id_required": true
  }'::jsonb,
  
  -- Usage limits
  usage_limits JSONB DEFAULT '{
    "daily_limit": 1000,
    "monthly_limit": 10000,
    "rate_limit_per_minute": 100
  }'::jsonb,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for SMS settings
CREATE INDEX idx_sms_settings_organization ON sms_settings(organization_id);

-- Enable RLS for SMS settings
ALTER TABLE sms_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for SMS settings
CREATE POLICY "Users can view their organization's SMS settings" ON sms_settings
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Admins can manage their organization's SMS settings" ON sms_settings
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true AND role IN ('owner', 'admin')
    )
  );

-- SMS usage tracking (extends existing sms_logs)
CREATE TABLE IF NOT EXISTS sms_usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  phone_number_id UUID REFERENCES phone_numbers(id) ON DELETE CASCADE,
  
  -- Usage metrics
  date DATE NOT NULL,
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  messages_delivered INTEGER DEFAULT 0,
  messages_failed INTEGER DEFAULT 0,
  
  -- Cost tracking
  cost_pence INTEGER DEFAULT 0,
  
  -- Peak usage tracking
  peak_hour INTEGER, -- 0-23
  peak_hour_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_org_phone_date UNIQUE (organization_id, phone_number_id, date)
);

-- Create indexes for SMS usage stats
CREATE INDEX idx_sms_usage_stats_organization ON sms_usage_stats(organization_id);
CREATE INDEX idx_sms_usage_stats_date ON sms_usage_stats(date);
CREATE INDEX idx_sms_usage_stats_phone_number ON sms_usage_stats(phone_number_id);

-- Enable RLS for SMS usage stats
ALTER TABLE sms_usage_stats ENABLE ROW LEVEL SECURITY;

-- RLS policies for SMS usage stats
CREATE POLICY "Users can view their organization's SMS usage stats" ON sms_usage_stats
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "System can insert SMS usage stats" ON sms_usage_stats
  FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Will be restricted by API

-- Document storage references
CREATE TABLE IF NOT EXISTS regulatory_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regulatory_bundle_id UUID NOT NULL REFERENCES regulatory_bundles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Document metadata
  document_type VARCHAR NOT NULL CHECK (document_type IN ('business_registration', 'proof_of_address', 'vat_certificate', 'identity_document', 'other')),
  file_name VARCHAR NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR NOT NULL,
  
  -- Storage reference
  storage_path VARCHAR NOT NULL, -- Supabase storage path
  
  -- OCR and processing
  ocr_text TEXT,
  extraction_data JSONB DEFAULT '{}'::jsonb,
  processing_status VARCHAR DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  
  -- Validation
  is_valid BOOLEAN DEFAULT NULL,
  validation_errors JSONB DEFAULT '[]'::jsonb,
  
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for regulatory documents
CREATE INDEX idx_regulatory_documents_bundle ON regulatory_documents(regulatory_bundle_id);
CREATE INDEX idx_regulatory_documents_organization ON regulatory_documents(organization_id);
CREATE INDEX idx_regulatory_documents_type ON regulatory_documents(document_type);

-- Enable RLS for regulatory documents
ALTER TABLE regulatory_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for regulatory documents
CREATE POLICY "Users can view their organization's regulatory documents" ON regulatory_documents
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can manage their organization's regulatory documents" ON regulatory_documents
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true AND role IN ('owner', 'admin')
    )
  );

-- Functions for common operations

-- Function to get organization's current phone number status
CREATE OR REPLACE FUNCTION get_org_phone_status(org_id UUID)
RETURNS TABLE (
  has_phone BOOLEAN,
  phone_count INTEGER,
  primary_number VARCHAR,
  bundle_status VARCHAR,
  setup_stage VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(pn.id) > 0 as has_phone,
    COUNT(pn.id)::INTEGER as phone_count,
    (SELECT phone_number FROM phone_numbers WHERE organization_id = org_id AND is_primary = true LIMIT 1) as primary_number,
    COALESCE(rb.bundle_status, 'not_started') as bundle_status,
    CASE 
      WHEN COUNT(pn.id) > 0 AND pn_active.status = 'active' THEN 'completed'
      WHEN rb.bundle_status = 'twilio-approved' THEN 'provisioning'
      WHEN rb.bundle_status IN ('pending-review', 'in-review') THEN 'under_review'
      WHEN rb.bundle_status = 'draft' OR rb.id IS NOT NULL THEN 'in_progress'
      ELSE 'not_started'
    END as setup_stage
  FROM phone_numbers pn
  FULL OUTER JOIN regulatory_bundles rb ON rb.organization_id = org_id
  LEFT JOIN phone_numbers pn_active ON pn_active.organization_id = org_id AND pn_active.status = 'active'
  WHERE pn.organization_id = org_id OR pn.id IS NULL
  GROUP BY rb.bundle_status, rb.id, pn_active.status;
END;
$$ LANGUAGE plpgsql;

-- Function to update usage statistics
CREATE OR REPLACE FUNCTION update_sms_usage_stats(
  org_id UUID,
  phone_id UUID,
  stat_date DATE,
  sent_count INTEGER DEFAULT 0,
  received_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  cost_pence_amount INTEGER DEFAULT 0
) RETURNS VOID AS $$
BEGIN
  INSERT INTO sms_usage_stats (
    organization_id, 
    phone_number_id, 
    date, 
    messages_sent, 
    messages_received, 
    messages_delivered, 
    messages_failed, 
    cost_pence
  )
  VALUES (
    org_id, 
    phone_id, 
    stat_date, 
    sent_count, 
    received_count, 
    delivered_count, 
    failed_count, 
    cost_pence_amount
  )
  ON CONFLICT (organization_id, phone_number_id, date)
  DO UPDATE SET
    messages_sent = sms_usage_stats.messages_sent + excluded.messages_sent,
    messages_received = sms_usage_stats.messages_received + excluded.messages_received,
    messages_delivered = sms_usage_stats.messages_delivered + excluded.messages_delivered,
    messages_failed = sms_usage_stats.messages_failed + excluded.messages_failed,
    cost_pence = sms_usage_stats.cost_pence + excluded.cost_pence,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_phone_numbers_updated_at BEFORE UPDATE ON phone_numbers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_regulatory_bundles_updated_at BEFORE UPDATE ON regulatory_bundles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sms_settings_updated_at BEFORE UPDATE ON sms_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sms_usage_stats_updated_at BEFORE UPDATE ON sms_usage_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_regulatory_documents_updated_at BEFORE UPDATE ON regulatory_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for documents (run separately in Supabase dashboard)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('regulatory-documents', 'regulatory-documents', false);

-- Create storage policy for regulatory documents
-- CREATE POLICY "Users can upload regulatory documents" ON storage.objects
--   FOR INSERT TO authenticated
--   WITH CHECK (bucket_id = 'regulatory-documents');

-- CREATE POLICY "Users can view their regulatory documents" ON storage.objects
--   FOR SELECT TO authenticated
--   USING (bucket_id = 'regulatory-documents');

-- Seed default SMS settings for existing organizations
INSERT INTO sms_settings (organization_id, provider, is_active)
SELECT id, 'twilio', false
FROM organizations
WHERE id NOT IN (SELECT organization_id FROM sms_settings)
ON CONFLICT (organization_id) DO NOTHING;