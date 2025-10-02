-- Add stripe_product_id column to saas_plans table
-- This column stores the Stripe Product ID for SaaS billing integration

ALTER TABLE saas_plans
ADD COLUMN IF NOT EXISTS stripe_product_id VARCHAR(255);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_saas_plans_stripe_product
ON saas_plans(stripe_product_id);

-- Add comment for documentation
COMMENT ON COLUMN saas_plans.stripe_product_id IS 'Stripe Product ID for this SaaS plan (e.g., prod_xxxxx)';
