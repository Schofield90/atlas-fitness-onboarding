-- Payment Transactions Table
-- Tracks all payments processed through connected Stripe accounts

CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  membership_id UUID REFERENCES memberships(id) ON DELETE SET NULL,
  
  -- Stripe data
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_charge_id TEXT,
  stripe_invoice_id TEXT,
  stripe_subscription_id TEXT,
  
  -- Payment details
  amount INTEGER NOT NULL, -- in pence
  currency TEXT DEFAULT 'GBP',
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, succeeded, failed, refunded, partially_refunded
  type TEXT NOT NULL, -- membership_payment, class_booking, personal_training, product_sale, other
  description TEXT,
  
  -- Platform fee
  platform_fee INTEGER DEFAULT 0, -- in pence
  platform_fee_status TEXT DEFAULT 'pending', -- pending, collected, transferred, failed
  
  -- Refund data
  refunded_amount INTEGER DEFAULT 0,
  refund_reason TEXT,
  refunded_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  failure_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  succeeded_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX idx_payment_transactions_org ON payment_transactions(organization_id);
CREATE INDEX idx_payment_transactions_contact ON payment_transactions(contact_id);
CREATE INDEX idx_payment_transactions_membership ON payment_transactions(membership_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_created ON payment_transactions(created_at DESC);
CREATE INDEX idx_payment_transactions_stripe_pi ON payment_transactions(stripe_payment_intent_id);

-- Enable RLS
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Organization members can view their payments"
  ON payment_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_organizations.user_id = auth.uid()
      AND user_organizations.organization_id = payment_transactions.organization_id
      AND user_organizations.is_active = true
    )
  );

CREATE POLICY "Organization staff can create payments"
  ON payment_transactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_organizations.user_id = auth.uid()
      AND user_organizations.organization_id = payment_transactions.organization_id
      AND user_organizations.role IN ('owner', 'admin', 'staff')
      AND user_organizations.is_active = true
    )
  );

CREATE POLICY "Service role can manage all payments"
  ON payment_transactions FOR ALL
  TO service_role
  USING (true);

-- Update trigger
CREATE TRIGGER update_payment_transactions_updated_at
  BEFORE UPDATE ON payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate daily revenue
CREATE OR REPLACE FUNCTION calculate_organization_revenue(
  p_organization_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE (
  date DATE,
  total_revenue INTEGER,
  platform_fees INTEGER,
  net_revenue INTEGER,
  transaction_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(pt.created_at) as date,
    SUM(pt.amount)::INTEGER as total_revenue,
    SUM(pt.platform_fee)::INTEGER as platform_fees,
    SUM(pt.amount - pt.platform_fee)::INTEGER as net_revenue,
    COUNT(*)::INTEGER as transaction_count
  FROM payment_transactions pt
  WHERE pt.organization_id = p_organization_id
    AND pt.status = 'succeeded'
    AND DATE(pt.created_at) BETWEEN p_start_date AND p_end_date
  GROUP BY DATE(pt.created_at)
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION calculate_organization_revenue TO authenticated;