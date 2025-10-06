-- Add custom pricing fields to customer_memberships table
-- This allows each client to have their own price override for a membership plan

ALTER TABLE customer_memberships
ADD COLUMN IF NOT EXISTS custom_price_pennies INTEGER,
ADD COLUMN IF NOT EXISTS custom_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS price_override_reason TEXT;

COMMENT ON COLUMN customer_memberships.custom_price_pennies IS 'Client-specific price in pennies (overrides membership_plan price)';
COMMENT ON COLUMN customer_memberships.custom_price IS 'Client-specific price in pounds (overrides membership_plan price)';
COMMENT ON COLUMN customer_memberships.price_override_reason IS 'Reason for custom pricing (e.g., grandfathered, discount, promotion)';

-- Add index for queries that filter by custom pricing
CREATE INDEX IF NOT EXISTS idx_customer_memberships_custom_price
ON customer_memberships(custom_price_pennies)
WHERE custom_price_pennies IS NOT NULL;
