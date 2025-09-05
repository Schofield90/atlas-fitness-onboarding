-- Add missing columns to booking_links table
ALTER TABLE booking_links 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'individual' CHECK (type IN ('individual', 'group', 'class')),
ADD COLUMN IF NOT EXISTS appointment_type_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS requires_auth BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS max_days_in_advance INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/London',
ADD COLUMN IF NOT EXISTS meeting_title_template TEXT DEFAULT '{{contact.name}} - {{service}}',
ADD COLUMN IF NOT EXISTS assigned_staff_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS meeting_location JSONB DEFAULT '{"type": "in_person", "details": ""}'::jsonb,
ADD COLUMN IF NOT EXISTS availability_rules JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS form_configuration JSONB DEFAULT '{"fields": [], "consent_text": "I agree to receive communications about my booking."}'::jsonb,
ADD COLUMN IF NOT EXISTS confirmation_settings JSONB DEFAULT '{"auto_confirm": true, "redirect_url": "", "custom_message": ""}'::jsonb,
ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{"email_enabled": true, "sms_enabled": false, "reminder_schedules": ["1 day", "1 hour"], "cancellation_notifications": true}'::jsonb,
ADD COLUMN IF NOT EXISTS style_settings JSONB DEFAULT '{"primary_color": "#3b82f6", "background_color": "#ffffff", "text_color": "#1f2937"}'::jsonb,
ADD COLUMN IF NOT EXISTS payment_settings JSONB DEFAULT '{"enabled": false, "amount": 0, "currency": "GBP", "description": ""}'::jsonb,
ADD COLUMN IF NOT EXISTS cancellation_policy JSONB DEFAULT '{"allowed": true, "hours_before": 24, "policy_text": "Cancellations allowed up to 24 hours before appointment."}'::jsonb,
ADD COLUMN IF NOT EXISTS booking_limits JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS buffer_settings JSONB DEFAULT '{"before_minutes": 0, "after_minutes": 15}'::jsonb;

-- Rename columns for consistency
ALTER TABLE booking_links 
RENAME COLUMN title TO name;

-- Add view_count for tracking
ALTER TABLE booking_links
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Create appointment_types table if it doesn't exist
CREATE TABLE IF NOT EXISTS appointment_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  description TEXT,
  session_type TEXT DEFAULT 'individual' CHECK (session_type IN ('individual', 'group', 'class')),
  max_capacity INTEGER DEFAULT 1,
  fitness_level TEXT,
  price_pennies INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_appointment_types_organization_id ON appointment_types(organization_id);

-- Enable RLS for appointment_types
ALTER TABLE appointment_types ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for appointment_types
CREATE POLICY "Users can view appointment types from their organization" ON appointment_types
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "Users can create appointment types for their organization" ON appointment_types
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'staff')
      AND is_active = true
    )
  );

CREATE POLICY "Users can update appointment types in their organization" ON appointment_types
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'staff')
      AND is_active = true
    )
  );

CREATE POLICY "Users can delete appointment types in their organization" ON appointment_types
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND is_active = true
    )
  );