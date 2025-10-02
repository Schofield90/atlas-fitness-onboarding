-- Add missing columns to saas_plans table to match the admin interface

-- Add slug column
ALTER TABLE saas_plans ADD COLUMN IF NOT EXISTS slug TEXT;

-- Add sort_order column for ordering plans
ALTER TABLE saas_plans ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Add Stripe price IDs for monthly and yearly
ALTER TABLE saas_plans ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(255);
ALTER TABLE saas_plans ADD COLUMN IF NOT EXISTS stripe_price_id_yearly VARCHAR(255);

-- Add price_monthly and price_yearly columns (in pennies)
ALTER TABLE saas_plans ADD COLUMN IF NOT EXISTS price_monthly INTEGER;
ALTER TABLE saas_plans ADD COLUMN IF NOT EXISTS price_yearly INTEGER;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_saas_plans_slug ON saas_plans(slug);
CREATE INDEX IF NOT EXISTS idx_saas_plans_sort_order ON saas_plans(sort_order);
CREATE INDEX IF NOT EXISTS idx_saas_plans_stripe_price ON saas_plans(stripe_price_id);
CREATE INDEX IF NOT EXISTS idx_saas_plans_stripe_price_yearly ON saas_plans(stripe_price_id_yearly);

-- Update existing data if any
UPDATE saas_plans
SET
  price_monthly = price_pennies,
  price_yearly = FLOOR(price_pennies * 10), -- 10 months for yearly discount
  slug = LOWER(REPLACE(name, ' ', '-'))
WHERE price_monthly IS NULL;
