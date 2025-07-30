-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Enable all for authenticated users" ON google_calendar_tokens;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON calendar_sync_settings;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON calendar_sync_events;

-- Create proper RLS policies for google_calendar_tokens
CREATE POLICY "Users can view own tokens" ON google_calendar_tokens
  FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own tokens" ON google_calendar_tokens
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own tokens" ON google_calendar_tokens
  FOR UPDATE TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own tokens" ON google_calendar_tokens
  FOR DELETE TO authenticated
  USING (auth.uid()::text = user_id);

-- Create proper RLS policies for calendar_sync_settings
-- First add user_id column if it doesn't exist
ALTER TABLE calendar_sync_settings ADD COLUMN IF NOT EXISTS user_id TEXT;

CREATE POLICY "Users can view own settings" ON calendar_sync_settings
  FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own settings" ON calendar_sync_settings
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own settings" ON calendar_sync_settings
  FOR UPDATE TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own settings" ON calendar_sync_settings
  FOR DELETE TO authenticated
  USING (auth.uid()::text = user_id);

-- Create proper RLS policies for calendar_sync_events
-- First add user_id column if it doesn't exist
ALTER TABLE calendar_sync_events ADD COLUMN IF NOT EXISTS user_id TEXT;

CREATE POLICY "Users can view own sync events" ON calendar_sync_events
  FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own sync events" ON calendar_sync_events
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own sync events" ON calendar_sync_events
  FOR UPDATE TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own sync events" ON calendar_sync_events
  FOR DELETE TO authenticated
  USING (auth.uid()::text = user_id);