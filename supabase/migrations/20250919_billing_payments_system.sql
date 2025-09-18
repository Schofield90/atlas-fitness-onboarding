-- Billing Schedules and Pending Payments System
-- This migration creates the tables for upcoming billing schedules and pending payments dashboard

-- Create billing_schedules table
CREATE TABLE IF NOT EXISTS billing_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    customer_membership_id UUID REFERENCES customer_memberships(id) ON DELETE CASCADE,
    due_at TIMESTAMPTZ NOT NULL,
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
    processor TEXT NOT NULL CHECK (processor IN ('stripe', 'gocardless', 'cash', 'account_credit')),
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'paused', 'skipped')),
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create pending_payments table
CREATE TABLE IF NOT EXISTS pending_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    pending_type TEXT NOT NULL CHECK (pending_type IN ('online', 'offline')),
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
    processor TEXT NOT NULL CHECK (processor IN ('stripe', 'gocardless', 'cash', 'account_credit')),
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_billing_schedules_organization_id ON billing_schedules(organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_schedules_due_at ON billing_schedules(due_at);
CREATE INDEX IF NOT EXISTS idx_billing_schedules_customer_id ON billing_schedules(customer_id);
CREATE INDEX IF NOT EXISTS idx_billing_schedules_status ON billing_schedules(status);
CREATE INDEX IF NOT EXISTS idx_billing_schedules_org_due_at ON billing_schedules(organization_id, due_at);

CREATE INDEX IF NOT EXISTS idx_pending_payments_organization_id ON pending_payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_pending_payments_pending_type ON pending_payments(pending_type);
CREATE INDEX IF NOT EXISTS idx_pending_payments_customer_id ON pending_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_pending_payments_created_at ON pending_payments(created_at);

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_billing_schedules_updated_at 
    BEFORE UPDATE ON billing_schedules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pending_payments_updated_at 
    BEFORE UPDATE ON pending_payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE billing_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for billing_schedules
CREATE POLICY "billing_schedules_select_policy" ON billing_schedules
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'staff')
        )
    );

CREATE POLICY "billing_schedules_insert_policy" ON billing_schedules
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "billing_schedules_update_policy" ON billing_schedules
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "billing_schedules_delete_policy" ON billing_schedules
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- RLS policies for pending_payments
CREATE POLICY "pending_payments_select_policy" ON pending_payments
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'staff')
        )
    );

CREATE POLICY "pending_payments_insert_policy" ON pending_payments
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "pending_payments_update_policy" ON pending_payments
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "pending_payments_delete_policy" ON pending_payments
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Create views for easier querying with customer details
CREATE OR REPLACE VIEW billing_schedules_view AS
SELECT 
    bs.*,
    c.first_name,
    c.last_name,
    c.email,
    COALESCE(c.first_name || ' ' || c.last_name, c.email, 'Unknown Customer') as customer_name,
    cm.membership_plan_id,
    mp.name as membership_plan_name,
    mp.price_cents as membership_price_cents,
    ROUND(bs.amount_cents::decimal / 100, 2) as amount
FROM billing_schedules bs
LEFT JOIN clients c ON bs.customer_id = c.id
LEFT JOIN customer_memberships cm ON bs.customer_membership_id = cm.id
LEFT JOIN membership_plans mp ON cm.membership_plan_id = mp.id;

CREATE OR REPLACE VIEW pending_payments_view AS
SELECT 
    pp.*,
    c.first_name,
    c.last_name,
    c.email,
    COALESCE(c.first_name || ' ' || c.last_name, c.email, 'Unknown Customer') as customer_name,
    i.invoice_date,
    i.invoice_number,
    ROUND(pp.amount_cents::decimal / 100, 2) as amount
FROM pending_payments pp
LEFT JOIN clients c ON pp.customer_id = c.id
LEFT JOIN invoices i ON pp.invoice_id = i.id;

-- Grant necessary permissions on views
GRANT SELECT ON billing_schedules_view TO authenticated;
GRANT SELECT ON pending_payments_view TO authenticated;

-- Add some sample data for testing (only if tables are empty)
DO $$
BEGIN
    -- Only insert sample data if the tables are empty
    IF NOT EXISTS (SELECT 1 FROM billing_schedules LIMIT 1) THEN
        -- Get a sample organization (Atlas Fitness)
        INSERT INTO billing_schedules (
            organization_id,
            customer_id,
            customer_membership_id,
            due_at,
            amount_cents,
            processor,
            status,
            description
        )
        SELECT 
            o.id as organization_id,
            c.id as customer_id,
            cm.id as customer_membership_id,
            (CURRENT_DATE + INTERVAL '7 days')::timestamptz as due_at,
            mp.price_cents,
            'stripe' as processor,
            'scheduled' as status,
            'Monthly membership payment' as description
        FROM organizations o
        CROSS JOIN LATERAL (
            SELECT id FROM clients 
            WHERE organization_id = o.id 
            LIMIT 3
        ) c
        LEFT JOIN customer_memberships cm ON cm.customer_id = c.id
        LEFT JOIN membership_plans mp ON cm.membership_plan_id = mp.id
        WHERE o.name ILIKE '%atlas%'
          AND mp.price_cents IS NOT NULL
        LIMIT 5;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pending_payments LIMIT 1) THEN
        -- Add some sample pending payments
        INSERT INTO pending_payments (
            organization_id,
            customer_id,
            pending_type,
            amount_cents,
            processor,
            notes
        )
        SELECT 
            o.id as organization_id,
            c.id as customer_id,
            CASE WHEN random() > 0.5 THEN 'online' ELSE 'offline' END as pending_type,
            (50 + random() * 150) * 100 as amount_cents, -- Random amount between £50-200
            CASE 
                WHEN random() > 0.7 THEN 'stripe'
                WHEN random() > 0.4 THEN 'gocardless'
                ELSE 'cash'
            END as processor,
            'Membership payment pending' as notes
        FROM organizations o
        CROSS JOIN LATERAL (
            SELECT id FROM clients 
            WHERE organization_id = o.id 
            LIMIT 2
        ) c
        WHERE o.name ILIKE '%atlas%'
        LIMIT 3;
    END IF;
END $$;