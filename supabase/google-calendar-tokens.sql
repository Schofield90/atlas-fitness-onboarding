-- Create table for Google Calendar OAuth tokens
CREATE TABLE IF NOT EXISTS google_calendar_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expiry_date BIGINT,
  token_type TEXT,
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create table for calendar sync settings
CREATE TABLE IF NOT EXISTS calendar_sync_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  google_calendar_id TEXT NOT NULL,
  google_calendar_name TEXT,
  sync_enabled BOOLEAN DEFAULT true,
  sync_direction TEXT DEFAULT 'both' CHECK (sync_direction IN ('to_google', 'from_google', 'both')),
  
  -- Event defaults
  default_event_duration INTEGER DEFAULT 60, -- minutes
  default_event_color TEXT,
  default_reminder_minutes INTEGER DEFAULT 60,
  
  -- Sync preferences
  sync_bookings BOOLEAN DEFAULT true,
  sync_classes BOOLEAN DEFAULT true,
  sync_staff_schedules BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create table for synced events mapping
CREATE TABLE IF NOT EXISTS calendar_sync_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  google_event_id TEXT UNIQUE NOT NULL,
  local_event_id UUID,
  local_event_type TEXT CHECK (local_event_type IN ('booking', 'class', 'staff_schedule')),
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'error')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_calendar_sync_events_google_id ON calendar_sync_events(google_event_id);
CREATE INDEX idx_calendar_sync_events_local_id ON calendar_sync_events(local_event_id);
CREATE INDEX idx_calendar_sync_events_status ON calendar_sync_events(sync_status);

-- Enable RLS
ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Enable all for authenticated users" ON google_calendar_tokens
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable all for authenticated users" ON calendar_sync_settings
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable all for authenticated users" ON calendar_sync_events
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Update triggers
CREATE TRIGGER update_google_calendar_tokens_updated_at
  BEFORE UPDATE ON google_calendar_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_sync_settings_updated_at
  BEFORE UPDATE ON calendar_sync_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();