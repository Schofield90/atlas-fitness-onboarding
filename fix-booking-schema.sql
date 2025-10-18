-- Fix booking_links schema - add all missing columns from enhanced booking system

-- Add max_days_in_advance
ALTER TABLE booking_links
ADD COLUMN IF NOT EXISTS max_days_in_advance INTEGER DEFAULT 30;

-- Add meeting_title_template
ALTER TABLE booking_links
ADD COLUMN IF NOT EXISTS meeting_title_template TEXT DEFAULT '{{contact.name}} - {{service}}';

-- Add assigned_staff_ids
ALTER TABLE booking_links
ADD COLUMN IF NOT EXISTS assigned_staff_ids UUID[];

-- Add meeting_location
ALTER TABLE booking_links
ADD COLUMN IF NOT EXISTS meeting_location JSONB DEFAULT '{"type": "in_person", "details": ""}';

-- Add availability_rules
ALTER TABLE booking_links
ADD COLUMN IF NOT EXISTS availability_rules JSONB DEFAULT '{}';

-- Add form_configuration
ALTER TABLE booking_links
ADD COLUMN IF NOT EXISTS form_configuration JSONB DEFAULT '{"fields": [], "consent_text": "I agree to receive communications about my booking."}';

-- Add confirmation_settings
ALTER TABLE booking_links
ADD COLUMN IF NOT EXISTS confirmation_settings JSONB DEFAULT '{"auto_confirm": true, "redirect_url": "", "custom_message": ""}';

-- Add notification_settings
ALTER TABLE booking_links
ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{"email_enabled": true, "sms_enabled": false, "reminder_schedules": ["1 day", "1 hour"]}';

-- Add style_settings
ALTER TABLE booking_links
ADD COLUMN IF NOT EXISTS style_settings JSONB DEFAULT '{"primary_color": "#3b82f6", "background_color": "#ffffff", "custom_css": ""}';

-- Add payment_settings
ALTER TABLE booking_links
ADD COLUMN IF NOT EXISTS payment_settings JSONB DEFAULT '{"enabled": false, "amount": 0, "currency": "GBP", "description": ""}';

-- Add cancellation_policy
ALTER TABLE booking_links
ADD COLUMN IF NOT EXISTS cancellation_policy JSONB DEFAULT '{"allowed": true, "hours_before": 24, "policy_text": "Cancellations allowed up to 24 hours before appointment."}';

-- Add booking_limits
ALTER TABLE booking_links
ADD COLUMN IF NOT EXISTS booking_limits JSONB DEFAULT '{"max_per_day": null, "max_per_week": null, "max_per_month": null}';

-- Add buffer_settings
ALTER TABLE booking_links
ADD COLUMN IF NOT EXISTS buffer_settings JSONB DEFAULT '{"before_minutes": 0, "after_minutes": 15}';

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
