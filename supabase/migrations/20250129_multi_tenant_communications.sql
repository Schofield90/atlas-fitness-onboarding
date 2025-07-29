-- Organization Communication Settings
CREATE TABLE IF NOT EXISTS organization_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Communication preferences
  default_greeting TEXT DEFAULT 'Thank you for calling',
  voicemail_enabled BOOLEAN DEFAULT false,
  voicemail_message TEXT,
  business_hours JSONB DEFAULT '{"monday": {"open": "09:00", "close": "17:00"}, "tuesday": {"open": "09:00", "close": "17:00"}, "wednesday": {"open": "09:00", "close": "17:00"}, "thursday": {"open": "09:00", "close": "17:00"}, "friday": {"open": "09:00", "close": "17:00"}, "saturday": {"open": "10:00", "close": "14:00"}, "sunday": {"closed": true}}',
  
  -- Call routing settings
  call_routing_type TEXT DEFAULT 'single' CHECK (call_routing_type IN ('single', 'round-robin', 'simultaneous', 'schedule-based')),
  call_timeout INTEGER DEFAULT 30, -- seconds before moving to next staff or voicemail
  record_calls BOOLEAN DEFAULT true,
  
  -- SMS/WhatsApp settings
  auto_response_enabled BOOLEAN DEFAULT true,
  auto_response_delay INTEGER DEFAULT 0, -- seconds to wait before auto-response
  sms_signature TEXT DEFAULT '',
  whatsapp_business_hours_only BOOLEAN DEFAULT false,
  
  -- Email settings
  email_from_name TEXT,
  email_signature TEXT,
  email_reply_to TEXT,
  
  -- AI settings
  ai_enabled BOOLEAN DEFAULT true,
  ai_personality TEXT DEFAULT 'professional', -- professional, friendly, casual
  ai_response_style TEXT DEFAULT 'concise', -- concise, detailed, conversational
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(organization_id)
);

-- Organization Staff Members (for routing calls/messages)
CREATE TABLE IF NOT EXISTS organization_staff (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Contact info
  phone_number TEXT NOT NULL,
  email TEXT NOT NULL,
  
  -- Availability
  is_available BOOLEAN DEFAULT true,
  available_hours JSONB, -- Override organization hours if needed
  
  -- Routing preferences
  receives_calls BOOLEAN DEFAULT true,
  receives_sms BOOLEAN DEFAULT true,
  receives_whatsapp BOOLEAN DEFAULT true,
  receives_emails BOOLEAN DEFAULT true,
  
  -- Priority for routing (lower number = higher priority)
  routing_priority INTEGER DEFAULT 100,
  
  -- Role
  role TEXT DEFAULT 'staff' CHECK (role IN ('owner', 'manager', 'staff', 'admin')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(organization_id, user_id)
);

-- Create indexes
CREATE INDEX idx_org_settings_org_id ON organization_settings(organization_id);
CREATE INDEX idx_org_staff_org_id ON organization_staff(organization_id);
CREATE INDEX idx_org_staff_available ON organization_staff(organization_id, is_available);

-- Add RLS policies
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_staff ENABLE ROW LEVEL SECURITY;

-- Organization settings policies
CREATE POLICY "Users can view their organization settings"
  ON organization_settings FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Organization admins can update settings"
  ON organization_settings FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'owner')
  ));

CREATE POLICY "Organization admins can insert settings"
  ON organization_settings FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'owner')
  ));

-- Staff policies
CREATE POLICY "Users can view their organization staff"
  ON organization_staff FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Organization admins can manage staff"
  ON organization_staff FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'owner')
  ));

-- Function to get available staff for call routing
CREATE OR REPLACE FUNCTION get_available_staff_for_call(org_id UUID)
RETURNS TABLE (
  staff_id UUID,
  phone_number TEXT,
  priority INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    os.id,
    os.phone_number,
    os.routing_priority
  FROM organization_staff os
  WHERE 
    os.organization_id = org_id
    AND os.is_available = true
    AND os.receives_calls = true
  ORDER BY os.routing_priority ASC;
END;
$$ LANGUAGE plpgsql;

-- Update organizations table to track communication features
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS communication_features JSONB DEFAULT '{
  "sms": true,
  "whatsapp": false,
  "voice": true,
  "email": true
}';

-- Trigger to create default settings when organization is created
CREATE OR REPLACE FUNCTION create_default_org_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO organization_settings (organization_id)
  VALUES (NEW.id)
  ON CONFLICT (organization_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_org_settings_trigger
AFTER INSERT ON organizations
FOR EACH ROW
EXECUTE FUNCTION create_default_org_settings();