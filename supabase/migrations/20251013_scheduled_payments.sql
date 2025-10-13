-- Scheduled Payments System for Recurring Billing
-- This table stores future payment records that haven't been processed yet

CREATE TABLE IF NOT EXISTS scheduled_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  membership_id UUID NOT NULL REFERENCES customer_memberships(id) ON DELETE CASCADE,
  membership_plan_id UUID NOT NULL REFERENCES membership_plans(id),
  
  -- Payment details
  amount_pennies INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'GBP',
  payment_provider VARCHAR(50) NOT NULL, -- 'stripe' | 'gocardless'
  provider_customer_id TEXT, -- Stripe customer ID or GoCardless customer ID
  
  -- Scheduling
  scheduled_date DATE NOT NULL,
  due_date DATE NOT NULL, -- When payment should be charged
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'pending', -- 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled'
  processed_at TIMESTAMP,
  payment_id UUID REFERENCES payments(id), -- Links to actual payment record once processed
  
  -- Error handling
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMP,
  error_message TEXT,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scheduled_payments_org ON scheduled_payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_payments_client ON scheduled_payments(client_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_payments_membership ON scheduled_payments(membership_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_payments_status ON scheduled_payments(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_payments_due_date ON scheduled_payments(due_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_payments_processing ON scheduled_payments(status, due_date) 
  WHERE status = 'pending' AND due_date <= CURRENT_DATE;

-- RLS Policies
ALTER TABLE scheduled_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view scheduled payments for their organization"
  ON scheduled_payments FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert scheduled payments for their organization"
  ON scheduled_payments FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update scheduled payments for their organization"
  ON scheduled_payments FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

-- Function to auto-generate scheduled payments for a membership
CREATE OR REPLACE FUNCTION generate_scheduled_payments(
  p_membership_id UUID,
  p_months_ahead INTEGER DEFAULT 3
) RETURNS INTEGER AS $$
DECLARE
  v_membership RECORD;
  v_plan RECORD;
  v_start_date DATE;
  v_payment_date DATE;
  v_count INTEGER := 0;
BEGIN
  -- Get membership details
  SELECT 
    cm.*,
    c.org_id as organization_id,
    c.id as client_id
  INTO v_membership
  FROM customer_memberships cm
  JOIN clients c ON c.id = cm.client_id
  WHERE cm.id = p_membership_id AND cm.status = 'active';
  
  IF NOT FOUND THEN
    RAISE NOTICE 'Membership not found or not active: %', p_membership_id;
    RETURN 0;
  END IF;
  
  -- Get plan details
  SELECT * INTO v_plan FROM membership_plans WHERE id = v_membership.membership_plan_id;
  
  -- Skip if one-time payment (trial, drop-in, etc)
  IF v_plan.billing_period = 'one_time' THEN
    RETURN 0;
  END IF;
  
  -- Calculate next payment date
  v_start_date := COALESCE(v_membership.next_billing_date, v_membership.start_date);
  
  -- Generate payments for next N months
  FOR i IN 1..p_months_ahead LOOP
    CASE v_plan.billing_period
      WHEN 'monthly' THEN
        v_payment_date := v_start_date + (i || ' months')::INTERVAL;
      WHEN 'annual', 'yearly' THEN
        v_payment_date := v_start_date + (i || ' years')::INTERVAL;
      WHEN 'weekly' THEN
        v_payment_date := v_start_date + (i || ' weeks')::INTERVAL;
      ELSE
        v_payment_date := v_start_date + (i || ' months')::INTERVAL;
    END CASE;
    
    -- Check if payment already scheduled
    IF NOT EXISTS (
      SELECT 1 FROM scheduled_payments 
      WHERE membership_id = p_membership_id 
        AND due_date = v_payment_date
        AND status IN ('pending', 'processing')
    ) THEN
      INSERT INTO scheduled_payments (
        organization_id,
        client_id,
        membership_id,
        membership_plan_id,
        amount_pennies,
        payment_provider,
        scheduled_date,
        due_date,
        status
      ) VALUES (
        v_membership.organization_id,
        v_membership.client_id,
        p_membership_id,
        v_membership.membership_plan_id,
        v_plan.price_pennies,
        COALESCE(v_membership.payment_provider, 'stripe'),
        CURRENT_DATE,
        v_payment_date,
        'pending'
      );
      
      v_count := v_count + 1;
    END IF;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Function to generate payments for all active memberships
CREATE OR REPLACE FUNCTION generate_all_scheduled_payments(
  p_organization_id UUID DEFAULT NULL,
  p_months_ahead INTEGER DEFAULT 3
) RETURNS TABLE(
  membership_id UUID,
  payments_created INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cm.id,
    generate_scheduled_payments(cm.id, p_months_ahead)
  FROM customer_memberships cm
  WHERE cm.status = 'active'
    AND (p_organization_id IS NULL OR cm.organization_id = p_organization_id);
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE scheduled_payments IS 'Future payment records for recurring memberships';
COMMENT ON FUNCTION generate_scheduled_payments IS 'Generate scheduled payments for a single membership';
COMMENT ON FUNCTION generate_all_scheduled_payments IS 'Generate scheduled payments for all active memberships';
