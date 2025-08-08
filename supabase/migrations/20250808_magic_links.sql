-- Create magic_links table for passwordless authentication
CREATE TABLE IF NOT EXISTS magic_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_magic_links_token ON magic_links(token);
CREATE INDEX idx_magic_links_client ON magic_links(client_id);
CREATE INDEX idx_magic_links_expires ON magic_links(expires_at);

-- Enable RLS
ALTER TABLE magic_links ENABLE ROW LEVEL SECURITY;

-- Only allow service role to access magic links
CREATE POLICY "Service role can manage magic links" ON magic_links
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to clean up expired magic links
CREATE OR REPLACE FUNCTION cleanup_expired_magic_links()
RETURNS void AS $$
BEGIN
  DELETE FROM magic_links 
  WHERE expires_at < NOW() 
  OR (used = TRUE AND used_at < NOW() - INTERVAL '7 days');
END;
$$ LANGUAGE plpgsql;

-- Add phone column to clients table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'phone') 
  THEN
    ALTER TABLE clients ADD COLUMN phone TEXT;
  END IF;
END $$;