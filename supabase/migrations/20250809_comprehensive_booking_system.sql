-- =============================================
-- COMPREHENSIVE BOOKING SYSTEM WITH GOOGLE CALENDAR INTEGRATION
-- Migration: 20250809_comprehensive_booking_system
-- Extends existing booking system with advanced calendar features
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- 1. GOOGLE CALENDAR INTEGRATION TABLES
-- =============================================

-- Calendar connections (OAuth tokens for Google)
CREATE TABLE IF NOT EXISTS calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL DEFAULT 'google' CHECK (provider IN ('google', 'outlook', 'apple')),
  email VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT NOT NULL DEFAULT 'https://www.googleapis.com/auth/calendar',
  is_active BOOLEAN DEFAULT true,
  last_sync TIMESTAMPTZ,
  sync_errors INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider, email)
);

-- Calendars (user's connected calendars)
CREATE TABLE IF NOT EXISTS calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES calendar_connections(id) ON DELETE CASCADE,
  google_calendar_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  timezone VARCHAR(100) NOT NULL DEFAULT 'Europe/London',
  is_primary BOOLEAN DEFAULT false,
  is_enabled BOOLEAN DEFAULT true,
  color VARCHAR(20),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(connection_id, google_calendar_id)
);

-- =============================================
-- 2. AVAILABILITY SYSTEM TABLES
-- =============================================

-- Availability rules (working hours)
CREATE TABLE IF NOT EXISTS availability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  timezone VARCHAR(100) NOT NULL DEFAULT 'Europe/London',
  buffer_before INTEGER DEFAULT 0, -- minutes
  buffer_after INTEGER DEFAULT 0, -- minutes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, day_of_week, start_time, end_time)
);

-- Availability overrides (time off/extra hours)
CREATE TABLE IF NOT EXISTS availability_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  type VARCHAR(20) NOT NULL CHECK (type IN ('unavailable', 'available', 'modified_hours')),
  reason VARCHAR(255),
  is_recurring BOOLEAN DEFAULT false,
  recurring_pattern JSONB, -- For recurring overrides
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Holidays (organization-specific holidays)
CREATE TABLE IF NOT EXISTS holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  is_recurring BOOLEAN DEFAULT false, -- e.g., Christmas Day every year
  recurring_pattern JSONB, -- For annual holidays
  affects_all_staff BOOLEAN DEFAULT true,
  staff_ids UUID[], -- Specific staff if not all
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 3. APPOINTMENT AND BOOKING LINK SYSTEM
-- =============================================

-- Appointment types (duration, buffers, etc)
CREATE TABLE IF NOT EXISTS appointment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Null means available to all org staff
  name VARCHAR(255) NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  buffer_before_minutes INTEGER DEFAULT 0,
  buffer_after_minutes INTEGER DEFAULT 15,
  price_pennies INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  color VARCHAR(20) DEFAULT '#3b82f6',
  location_type VARCHAR(20) DEFAULT 'in_person' CHECK (location_type IN ('in_person', 'video_call', 'phone', 'custom')),
  location_details TEXT,
  requires_confirmation BOOLEAN DEFAULT false,
  max_advance_days INTEGER DEFAULT 30,
  min_advance_hours INTEGER DEFAULT 2,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Booking links (public booking pages)
CREATE TABLE IF NOT EXISTS booking_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Individual link
  team_ids UUID[], -- For team booking links
  slug VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(20) DEFAULT 'individual' CHECK (type IN ('individual', 'team', 'round_robin', 'collective')),
  appointment_type_ids UUID[] NOT NULL, -- Available appointment types
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true,
  requires_auth BOOLEAN DEFAULT false,
  max_days_in_advance INTEGER DEFAULT 30,
  timezone VARCHAR(100) DEFAULT 'Europe/London',
  settings JSONB DEFAULT '{}'::jsonb, -- Custom form fields, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link branding (customization)
CREATE TABLE IF NOT EXISTS link_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_link_id UUID NOT NULL REFERENCES booking_links(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  logo_url TEXT,
  primary_color VARCHAR(20) DEFAULT '#3b82f6',
  secondary_color VARCHAR(20) DEFAULT '#1e40af',
  background_color VARCHAR(20) DEFAULT '#ffffff',
  text_color VARCHAR(20) DEFAULT '#1f2937',
  custom_css TEXT,
  welcome_message TEXT,
  thank_you_message TEXT,
  cancellation_policy TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(booking_link_id)
);

-- =============================================
-- 4. BOOKING SYSTEM TABLES
-- =============================================

-- Bookings (actual appointments) - Extends existing bookings table
-- Check if bookings table exists and add new columns if needed
DO $$
BEGIN
  -- Add new columns to existing bookings table if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'appointment_type_id') THEN
    ALTER TABLE bookings ADD COLUMN appointment_type_id UUID REFERENCES appointment_types(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'booking_link_id') THEN
    ALTER TABLE bookings ADD COLUMN booking_link_id UUID REFERENCES booking_links(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'organization_id') THEN
    ALTER TABLE bookings ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'assigned_to') THEN
    ALTER TABLE bookings ADD COLUMN assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'google_event_id') THEN
    ALTER TABLE bookings ADD COLUMN google_event_id VARCHAR(255);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'start_time') THEN
    ALTER TABLE bookings ADD COLUMN start_time TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'end_time') THEN
    ALTER TABLE bookings ADD COLUMN end_time TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'title') THEN
    ALTER TABLE bookings ADD COLUMN title VARCHAR(255);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'description') THEN
    ALTER TABLE bookings ADD COLUMN description TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'location_type') THEN
    ALTER TABLE bookings ADD COLUMN location_type VARCHAR(20) DEFAULT 'in_person';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'location_details') THEN
    ALTER TABLE bookings ADD COLUMN location_details TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'attendee_name') THEN
    ALTER TABLE bookings ADD COLUMN attendee_name VARCHAR(255);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'attendee_email') THEN
    ALTER TABLE bookings ADD COLUMN attendee_email VARCHAR(255);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'attendee_phone') THEN
    ALTER TABLE bookings ADD COLUMN attendee_phone VARCHAR(50);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'timezone') THEN
    ALTER TABLE bookings ADD COLUMN timezone VARCHAR(100) DEFAULT 'Europe/London';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'custom_fields') THEN
    ALTER TABLE bookings ADD COLUMN custom_fields JSONB DEFAULT '{}'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'cancellation_reason') THEN
    ALTER TABLE bookings ADD COLUMN cancellation_reason TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'reschedule_count') THEN
    ALTER TABLE bookings ADD COLUMN reschedule_count INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'confirmation_token') THEN
    ALTER TABLE bookings ADD COLUMN confirmation_token VARCHAR(255) UNIQUE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'cancellation_token') THEN
    ALTER TABLE bookings ADD COLUMN cancellation_token VARCHAR(255) UNIQUE;
  END IF;
END $$;

-- Booking audit (history tracking)
CREATE TABLE IF NOT EXISTS booking_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'updated', 'cancelled', 'rescheduled', 'confirmed', 'completed', 'no_show')),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_type VARCHAR(20) DEFAULT 'staff' CHECK (actor_type IN ('staff', 'customer', 'system')),
  previous_data JSONB,
  new_data JSONB,
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 5. NOTIFICATION SYSTEM TABLES
-- =============================================

-- Notifications (email/SMS queue)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('email', 'sms', 'push')),
  template VARCHAR(100) NOT NULL,
  recipient_email VARCHAR(255),
  recipient_phone VARCHAR(50),
  recipient_name VARCHAR(255),
  subject VARCHAR(255),
  body TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  send_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  external_id VARCHAR(255), -- Provider message ID
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 6. INDEXES FOR PERFORMANCE
-- =============================================

-- Calendar connections indexes
CREATE INDEX IF NOT EXISTS idx_calendar_connections_user_org ON calendar_connections(user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_calendar_connections_expires ON calendar_connections(expires_at) WHERE is_active = true;

-- Calendars indexes
CREATE INDEX IF NOT EXISTS idx_calendars_connection ON calendars(connection_id);
CREATE INDEX IF NOT EXISTS idx_calendars_enabled ON calendars(is_enabled) WHERE is_enabled = true;

-- Availability rules indexes
CREATE INDEX IF NOT EXISTS idx_availability_rules_user_day ON availability_rules(user_id, day_of_week) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_availability_rules_org ON availability_rules(organization_id);

-- Availability overrides indexes
CREATE INDEX IF NOT EXISTS idx_availability_overrides_user_date ON availability_overrides(user_id, date);
CREATE INDEX IF NOT EXISTS idx_availability_overrides_org_date ON availability_overrides(organization_id, date);

-- Holidays indexes
CREATE INDEX IF NOT EXISTS idx_holidays_org_date ON holidays(organization_id, date);

-- Appointment types indexes
CREATE INDEX IF NOT EXISTS idx_appointment_types_org_active ON appointment_types(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_appointment_types_user ON appointment_types(user_id) WHERE user_id IS NOT NULL;

-- Booking links indexes
CREATE INDEX IF NOT EXISTS idx_booking_links_slug ON booking_links(slug) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_booking_links_org ON booking_links(organization_id);
CREATE INDEX IF NOT EXISTS idx_booking_links_user ON booking_links(user_id) WHERE user_id IS NOT NULL;

-- Enhanced bookings indexes
CREATE INDEX IF NOT EXISTS idx_bookings_org_time ON bookings(organization_id, start_time) WHERE start_time IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_assigned_time ON bookings(assigned_to, start_time) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_google_event ON bookings(google_event_id) WHERE google_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_tokens ON bookings(confirmation_token, cancellation_token) WHERE confirmation_token IS NOT NULL;

-- Booking audit indexes
CREATE INDEX IF NOT EXISTS idx_booking_audit_booking ON booking_audit(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_audit_org_created ON booking_audit(organization_id, created_at);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_status_send_at ON notifications(status, send_at);
CREATE INDEX IF NOT EXISTS idx_notifications_booking ON notifications(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_org ON notifications(organization_id);

-- =============================================
-- 7. ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all new tables
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Calendar connections policies
CREATE POLICY "Users can view their own calendar connections" ON calendar_connections
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own calendar connections" ON calendar_connections
  FOR ALL USING (user_id = auth.uid());

-- Calendars policies
CREATE POLICY "Users can view their calendars" ON calendars
  FOR SELECT USING (
    connection_id IN (
      SELECT id FROM calendar_connections WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their calendars" ON calendars
  FOR ALL USING (
    connection_id IN (
      SELECT id FROM calendar_connections WHERE user_id = auth.uid()
    )
  );

-- Availability rules policies
CREATE POLICY "Users can view their org availability rules" ON availability_rules
  FOR SELECT USING (
    organization_id IN (
      SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own availability rules" ON availability_rules
  FOR ALL USING (user_id = auth.uid());

-- Availability overrides policies
CREATE POLICY "Users can view their org availability overrides" ON availability_overrides
  FOR SELECT USING (
    organization_id IN (
      SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own availability overrides" ON availability_overrides
  FOR ALL USING (user_id = auth.uid());

-- Holidays policies
CREATE POLICY "Users can view org holidays" ON holidays
  FOR SELECT USING (
    organization_id IN (
      SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage org holidays" ON holidays
  FOR ALL USING (
    organization_id IN (
      SELECT om.org_id FROM organization_members om 
      WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin')
    )
  );

-- Appointment types policies
CREATE POLICY "Users can view org appointment types" ON appointment_types
  FOR SELECT USING (
    organization_id IN (
      SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage appointment types" ON appointment_types
  FOR ALL USING (
    organization_id IN (
      SELECT om.org_id FROM organization_members om 
      WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin', 'coach')
    )
  );

-- Booking links policies (Public read for active links)
CREATE POLICY "Anyone can view active public booking links" ON booking_links
  FOR SELECT USING (is_active = true AND is_public = true);

CREATE POLICY "Users can view org booking links" ON booking_links
  FOR SELECT USING (
    organization_id IN (
      SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their booking links" ON booking_links
  FOR ALL USING (user_id = auth.uid() OR organization_id IN (
    SELECT om.org_id FROM organization_members om 
    WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin')
  ));

-- Link branding policies
CREATE POLICY "Anyone can view public link branding" ON link_branding
  FOR SELECT USING (
    booking_link_id IN (
      SELECT id FROM booking_links WHERE is_active = true AND is_public = true
    )
  );

CREATE POLICY "Users can manage their link branding" ON link_branding
  FOR ALL USING (
    organization_id IN (
      SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid()
    )
  );

-- Enhanced booking policies
CREATE POLICY "Users can view org bookings" ON bookings
  FOR SELECT USING (
    organization_id IN (
      SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can create public bookings" ON bookings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can manage org bookings" ON bookings
  FOR UPDATE USING (
    organization_id IN (
      SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid()
    )
  );

-- Booking audit policies
CREATE POLICY "Users can view org booking audit" ON booking_audit
  FOR SELECT USING (
    organization_id IN (
      SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert booking audit" ON booking_audit
  FOR INSERT WITH CHECK (true);

-- Notifications policies
CREATE POLICY "Users can view org notifications" ON notifications
  FOR SELECT USING (
    organization_id IN (
      SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage notifications" ON notifications
  FOR ALL USING (true);

-- =============================================
-- 8. FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to new tables
CREATE TRIGGER update_calendar_connections_updated_at 
  BEFORE UPDATE ON calendar_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendars_updated_at 
  BEFORE UPDATE ON calendars
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_availability_rules_updated_at 
  BEFORE UPDATE ON availability_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_availability_overrides_updated_at 
  BEFORE UPDATE ON availability_overrides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointment_types_updated_at 
  BEFORE UPDATE ON appointment_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_booking_links_updated_at 
  BEFORE UPDATE ON booking_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at 
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate secure tokens
CREATE OR REPLACE FUNCTION generate_booking_tokens()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.confirmation_token IS NULL THEN
    NEW.confirmation_token = encode(gen_random_bytes(32), 'base64url');
  END IF;
  
  IF NEW.cancellation_token IS NULL THEN
    NEW.cancellation_token = encode(gen_random_bytes(32), 'base64url');
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-generate booking tokens
CREATE TRIGGER generate_booking_tokens_trigger
  BEFORE INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION generate_booking_tokens();

-- Function to create booking audit trail
CREATE OR REPLACE FUNCTION create_booking_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO booking_audit (booking_id, organization_id, action, new_data)
    VALUES (NEW.id, NEW.organization_id, 'created', to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO booking_audit (booking_id, organization_id, action, previous_data, new_data)
    VALUES (NEW.id, NEW.organization_id, 'updated', to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ language 'plpgsql';

-- Trigger for booking audit trail
CREATE TRIGGER create_booking_audit_trigger
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION create_booking_audit();

-- =============================================
-- 9. HELPER FUNCTIONS FOR AVAILABILITY
-- =============================================

-- Function to get user availability for a date range
CREATE OR REPLACE FUNCTION get_user_availability(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_slot_duration INTEGER DEFAULT 30
)
RETURNS TABLE (
  available_start TIMESTAMPTZ,
  available_end TIMESTAMPTZ,
  slot_duration INTEGER
) AS $$
BEGIN
  -- This is a placeholder function that will be implemented in the API layer
  -- for complex availability calculations combining rules, overrides, and busy times
  RETURN QUERY
  SELECT 
    NOW() as available_start,
    NOW() + INTERVAL '1 hour' as available_end,
    p_slot_duration as slot_duration
  LIMIT 0;
END;
$$ language 'plpgsql';

-- Function to check if a time slot is available
CREATE OR REPLACE FUNCTION is_slot_available(
  p_user_id UUID,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ
)
RETURNS BOOLEAN AS $$
DECLARE
  slot_conflicts INTEGER;
BEGIN
  -- Check for existing bookings
  SELECT COUNT(*) INTO slot_conflicts
  FROM bookings
  WHERE assigned_to = p_user_id
    AND booking_status IN ('confirmed', 'attended')
    AND (
      (start_time <= p_start_time AND end_time > p_start_time) OR
      (start_time < p_end_time AND end_time >= p_end_time) OR
      (start_time >= p_start_time AND end_time <= p_end_time)
    );
  
  RETURN slot_conflicts = 0;
END;
$$ language 'plpgsql';

-- =============================================
-- 10. SAMPLE DATA AND DEFAULT CONFIGURATIONS
-- =============================================

-- Insert default appointment types for existing organizations
INSERT INTO appointment_types (organization_id, name, description, duration_minutes, buffer_after_minutes)
SELECT 
  id,
  'Consultation',
  'Initial consultation appointment',
  60,
  15
FROM organizations
WHERE NOT EXISTS (
  SELECT 1 FROM appointment_types WHERE organization_id = organizations.id
);

-- Insert default availability rules (9 AM to 5 PM, Monday to Friday)
INSERT INTO availability_rules (user_id, organization_id, day_of_week, start_time, end_time)
SELECT 
  u.id,
  om.org_id,
  dow,
  '09:00'::TIME,
  '17:00'::TIME
FROM users u
JOIN organization_members om ON u.id = om.user_id
CROSS JOIN generate_series(1, 5) dow -- Monday to Friday
WHERE NOT EXISTS (
  SELECT 1 FROM availability_rules 
  WHERE user_id = u.id AND day_of_week = dow
);

COMMENT ON TABLE calendar_connections IS 'OAuth tokens and connection info for Google Calendar integration';
COMMENT ON TABLE calendars IS 'Individual calendar details from connected Google accounts';
COMMENT ON TABLE availability_rules IS 'Weekly recurring availability rules (working hours)';
COMMENT ON TABLE availability_overrides IS 'Date-specific availability changes (time off, extra hours)';
COMMENT ON TABLE holidays IS 'Organization-wide holidays and special dates';
COMMENT ON TABLE appointment_types IS 'Available appointment types with duration and settings';
COMMENT ON TABLE booking_links IS 'Public booking page configurations';
COMMENT ON TABLE link_branding IS 'Visual customization for booking pages';
COMMENT ON TABLE booking_audit IS 'Audit trail for all booking changes';
COMMENT ON TABLE notifications IS 'Email/SMS notification queue and tracking';