-- Create session_tokens table for custom authentication flow
-- This replaces Supabase magic links to avoid domain redirect issues

CREATE TABLE IF NOT EXISTS session_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  redirect_url TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_session_tokens_token ON session_tokens(token);
CREATE INDEX IF NOT EXISTS idx_session_tokens_expires ON session_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_session_tokens_org ON session_tokens(organization_id);
CREATE INDEX IF NOT EXISTS idx_session_tokens_email ON session_tokens(email);

-- Enable RLS
ALTER TABLE session_tokens ENABLE ROW LEVEL SECURITY;

-- Only service role can access session tokens
CREATE POLICY "Service role only" ON session_tokens
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Automatic cleanup of expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_session_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM session_tokens 
  WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup (if pg_cron is available)
-- SELECT cron.schedule('cleanup-session-tokens', '0 * * * *', 'SELECT cleanup_expired_session_tokens();');