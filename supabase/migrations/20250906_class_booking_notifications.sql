-- =============================================
-- CLASS BOOKING NOTIFICATION SYSTEM
-- Migration: 20250906_class_booking_notifications
-- Sets up automated notifications for class booking events
-- =============================================

-- Create notification templates table
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  template_type VARCHAR(50) NOT NULL CHECK (template_type IN (
    'booking_confirmation',
    'booking_reminder_24h',
    'booking_reminder_2h',
    'booking_cancelled',
    'class_cancelled',
    'waitlist_spot_available',
    'waitlist_confirmed',
    'recurring_booking_created',
    'payment_required',
    'check_in_reminder'
  )),
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'sms', 'push', 'in_app')),
  is_active BOOLEAN DEFAULT true,
  
  -- Template content
  subject_template TEXT, -- For email/push notifications
  body_template TEXT NOT NULL,
  
  -- Sending rules
  send_delay_minutes INTEGER DEFAULT 0, -- Delay before sending (can be negative for "X minutes before event")
  max_send_attempts INTEGER DEFAULT 3,
  
  -- Personalization variables available:
  -- {customer_name}, {class_name}, {class_date}, {class_time}, 
  -- {instructor_name}, {location}, {booking_reference}, {cancellation_link}, etc.
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, template_type, channel)
);

-- Create notification queue table (extends existing notifications table)
DO $$
BEGIN
  -- Add new columns to existing notifications table if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'template_id') THEN
    ALTER TABLE notifications ADD COLUMN template_id UUID REFERENCES notification_templates(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'scheduled_send_at') THEN
    ALTER TABLE notifications ADD COLUMN scheduled_send_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'variables') THEN
    ALTER TABLE notifications ADD COLUMN variables JSONB DEFAULT '{}'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'schedule_id') THEN
    ALTER TABLE notifications ADD COLUMN schedule_id UUID REFERENCES class_schedules(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'waitlist_id') THEN
    ALTER TABLE notifications ADD COLUMN waitlist_id UUID REFERENCES class_waitlist(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add indexes for the new notification columns
CREATE INDEX IF NOT EXISTS idx_notifications_template ON notifications(template_id) WHERE template_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_send ON notifications(scheduled_send_at, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notifications_schedule ON notifications(schedule_id) WHERE schedule_id IS NOT NULL;

-- Enable RLS on notification templates
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- Notification templates policies
CREATE POLICY "Users can view org notification templates" ON notification_templates
  FOR SELECT USING (
    organization_id IN (
      SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage notification templates" ON notification_templates
  FOR ALL USING (
    organization_id IN (
      SELECT om.org_id FROM organization_members om 
      WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin')
    )
  );

-- =============================================
-- NOTIFICATION TRIGGER FUNCTIONS
-- =============================================

-- Function to create notification from template
CREATE OR REPLACE FUNCTION create_notification_from_template(
  p_organization_id UUID,
  p_template_type VARCHAR(50),
  p_channel VARCHAR(20),
  p_recipient_email VARCHAR(255),
  p_recipient_phone VARCHAR(50),
  p_recipient_name VARCHAR(255),
  p_variables JSONB,
  p_booking_id UUID DEFAULT NULL,
  p_schedule_id UUID DEFAULT NULL,
  p_waitlist_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  template_record RECORD;
  notification_id UUID;
  processed_subject TEXT;
  processed_body TEXT;
  send_at_time TIMESTAMPTZ;
  var_key TEXT;
  var_value TEXT;
BEGIN
  -- Get the template
  SELECT * INTO template_record
  FROM notification_templates 
  WHERE organization_id = p_organization_id 
    AND template_type = p_template_type 
    AND channel = p_channel 
    AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL; -- No template found
  END IF;

  -- Process template variables
  processed_subject := template_record.subject_template;
  processed_body := template_record.body_template;

  -- Replace variables in templates
  FOR var_key, var_value IN SELECT * FROM jsonb_each_text(p_variables) LOOP
    processed_subject := REPLACE(processed_subject, '{' || var_key || '}', var_value);
    processed_body := REPLACE(processed_body, '{' || var_key || '}', var_value);
  END LOOP;

  -- Calculate send time
  send_at_time := NOW() + (template_record.send_delay_minutes || ' minutes')::INTERVAL;

  -- Create notification
  INSERT INTO notifications (
    organization_id,
    template_id,
    booking_id,
    schedule_id,
    waitlist_id,
    type,
    template,
    recipient_email,
    recipient_phone,
    recipient_name,
    subject,
    body,
    status,
    send_at,
    scheduled_send_at,
    variables,
    max_retries,
    trigger_type
  ) VALUES (
    p_organization_id,
    template_record.id,
    p_booking_id,
    p_schedule_id,
    p_waitlist_id,
    p_channel,
    p_template_type,
    p_recipient_email,
    p_recipient_phone,
    p_recipient_name,
    processed_subject,
    processed_body,
    'pending',
    send_at_time,
    send_at_time,
    p_variables,
    template_record.max_send_attempts,
    'automated'
  ) RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to send booking confirmation
CREATE OR REPLACE FUNCTION send_booking_confirmation()
RETURNS TRIGGER AS $$
DECLARE
  customer_record RECORD;
  schedule_record RECORD;
  class_variables JSONB;
BEGIN
  -- Only process confirmed bookings
  IF NEW.status != 'confirmed' THEN
    RETURN NEW;
  END IF;

  -- Get customer details
  SELECT * INTO customer_record
  FROM clients 
  WHERE id = NEW.client_id;

  -- Get schedule details
  SELECT cs.*, ct.name as class_name
  INTO schedule_record
  FROM class_schedules cs
  LEFT JOIN class_types ct ON cs.class_type_id = ct.id
  WHERE cs.id = NEW.schedule_id;

  -- Build variables for template
  class_variables := jsonb_build_object(
    'customer_name', COALESCE(customer_record.first_name || ' ' || customer_record.last_name, customer_record.email),
    'class_name', COALESCE(schedule_record.class_name, 'Class'),
    'class_date', to_char(schedule_record.start_time::date, 'FMDay, FMMonth FMDDth, YYYY'),
    'class_time', to_char(schedule_record.start_time, 'HH24:MI'),
    'class_end_time', to_char(schedule_record.end_time, 'HH24:MI'),
    'location', COALESCE(schedule_record.room_location, 'Main Studio'),
    'instructor_name', COALESCE(schedule_record.instructor_name, 'TBA'),
    'booking_reference', NEW.id::text,
    'booking_type', NEW.booking_type,
    'special_requirements', COALESCE(NEW.special_requirements, ''),
    'cancellation_cutoff_hours', COALESCE(schedule_record.cancellation_cutoff_hours, 24)::text
  );

  -- Send email confirmation
  PERFORM create_notification_from_template(
    NEW.organization_id,
    'booking_confirmation',
    'email',
    customer_record.email,
    customer_record.phone,
    customer_record.first_name || ' ' || customer_record.last_name,
    class_variables,
    NEW.id,
    NEW.schedule_id
  );

  -- Send SMS confirmation if phone number exists
  IF customer_record.phone IS NOT NULL THEN
    PERFORM create_notification_from_template(
      NEW.organization_id,
      'booking_confirmation',
      'sms',
      customer_record.email,
      customer_record.phone,
      customer_record.first_name || ' ' || customer_record.last_name,
      class_variables,
      NEW.id,
      NEW.schedule_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to send booking reminder
CREATE OR REPLACE FUNCTION send_booking_reminders()
RETURNS TRIGGER AS $$
DECLARE
  customer_record RECORD;
  schedule_record RECORD;
  class_variables JSONB;
BEGIN
  -- Only process for new schedules or time changes
  IF TG_OP = 'UPDATE' AND NEW.start_time = OLD.start_time THEN
    RETURN NEW;
  END IF;

  -- Schedule 24-hour reminder notifications for all confirmed bookings
  FOR customer_record IN
    SELECT c.*, cb.id as booking_id, cb.special_requirements
    FROM class_bookings cb
    JOIN clients c ON cb.client_id = c.id
    WHERE cb.schedule_id = NEW.id
    AND cb.status = 'confirmed'
  LOOP
    -- Build variables
    class_variables := jsonb_build_object(
      'customer_name', COALESCE(customer_record.first_name || ' ' || customer_record.last_name, customer_record.email),
      'class_name', COALESCE(NEW.class_type, 'Class'),
      'class_date', to_char(NEW.start_time::date, 'FMDay, FMMonth FMDDth, YYYY'),
      'class_time', to_char(NEW.start_time, 'HH24:MI'),
      'location', COALESCE(NEW.room_location, 'Main Studio'),
      'instructor_name', COALESCE(NEW.instructor_name, 'TBA'),
      'special_requirements', COALESCE(customer_record.special_requirements, '')
    );

    -- Schedule 24-hour email reminder
    PERFORM create_notification_from_template(
      NEW.organization_id,
      'booking_reminder_24h',
      'email',
      customer_record.email,
      customer_record.phone,
      customer_record.first_name || ' ' || customer_record.last_name,
      class_variables,
      customer_record.booking_id,
      NEW.id
    );

    -- Schedule 2-hour SMS reminder
    IF customer_record.phone IS NOT NULL THEN
      PERFORM create_notification_from_template(
        NEW.organization_id,
        'booking_reminder_2h',
        'sms',
        customer_record.email,
        customer_record.phone,
        customer_record.first_name || ' ' || customer_record.last_name,
        class_variables,
        customer_record.booking_id,
        NEW.id
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle booking cancellations
CREATE OR REPLACE FUNCTION send_booking_cancellation()
RETURNS TRIGGER AS $$
DECLARE
  customer_record RECORD;
  schedule_record RECORD;
  class_variables JSONB;
BEGIN
  -- Only process when status changes to cancelled
  IF TG_OP = 'UPDATE' AND (OLD.status = 'cancelled' OR NEW.status != 'cancelled') THEN
    RETURN NEW;
  END IF;

  -- Get customer and schedule details
  SELECT c.* INTO customer_record
  FROM clients c WHERE c.id = NEW.client_id;

  SELECT cs.*, ct.name as class_name
  INTO schedule_record
  FROM class_schedules cs
  LEFT JOIN class_types ct ON cs.class_type_id = ct.id
  WHERE cs.id = NEW.schedule_id;

  -- Build variables
  class_variables := jsonb_build_object(
    'customer_name', COALESCE(customer_record.first_name || ' ' || customer_record.last_name, customer_record.email),
    'class_name', COALESCE(schedule_record.class_name, 'Class'),
    'class_date', to_char(schedule_record.start_time::date, 'FMDay, FMMonth FMDDth, YYYY'),
    'class_time', to_char(schedule_record.start_time, 'HH24:MI'),
    'cancellation_reason', COALESCE(NEW.cancellation_reason, 'No reason provided'),
    'booking_reference', NEW.id::text
  );

  -- Send cancellation notification
  PERFORM create_notification_from_template(
    NEW.organization_id,
    'booking_cancelled',
    'email',
    customer_record.email,
    customer_record.phone,
    customer_record.first_name || ' ' || customer_record.last_name,
    class_variables,
    NEW.id,
    NEW.schedule_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle waitlist notifications
CREATE OR REPLACE FUNCTION send_waitlist_notifications()
RETURNS TRIGGER AS $$
DECLARE
  customer_record RECORD;
  schedule_record RECORD;
  class_variables JSONB;
BEGIN
  -- Get customer and schedule details
  SELECT c.* INTO customer_record
  FROM clients c WHERE c.id = NEW.client_id;

  SELECT cs.*, ct.name as class_name
  INTO schedule_record
  FROM class_schedules cs
  LEFT JOIN class_types ct ON cs.class_type_id = ct.id
  WHERE cs.id = NEW.schedule_id;

  -- Build variables
  class_variables := jsonb_build_object(
    'customer_name', COALESCE(customer_record.first_name || ' ' || customer_record.last_name, customer_record.email),
    'class_name', COALESCE(schedule_record.class_name, 'Class'),
    'class_date', to_char(schedule_record.start_time::date, 'FMDay, FMMonth FMDDth, YYYY'),
    'class_time', to_char(schedule_record.start_time, 'HH24:MI'),
    'waitlist_position', NEW.position::text,
    'auto_book', CASE WHEN NEW.auto_book THEN 'enabled' ELSE 'disabled' END
  );

  IF TG_OP = 'INSERT' THEN
    -- Send waitlist confirmation
    PERFORM create_notification_from_template(
      NEW.organization_id,
      'waitlist_confirmed',
      'email',
      customer_record.email,
      customer_record.phone,
      customer_record.first_name || ' ' || customer_record.last_name,
      class_variables,
      NULL,
      NEW.schedule_id,
      NEW.id
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'converted' AND NOT NEW.notification_sent THEN
    -- Send spot available notification
    PERFORM create_notification_from_template(
      NEW.organization_id,
      'waitlist_spot_available',
      'email',
      customer_record.email,
      customer_record.phone,
      customer_record.first_name || ' ' || customer_record.last_name,
      class_variables,
      NULL,
      NEW.schedule_id,
      NEW.id
    );

    -- Mark notification as sent
    NEW.notification_sent := true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- CREATE TRIGGERS
-- =============================================

-- Booking confirmation trigger
CREATE TRIGGER send_booking_confirmation_trigger
  AFTER INSERT ON class_bookings
  FOR EACH ROW EXECUTE FUNCTION send_booking_confirmation();

-- Booking reminder scheduling trigger
CREATE TRIGGER schedule_booking_reminders_trigger
  AFTER INSERT OR UPDATE ON class_schedules
  FOR EACH ROW EXECUTE FUNCTION send_booking_reminders();

-- Booking cancellation trigger
CREATE TRIGGER send_booking_cancellation_trigger
  AFTER UPDATE ON class_bookings
  FOR EACH ROW EXECUTE FUNCTION send_booking_cancellation();

-- Waitlist notification trigger
CREATE TRIGGER send_waitlist_notifications_trigger
  AFTER INSERT OR UPDATE ON class_waitlist
  FOR EACH ROW EXECUTE FUNCTION send_waitlist_notifications();

-- =============================================
-- DEFAULT NOTIFICATION TEMPLATES
-- =============================================

-- Function to create default templates for an organization
CREATE OR REPLACE FUNCTION create_default_notification_templates(org_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Booking Confirmation Email
  INSERT INTO notification_templates (organization_id, name, template_type, channel, subject_template, body_template)
  VALUES (
    org_id,
    'Booking Confirmation Email',
    'booking_confirmation',
    'email',
    'Booking Confirmed: {class_name} on {class_date}',
    'Hi {customer_name},

Your booking has been confirmed!

Class Details:
• Class: {class_name}
• Date: {class_date} at {class_time}
• Location: {location}
• Instructor: {instructor_name}

Booking Reference: {booking_reference}

Special Requirements: {special_requirements}

Important: Please arrive 10 minutes early. Cancellations must be made at least {cancellation_cutoff_hours} hours in advance.

See you in class!

Best regards,
Your Fitness Team'
  ) ON CONFLICT (organization_id, template_type, channel) DO NOTHING;

  -- 24 Hour Reminder Email
  INSERT INTO notification_templates (organization_id, name, template_type, channel, subject_template, body_template, send_delay_minutes)
  VALUES (
    org_id,
    '24 Hour Class Reminder',
    'booking_reminder_24h',
    'email',
    'Class Reminder: {class_name} tomorrow at {class_time}',
    'Hi {customer_name},

Just a friendly reminder about your class tomorrow:

• Class: {class_name}
• Date: {class_date} at {class_time}
• Location: {location}
• Instructor: {instructor_name}

Please arrive 10 minutes early and bring water and a towel.

Special Requirements: {special_requirements}

Looking forward to seeing you there!

Best regards,
Your Fitness Team',
    -1440 -- 24 hours before class
  ) ON CONFLICT (organization_id, template_type, channel) DO NOTHING;

  -- 2 Hour SMS Reminder
  INSERT INTO notification_templates (organization_id, name, template_type, channel, body_template, send_delay_minutes)
  VALUES (
    org_id,
    '2 Hour SMS Reminder',
    'booking_reminder_2h',
    'sms',
    'Reminder: {class_name} class starting at {class_time} at {location}. See you soon! - Your Fitness Team',
    -120 -- 2 hours before class
  ) ON CONFLICT (organization_id, template_type, channel) DO NOTHING;

  -- Booking Cancellation
  INSERT INTO notification_templates (organization_id, name, template_type, channel, subject_template, body_template)
  VALUES (
    org_id,
    'Booking Cancellation',
    'booking_cancelled',
    'email',
    'Booking Cancelled: {class_name} on {class_date}',
    'Hi {customer_name},

Your booking for {class_name} on {class_date} at {class_time} has been cancelled.

Reason: {cancellation_reason}
Reference: {booking_reference}

If you didn''t request this cancellation, please contact us immediately.

Thanks,
Your Fitness Team'
  ) ON CONFLICT (organization_id, template_type, channel) DO NOTHING;

  -- Waitlist Confirmation
  INSERT INTO notification_templates (organization_id, name, template_type, channel, subject_template, body_template)
  VALUES (
    org_id,
    'Waitlist Confirmation',
    'waitlist_confirmed',
    'email',
    'Added to Waitlist: {class_name} on {class_date}',
    'Hi {customer_name},

You''ve been added to the waitlist for:

• Class: {class_name}
• Date: {class_date} at {class_time}
• Your Position: #{waitlist_position}

Auto-booking is {auto_book} for this class.

We''ll notify you if a spot becomes available!

Best regards,
Your Fitness Team'
  ) ON CONFLICT (organization_id, template_type, channel) DO NOTHING;

  -- Waitlist Spot Available
  INSERT INTO notification_templates (organization_id, name, template_type, channel, subject_template, body_template)
  VALUES (
    org_id,
    'Waitlist Spot Available',
    'waitlist_spot_available',
    'email',
    'Spot Available: {class_name} on {class_date}',
    'Hi {customer_name},

Great news! A spot has become available in:

• Class: {class_name}
• Date: {class_date} at {class_time}

We''ve automatically booked you into this class. If you can''t make it, please cancel as soon as possible so others on the waitlist can take your spot.

See you in class!

Best regards,
Your Fitness Team'
  ) ON CONFLICT (organization_id, template_type, channel) DO NOTHING;

END;
$$ LANGUAGE plpgsql;

-- Create default templates for existing organizations
INSERT INTO notification_templates (organization_id, name, template_type, channel, subject_template, body_template)
SELECT 
  id,
  'Booking Confirmation Email',
  'booking_confirmation',
  'email',
  'Booking Confirmed: {class_name} on {class_date}',
  'Hi {customer_name},

Your booking has been confirmed!

Class Details:
• Class: {class_name}
• Date: {class_date} at {class_time}
• Location: {location}
• Instructor: {instructor_name}

Booking Reference: {booking_reference}

See you in class!'
FROM organizations
ON CONFLICT (organization_id, template_type, channel) DO NOTHING;

-- Add trigger to create templates for new organizations
CREATE OR REPLACE FUNCTION create_org_notification_templates()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_default_notification_templates(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_org_templates_trigger
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION create_org_notification_templates();

-- Add updated_at trigger for notification templates
CREATE TRIGGER update_notification_templates_updated_at 
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE notification_templates IS 'Customizable notification templates for booking events';
COMMENT ON COLUMN notification_templates.send_delay_minutes IS 'Minutes to delay sending (negative values mean X minutes before event)';
COMMENT ON COLUMN notification_templates.template_type IS 'Type of notification trigger';
COMMENT ON FUNCTION create_notification_from_template IS 'Creates a queued notification from a template with variable substitution';