-- Create invoices revenue reporting system
-- Migration: 20250917_invoices_revenue_system.sql

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'offline', 'retrying', 'failed')),
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  fees_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  processor VARCHAR(20) NOT NULL DEFAULT 'stripe' CHECK (processor IN ('stripe', 'gocardless', 'cash', 'account_credit')),
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_date DATE,
  description TEXT,
  invoice_number VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create invoice_items table  
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('membership', 'class', 'course', 'store')),
  item_id UUID,
  name VARCHAR(255) NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  unit_price_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create report_preferences table
CREATE TABLE IF NOT EXISTS report_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_key VARCHAR(100) NOT NULL,
  columns_json JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, report_key)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_organization_id ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date_desc ON invoices(organization_id, invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_date ON invoices(payment_date);
CREATE INDEX IF NOT EXISTS idx_invoices_processor ON invoices(processor);
CREATE INDEX IF NOT EXISTS idx_invoices_total_cents ON invoices(total_cents);

CREATE INDEX IF NOT EXISTS idx_invoice_items_organization_id ON invoice_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_item_type ON invoice_items(item_type);
CREATE INDEX IF NOT EXISTS idx_invoice_items_item_id ON invoice_items(item_id);

CREATE INDEX IF NOT EXISTS idx_report_preferences_user_report ON report_preferences(user_id, report_key);

-- Add RLS policies
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_preferences ENABLE ROW LEVEL SECURITY;

-- Invoices policies
CREATE POLICY "Organization members can view invoices"
  ON invoices FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization admins can manage invoices"
  ON invoices FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
      UNION
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- Invoice items policies
CREATE POLICY "Organization members can view invoice_items"
  ON invoice_items FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization admins can manage invoice_items"
  ON invoice_items FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
      UNION
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- Report preferences policies
CREATE POLICY "Users can manage their own report preferences"
  ON report_preferences FOR ALL
  USING (user_id = auth.uid());

-- Create functions for updated_at triggers
CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_report_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoices_updated_at();

CREATE TRIGGER update_report_preferences_updated_at
  BEFORE UPDATE ON report_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_report_preferences_updated_at();

-- Create view for invoice summaries with customer details
CREATE OR REPLACE VIEW invoice_summaries AS
SELECT 
  i.id,
  i.organization_id,
  i.customer_id,
  c.name as customer_name,
  c.email as customer_email,
  cm.id as customer_membership_id,
  cm.membership_plan_id,
  mp.name as membership_plan_name,
  i.status,
  i.subtotal_cents,
  i.tax_cents,
  i.discount_cents,
  i.fees_cents,
  i.total_cents,
  i.processor,
  i.invoice_date,
  i.payment_date,
  i.description,
  i.invoice_number,
  i.created_at,
  i.updated_at,
  -- Calculate amounts in currency units
  ROUND(i.subtotal_cents / 100.0, 2) as subtotal,
  ROUND(i.tax_cents / 100.0, 2) as tax,
  ROUND(i.discount_cents / 100.0, 2) as discount,
  ROUND(i.fees_cents / 100.0, 2) as fees,
  ROUND(i.total_cents / 100.0, 2) as total,
  -- Aggregate invoice items
  (
    SELECT COUNT(*)
    FROM invoice_items ii 
    WHERE ii.invoice_id = i.id
  ) as item_count,
  (
    SELECT COALESCE(ARRAY_AGG(ii.name), ARRAY[]::text[])
    FROM invoice_items ii 
    WHERE ii.invoice_id = i.id
  ) as item_names
FROM invoices i
LEFT JOIN clients c ON i.customer_id = c.id
LEFT JOIN customer_memberships cm ON i.customer_id = cm.client_id 
  AND cm.status = 'active'
LEFT JOIN membership_plans mp ON cm.membership_plan_id = mp.id;

-- Grant permissions
GRANT ALL ON invoices TO authenticated;
GRANT ALL ON invoice_items TO authenticated;
GRANT ALL ON report_preferences TO authenticated;
GRANT SELECT ON invoice_summaries TO authenticated;

-- Create some sample data for testing (optional - remove in production)
-- DO $$ 
-- DECLARE
--   sample_org_id UUID;
--   sample_customer_id UUID;
--   sample_invoice_id UUID;
-- BEGIN
--   -- Get first organization for sample data
--   SELECT id INTO sample_org_id FROM organizations LIMIT 1;
--   
--   IF sample_org_id IS NOT NULL THEN
--     -- Get first customer for sample data  
--     SELECT id INTO sample_customer_id FROM clients WHERE organization_id = sample_org_id LIMIT 1;
--     
--     IF sample_customer_id IS NOT NULL THEN
--       -- Create sample invoices
--       INSERT INTO invoices (organization_id, customer_id, status, subtotal_cents, tax_cents, total_cents, processor, invoice_date, payment_date, description, invoice_number)
--       VALUES 
--         (sample_org_id, sample_customer_id, 'paid', 5000, 500, 5500, 'stripe', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE - INTERVAL '8 days', 'Monthly membership fee', 'INV-001'),
--         (sample_org_id, sample_customer_id, 'pending', 3000, 300, 3300, 'stripe', CURRENT_DATE - INTERVAL '5 days', NULL, 'Personal training session', 'INV-002'),
--         (sample_org_id, sample_customer_id, 'failed', 7500, 750, 8250, 'stripe', CURRENT_DATE - INTERVAL '3 days', NULL, 'Quarterly membership', 'INV-003')
--       RETURNING id INTO sample_invoice_id;
--       
--       -- Create sample invoice items for the last invoice
--       INSERT INTO invoice_items (organization_id, invoice_id, item_type, name, qty, unit_price_cents, total_cents)
--       VALUES 
--         (sample_org_id, sample_invoice_id, 'membership', 'Premium Membership', 1, 7500, 7500);
--     END IF;
--   END IF;
-- END $$;