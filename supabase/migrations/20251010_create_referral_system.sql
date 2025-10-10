-- Create referral_codes table
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  referrer_client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Code details
  code VARCHAR(50) NOT NULL,
  description TEXT,
  
  -- Credit settings
  credit_amount DECIMAL(10, 2) NOT NULL DEFAULT 0, -- Amount credited to referrer when code is used
  credit_type VARCHAR(20) NOT NULL DEFAULT 'fixed' CHECK (credit_type IN ('fixed', 'percentage')),
  
  -- Usage tracking
  times_used INTEGER DEFAULT 0,
  max_uses INTEGER, -- NULL = unlimited
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  
  UNIQUE(organization_id, code)
);

-- Create referral_credits table to track credits earned
CREATE TABLE IF NOT EXISTS referral_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  referrer_client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  referee_client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  referral_code_id UUID NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
  membership_id UUID REFERENCES customer_memberships(id) ON DELETE SET NULL,
  
  -- Credit details
  credit_amount DECIMAL(10, 2) NOT NULL,
  credit_status VARCHAR(20) DEFAULT 'pending' CHECK (credit_status IN ('pending', 'approved', 'paid', 'cancelled')),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  notes TEXT
);

-- Indexes
CREATE INDEX idx_referral_codes_org_code ON referral_codes(organization_id, code);
CREATE INDEX idx_referral_codes_referrer ON referral_codes(referrer_client_id);
CREATE INDEX idx_referral_credits_referrer ON referral_credits(referrer_client_id);
CREATE INDEX idx_referral_credits_referee ON referral_credits(referee_client_id);

-- RLS Policies
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_credits ENABLE ROW LEVEL SECURITY;

-- Organization members can view referral codes
CREATE POLICY "Users can view referral codes for their organization"
  ON referral_codes FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

-- Organization members can create referral codes
CREATE POLICY "Users can create referral codes for their organization"
  ON referral_codes FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

-- Organization members can update/delete referral codes
CREATE POLICY "Users can update referral codes for their organization"
  ON referral_codes FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete referral codes for their organization"
  ON referral_codes FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

-- Credits policies
CREATE POLICY "Users can view referral credits for their organization"
  ON referral_credits FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert referral credits for their organization"
  ON referral_credits FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

-- Function to increment referral code usage
CREATE OR REPLACE FUNCTION increment_referral_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE referral_codes
  SET times_used = times_used + 1
  WHERE id = NEW.referral_code_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_referral_usage
  AFTER INSERT ON referral_credits
  FOR EACH ROW
  EXECUTE FUNCTION increment_referral_usage();

-- Seed demo referral codes for Atlas Fitness
INSERT INTO referral_codes (
  organization_id, 
  referrer_client_id, 
  code, 
  credit_amount, 
  credit_type, 
  description, 
  is_active,
  max_uses
)
SELECT 
  'ee1206d7-62fb-49cf-9f39-95b9c54423a4',
  c.id,
  UPPER(SUBSTRING(c.first_name || c.last_name FROM 1 FOR 8)),
  20.00, -- £20 credit per referral
  'fixed',
  'Referral code for ' || c.first_name || ' ' || c.last_name,
  true,
  NULL -- unlimited uses
FROM clients c
WHERE c.org_id = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4'
AND c.status = 'active'
LIMIT 5 -- Only create codes for first 5 active clients
ON CONFLICT (organization_id, code) DO NOTHING;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON referral_codes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON referral_credits TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
