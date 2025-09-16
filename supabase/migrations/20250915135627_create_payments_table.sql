
-- Create payments table for tracking all client payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL, -- Amount in pennies/cents
  currency VARCHAR(3) DEFAULT 'GBP',
  payment_date DATE NOT NULL,
  payment_time TIME,
  payment_method VARCHAR(50),
  reference VARCHAR(255),
  description TEXT,
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled')),
  stripe_payment_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  invoice_id UUID,
  membership_id UUID REFERENCES customer_memberships(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_organization_id ON payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_client_id ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_method ON payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- Add RLS policies
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policy for organization members to view their organization's payments
CREATE POLICY "Organization members can view payments"
  ON payments FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

-- Policy for organization admins to manage payments
CREATE POLICY "Organization admins can manage payments"
  ON payments FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_payments_updated_at();

-- Create a view for payment summaries
CREATE OR REPLACE VIEW payment_summaries AS
SELECT 
  p.organization_id,
  p.client_id,
  c.name as client_name,
  COUNT(*) as payment_count,
  SUM(p.amount) as total_amount,
  AVG(p.amount) as average_amount,
  MAX(p.payment_date) as last_payment_date,
  MIN(p.payment_date) as first_payment_date
FROM payments p
LEFT JOIN clients c ON p.client_id = c.id
WHERE p.status = 'completed'
GROUP BY p.organization_id, p.client_id, c.name;

-- Grant permissions
GRANT ALL ON payments TO authenticated;
GRANT ALL ON payment_summaries TO authenticated;
