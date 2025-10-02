-- Create platform_stripe_accounts table for storing admin Stripe OAuth connection
CREATE TABLE IF NOT EXISTS platform_stripe_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform_id TEXT UNIQUE NOT NULL,
  stripe_account_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  scope TEXT,
  country TEXT,
  default_currency TEXT,
  email TEXT,
  connected_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE platform_stripe_accounts ENABLE ROW LEVEL SECURITY;

-- Policy: Only allow service role access (admin operations bypass RLS via service role key)
CREATE POLICY "Service role full access" ON platform_stripe_accounts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_platform_stripe_platform_id ON platform_stripe_accounts(platform_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_platform_stripe_accounts_updated_at
  BEFORE UPDATE ON platform_stripe_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
