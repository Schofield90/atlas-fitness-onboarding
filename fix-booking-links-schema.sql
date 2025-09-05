-- Quick fix for missing assigned_staff_ids column in booking_links table
-- This is a minimal version of the enhanced booking links migration

-- Enable required extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add the missing assigned_staff_ids column if it doesn't exist
DO $$
BEGIN
  -- Staff assignment column (this is the main one causing the error)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_links' AND column_name = 'assigned_staff_ids') THEN
    ALTER TABLE booking_links ADD COLUMN assigned_staff_ids UUID[];
    RAISE NOTICE 'Added assigned_staff_ids column to booking_links table';
  ELSE
    RAISE NOTICE 'assigned_staff_ids column already exists in booking_links table';
  END IF;
  
  -- Add other commonly needed columns that might be missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_links' AND column_name = 'meeting_title_template') THEN
    ALTER TABLE booking_links ADD COLUMN meeting_title_template TEXT DEFAULT '{{contact.name}} - {{service}}';
    RAISE NOTICE 'Added meeting_title_template column to booking_links table';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_links' AND column_name = 'meeting_location') THEN
    ALTER TABLE booking_links ADD COLUMN meeting_location JSONB DEFAULT '{"type": "in_person", "details": ""}';
    RAISE NOTICE 'Added meeting_location column to booking_links table';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_links' AND column_name = 'availability_rules') THEN
    ALTER TABLE booking_links ADD COLUMN availability_rules JSONB DEFAULT '{}';
    RAISE NOTICE 'Added availability_rules column to booking_links table';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_links' AND column_name = 'form_configuration') THEN
    ALTER TABLE booking_links ADD COLUMN form_configuration JSONB DEFAULT '{"fields": [], "consent_text": "I agree to receive communications about my booking."}';
    RAISE NOTICE 'Added form_configuration column to booking_links table';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_links' AND column_name = 'confirmation_settings') THEN
    ALTER TABLE booking_links ADD COLUMN confirmation_settings JSONB DEFAULT '{"auto_confirm": true, "redirect_url": "", "custom_message": ""}';
    RAISE NOTICE 'Added confirmation_settings column to booking_links table';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_links' AND column_name = 'notification_settings') THEN
    ALTER TABLE booking_links ADD COLUMN notification_settings JSONB DEFAULT '{"email_enabled": true, "sms_enabled": false, "reminder_schedules": ["1 day", "1 hour"]}';
    RAISE NOTICE 'Added notification_settings column to booking_links table';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_links' AND column_name = 'style_settings') THEN
    ALTER TABLE booking_links ADD COLUMN style_settings JSONB DEFAULT '{"primary_color": "#3b82f6", "background_color": "#ffffff", "custom_css": ""}';
    RAISE NOTICE 'Added style_settings column to booking_links table';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_links' AND column_name = 'payment_settings') THEN
    ALTER TABLE booking_links ADD COLUMN payment_settings JSONB DEFAULT '{"enabled": false, "amount": 0, "currency": "GBP", "description": ""}';
    RAISE NOTICE 'Added payment_settings column to booking_links table';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_links' AND column_name = 'cancellation_policy') THEN
    ALTER TABLE booking_links ADD COLUMN cancellation_policy JSONB DEFAULT '{"allowed": true, "hours_before": 24, "policy_text": "Cancellations allowed up to 24 hours before appointment."}';
    RAISE NOTICE 'Added cancellation_policy column to booking_links table';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_links' AND column_name = 'booking_limits') THEN
    ALTER TABLE booking_links ADD COLUMN booking_limits JSONB DEFAULT '{"max_per_day": null, "max_per_week": null, "max_per_month": null}';
    RAISE NOTICE 'Added booking_limits column to booking_links table';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_links' AND column_name = 'buffer_settings') THEN
    ALTER TABLE booking_links ADD COLUMN buffer_settings JSONB DEFAULT '{"before_minutes": 0, "after_minutes": 15}';
    RAISE NOTICE 'Added buffer_settings column to booking_links table';
  END IF;
END $$;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'booking_links' 
  AND column_name IN (
    'assigned_staff_ids', 
    'meeting_title_template', 
    'meeting_location', 
    'availability_rules',
    'form_configuration',
    'confirmation_settings',
    'notification_settings',
    'style_settings',
    'payment_settings',
    'cancellation_policy',
    'booking_limits',
    'buffer_settings'
  )
ORDER BY column_name;