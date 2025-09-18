-- Discount Codes Usage Reporting System Migration
-- Creates comprehensive discount tracking for reporting

-- Drop existing tables if they exist
DROP TABLE IF EXISTS discount_code_uses CASCADE;
DROP TABLE IF EXISTS discount_codes CASCADE;

-- Create discount_codes table with enhanced structure for reporting
CREATE TABLE discount_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    group_name VARCHAR(255),
    active BOOLEAN DEFAULT true,
    discount_type discount_type_enum NOT NULL,
    discount_value INTEGER NOT NULL, -- percentage for percentage type, cents for fixed type
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique codes per organization
    UNIQUE(org_id, code)
);

-- Create enum for discount types
CREATE TYPE discount_type_enum AS ENUM ('percentage', 'fixed', 'trial');

-- Recreate discount_codes table with the enum
DROP TABLE IF EXISTS discount_codes CASCADE;
CREATE TABLE discount_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    group_name VARCHAR(255),
    active BOOLEAN DEFAULT true,
    discount_type discount_type_enum NOT NULL,
    discount_value INTEGER NOT NULL, -- percentage for percentage type, cents for fixed type
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique codes per organization
    UNIQUE(org_id, code)
);

-- Create discount_code_uses table for detailed usage tracking
CREATE TABLE discount_code_uses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code_id UUID NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    use_type use_type_enum NOT NULL,
    used_for TEXT, -- Description of what the discount was used for
    used_at TIMESTAMPTZ DEFAULT NOW(),
    invoice_id UUID, -- Reference to invoice where it was applied
    amount_discounted_cents INTEGER NOT NULL -- Amount discounted in cents
);

-- Create enum for use types
CREATE TYPE use_type_enum AS ENUM ('class', 'course', 'membership', 'store');

-- Recreate discount_code_uses table with the enum
DROP TABLE IF EXISTS discount_code_uses CASCADE;
CREATE TABLE discount_code_uses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code_id UUID NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    use_type use_type_enum NOT NULL,
    used_for TEXT, -- Description of what the discount was used for
    used_at TIMESTAMPTZ DEFAULT NOW(),
    invoice_id UUID, -- Reference to invoice where it was applied
    amount_discounted_cents INTEGER NOT NULL -- Amount discounted in cents
);

-- Create indexes for performance
CREATE INDEX idx_discount_codes_org_id ON discount_codes(org_id);
CREATE INDEX idx_discount_codes_code ON discount_codes(code);
CREATE INDEX idx_discount_codes_group_name ON discount_codes(group_name);
CREATE INDEX idx_discount_codes_active ON discount_codes(active);
CREATE INDEX idx_discount_codes_valid_dates ON discount_codes(valid_from, valid_until);

CREATE INDEX idx_discount_code_uses_org_id ON discount_code_uses(org_id);
CREATE INDEX idx_discount_code_uses_code_id ON discount_code_uses(code_id);
CREATE INDEX idx_discount_code_uses_customer_id ON discount_code_uses(customer_id);
CREATE INDEX idx_discount_code_uses_used_at ON discount_code_uses(used_at);
CREATE INDEX idx_discount_code_uses_use_type ON discount_code_uses(use_type);

-- Enable RLS
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_code_uses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for discount_codes
CREATE POLICY "Users can view discount codes from their organization"
    ON discount_codes FOR SELECT
    USING (
        org_id IN (
            SELECT organization_id 
            FROM organization_staff 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage discount codes in their organization"
    ON discount_codes FOR ALL
    USING (
        org_id IN (
            SELECT organization_id 
            FROM organization_staff 
            WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for discount_code_uses
CREATE POLICY "Users can view discount uses from their organization"
    ON discount_code_uses FOR SELECT
    USING (
        org_id IN (
            SELECT organization_id 
            FROM organization_staff 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create discount uses in their organization"
    ON discount_code_uses FOR INSERT
    WITH CHECK (
        org_id IN (
            SELECT organization_id 
            FROM organization_staff 
            WHERE user_id = auth.uid()
        )
    );

-- Create view for comprehensive discount reporting
CREATE OR REPLACE VIEW discount_usage_report AS
SELECT 
    du.id,
    du.org_id,
    du.code_id,
    du.customer_id,
    du.use_type,
    du.used_for,
    du.used_at,
    du.invoice_id,
    du.amount_discounted_cents,
    
    -- Discount code details
    dc.code,
    dc.name as discount_name,
    dc.group_name,
    dc.discount_type,
    dc.discount_value,
    dc.active as code_active,
    
    -- Customer details
    c.first_name,
    c.last_name,
    c.email,
    CONCAT(c.first_name, ' ', c.last_name) as customer_name,
    
    -- Date extraction for grouping
    DATE_TRUNC('year', du.used_at) as use_year,
    DATE_TRUNC('month', du.used_at) as use_month,
    DATE_TRUNC('week', du.used_at) as use_week,
    DATE_TRUNC('day', du.used_at) as use_day,
    EXTRACT(DOW FROM du.used_at) as day_of_week,
    EXTRACT(HOUR FROM du.used_at) as hour_of_day

FROM discount_code_uses du
LEFT JOIN discount_codes dc ON du.code_id = dc.id
LEFT JOIN clients c ON du.customer_id = c.id;

-- Enable RLS on the view
ALTER VIEW discount_usage_report SET (security_barrier = true);

-- Create RLS policy for the view
CREATE POLICY "Users can view discount usage report from their organization"
    ON discount_usage_report FOR SELECT
    USING (
        org_id IN (
            SELECT organization_id 
            FROM organization_staff 
            WHERE user_id = auth.uid()
        )
    );

-- Function to update current_uses when a discount is used
CREATE OR REPLACE FUNCTION update_discount_code_usage()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE discount_codes 
        SET current_uses = current_uses + 1,
            updated_at = NOW()
        WHERE id = NEW.code_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE discount_codes 
        SET current_uses = GREATEST(0, current_uses - 1),
            updated_at = NOW()
        WHERE id = OLD.code_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update usage counts
CREATE TRIGGER trigger_update_discount_code_usage
    AFTER INSERT OR DELETE ON discount_code_uses
    FOR EACH ROW
    EXECUTE FUNCTION update_discount_code_usage();

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at on discount_codes
CREATE TRIGGER trigger_discount_codes_updated_at
    BEFORE UPDATE ON discount_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing (optional)
-- Note: This would typically be done through the application, not migration
-- But included here for initial testing

-- Sample discount codes
INSERT INTO discount_codes (org_id, code, name, group_name, discount_type, discount_value, max_uses) 
SELECT 
    o.id,
    'WELCOME10',
    'Welcome 10% Off',
    'New Member Offers',
    'percentage'::discount_type_enum,
    10,
    100
FROM organizations o 
LIMIT 1;

INSERT INTO discount_codes (org_id, code, name, group_name, discount_type, discount_value, max_uses) 
SELECT 
    o.id,
    'SAVE20',
    'Save $20',
    'General Discounts',
    'fixed'::discount_type_enum,
    2000, -- $20 in cents
    50
FROM organizations o 
LIMIT 1;

INSERT INTO discount_codes (org_id, code, name, group_name, discount_type, discount_value) 
SELECT 
    o.id,
    'TRIAL7',
    '7-Day Free Trial',
    'Trial Offers',
    'trial'::discount_type_enum,
    100 -- 100% off
FROM organizations o 
LIMIT 1;

-- Add some sample usage data
INSERT INTO discount_code_uses (org_id, code_id, customer_id, use_type, used_for, amount_discounted_cents)
SELECT 
    dc.org_id,
    dc.id,
    c.id,
    'membership'::use_type_enum,
    'Monthly Membership',
    CASE 
        WHEN dc.discount_type = 'percentage' THEN (5000 * dc.discount_value / 100)
        ELSE dc.discount_value
    END
FROM discount_codes dc
CROSS JOIN clients c
WHERE c.organization_id = dc.org_id
LIMIT 10;

COMMENT ON TABLE discount_codes IS 'Discount codes available for use in the organization';
COMMENT ON TABLE discount_code_uses IS 'Tracking table for discount code usage';
COMMENT ON VIEW discount_usage_report IS 'Comprehensive view for discount usage reporting';