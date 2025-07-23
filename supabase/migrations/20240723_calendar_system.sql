-- Create calendar integrations table
CREATE TABLE IF NOT EXISTS calendar_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'outlook', 'apple')),
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  calendar_email TEXT,
  calendar_name TEXT,
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Create calendar settings table
CREATE TABLE IF NOT EXISTS calendar_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  working_hours JSONB DEFAULT '{
    "monday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "tuesday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "wednesday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "thursday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "friday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "saturday": {"enabled": false, "start": "09:00", "end": "12:00"},
    "sunday": {"enabled": false, "start": "09:00", "end": "12:00"}
  }'::jsonb,
  slot_duration INTEGER DEFAULT 30, -- minutes
  buffer_time INTEGER DEFAULT 15, -- minutes
  timezone TEXT DEFAULT 'America/New_York',
  google_calendar_connected BOOLEAN DEFAULT false,
  booking_confirmation_enabled BOOLEAN DEFAULT true,
  reminder_enabled BOOLEAN DEFAULT true,
  reminder_time INTEGER DEFAULT 24, -- hours before appointment
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create calendar events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  attendees JSONB DEFAULT '[]'::jsonb,
  meeting_url TEXT,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'tentative', 'cancelled')),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  google_event_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create booking links table
CREATE TABLE IF NOT EXISTS booking_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  duration INTEGER DEFAULT 30, -- minutes
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_calendar_integrations_user_id ON calendar_integrations(user_id);
CREATE INDEX idx_calendar_integrations_organization_id ON calendar_integrations(organization_id);
CREATE INDEX idx_calendar_settings_user_id ON calendar_settings(user_id);
CREATE INDEX idx_calendar_events_organization_id ON calendar_events(organization_id);
CREATE INDEX idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX idx_calendar_events_lead_id ON calendar_events(lead_id);
CREATE INDEX idx_booking_links_user_id ON booking_links(user_id);
CREATE INDEX idx_booking_links_slug ON booking_links(slug);

-- Enable RLS
ALTER TABLE calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for calendar_integrations
CREATE POLICY "Users can view own calendar integrations" ON calendar_integrations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calendar integrations" ON calendar_integrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar integrations" ON calendar_integrations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendar integrations" ON calendar_integrations
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for calendar_settings
CREATE POLICY "Users can view own calendar settings" ON calendar_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calendar settings" ON calendar_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar settings" ON calendar_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for calendar_events
CREATE POLICY "Users can view organization events" ON calendar_events
  FOR SELECT USING (
    organization_id IN (
      SELECT COALESCE(
        (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid,
        auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert organization events" ON calendar_events
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT COALESCE(
        (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid,
        auth.uid()
      )
    ) AND created_by = auth.uid()
  );

CREATE POLICY "Users can update organization events" ON calendar_events
  FOR UPDATE USING (
    organization_id IN (
      SELECT COALESCE(
        (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid,
        auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete organization events" ON calendar_events
  FOR DELETE USING (
    organization_id IN (
      SELECT COALESCE(
        (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid,
        auth.uid()
      )
    )
  );

-- RLS Policies for booking_links
CREATE POLICY "Users can view own booking links" ON booking_links
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view active booking links by slug" ON booking_links
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can insert own booking links" ON booking_links
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own booking links" ON booking_links
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own booking links" ON booking_links
  FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_calendar_integrations_updated_at BEFORE UPDATE ON calendar_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_settings_updated_at BEFORE UPDATE ON calendar_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_booking_links_updated_at BEFORE UPDATE ON booking_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();