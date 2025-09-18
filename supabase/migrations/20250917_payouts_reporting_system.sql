-- Monthly Payouts Reporting System Migration
-- Creates comprehensive payout tracking for Stripe and GoCardless

-- Create payouts table for tracking monthly payouts from payment processors
CREATE TABLE IF NOT EXISTS payouts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    processor processor_enum NOT NULL,
    payout_date DATE NOT NULL,
    amount_cents INTEGER NOT NULL,
    status payout_status_enum NOT NULL DEFAULT 'in_transit',
    stripe_payout_id VARCHAR(255),
    gocardless_payout_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure external IDs are unique when provided
    CONSTRAINT unique_stripe_payout_id UNIQUE (stripe_payout_id),
    CONSTRAINT unique_gocardless_payout_id UNIQUE (gocardless_payout_id),
    
    -- Ensure we have the appropriate external ID for each processor
    CONSTRAINT check_stripe_id CHECK (
        processor != 'stripe' OR stripe_payout_id IS NOT NULL
    ),
    CONSTRAINT check_gocardless_id CHECK (
        processor != 'gocardless' OR gocardless_payout_id IS NOT NULL
    )
);

-- Create enum types for payouts
CREATE TYPE processor_enum AS ENUM ('stripe', 'gocardless');
CREATE TYPE payout_status_enum AS ENUM ('paid', 'in_transit');
CREATE TYPE payout_item_type_enum AS ENUM ('charge', 'refund');

-- Recreate payouts table with proper enum types
DROP TABLE IF EXISTS payouts CASCADE;
CREATE TABLE payouts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    processor processor_enum NOT NULL,
    payout_date DATE NOT NULL,
    amount_cents INTEGER NOT NULL,
    status payout_status_enum NOT NULL DEFAULT 'in_transit',
    stripe_payout_id VARCHAR(255),
    gocardless_payout_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure external IDs are unique when provided
    CONSTRAINT unique_stripe_payout_id UNIQUE (stripe_payout_id),
    CONSTRAINT unique_gocardless_payout_id UNIQUE (gocardless_payout_id),
    
    -- Ensure we have the appropriate external ID for each processor
    CONSTRAINT check_stripe_id CHECK (
        processor != 'stripe' OR stripe_payout_id IS NOT NULL
    ),
    CONSTRAINT check_gocardless_id CHECK (
        processor != 'gocardless' OR gocardless_payout_id IS NOT NULL
    )
);

-- Create payout_items table for detailed breakdown of what's included in each payout
CREATE TABLE payout_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    payout_id UUID NOT NULL REFERENCES payouts(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    type payout_item_type_enum NOT NULL,
    customer_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    item TEXT NOT NULL, -- Description of what was charged/refunded
    amount_cents INTEGER NOT NULL,
    fee_cents INTEGER DEFAULT 0,
    occurred_at TIMESTAMPTZ NOT NULL, -- When the original charge/refund occurred
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_payouts_org_id ON payouts(org_id);
CREATE INDEX idx_payouts_payout_date_desc ON payouts(payout_date DESC);
CREATE INDEX idx_payouts_processor ON payouts(processor);
CREATE INDEX idx_payouts_status ON payouts(status);
CREATE INDEX idx_payouts_stripe_payout_id ON payouts(stripe_payout_id);
CREATE INDEX idx_payouts_gocardless_payout_id ON payouts(gocardless_payout_id);

CREATE INDEX idx_payout_items_org_id ON payout_items(org_id);
CREATE INDEX idx_payout_items_payout_id ON payout_items(payout_id);
CREATE INDEX idx_payout_items_invoice_id ON payout_items(invoice_id);
CREATE INDEX idx_payout_items_customer_id ON payout_items(customer_id);
CREATE INDEX idx_payout_items_type ON payout_items(type);
CREATE INDEX idx_payout_items_occurred_at ON payout_items(occurred_at);

-- Enable RLS
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payouts
CREATE POLICY "Users can view payouts from their organization"
    ON payouts FOR SELECT
    USING (
        org_id IN (
            SELECT organization_id 
            FROM organization_staff 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage payouts in their organization"
    ON payouts FOR ALL
    USING (
        org_id IN (
            SELECT organization_id 
            FROM organization_staff 
            WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for payout_items
CREATE POLICY "Users can view payout items from their organization"
    ON payout_items FOR SELECT
    USING (
        org_id IN (
            SELECT organization_id 
            FROM organization_staff 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage payout items in their organization"
    ON payout_items FOR ALL
    USING (
        org_id IN (
            SELECT organization_id 
            FROM organization_staff 
            WHERE user_id = auth.uid()
        )
    );

-- Create view for comprehensive payout reporting
CREATE OR REPLACE VIEW payout_summaries AS
SELECT 
    p.id,
    p.org_id,
    p.processor,
    p.payout_date,
    p.amount_cents,
    p.status,
    p.stripe_payout_id,
    p.gocardless_payout_id,
    p.created_at,
    p.updated_at,
    
    -- Convert to currency units
    ROUND(p.amount_cents::numeric / 100, 2) as amount,
    
    -- Count of items in this payout
    COALESCE(item_counts.item_count, 0) as item_count,
    COALESCE(item_counts.charge_count, 0) as charge_count,
    COALESCE(item_counts.refund_count, 0) as refund_count,
    COALESCE(item_counts.total_fees_cents, 0) as total_fees_cents,
    ROUND(COALESCE(item_counts.total_fees_cents, 0)::numeric / 100, 2) as total_fees,
    
    -- Date grouping fields for reporting
    DATE_TRUNC('year', p.payout_date) as payout_year,
    DATE_TRUNC('month', p.payout_date) as payout_month,
    DATE_TRUNC('week', p.payout_date) as payout_week,
    EXTRACT(DOW FROM p.payout_date) as day_of_week,
    EXTRACT(DAY FROM p.payout_date) as day_of_month

FROM payouts p
LEFT JOIN (
    SELECT 
        payout_id,
        COUNT(*) as item_count,
        SUM(CASE WHEN type = 'charge' THEN 1 ELSE 0 END) as charge_count,
        SUM(CASE WHEN type = 'refund' THEN 1 ELSE 0 END) as refund_count,
        SUM(fee_cents) as total_fees_cents
    FROM payout_items
    GROUP BY payout_id
) item_counts ON p.id = item_counts.payout_id;

-- Enable RLS on the view
ALTER VIEW payout_summaries SET (security_barrier = true);

-- Create RLS policy for the view
CREATE POLICY "Users can view payout summaries from their organization"
    ON payout_summaries FOR SELECT
    USING (
        org_id IN (
            SELECT organization_id 
            FROM organization_staff 
            WHERE user_id = auth.uid()
        )
    );

-- Create view for detailed payout items with customer info
CREATE OR REPLACE VIEW payout_items_detailed AS
SELECT 
    pi.id,
    pi.org_id,
    pi.payout_id,
    pi.invoice_id,
    pi.type,
    pi.customer_id,
    pi.item,
    pi.amount_cents,
    pi.fee_cents,
    pi.occurred_at,
    pi.created_at,
    
    -- Convert to currency units
    ROUND(pi.amount_cents::numeric / 100, 2) as amount,
    ROUND(pi.fee_cents::numeric / 100, 2) as fee,
    
    -- Customer details
    c.first_name,
    c.last_name,
    c.email,
    CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, '')) as customer_name,
    
    -- Payout details
    p.processor,
    p.payout_date,
    p.status as payout_status,
    
    -- Date formatting for display
    pi.occurred_at::date as occurred_date,
    TO_CHAR(pi.occurred_at, 'YYYY-MM-DD HH24:MI') as occurred_datetime

FROM payout_items pi
LEFT JOIN clients c ON pi.customer_id = c.id
LEFT JOIN payouts p ON pi.payout_id = p.id;

-- Enable RLS on the detailed view
ALTER VIEW payout_items_detailed SET (security_barrier = true);

-- Create RLS policy for the detailed view
CREATE POLICY "Users can view detailed payout items from their organization"
    ON payout_items_detailed FOR SELECT
    USING (
        org_id IN (
            SELECT organization_id 
            FROM organization_staff 
            WHERE user_id = auth.uid()
        )
    );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at on payouts
CREATE TRIGGER trigger_payouts_updated_at
    BEFORE UPDATE ON payouts
    FOR EACH ROW
    EXECUTE FUNCTION update_payouts_updated_at();

-- Insert sample data for testing
-- Note: This would typically be populated by webhook data from Stripe/GoCardless

-- Sample Stripe payout
INSERT INTO payouts (org_id, processor, payout_date, amount_cents, status, stripe_payout_id) 
SELECT 
    o.id,
    'stripe'::processor_enum,
    CURRENT_DATE - INTERVAL '7 days',
    125000, -- £1,250.00
    'paid'::payout_status_enum,
    'po_test_stripe_payout_123'
FROM organizations o 
LIMIT 1;

-- Sample GoCardless payout
INSERT INTO payouts (org_id, processor, payout_date, amount_cents, status, gocardless_payout_id) 
SELECT 
    o.id,
    'gocardless'::processor_enum,
    CURRENT_DATE - INTERVAL '14 days',
    87500, -- £875.00
    'paid'::payout_status_enum,
    'PO12345GOCARDLESS'
FROM organizations o 
LIMIT 1;

-- Sample payout items for the Stripe payout
INSERT INTO payout_items (org_id, payout_id, type, customer_id, item, amount_cents, fee_cents, occurred_at)
SELECT 
    p.org_id,
    p.id,
    'charge'::payout_item_type_enum,
    c.id,
    'Monthly Membership - Premium',
    5000, -- £50.00
    145,  -- £1.45 processing fee
    p.payout_date - INTERVAL '3 days'
FROM payouts p
CROSS JOIN clients c
WHERE p.processor = 'stripe' 
  AND c.organization_id = p.org_id
LIMIT 5;

-- Sample refund item
INSERT INTO payout_items (org_id, payout_id, type, customer_id, item, amount_cents, fee_cents, occurred_at)
SELECT 
    p.org_id,
    p.id,
    'refund'::payout_item_type_enum,
    c.id,
    'Refund - Class Cancellation',
    -2500, -- -£25.00 refund
    0,     -- No fee on refunds
    p.payout_date - INTERVAL '1 day'
FROM payouts p
CROSS JOIN clients c
WHERE p.processor = 'stripe' 
  AND c.organization_id = p.org_id
LIMIT 1;

COMMENT ON TABLE payouts IS 'Monthly payouts received from payment processors (Stripe, GoCardless)';
COMMENT ON TABLE payout_items IS 'Detailed breakdown of charges and refunds included in each payout';
COMMENT ON VIEW payout_summaries IS 'Summary view of payouts with aggregated item counts and fees';
COMMENT ON VIEW payout_items_detailed IS 'Detailed view of payout items with customer and payout information';