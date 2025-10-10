-- GoCardless Sessions Table
-- Stores temporary session data during GoCardless redirect flow
CREATE TABLE IF NOT EXISTS gocardless_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT NOT NULL UNIQUE,
  redirect_flow_id TEXT,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  membership_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gocardless_sessions_token ON gocardless_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_gocardless_sessions_redirect_flow ON gocardless_sessions(redirect_flow_id);
CREATE INDEX IF NOT EXISTS idx_gocardless_sessions_org ON gocardless_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_gocardless_sessions_expires ON gocardless_sessions(expires_at);

-- RLS Policies
ALTER TABLE gocardless_sessions ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage all sessions
CREATE POLICY "Service role can manage all gocardless sessions"
ON gocardless_sessions FOR ALL
TO service_role
USING (true);

-- Comment
COMMENT ON TABLE gocardless_sessions IS 'Temporary storage for GoCardless redirect flow sessions. Sessions expire after 30 minutes.';
