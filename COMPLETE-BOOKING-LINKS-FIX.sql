-- Complete booking_links schema fix
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql/new

-- First, let's make sure the base table exists with all basic columns
CREATE TABLE IF NOT EXISTS booking_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  team_ids UUID[],
  slug VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(20) DEFAULT 'individual' CHECK (type IN ('individual', 'team', 'round_robin', 'collective')),
  appointment_type_ids UUID[] NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true,
  requires_auth BOOLEAN DEFAULT false,
  max_days_in_advance INTEGER DEFAULT 30,
  timezone VARCHAR(100) DEFAULT 'Europe/London',
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Now add the enhanced columns one by one
DO $$
BEGIN
  -- meeting_title_template
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'booking_links' AND column_name = 'meeting_title_template') THEN
    ALTER TABLE booking_links ADD COLUMN meeting_title_template TEXT DEFAULT '{{contact.name}} - {{service}}';
  END IF;

  -- assigned_staff_ids
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'booking_links' AND column_name = 'assigned_staff_ids') THEN
    ALTER TABLE booking_links ADD COLUMN assigned_staff_ids UUID[];
  END IF;

  -- meeting_location
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'booking_links' AND column_name = 'meeting_location') THEN
    ALTER TABLE booking_links ADD COLUMN meeting_location JSONB DEFAULT '{"type": "in_person", "details": ""}';
  END IF;

  -- availability_rules
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'booking_links' AND column_name = 'availability_rules') THEN
    ALTER TABLE booking_links ADD COLUMN availability_rules JSONB DEFAULT '{}';
  END IF;

  -- form_configuration
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'booking_links' AND column_name = 'form_configuration') THEN
    ALTER TABLE booking_links ADD COLUMN form_configuration JSONB DEFAULT '{"fields": [], "consent_text": "I agree to receive communications about my booking."}';
  END IF;

  -- confirmation_settings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'booking_links' AND column_name = 'confirmation_settings') THEN
    ALTER TABLE booking_links ADD COLUMN confirmation_settings JSONB DEFAULT '{"auto_confirm": true, "redirect_url": "", "custom_message": ""}';
  END IF;

  -- notification_settings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'booking_links' AND column_name = 'notification_settings') THEN
    ALTER TABLE booking_links ADD COLUMN notification_settings JSONB DEFAULT '{"email_enabled": true, "sms_enabled": false, "reminder_schedules": ["1 day", "1 hour"]}';
  END IF;

  -- style_settings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'booking_links' AND column_name = 'style_settings') THEN
    ALTER TABLE booking_links ADD COLUMN style_settings JSONB DEFAULT '{"primary_color": "#3b82f6", "background_color": "#ffffff", "custom_css": ""}';
  END IF;

  -- payment_settings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'booking_links' AND column_name = 'payment_settings') THEN
    ALTER TABLE booking_links ADD COLUMN payment_settings JSONB DEFAULT '{"enabled": false, "amount": 0, "currency": "GBP", "description": ""}';
  END IF;

  -- cancellation_policy
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'booking_links' AND column_name = 'cancellation_policy') THEN
    ALTER TABLE booking_links ADD COLUMN cancellation_policy JSONB DEFAULT '{"allowed": true, "hours_before": 24, "policy_text": "Cancellations allowed up to 24 hours before appointment."}';
  END IF;

  -- booking_limits
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'booking_links' AND column_name = 'booking_limits') THEN
    ALTER TABLE booking_links ADD COLUMN booking_limits JSONB DEFAULT '{"max_per_day": null, "max_per_week": null, "max_per_month": null}';
  END IF;

  -- buffer_settings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'booking_links' AND column_name = 'buffer_settings') THEN
    ALTER TABLE booking_links ADD COLUMN buffer_settings JSONB DEFAULT '{"before_minutes": 0, "after_minutes": 15}';
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN booking_links.max_days_in_advance IS 'Maximum number of days in advance that bookings can be made';
COMMENT ON COLUMN booking_links.meeting_title_template IS 'Template for meeting titles with variables like {{contact.name}}';
COMMENT ON COLUMN booking_links.assigned_staff_ids IS 'Array of staff member IDs who can take bookings through this link';
COMMENT ON COLUMN booking_links.meeting_location IS 'JSON object defining meeting location (type, details, zoom link, etc.)';
COMMENT ON COLUMN booking_links.availability_rules IS 'JSON object defining availability rules and constraints';
COMMENT ON COLUMN booking_links.form_configuration IS 'JSON object defining custom form fields and validation';
COMMENT ON COLUMN booking_links.confirmation_settings IS 'JSON object for booking confirmation behavior';
COMMENT ON COLUMN booking_links.notification_settings IS 'JSON object for email/SMS notification configuration';
COMMENT ON COLUMN booking_links.style_settings IS 'JSON object for booking page visual customization';
COMMENT ON COLUMN booking_links.payment_settings IS 'JSON object for optional payment collection';
COMMENT ON COLUMN booking_links.cancellation_policy IS 'JSON object defining cancellation rules and policy';
COMMENT ON COLUMN booking_links.booking_limits IS 'JSON object defining booking limits per time period';
COMMENT ON COLUMN booking_links.buffer_settings IS 'JSON object defining buffer time before/after bookings';

-- Verify columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'booking_links'
ORDER BY ordinal_position;
