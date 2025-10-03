CREATE TABLE IF NOT EXISTS stripe_connect_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_account_id TEXT NOT NULL,
  connected_at TIMESTAMPTZ NOT NULL,
  onboarding_completed BOOLEAN DEFAULT false,
  charges_enabled BOOLEAN DEFAULT false,
  payouts_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id),
  UNIQUE(stripe_account_id)
);

CREATE INDEX IF NOT EXISTS idx_stripe_connect_org ON stripe_connect_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_stripe_connect_account ON stripe_connect_accounts(stripe_account_id);

-- RLS policies
ALTER TABLE stripe_connect_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their org's Stripe Connect"
  ON stripe_connect_accounts
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access"
  ON stripe_connect_accounts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
