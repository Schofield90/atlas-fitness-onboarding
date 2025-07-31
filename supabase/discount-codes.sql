-- Create discount codes table
CREATE TABLE IF NOT EXISTS discount_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value INTEGER NOT NULL, -- In pennies for fixed, percentage for percentage
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_until TIMESTAMP WITH TIME ZONE,
    usage_limit INTEGER,
    times_used INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL,
    UNIQUE(organization_id, code)
);

-- Create discount usage tracking table
CREATE TABLE IF NOT EXISTS discount_code_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    discount_code_id UUID NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL,
    order_id UUID,
    order_type VARCHAR(50), -- 'membership', 'class', 'product', etc.
    original_amount INTEGER NOT NULL, -- In pennies
    discount_amount INTEGER NOT NULL, -- In pennies
    final_amount INTEGER NOT NULL, -- In pennies
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Add indexes
CREATE INDEX idx_discount_codes_organization_id ON discount_codes(organization_id);
CREATE INDEX idx_discount_codes_code ON discount_codes(code);
CREATE INDEX idx_discount_codes_valid_dates ON discount_codes(valid_from, valid_until);
CREATE INDEX idx_discount_code_usage_discount_code_id ON discount_code_usage(discount_code_id);
CREATE INDEX idx_discount_code_usage_customer_id ON discount_code_usage(customer_id);

-- Add RLS policies
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_code_usage ENABLE ROW LEVEL SECURITY;

-- Policies for discount_codes
CREATE POLICY "Users can view discount codes from their organization" ON discount_codes
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_staff WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create discount codes for their organization" ON discount_codes
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_staff WHERE user_id = auth.uid()
        ) AND created_by = auth.uid()
    );

CREATE POLICY "Users can update discount codes from their organization" ON discount_codes
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM organization_staff WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete discount codes from their organization" ON discount_codes
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM organization_staff WHERE user_id = auth.uid()
        )
    );

-- Policies for discount_code_usage
CREATE POLICY "Users can view discount usage from their organization" ON discount_code_usage
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_staff WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "System can track discount usage" ON discount_code_usage
    FOR INSERT WITH CHECK (true);

-- Function to validate and apply discount code
CREATE OR REPLACE FUNCTION validate_discount_code(
    p_organization_id UUID,
    p_code VARCHAR,
    p_amount INTEGER
) RETURNS TABLE (
    is_valid BOOLEAN,
    discount_amount INTEGER,
    final_amount INTEGER,
    discount_id UUID,
    message TEXT
) AS $$
DECLARE
    v_discount RECORD;
    v_discount_amount INTEGER;
    v_final_amount INTEGER;
BEGIN
    -- Find the discount code
    SELECT * INTO v_discount
    FROM discount_codes
    WHERE organization_id = p_organization_id
    AND UPPER(code) = UPPER(p_code)
    AND is_active = true;

    -- Check if code exists
    IF v_discount.id IS NULL THEN
        RETURN QUERY SELECT 
            false::BOOLEAN,
            0::INTEGER,
            p_amount::INTEGER,
            NULL::UUID,
            'Invalid discount code'::TEXT;
        RETURN;
    END IF;

    -- Check if code is within valid date range
    IF v_discount.valid_from IS NOT NULL AND NOW() < v_discount.valid_from THEN
        RETURN QUERY SELECT 
            false::BOOLEAN,
            0::INTEGER,
            p_amount::INTEGER,
            NULL::UUID,
            'Discount code is not yet valid'::TEXT;
        RETURN;
    END IF;

    IF v_discount.valid_until IS NOT NULL AND NOW() > v_discount.valid_until THEN
        RETURN QUERY SELECT 
            false::BOOLEAN,
            0::INTEGER,
            p_amount::INTEGER,
            NULL::UUID,
            'Discount code has expired'::TEXT;
        RETURN;
    END IF;

    -- Check usage limit
    IF v_discount.usage_limit IS NOT NULL AND v_discount.times_used >= v_discount.usage_limit THEN
        RETURN QUERY SELECT 
            false::BOOLEAN,
            0::INTEGER,
            p_amount::INTEGER,
            NULL::UUID,
            'Discount code usage limit reached'::TEXT;
        RETURN;
    END IF;

    -- Calculate discount amount
    IF v_discount.discount_type = 'percentage' THEN
        v_discount_amount := (p_amount * v_discount.discount_value) / 100;
    ELSE -- fixed
        v_discount_amount := v_discount.discount_value;
    END IF;

    -- Ensure discount doesn't exceed original amount
    IF v_discount_amount > p_amount THEN
        v_discount_amount := p_amount;
    END IF;

    v_final_amount := p_amount - v_discount_amount;

    RETURN QUERY SELECT 
        true::BOOLEAN,
        v_discount_amount::INTEGER,
        v_final_amount::INTEGER,
        v_discount.id::UUID,
        'Discount applied successfully'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to record discount usage
CREATE OR REPLACE FUNCTION record_discount_usage(
    p_discount_code_id UUID,
    p_organization_id UUID,
    p_customer_id UUID,
    p_order_id UUID,
    p_order_type VARCHAR,
    p_original_amount INTEGER,
    p_discount_amount INTEGER,
    p_final_amount INTEGER,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
    v_usage_id UUID;
BEGIN
    -- Insert usage record
    INSERT INTO discount_code_usage (
        discount_code_id,
        organization_id,
        customer_id,
        order_id,
        order_type,
        original_amount,
        discount_amount,
        final_amount,
        metadata
    ) VALUES (
        p_discount_code_id,
        p_organization_id,
        p_customer_id,
        p_order_id,
        p_order_type,
        p_original_amount,
        p_discount_amount,
        p_final_amount,
        p_metadata
    ) RETURNING id INTO v_usage_id;

    -- Update times_used counter
    UPDATE discount_codes
    SET times_used = times_used + 1,
        updated_at = NOW()
    WHERE id = p_discount_code_id;

    RETURN v_usage_id;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_discount_codes_updated_at
    BEFORE UPDATE ON discount_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();