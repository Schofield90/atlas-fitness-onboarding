-- Create table to store Google Calendar watch channels
CREATE TABLE IF NOT EXISTS google_calendar_watches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL UNIQUE,
  resource_id TEXT NOT NULL,
  resource_uri TEXT,
  expiration TIMESTAMPTZ NOT NULL,
  calendar_id TEXT NOT NULL DEFAULT 'primary',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_google_calendar_watches_user_id ON google_calendar_watches(user_id);
CREATE INDEX idx_google_calendar_watches_channel_id ON google_calendar_watches(channel_id);
CREATE INDEX idx_google_calendar_watches_expiration ON google_calendar_watches(expiration);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_google_calendar_watches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_google_calendar_watches_updated_at
BEFORE UPDATE ON google_calendar_watches
FOR EACH ROW
EXECUTE FUNCTION update_google_calendar_watches_updated_at();

-- Enable RLS
ALTER TABLE google_calendar_watches ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own watch channels"
  ON google_calendar_watches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own watch channels"
  ON google_calendar_watches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watch channels"
  ON google_calendar_watches FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own watch channels"
  ON google_calendar_watches FOR DELETE
  USING (auth.uid() = user_id);