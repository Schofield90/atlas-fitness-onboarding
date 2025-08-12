-- Booking System Database Schema
-- For Supabase/PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Calendars table
CREATE TABLE IF NOT EXISTS calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  group_name TEXT NOT NULL,
  distribution TEXT NOT NULL CHECK (distribution IN ('single', 'round_robin', 'optimize_availability', 'equal_distribution')),
  color TEXT,
  auto_confirm BOOLEAN DEFAULT true,
  invite_template TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff table
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ext_ref TEXT, -- External reference (e.g., GHL user id)
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calendar-Staff assignment table
CREATE TABLE IF NOT EXISTS calendar_staff (
  calendar_id UUID REFERENCES calendars(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  weight INT DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  PRIMARY KEY (calendar_id, staff_id)
);

-- Availability policies
CREATE TABLE IF NOT EXISTS availability_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID REFERENCES calendars(id) ON DELETE CASCADE,
  work_hours JSONB NOT NULL, -- {Mon:[["08:00","18:00"]], Tue:...}
  slot_interval_mins INT NOT NULL,
  duration_mins INT NOT NULL,
  buffer_before_mins INT DEFAULT 0,
  buffer_after_mins INT DEFAULT 0,
  min_notice_mins INT NOT NULL DEFAULT 0,
  date_range_days INT NOT NULL DEFAULT 30,
  max_per_slot_per_user INT DEFAULT 1,
  look_busy_percent INT DEFAULT 0 CHECK (look_busy_percent >= 0 AND look_busy_percent <= 100),
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID REFERENCES calendars(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES staff(id),
  contact_name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'canceled', 'rescheduled', 'pending', 'completed', 'no_show')),
  consent_given BOOLEAN DEFAULT false,
  consent_text TEXT,
  ics_uid TEXT UNIQUE, -- For calendar integration
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Booking notes table
CREATE TABLE IF NOT EXISTS booking_notes (
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE PRIMARY KEY,
  notes TEXT,
  internal_notes TEXT, -- Staff-only notes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Booking forms configuration
CREATE TABLE IF NOT EXISTS booking_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID REFERENCES calendars(id) ON DELETE CASCADE,
  fields JSONB NOT NULL DEFAULT '["name", "email", "phone"]',
  required_fields JSONB NOT NULL DEFAULT '["name", "email"]',
  consent_enabled BOOLEAN DEFAULT true,
  consent_text TEXT DEFAULT 'I agree to receive communications',
  custom_fields JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Booking reminders configuration
CREATE TABLE IF NOT EXISTS booking_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID REFERENCES calendars(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('email', 'sms', 'push')),
  timing_mins INT NOT NULL, -- Minutes before appointment (negative for after)
  template TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Booking links
CREATE TABLE IF NOT EXISTS booking_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID REFERENCES calendars(id) ON DELETE CASCADE,
  url_path TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reschedule/Cancel policies
CREATE TABLE IF NOT EXISTS reschedule_cancel_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID REFERENCES calendars(id) ON DELETE CASCADE,
  allow_reschedule BOOLEAN DEFAULT true,
  allow_cancel BOOLEAN DEFAULT true,
  reschedule_min_notice_mins INT DEFAULT 60,
  cancel_min_notice_mins INT DEFAULT 60,
  reschedule_expiry_hours INT, -- NULL means no expiry
  cancel_expiry_hours INT, -- NULL means no expiry
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_bookings_calendar_id ON bookings(calendar_id);
CREATE INDEX idx_bookings_staff_id ON bookings(staff_id);
CREATE INDEX idx_bookings_start_time ON bookings(start_time);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_contact_email ON bookings(contact_email);
CREATE INDEX idx_calendars_slug ON calendars(slug);
CREATE INDEX idx_booking_links_url_path ON booking_links(url_path);

-- Row Level Security (RLS)
ALTER TABLE calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_policies ENABLE ROW LEVEL SECURITY;

-- RLS Policies (adjust based on your auth setup)
CREATE POLICY "Public can view active calendars" ON calendars
  FOR SELECT USING (true);

CREATE POLICY "Public can view availability" ON availability_policies
  FOR SELECT USING (true);

CREATE POLICY "Public can create bookings" ON bookings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own bookings" ON bookings
  FOR SELECT USING (contact_email = current_setting('app.current_user_email', true));

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_calendars_updated_at BEFORE UPDATE ON calendars
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_availability_policies_updated_at BEFORE UPDATE ON availability_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();