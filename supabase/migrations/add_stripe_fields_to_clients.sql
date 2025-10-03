-- Add Stripe-related fields to clients table for payment method and subscription tracking
-- This supports importing data from GoTeamUp/Stripe without requiring customers to re-enter payment info

ALTER TABLE clients
  -- Stripe customer ID (for linking to Stripe)
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),

  -- Payment method information (from default payment method)
  ADD COLUMN IF NOT EXISTS payment_method_last4 VARCHAR(4),
  ADD COLUMN IF NOT EXISTS payment_method_brand VARCHAR(50),
  ADD COLUMN IF NOT EXISTS payment_method_exp_month INTEGER,
  ADD COLUMN IF NOT EXISTS payment_method_exp_year INTEGER,

  -- Subscription information
  ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMP WITH TIME ZONE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_clients_stripe_customer ON clients(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_clients_stripe_subscription ON clients(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_clients_subscription_status ON clients(subscription_status);

-- Add comment explaining these fields
COMMENT ON COLUMN clients.stripe_customer_id IS 'Stripe customer ID for payment processing';
COMMENT ON COLUMN clients.payment_method_last4 IS 'Last 4 digits of default payment method';
COMMENT ON COLUMN clients.payment_method_brand IS 'Payment method brand (visa, mastercard, etc)';
COMMENT ON COLUMN clients.stripe_subscription_id IS 'Active Stripe subscription ID';
COMMENT ON COLUMN clients.subscription_status IS 'Subscription status (active, trialing, canceled, etc)';
COMMENT ON COLUMN clients.subscription_current_period_end IS 'When current subscription period ends';
