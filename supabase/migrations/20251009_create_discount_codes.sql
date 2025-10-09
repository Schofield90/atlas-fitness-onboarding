-- Create discount_codes table
CREATE TABLE IF NOT EXISTS discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('percentage', 'fixed')),
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  description TEXT,

  -- Validity
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,

  -- Usage limits
  max_uses INTEGER, -- NULL = unlimited
  max_uses_per_customer INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,

  -- Restrictions
  min_purchase_amount DECIMAL(10, 2), -- Minimum amount required to use code
  applies_to_plans UUID[], -- NULL = all plans, or array of membership_plan_ids

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, code)
);

-- Create index for fast lookups
CREATE INDEX idx_discount_codes_org_code ON discount_codes(organization_id, code);
CREATE INDEX idx_discount_codes_active ON discount_codes(organization_id, is_active) WHERE is_active = true;
CREATE INDEX idx_discount_codes_expires ON discount_codes(expires_at) WHERE expires_at IS NOT NULL;

-- Create discount_code_usage tracking table
CREATE TABLE IF NOT EXISTS discount_code_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_code_id UUID NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  membership_id UUID REFERENCES customer_memberships(id),
  amount_discounted DECIMAL(10, 2) NOT NULL,
  used_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(discount_code_id, customer_id, membership_id)
);

CREATE INDEX idx_discount_usage_code ON discount_code_usage(discount_code_id);
CREATE INDEX idx_discount_usage_customer ON discount_code_usage(customer_id);

-- RLS Policies
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_code_usage ENABLE ROW LEVEL SECURITY;

-- Discount codes: organization members can view and manage
CREATE POLICY "Users can view discount codes for their organization"
  ON discount_codes FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create discount codes for their organization"
  ON discount_codes FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update discount codes for their organization"
  ON discount_codes FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete discount codes for their organization"
  ON discount_codes FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

-- Usage tracking: organization members can view
CREATE POLICY "Users can view usage for their organization's codes"
  ON discount_code_usage FOR SELECT
  USING (
    discount_code_id IN (
      SELECT id FROM discount_codes WHERE organization_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
      )
    )
  );

-- Function to update discount code usage count
CREATE OR REPLACE FUNCTION increment_discount_code_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE discount_codes
  SET current_uses = current_uses + 1,
      updated_at = NOW()
  WHERE id = NEW.discount_code_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_discount_usage
  AFTER INSERT ON discount_code_usage
  FOR EACH ROW
  EXECUTE FUNCTION increment_discount_code_usage();

-- Seed demo discount codes
INSERT INTO discount_codes (organization_id, code, type, amount, description, is_active, max_uses)
VALUES
  (
    'ee1206d7-62fb-49cf-9f39-95b9c54423a4', -- Atlas Fitness org
    'WELCOME10',
    'percentage',
    10.00,
    'Welcome offer - 10% off first membership',
    true,
    NULL -- unlimited uses
  ),
  (
    'ee1206d7-62fb-49cf-9f39-95b9c54423a4',
    'SUMMER25',
    'percentage',
    25.00,
    'Summer promotion - 25% off',
    true,
    100 -- limited to 100 uses
  ),
  (
    'ee1206d7-62fb-49cf-9f39-95b9c54423a4',
    'SAVE20',
    'fixed',
    2000, -- £20.00 in pennies
    'Fixed £20 discount',
    true,
    NULL
  )
ON CONFLICT (organization_id, code) DO NOTHING;

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON discount_codes TO authenticated;
GRANT SELECT, INSERT ON discount_code_usage TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
