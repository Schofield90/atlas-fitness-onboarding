-- =============================================
-- COMBINED MIGRATIONS FOR ATLAS FITNESS
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Email Templates Table (Fixed)
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  type VARCHAR(100) DEFAULT 'custom',
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on email_templates
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_templates
CREATE POLICY "Users can view email templates from their organization" ON email_templates
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can create email templates for their organization" ON email_templates
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can update email templates in their organization" ON email_templates
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can delete email templates in their organization" ON email_templates
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- 2. Staff Management Schema (Fixed with reserved keyword issue)
-- Run the migration file: 20250808_staff_management_schema.sql
-- This is too large to include here but has been fixed

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_templates_organization_id ON email_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_type ON email_templates(type);
CREATE INDEX IF NOT EXISTS idx_email_templates_is_active ON email_templates(is_active);

-- 4. Create trigger for updated_at on email_templates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_templates_updated_at 
  BEFORE UPDATE ON email_templates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Insert default email templates
INSERT INTO email_templates (organization_id, name, subject, body, type, variables) VALUES
  ('63589490-8f55-4157-bd3a-e141594b748e', 'Welcome Email', 'Welcome to Atlas Fitness!', 
   'Hi {{firstName}},\n\nWelcome to Atlas Fitness! We''re excited to have you as part of our community.\n\nBest regards,\nThe Atlas Fitness Team', 
   'welcome', '["firstName"]'::jsonb),
  ('63589490-8f55-4157-bd3a-e141594b748e', 'Booking Confirmation', 'Your class is booked!', 
   'Hi {{firstName}},\n\nYour booking for {{className}} on {{date}} at {{time}} has been confirmed.\n\nSee you there!\nAtlas Fitness', 
   'booking', '["firstName", "className", "date", "time"]'::jsonb),
  ('63589490-8f55-4157-bd3a-e141594b748e', 'Payment Reminder', 'Payment Reminder', 
   'Hi {{firstName}},\n\nThis is a friendly reminder that your payment of {{amount}} is due on {{dueDate}}.\n\nBest regards,\nAtlas Fitness', 
   'payment', '["firstName", "amount", "dueDate"]'::jsonb)
ON CONFLICT DO NOTHING;

-- 6. Check if staff management tables exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'staff_profiles') THEN
    RAISE NOTICE 'Staff management tables not created yet. Please run 20250808_staff_management_schema.sql separately.';
  END IF;
END $$;

-- 7. Grant necessary permissions
GRANT ALL ON email_templates TO authenticated;
GRANT ALL ON email_templates TO service_role;

-- 8. Add chatbot_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS chatbot_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT false,
  response_tone VARCHAR(20) DEFAULT 'professional' CHECK (response_tone IN ('professional', 'friendly', 'casual')),
  auto_respond BOOLEAN DEFAULT true,
  business_hours_only BOOLEAN DEFAULT true,
  response_delay INTEGER DEFAULT 3,
  fallback_to_human BOOLEAN DEFAULT true,
  welcome_message TEXT,
  offline_message TEXT,
  ai_features JSONB DEFAULT '{}'::jsonb,
  business_hours JSONB DEFAULT '{"monday": {"start": "09:00", "end": "17:00"}, "tuesday": {"start": "09:00", "end": "17:00"}, "wednesday": {"start": "09:00", "end": "17:00"}, "thursday": {"start": "09:00", "end": "17:00"}, "friday": {"start": "09:00", "end": "17:00"}, "saturday": {"start": "10:00", "end": "14:00"}, "sunday": {"start": "closed", "end": "closed"}}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id)
);

-- Enable RLS on chatbot_settings
ALTER TABLE chatbot_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for chatbot_settings
CREATE POLICY "Users can view chatbot settings from their organization" ON chatbot_settings
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can update chatbot settings in their organization" ON chatbot_settings
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Create trigger for updated_at on chatbot_settings
CREATE TRIGGER update_chatbot_settings_updated_at 
  BEFORE UPDATE ON chatbot_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Insert default chatbot settings
INSERT INTO chatbot_settings (organization_id, enabled, response_tone, auto_respond) 
VALUES ('63589490-8f55-4157-bd3a-e141594b748e', true, 'friendly', true)
ON CONFLICT (organization_id) DO NOTHING;

-- Grant permissions for chatbot_settings
GRANT ALL ON chatbot_settings TO authenticated;
GRANT ALL ON chatbot_settings TO service_role;

-- Final message
DO $$ 
BEGIN
  RAISE NOTICE 'Combined migrations completed successfully!';
  RAISE NOTICE 'Remember to run 20250808_staff_management_schema.sql separately for the full staff management system.';
END $$;