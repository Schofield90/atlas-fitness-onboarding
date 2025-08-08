-- Mobile App Notifications and Messaging Schema
-- This migration adds tables for push notifications and lightweight messaging

-- ============================================
-- 1. NOTIFICATION SYSTEM
-- ============================================

-- Notification templates
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Template info
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL, -- booking_reminder, class_change, waitlist_promotion, etc.
  title_template TEXT NOT NULL, -- with {{variables}}
  body_template TEXT NOT NULL,
  
  -- Timing
  trigger_hours_before DECIMAL(4,2), -- for reminders
  
  -- Status
  active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification logs
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Notification details
  type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  
  -- Delivery info
  devices_sent INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed, read
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  
  -- Reference
  reference_type VARCHAR(50), -- booking, class_session, membership
  reference_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- In-app notifications (persistent)
CREATE TABLE IF NOT EXISTS member_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Notification content
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  action_type VARCHAR(50), -- navigate_booking, navigate_class, open_url
  action_data JSONB,
  
  -- Status
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  -- Expiry
  expires_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. LIGHTWEIGHT MESSAGING
-- ============================================

-- Message threads (one per member per org)
CREATE TABLE IF NOT EXISTS member_message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Thread info
  subject VARCHAR(200),
  status VARCHAR(20) DEFAULT 'open', -- open, closed, archived
  
  -- Metadata
  last_message_at TIMESTAMPTZ,
  unread_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, organization_id)
);

-- Messages
CREATE TABLE IF NOT EXISTS member_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES member_message_threads(id) ON DELETE CASCADE,
  
  -- Sender info
  sender_type VARCHAR(20) NOT NULL, -- member, staff, system
  sender_id UUID, -- user_id or staff_id
  sender_name TEXT,
  
  -- Message content
  content TEXT NOT NULL,
  attachments JSONB, -- [{url, type, name}]
  
  -- Status
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. FUNCTIONS FOR NOTIFICATIONS
-- ============================================

-- Schedule class reminder notifications
CREATE OR REPLACE FUNCTION schedule_class_reminders()
RETURNS void AS $$
DECLARE
  v_reminder RECORD;
  v_template RECORD;
BEGIN
  -- Find classes that need reminders sent
  FOR v_reminder IN
    SELECT 
      b.user_id,
      b.organization_id,
      cs.start_at,
      c.name as class_name,
      i.full_name as instructor_name,
      l.name as location_name,
      mp.reminder_hours_before
    FROM bookings b
    JOIN class_sessions cs ON b.session_id = cs.id
    JOIN classes c ON cs.class_id = c.id
    LEFT JOIN instructors i ON cs.instructor_id = i.id
    LEFT JOIN locations l ON cs.location_id = l.id
    LEFT JOIN member_preferences mp ON mp.user_id = b.user_id AND mp.organization_id = b.organization_id
    WHERE b.status = 'booked'
      AND b.checked_in = false
      AND cs.start_at > NOW()
      AND cs.start_at <= NOW() + INTERVAL '24 hours'
      AND mp.push_booking_reminders = true
      AND NOT EXISTS (
        SELECT 1 FROM notification_logs nl
        WHERE nl.user_id = b.user_id
          AND nl.reference_type = 'booking'
          AND nl.reference_id = b.id
          AND nl.type = 'booking_reminder'
      )
  LOOP
    -- Check if it's time to send reminder
    IF v_reminder.start_at <= NOW() + (v_reminder.reminder_hours_before || ' hours')::INTERVAL THEN
      -- Get template
      SELECT * INTO v_template
      FROM notification_templates
      WHERE organization_id = v_reminder.organization_id
        AND type = 'booking_reminder'
        AND active = true
      LIMIT 1;
      
      IF v_template IS NOT NULL THEN
        -- Queue notification
        INSERT INTO notification_logs (
          user_id,
          organization_id,
          type,
          title,
          body,
          reference_type,
          reference_id,
          status
        ) VALUES (
          v_reminder.user_id,
          v_reminder.organization_id,
          'booking_reminder',
          REPLACE(REPLACE(v_template.title_template, '{{class_name}}', v_reminder.class_name), '{{time}}', TO_CHAR(v_reminder.start_at, 'HH24:MI')),
          REPLACE(REPLACE(REPLACE(v_template.body_template, '{{class_name}}', v_reminder.class_name), '{{instructor}}', COALESCE(v_reminder.instructor_name, 'TBA')), '{{location}}', COALESCE(v_reminder.location_name, 'Main Gym')),
          'booking',
          v_reminder.booking_id,
          'pending'
        );
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Process waitlist promotions
CREATE OR REPLACE FUNCTION process_waitlist_promotion(
  p_session_id UUID
)
RETURNS void AS $$
DECLARE
  v_available_spots INTEGER;
  v_waitlist_booking RECORD;
BEGIN
  -- Calculate available spots
  SELECT (capacity - booking_count) INTO v_available_spots
  FROM class_sessions
  WHERE id = p_session_id;
  
  -- Process waitlist if spots available
  WHILE v_available_spots > 0 LOOP
    -- Get next person on waitlist
    SELECT * INTO v_waitlist_booking
    FROM bookings
    WHERE session_id = p_session_id
      AND status = 'waitlisted'
    ORDER BY created_at
    LIMIT 1;
    
    IF v_waitlist_booking IS NULL THEN
      EXIT;
    END IF;
    
    -- Promote to booked
    UPDATE bookings
    SET status = 'booked',
        updated_at = NOW()
    WHERE id = v_waitlist_booking.id;
    
    -- Update session counts
    UPDATE class_sessions
    SET booking_count = booking_count + 1,
        waitlist_count = waitlist_count - 1
    WHERE id = p_session_id;
    
    -- Send notification
    INSERT INTO notification_logs (
      user_id,
      organization_id,
      type,
      title,
      body,
      reference_type,
      reference_id,
      data,
      status
    ) VALUES (
      v_waitlist_booking.user_id,
      v_waitlist_booking.organization_id,
      'waitlist_promotion',
      'You''re off the waitlist! 🎉',
      'A spot opened up and you''re now booked for class',
      'booking',
      v_waitlist_booking.id,
      jsonb_build_object('session_id', p_session_id, 'action_required', true),
      'pending'
    );
    
    v_available_spots := v_available_spots - 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. MESSAGING FUNCTIONS
-- ============================================

-- Get or create message thread
CREATE OR REPLACE FUNCTION get_or_create_message_thread(
  p_user_id UUID,
  p_organization_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_thread_id UUID;
  v_client_id UUID;
BEGIN
  -- Get existing thread
  SELECT id INTO v_thread_id
  FROM member_message_threads
  WHERE user_id = p_user_id
    AND organization_id = p_organization_id;
    
  IF v_thread_id IS NOT NULL THEN
    RETURN v_thread_id;
  END IF;
  
  -- Get client_id
  SELECT id INTO v_client_id
  FROM clients
  WHERE user_id = p_user_id
    AND organization_id = p_organization_id
  LIMIT 1;
  
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Client not found';
  END IF;
  
  -- Create new thread
  INSERT INTO member_message_threads (
    user_id,
    organization_id,
    client_id,
    subject
  ) VALUES (
    p_user_id,
    p_organization_id,
    v_client_id,
    'Support Conversation'
  ) RETURNING id INTO v_thread_id;
  
  RETURN v_thread_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. ROW LEVEL SECURITY
-- ============================================

-- Enable RLS
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_messages ENABLE ROW LEVEL SECURITY;

-- Notification templates (org admins only)
CREATE POLICY "Org admins can manage notification templates" ON notification_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_organizations
      WHERE organization_id = notification_templates.organization_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Notification logs (users see own)
CREATE POLICY "Users can view own notification logs" ON notification_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Member notifications
CREATE POLICY "Users can view own notifications" ON member_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON member_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Message threads
CREATE POLICY "Users can view own message threads" ON member_message_threads
  FOR SELECT USING (auth.uid() = user_id);

-- Messages
CREATE POLICY "Users can view messages in their threads" ON member_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM member_message_threads
      WHERE id = member_messages.thread_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages in their threads" ON member_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM member_message_threads
      WHERE id = member_messages.thread_id
        AND user_id = auth.uid()
    )
  );

-- ============================================
-- 6. INDEXES
-- ============================================

CREATE INDEX idx_notification_logs_user ON notification_logs(user_id);
CREATE INDEX idx_notification_logs_status ON notification_logs(status);
CREATE INDEX idx_notification_logs_created ON notification_logs(created_at);
CREATE INDEX idx_member_notifications_user ON member_notifications(user_id);
CREATE INDEX idx_member_notifications_read ON member_notifications(read);
CREATE INDEX idx_member_message_threads_user ON member_message_threads(user_id);
CREATE INDEX idx_member_messages_thread ON member_messages(thread_id);
CREATE INDEX idx_member_messages_created ON member_messages(created_at);

-- ============================================
-- 7. TRIGGERS
-- ============================================

-- Update thread last message timestamp
CREATE OR REPLACE FUNCTION update_thread_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE member_message_threads
  SET last_message_at = NEW.created_at,
      unread_count = unread_count + 1
  WHERE id = NEW.thread_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_thread_on_new_message
  AFTER INSERT ON member_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_last_message();

-- Update timestamps
CREATE TRIGGER update_notification_templates_updated_at
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_member_message_threads_updated_at
  BEFORE UPDATE ON member_message_threads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();