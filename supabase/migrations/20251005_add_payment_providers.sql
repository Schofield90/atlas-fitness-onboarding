-- Add support for multiple payment providers (Stripe, GoCardless, etc.)
-- Migration: 20251005_add_payment_providers.sql

-- 1. Create payment_provider_accounts table
CREATE TABLE IF NOT EXISTS payment_provider_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- 'stripe', 'gocardless'
  access_token TEXT NOT NULL, -- API key or OAuth access token
  refresh_token TEXT, -- For OAuth refresh (if applicable)
  environment VARCHAR(20) DEFAULT 'live', -- 'live' or 'sandbox'
  connected_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- One provider per organization
  UNIQUE(organization_id, provider)
);

-- Enable RLS
ALTER TABLE payment_provider_accounts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their organization's payment providers
CREATE POLICY payment_provider_accounts_select
  ON payment_provider_accounts FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Policy: Staff can insert/update their organization's providers
CREATE POLICY payment_provider_accounts_insert
  ON payment_provider_accounts FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY payment_provider_accounts_update
  ON payment_provider_accounts FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- 2. Add payment_provider column to payments table
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(50) DEFAULT 'stripe',
ADD COLUMN IF NOT EXISTS provider_payment_id VARCHAR(255); -- GoCardless payment ID or Stripe charge ID

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_provider ON payments(payment_provider);
CREATE INDEX IF NOT EXISTS idx_payments_provider_id ON payments(provider_payment_id);

-- Update existing payments to have provider='stripe' and populate provider_payment_id
UPDATE payments
SET
  payment_provider = 'stripe',
  provider_payment_id = charge_id
WHERE payment_provider IS NULL AND charge_id IS NOT NULL;

-- 3. Add payment_provider column to customer_memberships table
ALTER TABLE customer_memberships
ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(50) DEFAULT 'stripe',
ADD COLUMN IF NOT EXISTS provider_subscription_id VARCHAR(255); -- GoCardless subscription ID or Stripe subscription ID

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_memberships_provider ON customer_memberships(payment_provider);
CREATE INDEX IF NOT EXISTS idx_memberships_provider_sub_id ON customer_memberships(provider_subscription_id);

-- Update existing memberships to populate provider_subscription_id from stripe_subscription_id
UPDATE customer_memberships
SET
  payment_provider = 'stripe',
  provider_subscription_id = stripe_subscription_id
WHERE payment_provider IS NULL AND stripe_subscription_id IS NOT NULL;

-- 4. Add payment_provider to membership_plans (optional - tracks which provider the plan is for)
ALTER TABLE membership_plans
ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(50) DEFAULT 'stripe',
ADD COLUMN IF NOT EXISTS provider_price_id VARCHAR(255); -- GoCardless plan ID or Stripe price ID

-- Update existing plans
UPDATE membership_plans
SET
  payment_provider = 'stripe',
  provider_price_id = stripe_price_id
WHERE payment_provider IS NULL AND stripe_price_id IS NOT NULL;

-- 5. Migrate stripe_connect_accounts to payment_provider_accounts
INSERT INTO payment_provider_accounts (organization_id, provider, access_token, connected_at, metadata)
SELECT
  organization_id,
  'stripe' as provider,
  access_token,
  connected_at,
  jsonb_build_object(
    'stripe_account_id', stripe_account_id,
    'onboarding_completed', onboarding_completed,
    'charges_enabled', charges_enabled,
    'payouts_enabled', payouts_enabled
  ) as metadata
FROM stripe_connect_accounts
ON CONFLICT (organization_id, provider) DO NOTHING;

-- 6. Create helper function to get payment provider connection
CREATE OR REPLACE FUNCTION get_payment_provider_connection(
  p_organization_id UUID,
  p_provider VARCHAR(50)
)
RETURNS TABLE (
  access_token TEXT,
  environment VARCHAR(20),
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ppa.access_token,
    ppa.environment,
    ppa.metadata
  FROM payment_provider_accounts ppa
  WHERE ppa.organization_id = p_organization_id
    AND ppa.provider = p_provider
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE payment_provider_accounts IS 'Stores connections to payment providers (Stripe, GoCardless, etc.)';
COMMENT ON COLUMN payments.payment_provider IS 'Which payment provider processed this payment (stripe, gocardless)';
COMMENT ON COLUMN customer_memberships.payment_provider IS 'Which payment provider manages this subscription';
