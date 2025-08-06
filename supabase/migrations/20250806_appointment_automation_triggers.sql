-- Migration: Appointment Automation Triggers
-- Created: 2025-08-06
-- Description: Creates enhanced appointment/booking tracking and automation triggers
-- building on existing booking system tables (bookings, class_sessions, calendar_events)

-- Create appointment_status_changes table
-- Purpose: Track all status changes for appointments to trigger automations
CREATE TABLE IF NOT EXISTS appointment_status_changes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Appointment reference
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  calendar_event_id uuid REFERENCES calendar_events(id) ON DELETE CASCADE,
  class_booking_id uuid REFERENCES class_bookings(id) ON DELETE CASCADE,
  
  -- Status change details
  old_status text,
  new_status text NOT NULL,
  change_reason text, -- 'manual', 'no_show', 'client_request', 'system', 'staff_action'
  change_type text NOT NULL, -- 'scheduled', 'confirmed', 'cancelled', 'rescheduled', 'completed', 'no_show'
  
  -- Context
  changed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES contacts(id),
  
  -- Additional details
  notes text,
  automatic_change boolean DEFAULT false, -- Was this an automatic system change?
  rescheduled_to timestamptz, -- If rescheduled, when to
  cancellation_fee_applied boolean DEFAULT false,
  
  -- Automation triggers
  automation_triggered boolean DEFAULT false,
  triggered_automation_ids uuid[] DEFAULT '{}',
  notifications_sent jsonb DEFAULT '{}', -- Track what notifications were sent
  
  -- Timestamps
  changed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  
  -- Ensure at least one appointment reference exists
  CONSTRAINT appointment_status_changes_has_reference CHECK (
    booking_id IS NOT NULL OR 
    calendar_event_id IS NOT NULL OR 
    class_booking_id IS NOT NULL
  )
);

-- Create appointment_reminders table
-- Purpose: Manage appointment reminder schedules and tracking
CREATE TABLE IF NOT EXISTS appointment_reminders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Appointment reference
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  calendar_event_id uuid REFERENCES calendar_events(id) ON DELETE CASCADE,
  class_booking_id uuid REFERENCES class_bookings(id) ON DELETE CASCADE,
  
  -- Reminder configuration
  reminder_type text NOT NULL, -- 'email', 'sms', 'whatsapp', 'push', 'call'
  reminder_timing text NOT NULL, -- '24_hours', '2_hours', '30_minutes', 'custom'
  custom_timing_minutes integer, -- For custom timing
  
  -- Content
  message_template_id uuid, -- Reference to message template
  custom_message text,
  subject text, -- For emails
  
  -- Scheduling
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  
  -- Status and results
  status text DEFAULT 'scheduled', -- 'scheduled', 'sent', 'failed', 'cancelled'
  delivery_status text, -- 'delivered', 'bounced', 'opened', 'clicked'
  error_message text,
  
  -- Recipient details (cached for performance)
  recipient_name text,
  recipient_email text,
  recipient_phone text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure at least one appointment reference exists
  CONSTRAINT appointment_reminders_has_reference CHECK (
    booking_id IS NOT NULL OR 
    calendar_event_id IS NOT NULL OR 
    class_booking_id IS NOT NULL
  )
);

-- Create customer_booking_patterns table
-- Purpose: Track customer booking behavior for automation insights
CREATE TABLE IF NOT EXISTS customer_booking_patterns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  
  -- Booking statistics (automatically calculated)
  total_bookings integer DEFAULT 0,
  completed_bookings integer DEFAULT 0,
  cancelled_bookings integer DEFAULT 0,
  no_show_bookings integer DEFAULT 0,
  
  -- Timing patterns
  average_booking_lead_time_hours decimal(10,2), -- How far in advance they book
  preferred_booking_times jsonb DEFAULT '{}', -- Most common booking times
  preferred_days_of_week jsonb DEFAULT '{}', -- Most common days
  
  -- Behavior patterns
  cancellation_rate decimal(5,2) DEFAULT 0.00, -- Percentage of bookings cancelled
  no_show_rate decimal(5,2) DEFAULT 0.00, -- Percentage no-shows
  completion_rate decimal(5,2) DEFAULT 0.00, -- Percentage completed
  rescheduling_frequency decimal(5,2) DEFAULT 0.00, -- How often they reschedule
  
  -- Recent behavior
  last_booking_date timestamptz,
  last_completion_date timestamptz,
  last_cancellation_date timestamptz,
  days_since_last_booking integer,
  
  -- Risk scores (for automation targeting)
  no_show_risk_score decimal(3,2) DEFAULT 0.00, -- 0.00 to 1.00 probability of no-show
  cancellation_risk_score decimal(3,2) DEFAULT 0.00, -- 0.00 to 1.00 probability of cancellation
  churn_risk_score decimal(3,2) DEFAULT 0.00, -- 0.00 to 1.00 probability of not rebooking
  
  -- Engagement indicators
  engagement_level text DEFAULT 'new', -- 'new', 'engaged', 'at_risk', 'inactive'
  booking_streak integer DEFAULT 0, -- Consecutive completed bookings
  longest_booking_streak integer DEFAULT 0,
  
  -- Timestamps
  last_calculated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT customer_booking_patterns_unique UNIQUE (organization_id, contact_id)
);

-- Create no_show_tracking table
-- Purpose: Enhanced tracking of no-shows with automation triggers
CREATE TABLE IF NOT EXISTS no_show_tracking (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Appointment details
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  calendar_event_id uuid REFERENCES calendar_events(id) ON DELETE CASCADE,
  class_booking_id uuid REFERENCES class_bookings(id) ON DELETE CASCADE,
  
  -- No-show details
  contact_id uuid NOT NULL REFERENCES contacts(id),
  appointment_date timestamptz NOT NULL,
  appointment_type text, -- 'class', 'personal_training', 'consultation', 'trial'
  
  -- Context
  was_reminder_sent boolean DEFAULT false,
  last_reminder_sent_at timestamptz,
  check_in_attempted boolean DEFAULT false, -- Did they try to check in?
  
  -- Follow-up actions
  follow_up_required boolean DEFAULT true,
  follow_up_completed boolean DEFAULT false,
  follow_up_method text, -- 'call', 'email', 'sms', 'in_person'
  follow_up_outcome text, -- 'rescheduled', 'explanation_given', 'no_response', 'cancelled_membership'
  
  -- Fees and policies
  no_show_fee_applied boolean DEFAULT false,
  no_show_fee_amount decimal(10,2) DEFAULT 0.00,
  waived_fee boolean DEFAULT false,
  waive_reason text,
  
  -- Automation and notifications
  automation_triggered boolean DEFAULT false,
  triggered_automation_ids uuid[] DEFAULT '{}',
  staff_notified boolean DEFAULT false,
  
  -- Resolution
  resolved_at timestamptz,
  resolution_notes text,
  
  -- Timestamps
  recorded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  
  -- Ensure at least one appointment reference exists
  CONSTRAINT no_show_tracking_has_reference CHECK (
    booking_id IS NOT NULL OR 
    calendar_event_id IS NOT NULL OR 
    class_booking_id IS NOT NULL
  )
);

-- Create booking_availability_requests table
-- Purpose: Track requests for unavailable time slots to trigger waitlist automation
CREATE TABLE IF NOT EXISTS booking_availability_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Requester details
  contact_id uuid REFERENCES contacts(id),
  requester_name text NOT NULL,
  requester_email text,
  requester_phone text,
  
  -- Request details
  requested_service text NOT NULL, -- 'class', 'personal_training', 'consultation'
  preferred_date date,
  preferred_time_start time,
  preferred_time_end time,
  alternative_dates date[] DEFAULT '{}',
  flexible_timing boolean DEFAULT false,
  
  -- Context
  original_class_session_id uuid REFERENCES class_sessions(id),
  original_program_id uuid REFERENCES programs(id),
  source text DEFAULT 'booking_form', -- 'booking_form', 'phone', 'walk_in', 'website'
  
  -- Status
  status text DEFAULT 'pending', -- 'pending', 'matched', 'cancelled', 'expired'
  priority_level text DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  
  -- Resolution
  matched_booking_id uuid,
  alternative_offered text,
  response_deadline timestamptz,
  
  -- Automation
  automation_triggered boolean DEFAULT false,
  triggered_automation_ids uuid[] DEFAULT '{}',
  notifications_sent jsonb DEFAULT '{}',
  
  -- Timestamps
  requested_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  expires_at timestamptz DEFAULT now() + interval '7 days',
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_appointment_status_changes_organization ON appointment_status_changes(organization_id);
CREATE INDEX idx_appointment_status_changes_booking ON appointment_status_changes(booking_id);
CREATE INDEX idx_appointment_status_changes_calendar ON appointment_status_changes(calendar_event_id);
CREATE INDEX idx_appointment_status_changes_class_booking ON appointment_status_changes(class_booking_id);
CREATE INDEX idx_appointment_status_changes_contact ON appointment_status_changes(contact_id);
CREATE INDEX idx_appointment_status_changes_type ON appointment_status_changes(change_type);
CREATE INDEX idx_appointment_status_changes_changed_at ON appointment_status_changes(changed_at DESC);

CREATE INDEX idx_appointment_reminders_organization ON appointment_reminders(organization_id);
CREATE INDEX idx_appointment_reminders_booking ON appointment_reminders(booking_id);
CREATE INDEX idx_appointment_reminders_calendar ON appointment_reminders(calendar_event_id);
CREATE INDEX idx_appointment_reminders_class_booking ON appointment_reminders(class_booking_id);
CREATE INDEX idx_appointment_reminders_scheduled_for ON appointment_reminders(scheduled_for);
CREATE INDEX idx_appointment_reminders_status ON appointment_reminders(status);
CREATE INDEX idx_appointment_reminders_type ON appointment_reminders(reminder_type);

CREATE INDEX idx_customer_booking_patterns_organization ON customer_booking_patterns(organization_id);
CREATE INDEX idx_customer_booking_patterns_contact ON customer_booking_patterns(contact_id);
CREATE INDEX idx_customer_booking_patterns_engagement ON customer_booking_patterns(engagement_level);
CREATE INDEX idx_customer_booking_patterns_risk_scores ON customer_booking_patterns(no_show_risk_score, cancellation_risk_score, churn_risk_score);
CREATE INDEX idx_customer_booking_patterns_last_booking ON customer_booking_patterns(last_booking_date DESC);

CREATE INDEX idx_no_show_tracking_organization ON no_show_tracking(organization_id);
CREATE INDEX idx_no_show_tracking_contact ON no_show_tracking(contact_id);
CREATE INDEX idx_no_show_tracking_booking ON no_show_tracking(booking_id);
CREATE INDEX idx_no_show_tracking_calendar ON no_show_tracking(calendar_event_id);
CREATE INDEX idx_no_show_tracking_class_booking ON no_show_tracking(class_booking_id);
CREATE INDEX idx_no_show_tracking_appointment_date ON no_show_tracking(appointment_date DESC);
CREATE INDEX idx_no_show_tracking_follow_up ON no_show_tracking(follow_up_required) WHERE follow_up_required = true;

CREATE INDEX idx_booking_availability_requests_organization ON booking_availability_requests(organization_id);
CREATE INDEX idx_booking_availability_requests_contact ON booking_availability_requests(contact_id);
CREATE INDEX idx_booking_availability_requests_status ON booking_availability_requests(status);
CREATE INDEX idx_booking_availability_requests_date ON booking_availability_requests(preferred_date);
CREATE INDEX idx_booking_availability_requests_expires ON booking_availability_requests(expires_at) WHERE status = 'pending';

-- Create trigger functions
-- Function to log appointment status changes
CREATE OR REPLACE FUNCTION log_appointment_status_change()
RETURNS TRIGGER AS $$
DECLARE
  org_id uuid;
  contact_id_val uuid;
  old_status_val text;
  new_status_val text;
BEGIN
  -- Handle different table types
  IF TG_TABLE_NAME = 'bookings' THEN
    -- Get organization_id through class_session
    SELECT cs.organization_id, b.customer_id INTO org_id, contact_id_val
    FROM class_sessions cs
    JOIN bookings b ON b.class_session_id = cs.id
    WHERE b.id = COALESCE(NEW.id, OLD.id);
    
    old_status_val := OLD.booking_status;
    new_status_val := NEW.booking_status;
    
    -- Only log if status actually changed
    IF OLD.booking_status IS DISTINCT FROM NEW.booking_status THEN
      INSERT INTO appointment_status_changes (
        organization_id, booking_id, contact_id, old_status, new_status, 
        change_type, changed_by, changed_at
      ) VALUES (
        org_id, NEW.id, contact_id_val, old_status_val, new_status_val,
        new_status_val, auth.uid(), now()
      );
    END IF;
    
  ELSIF TG_TABLE_NAME = 'calendar_events' THEN
    org_id := NEW.organization_id;
    -- Try to get contact_id from lead_id
    SELECT c.id INTO contact_id_val
    FROM contacts c
    WHERE c.lead_id = NEW.lead_id
    LIMIT 1;
    
    old_status_val := OLD.status;
    new_status_val := NEW.status;
    
    -- Only log if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO appointment_status_changes (
        organization_id, calendar_event_id, contact_id, old_status, new_status,
        change_type, changed_by, changed_at
      ) VALUES (
        org_id, NEW.id, contact_id_val, old_status_val, new_status_val,
        new_status_val, auth.uid(), now()
      );
    END IF;
    
  ELSIF TG_TABLE_NAME = 'class_bookings' THEN
    SELECT gym_id INTO org_id FROM class_bookings WHERE id = COALESCE(NEW.id, OLD.id);
    -- Try to get contact from client_id
    SELECT c.id INTO contact_id_val
    FROM contacts c
    WHERE c.client_id = COALESCE(NEW.client_id, OLD.client_id)
    LIMIT 1;
    
    old_status_val := OLD.status;
    new_status_val := NEW.status;
    
    -- Only log if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO appointment_status_changes (
        organization_id, class_booking_id, contact_id, old_status, new_status,
        change_type, changed_by, changed_at
      ) VALUES (
        org_id, NEW.id, contact_id_val, old_status_val, new_status_val,
        new_status_val, auth.uid(), now()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update customer booking patterns
CREATE OR REPLACE FUNCTION update_customer_booking_patterns()
RETURNS TRIGGER AS $$
DECLARE
  contact_id_val uuid;
  org_id uuid;
BEGIN
  -- Get contact and organization IDs based on table
  IF TG_TABLE_NAME = 'bookings' THEN
    SELECT cs.organization_id, b.customer_id INTO org_id, contact_id_val
    FROM class_sessions cs
    JOIN bookings b ON b.class_session_id = cs.id
    WHERE b.id = COALESCE(NEW.id, OLD.id);
    
    -- Convert customer_id to contact_id if needed
    SELECT c.id INTO contact_id_val
    FROM contacts c
    WHERE c.lead_id = contact_id_val
    LIMIT 1;
    
  ELSIF TG_TABLE_NAME = 'class_bookings' THEN
    SELECT gym_id INTO org_id FROM class_bookings WHERE id = COALESCE(NEW.id, OLD.id);
    SELECT c.id INTO contact_id_val
    FROM contacts c
    WHERE c.client_id = COALESCE(NEW.client_id, OLD.client_id)
    LIMIT 1;
  END IF;
  
  -- Only proceed if we have valid IDs
  IF org_id IS NOT NULL AND contact_id_val IS NOT NULL THEN
    -- Insert or update booking patterns record
    INSERT INTO customer_booking_patterns (organization_id, contact_id)
    VALUES (org_id, contact_id_val)
    ON CONFLICT (organization_id, contact_id) DO UPDATE SET
      updated_at = now(),
      last_calculated_at = now();
    
    -- Trigger a recalculation of patterns (this would be done by a background job)
    -- For now, we just update the timestamp
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to auto-create reminders for new bookings
CREATE OR REPLACE FUNCTION create_appointment_reminders()
RETURNS TRIGGER AS $$
DECLARE
  org_id uuid;
  contact_id_val uuid;
  appointment_time timestamptz;
  reminder_settings jsonb;
BEGIN
  -- Get organization and appointment details
  IF TG_TABLE_NAME = 'bookings' THEN
    SELECT cs.organization_id, cs.start_time, b.customer_id INTO org_id, appointment_time, contact_id_val
    FROM class_sessions cs
    JOIN bookings b ON b.class_session_id = cs.id
    WHERE b.id = NEW.id;
    
    -- Convert to contact_id if needed
    SELECT c.id INTO contact_id_val
    FROM contacts c
    WHERE c.lead_id = contact_id_val
    LIMIT 1;
    
  ELSIF TG_TABLE_NAME = 'calendar_events' THEN
    org_id := NEW.organization_id;
    appointment_time := NEW.start_time;
    SELECT c.id INTO contact_id_val
    FROM contacts c
    WHERE c.lead_id = NEW.lead_id
    LIMIT 1;
    
  ELSIF TG_TABLE_NAME = 'class_bookings' THEN
    SELECT cs.gym_id, cs.start_time INTO org_id, appointment_time
    FROM class_schedules cs
    WHERE cs.id = NEW.schedule_id;
    
    SELECT c.id INTO contact_id_val
    FROM contacts c
    WHERE c.client_id = NEW.client_id
    LIMIT 1;
  END IF;
  
  -- Only create reminders if we have all required data and booking is confirmed
  IF org_id IS NOT NULL AND contact_id_val IS NOT NULL AND appointment_time > now() THEN
    -- Create 24-hour reminder (if appointment is more than 24 hours away)
    IF appointment_time > now() + interval '24 hours' THEN
      INSERT INTO appointment_reminders (
        organization_id,
        booking_id,
        calendar_event_id,
        class_booking_id,
        reminder_type,
        reminder_timing,
        scheduled_for,
        recipient_name,
        recipient_email,
        recipient_phone
      )
      SELECT 
        org_id,
        CASE WHEN TG_TABLE_NAME = 'bookings' THEN NEW.id END,
        CASE WHEN TG_TABLE_NAME = 'calendar_events' THEN NEW.id END,
        CASE WHEN TG_TABLE_NAME = 'class_bookings' THEN NEW.id END,
        'email',
        '24_hours',
        appointment_time - interval '24 hours',
        c.first_name || ' ' || COALESCE(c.last_name, ''),
        c.email,
        c.phone
      FROM contacts c
      WHERE c.id = contact_id_val AND c.email IS NOT NULL;
    END IF;
    
    -- Create 2-hour reminder
    IF appointment_time > now() + interval '2 hours' THEN
      INSERT INTO appointment_reminders (
        organization_id,
        booking_id,
        calendar_event_id,
        class_booking_id,
        reminder_type,
        reminder_timing,
        scheduled_for,
        recipient_name,
        recipient_email,
        recipient_phone
      )
      SELECT 
        org_id,
        CASE WHEN TG_TABLE_NAME = 'bookings' THEN NEW.id END,
        CASE WHEN TG_TABLE_NAME = 'calendar_events' THEN NEW.id END,
        CASE WHEN TG_TABLE_NAME = 'class_bookings' THEN NEW.id END,
        'sms',
        '2_hours',
        appointment_time - interval '2 hours',
        c.first_name || ' ' || COALESCE(c.last_name, ''),
        c.email,
        c.phone
      FROM contacts c
      WHERE c.id = contact_id_val AND c.phone IS NOT NULL AND c.sms_opt_in = true;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to track no-shows
CREATE OR REPLACE FUNCTION track_no_shows()
RETURNS TRIGGER AS $$
DECLARE
  org_id uuid;
  contact_id_val uuid;
  appointment_time timestamptz;
BEGIN
  -- Only track no-shows when status changes to 'no_show'
  IF NEW.booking_status = 'no_show' OR NEW.status = 'no_show' THEN
    -- Get organization and contact details
    IF TG_TABLE_NAME = 'bookings' THEN
      SELECT cs.organization_id, cs.start_time, b.customer_id INTO org_id, appointment_time, contact_id_val
      FROM class_sessions cs
      JOIN bookings b ON b.class_session_id = cs.id
      WHERE b.id = NEW.id;
      
      -- Convert to contact_id if needed
      SELECT c.id INTO contact_id_val
      FROM contacts c
      WHERE c.lead_id = contact_id_val
      LIMIT 1;
      
    ELSIF TG_TABLE_NAME = 'class_bookings' THEN
      SELECT cs.gym_id, cs.start_time INTO org_id, appointment_time
      FROM class_schedules cs
      WHERE cs.id = NEW.schedule_id;
      
      SELECT c.id INTO contact_id_val
      FROM contacts c
      WHERE c.client_id = NEW.client_id
      LIMIT 1;
    END IF;
    
    -- Create no-show record
    IF org_id IS NOT NULL AND contact_id_val IS NOT NULL THEN
      INSERT INTO no_show_tracking (
        organization_id,
        booking_id,
        class_booking_id,
        contact_id,
        appointment_date,
        appointment_type
      ) VALUES (
        org_id,
        CASE WHEN TG_TABLE_NAME = 'bookings' THEN NEW.id END,
        CASE WHEN TG_TABLE_NAME = 'class_bookings' THEN NEW.id END,
        contact_id_val,
        appointment_time,
        'class'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
-- Status change logging triggers
CREATE TRIGGER log_booking_status_change
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION log_appointment_status_change();

CREATE TRIGGER log_calendar_status_change
  AFTER UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION log_appointment_status_change();

-- Only create trigger for class_bookings if the table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'class_bookings') THEN
    EXECUTE 'CREATE TRIGGER log_class_booking_status_change
      AFTER UPDATE ON class_bookings
      FOR EACH ROW
      EXECUTE FUNCTION log_appointment_status_change()';
  END IF;
END $$;

-- Booking pattern update triggers
CREATE TRIGGER update_booking_patterns_on_booking
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_booking_patterns();

-- Auto-create reminders triggers
CREATE TRIGGER create_reminders_on_booking
  AFTER INSERT ON bookings
  FOR EACH ROW
  WHEN (NEW.booking_status = 'confirmed')
  EXECUTE FUNCTION create_appointment_reminders();

CREATE TRIGGER create_reminders_on_calendar_event
  AFTER INSERT ON calendar_events
  FOR EACH ROW
  WHEN (NEW.status = 'confirmed')
  EXECUTE FUNCTION create_appointment_reminders();

-- No-show tracking triggers
CREATE TRIGGER track_no_shows_booking
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION track_no_shows();

-- Updated_at triggers
CREATE TRIGGER update_appointment_reminders_updated_at
  BEFORE UPDATE ON appointment_reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_booking_patterns_updated_at
  BEFORE UPDATE ON customer_booking_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE appointment_status_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_booking_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE no_show_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_availability_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Appointment Status Changes policies
CREATE POLICY "Users can view appointment status changes from their organization"
  ON appointment_status_changes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = appointment_status_changes.organization_id
    )
  );

-- Appointment Reminders policies
CREATE POLICY "Users can view appointment reminders from their organization"
  ON appointment_reminders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = appointment_reminders.organization_id
    )
  );

CREATE POLICY "Users can manage appointment reminders for their organization"
  ON appointment_reminders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = appointment_reminders.organization_id
    )
  );

-- Customer Booking Patterns policies
CREATE POLICY "Users can view booking patterns from their organization"
  ON customer_booking_patterns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = customer_booking_patterns.organization_id
    )
  );

-- No Show Tracking policies
CREATE POLICY "Users can view no-show tracking from their organization"
  ON no_show_tracking FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = no_show_tracking.organization_id
    )
  );

CREATE POLICY "Users can manage no-show tracking for their organization"
  ON no_show_tracking FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = no_show_tracking.organization_id
    )
  );

-- Booking Availability Requests policies
CREATE POLICY "Users can view availability requests from their organization"
  ON booking_availability_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = booking_availability_requests.organization_id
    )
  );

CREATE POLICY "Users can manage availability requests for their organization"
  ON booking_availability_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = booking_availability_requests.organization_id
    )
  );

-- Public can create availability requests (for booking forms)
CREATE POLICY "Anyone can create booking availability requests"
  ON booking_availability_requests FOR INSERT
  WITH CHECK (true);

-- Service role policies (for automation)
CREATE POLICY "Service role can manage all appointment status changes"
  ON appointment_status_changes FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage all appointment reminders"
  ON appointment_reminders FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage all booking patterns"
  ON customer_booking_patterns FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage all no-show tracking"
  ON no_show_tracking FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage all availability requests"
  ON booking_availability_requests FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Add helpful comments
COMMENT ON TABLE appointment_status_changes IS 'Tracks all appointment status changes for automation triggers';
COMMENT ON TABLE appointment_reminders IS 'Manages automated appointment reminder schedules and delivery';
COMMENT ON TABLE customer_booking_patterns IS 'Analyzes customer booking behavior for automation insights';
COMMENT ON TABLE no_show_tracking IS 'Enhanced no-show tracking with automated follow-up triggers';
COMMENT ON TABLE booking_availability_requests IS 'Tracks requests for unavailable slots to trigger waitlist automation';

COMMENT ON COLUMN customer_booking_patterns.preferred_booking_times IS 'JSON object with most common booking times by hour';
COMMENT ON COLUMN customer_booking_patterns.no_show_risk_score IS 'Calculated probability (0-1) of no-show based on history';
COMMENT ON COLUMN appointment_reminders.notifications_sent IS 'JSON object tracking which notifications were sent and when';
COMMENT ON COLUMN no_show_tracking.triggered_automation_ids IS 'Array of automation IDs triggered by this no-show';