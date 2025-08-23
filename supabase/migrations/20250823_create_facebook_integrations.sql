-- Create facebook_integrations table
CREATE TABLE IF NOT EXISTS facebook_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  facebook_user_id TEXT NOT NULL,
  facebook_user_name TEXT,
  facebook_user_email TEXT,
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  granted_scopes TEXT[],
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, facebook_user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_facebook_integrations_org ON facebook_integrations(organization_id);
CREATE INDEX IF NOT EXISTS idx_facebook_integrations_user ON facebook_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_facebook_integrations_active ON facebook_integrations(is_active);
CREATE INDEX IF NOT EXISTS idx_facebook_integrations_fb_user ON facebook_integrations(facebook_user_id);

-- Enable RLS
ALTER TABLE facebook_integrations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own integrations" ON facebook_integrations;
DROP POLICY IF EXISTS "Users can insert own integrations" ON facebook_integrations;
DROP POLICY IF EXISTS "Users can update own integrations" ON facebook_integrations;
DROP POLICY IF EXISTS "Users can delete own integrations" ON facebook_integrations;

-- Create RLS policies
-- Users can view their own integrations
CREATE POLICY "Users can view own integrations"
  ON facebook_integrations
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own integrations  
CREATE POLICY "Users can insert own integrations"
  ON facebook_integrations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own integrations
CREATE POLICY "Users can update own integrations"
  ON facebook_integrations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own integrations
CREATE POLICY "Users can delete own integrations"
  ON facebook_integrations
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_facebook_integrations_updated_at ON facebook_integrations;
CREATE TRIGGER update_facebook_integrations_updated_at
  BEFORE UPDATE ON facebook_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();