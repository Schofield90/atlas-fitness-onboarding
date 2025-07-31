-- Settings Management System Database Schema
-- Complete implementation for gym/fitness CRM platform

-- Organization Settings (Business Profile)
CREATE TABLE IF NOT EXISTS organization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Business Information
  business_name VARCHAR NOT NULL,
  business_type VARCHAR CHECK (business_type IN ('gym', 'personal_training', 'yoga_studio', 'crossfit', 'martial_arts', 'dance_studio')),
  description TEXT,
  website_url VARCHAR,
  
  -- Contact Information
  primary_email VARCHAR,
  primary_phone VARCHAR,
  address JSONB DEFAULT '{
    "street": "",
    "city": "",
    "state": "",
    "postal_code": "",
    "country": "GB"
  }'::jsonb,
  
  -- Business Hours
  business_hours JSONB DEFAULT '{
    "monday": {"open": "06:00", "close": "22:00", "closed": false},
    "tuesday": {"open": "06:00", "close": "22:00", "closed": false},
    "wednesday": {"open": "06:00", "close": "22:00", "closed": false},
    "thursday": {"open": "06:00", "close": "22:00", "closed": false},
    "friday": {"open": "06:00", "close": "22:00", "closed": false},
    "saturday": {"open": "07:00", "close": "20:00", "closed": false},
    "sunday": {"open": "08:00", "close": "18:00", "closed": false}
  }'::jsonb,
  
  -- Branding
  logo_url VARCHAR,
  brand_color VARCHAR DEFAULT '#3b82f6',
  secondary_color VARCHAR DEFAULT '#64748b',
  
  -- Timezone & Locale
  timezone VARCHAR DEFAULT 'Europe/London',
  date_format VARCHAR DEFAULT 'DD/MM/YYYY',
  currency VARCHAR DEFAULT 'GBP',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id)
);

-- Integration Settings
CREATE TABLE IF NOT EXISTS integration_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Integration Type
  provider VARCHAR NOT NULL, -- 'twilio', 'facebook', 'google', 'stripe', 'resend', 'sendgrid'
  
  -- Configuration
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  credentials JSONB DEFAULT '{}'::jsonb, -- Encrypted sensitive data
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  sync_status VARCHAR DEFAULT 'connected',
  error_message TEXT,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, provider)
);

-- Custom Fields Configuration
CREATE TABLE IF NOT EXISTS custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Field Definition
  entity_type VARCHAR NOT NULL CHECK (entity_type IN ('lead', 'client', 'booking')),
  field_name VARCHAR NOT NULL,
  field_label VARCHAR NOT NULL,
  field_type VARCHAR NOT NULL CHECK (field_type IN ('text', 'number', 'email', 'phone', 'date', 'select', 'multiselect', 'boolean', 'textarea')),
  
  -- Field Options (for select/multiselect)
  options JSONB DEFAULT '[]'::jsonb,
  
  -- Validation Rules
  is_required BOOLEAN DEFAULT FALSE,
  validation_rules JSONB DEFAULT '{}'::jsonb,
  
  -- Display
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, entity_type, field_name)
);

-- Email Templates
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Template Info
  name VARCHAR NOT NULL,
  subject VARCHAR NOT NULL,
  template_type VARCHAR NOT NULL CHECK (template_type IN ('welcome', 'follow_up', 'reminder', 'confirmation', 'marketing', 'custom')),
  
  -- Content
  html_content TEXT,
  text_content TEXT,
  
  -- Variables
  available_variables JSONB DEFAULT '[]'::jsonb,
  
  -- Settings
  is_active BOOLEAN DEFAULT TRUE,
  is_system BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification Settings
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Notification Types
  email_notifications JSONB DEFAULT '{
    "new_lead": true,
    "booking_confirmation": true,
    "payment_received": true,
    "system_alerts": true
  }'::jsonb,
  
  sms_notifications JSONB DEFAULT '{
    "urgent_alerts": true,
    "booking_reminders": false
  }'::jsonb,
  
  push_notifications JSONB DEFAULT '{
    "new_messages": true,
    "task_assignments": true
  }'::jsonb,
  
  -- Preferences
  quiet_hours JSONB DEFAULT '{
    "enabled": false,
    "start": "22:00",
    "end": "08:00"
  }'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, user_id)
);

-- Tags System
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Tag Info
  name VARCHAR NOT NULL,
  color VARCHAR DEFAULT '#3b82f6',
  entity_type VARCHAR CHECK (entity_type IN ('lead', 'client', 'general')),
  
  -- Usage Stats
  usage_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, name, entity_type)
);

-- Audit Logs for Settings Changes
CREATE TABLE IF NOT EXISTS settings_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Change Info
  action VARCHAR NOT NULL, -- 'create', 'update', 'delete'
  entity_type VARCHAR NOT NULL, -- 'organization_settings', 'integration_settings', etc.
  entity_id UUID,
  
  -- Change Details
  old_values JSONB,
  new_values JSONB,
  
  -- Metadata
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_organization_settings_org ON organization_settings(organization_id);
CREATE INDEX idx_integration_settings_org ON integration_settings(organization_id);
CREATE INDEX idx_integration_settings_provider ON integration_settings(provider);
CREATE INDEX idx_custom_fields_org_entity ON custom_fields(organization_id, entity_type);
CREATE INDEX idx_email_templates_org ON email_templates(organization_id);
CREATE INDEX idx_notification_settings_org_user ON notification_settings(organization_id, user_id);
CREATE INDEX idx_tags_org ON tags(organization_id);
CREATE INDEX idx_settings_audit_logs_org ON settings_audit_logs(organization_id);
CREATE INDEX idx_settings_audit_logs_created ON settings_audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Organization Settings
CREATE POLICY "Users can view their organization settings" ON organization_settings
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Admins can manage organization settings" ON organization_settings
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin') 
      AND is_active = true
    )
  );

-- Integration Settings
CREATE POLICY "Users can view integration settings" ON integration_settings
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Admins can manage integration settings" ON integration_settings
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin') 
      AND is_active = true
    )
  );

-- Custom Fields
CREATE POLICY "Users can view custom fields" ON custom_fields
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Admins can manage custom fields" ON custom_fields
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin') 
      AND is_active = true
    )
  );

-- Email Templates
CREATE POLICY "Users can view email templates" ON email_templates
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Admins can manage email templates" ON email_templates
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin') 
      AND is_active = true
    )
  );

-- Notification Settings (personal)
CREATE POLICY "Users can view their notification settings" ON notification_settings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage their notification settings" ON notification_settings
  FOR ALL USING (user_id = auth.uid());

-- Tags
CREATE POLICY "Users can view tags" ON tags
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can manage tags" ON tags
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Audit Logs (read-only for users)
CREATE POLICY "Admins can view audit logs" ON settings_audit_logs
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin') 
      AND is_active = true
    )
  );

-- Helper functions
CREATE OR REPLACE FUNCTION log_settings_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO settings_audit_logs (
    organization_id,
    user_id,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values
  ) VALUES (
    COALESCE(NEW.organization_id, OLD.organization_id),
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for audit logging
CREATE TRIGGER audit_organization_settings
  AFTER INSERT OR UPDATE OR DELETE ON organization_settings
  FOR EACH ROW EXECUTE FUNCTION log_settings_change();

CREATE TRIGGER audit_integration_settings
  AFTER INSERT OR UPDATE OR DELETE ON integration_settings
  FOR EACH ROW EXECUTE FUNCTION log_settings_change();

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organization_settings_updated_at
  BEFORE UPDATE ON organization_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_integration_settings_updated_at
  BEFORE UPDATE ON integration_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_custom_fields_updated_at
  BEFORE UPDATE ON custom_fields
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON notification_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();