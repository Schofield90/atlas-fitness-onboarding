-- =====================================================
-- COMPLETE PAYMENT SYSTEM MIGRATION
-- Two-rail architecture: SaaS billing + Merchant processing
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- RAIL A: SaaS BILLING TABLES
-- =====================================================

-- Platform customers (one per organization)
CREATE TABLE IF NOT EXISTS billing_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL UNIQUE,
  email text NOT NULL,
  currency text NOT NULL DEFAULT 'gbp',
  tax_exempt text DEFAULT 'none', -- none, exempt, reverse
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id)
);

-- Platform subscription plans
CREATE TABLE IF NOT EXISTS billing_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key text NOT NULL UNIQUE, -- starter_monthly, pro_annual, etc
  stripe_price_id text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'gbp',
  interval text NOT NULL, -- month, year
  interval_count integer DEFAULT 1,
  features jsonb NOT NULL DEFAULT '{}',
  max_clients integer,
  max_staff integer,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Organization subscriptions
CREATE TABLE IF NOT EXISTS billing_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  billing_customer_id uuid NOT NULL REFERENCES billing_customers(id),
  stripe_subscription_id text NOT NULL UNIQUE,
  stripe_price_id text NOT NULL,
  plan_key text NOT NULL REFERENCES billing_plans(plan_key),
  status text NOT NULL, -- trialing, active, past_due, canceled, incomplete
  cancel_at_period_end boolean DEFAULT false,
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  trial_start timestamptz,
  trial_end timestamptz,
  canceled_at timestamptz,
  ended_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- RAIL B: MERCHANT PROCESSING TABLES
-- =====================================================

-- Connected payment accounts (Stripe Connect + GoCardless)
CREATE TABLE IF NOT EXISTS connected_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  
  -- Stripe Connect
  stripe_account_id text UNIQUE,
  stripe_account_status text, -- restricted, pending, enabled
  stripe_charges_enabled boolean DEFAULT false,
  stripe_payouts_enabled boolean DEFAULT false,
  stripe_onboarding_completed boolean DEFAULT false,
  stripe_details_submitted boolean DEFAULT false,
  
  -- GoCardless
  gc_organization_id text UNIQUE,
  gc_access_token text, -- encrypted
  gc_refresh_token text, -- encrypted
  gc_webhook_secret text, -- encrypted
  gc_enabled boolean DEFAULT false,
  gc_verified boolean DEFAULT false,
  gc_creditor_id text,
  
  -- Shared
  default_currency text DEFAULT 'GBP',
  platform_fee_bps integer DEFAULT 300, -- 300 = 3%
  payout_schedule text DEFAULT 'standard', -- standard, manual
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Products/services the gym sells
CREATE TABLE IF NOT EXISTS gym_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  type text NOT NULL, -- membership, class_pack, personal_training, merchandise
  
  -- Pricing
  price_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'GBP',
  billing_interval text, -- one_time, day, week, month, year
  billing_interval_count integer DEFAULT 1,
  trial_period_days integer DEFAULT 0,
  setup_fee_cents integer DEFAULT 0,
  
  -- Payment config
  payment_methods text[] DEFAULT ARRAY['card'], -- card, direct_debit, both
  processor_preference text DEFAULT 'stripe', -- stripe, gocardless
  platform_fee_override_bps integer, -- override default platform fee
  
  -- Stripe product/price IDs (if using Stripe Products API)
  stripe_product_id text,
  stripe_price_id text,
  
  -- GoCardless plan ID (if using GC subscriptions)
  gc_plan_id text,
  
  -- Status
  active boolean DEFAULT true,
  archived boolean DEFAULT false,
  
  -- Metadata
  max_quantity integer DEFAULT 1,
  features jsonb DEFAULT '{}',
  terms_and_conditions text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Client payment methods on file
CREATE TABLE IF NOT EXISTS client_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Stripe payment method
  stripe_payment_method_id text UNIQUE,
  stripe_customer_id text,
  
  -- GoCardless mandate
  gc_mandate_id text UNIQUE,
  gc_customer_id text,
  gc_customer_bank_account_id text,
  
  -- Shared metadata
  type text NOT NULL, -- card, direct_debit
  brand text, -- visa, mastercard, null for direct debit
  last4 text,
  exp_month integer,
  exp_year integer,
  bank_name text, -- for direct debit
  account_holder_name text,
  
  is_default boolean DEFAULT false,
  status text NOT NULL DEFAULT 'active', -- active, expired, canceled
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(organization_id, client_id, stripe_payment_method_id),
  UNIQUE(organization_id, client_id, gc_mandate_id)
);

-- Actual charges/payments
CREATE TABLE IF NOT EXISTS gym_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  product_id uuid REFERENCES gym_products(id) ON DELETE SET NULL,
  payment_method_id uuid REFERENCES client_payment_methods(id) ON DELETE SET NULL,
  
  -- Amount
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'GBP',
  platform_fee_cents integer DEFAULT 0,
  application_fee_cents integer DEFAULT 0,
  net_amount_cents integer NOT NULL, -- amount - fees
  
  -- Processor details
  processor text NOT NULL, -- stripe, gocardless
  processor_payment_id text UNIQUE, -- pi_xxx, PM123456
  processor_charge_id text UNIQUE, -- ch_xxx (Stripe charges)
  processor_transfer_id text, -- tr_xxx (Stripe transfers)
  
  -- Status tracking
  status text NOT NULL, -- pending, processing, succeeded, failed, refunded, partially_refunded
  failure_reason text,
  refund_amount_cents integer DEFAULT 0,
  refunded_at timestamptz,
  
  -- Metadata
  description text,
  statement_descriptor text,
  receipt_email text,
  receipt_url text,
  metadata jsonb DEFAULT '{}',
  
  -- Timestamps
  initiated_at timestamptz DEFAULT now(),
  confirmed_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Recurring subscriptions (gym's clients)
CREATE TABLE IF NOT EXISTS gym_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES gym_products(id),
  payment_method_id uuid REFERENCES client_payment_methods(id),
  
  -- Subscription identifiers
  stripe_subscription_id text UNIQUE,
  gc_subscription_id text UNIQUE,
  
  -- Status
  status text NOT NULL, -- trialing, active, past_due, paused, canceled
  cancel_at_period_end boolean DEFAULT false,
  
  -- Billing cycle
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  billing_cycle_anchor timestamptz,
  
  -- Trial
  trial_start timestamptz,
  trial_end timestamptz,
  
  -- Cancellation
  canceled_at timestamptz,
  cancellation_reason text,
  ended_at timestamptz,
  
  -- Payment history
  last_payment_at timestamptz,
  last_payment_amount_cents integer,
  failed_payment_count integer DEFAULT 0,
  
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- WEBHOOK & EVENT TRACKING
-- =====================================================

-- Webhook events for idempotency
CREATE TABLE IF NOT EXISTS webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL, -- stripe, gocardless
  event_id text NOT NULL,
  event_type text NOT NULL,
  api_version text,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Processing
  status text NOT NULL DEFAULT 'pending', -- pending, processing, processed, failed
  attempts integer DEFAULT 0,
  last_error text,
  
  -- Payload
  payload jsonb NOT NULL,
  headers jsonb,
  
  -- Timestamps
  received_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  failed_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(provider, event_id)
);

-- Failed webhook events (DLQ)
CREATE TABLE IF NOT EXISTS webhook_dlq (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_event_id uuid REFERENCES webhook_events(id),
  provider text NOT NULL,
  event_type text NOT NULL,
  error_message text NOT NULL,
  error_details jsonb,
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  next_retry_at timestamptz,
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Platform revenue tracking
CREATE TABLE IF NOT EXISTS platform_revenue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type text NOT NULL, -- subscription, platform_fee, setup_fee
  
  -- Amounts
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'GBP',
  
  -- Source
  source text NOT NULL, -- stripe, gocardless, manual
  source_id text, -- subscription_id or charge_id
  
  -- Period (for subscriptions)
  period_start timestamptz,
  period_end timestamptz,
  
  -- Status
  status text NOT NULL DEFAULT 'pending', -- pending, collected, failed
  collected_at timestamptz,
  
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_billing_customers_org ON billing_customers(organization_id);
CREATE INDEX idx_billing_customers_stripe ON billing_customers(stripe_customer_id);

CREATE INDEX idx_billing_subscriptions_org ON billing_subscriptions(organization_id);
CREATE INDEX idx_billing_subscriptions_stripe ON billing_subscriptions(stripe_subscription_id);
CREATE INDEX idx_billing_subscriptions_status ON billing_subscriptions(status);

CREATE INDEX idx_connected_accounts_org ON connected_accounts(organization_id);
CREATE INDEX idx_connected_accounts_stripe ON connected_accounts(stripe_account_id);
CREATE INDEX idx_connected_accounts_gc ON connected_accounts(gc_organization_id);

CREATE INDEX idx_gym_products_org ON gym_products(organization_id);
CREATE INDEX idx_gym_products_active ON gym_products(active) WHERE active = true;

CREATE INDEX idx_gym_charges_org ON gym_charges(organization_id);
CREATE INDEX idx_gym_charges_client ON gym_charges(client_id);
CREATE INDEX idx_gym_charges_status ON gym_charges(status);
CREATE INDEX idx_gym_charges_processor ON gym_charges(processor, processor_payment_id);

CREATE INDEX idx_gym_subscriptions_org ON gym_subscriptions(organization_id);
CREATE INDEX idx_gym_subscriptions_client ON gym_subscriptions(client_id);
CREATE INDEX idx_gym_subscriptions_status ON gym_subscriptions(status);

CREATE INDEX idx_webhook_events_provider ON webhook_events(provider, event_id);
CREATE INDEX idx_webhook_events_status ON webhook_events(status) WHERE status = 'pending';

CREATE INDEX idx_platform_revenue_org ON platform_revenue(organization_id);
CREATE INDEX idx_platform_revenue_period ON platform_revenue(period_start, period_end);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_dlq ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_revenue ENABLE ROW LEVEL SECURITY;

-- Helper function to check org membership
CREATE OR REPLACE FUNCTION user_has_org_access(org_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_organizations
    WHERE user_id = auth.uid()
    AND organization_id = org_id
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Billing customers policies
CREATE POLICY "Users can view their org's billing customer"
  ON billing_customers FOR SELECT
  TO authenticated
  USING (user_has_org_access(organization_id));

CREATE POLICY "Users can update their org's billing customer"
  ON billing_customers FOR UPDATE
  TO authenticated
  USING (user_has_org_access(organization_id));

-- Billing plans - public read
CREATE POLICY "Anyone can view active billing plans"
  ON billing_plans FOR SELECT
  TO authenticated
  USING (active = true);

-- Billing subscriptions policies
CREATE POLICY "Users can view their org's subscriptions"
  ON billing_subscriptions FOR SELECT
  TO authenticated
  USING (user_has_org_access(organization_id));

CREATE POLICY "Users can update their org's subscriptions"
  ON billing_subscriptions FOR UPDATE
  TO authenticated
  USING (user_has_org_access(organization_id));

-- Connected accounts policies
CREATE POLICY "Users can view their org's connected accounts"
  ON connected_accounts FOR SELECT
  TO authenticated
  USING (user_has_org_access(organization_id));

CREATE POLICY "Users can update their org's connected accounts"
  ON connected_accounts FOR UPDATE
  TO authenticated
  USING (user_has_org_access(organization_id));

-- Gym products policies
CREATE POLICY "Users can view their org's products"
  ON gym_products FOR SELECT
  TO authenticated
  USING (user_has_org_access(organization_id));

CREATE POLICY "Users can insert products for their org"
  ON gym_products FOR INSERT
  TO authenticated
  WITH CHECK (user_has_org_access(organization_id));

CREATE POLICY "Users can update their org's products"
  ON gym_products FOR UPDATE
  TO authenticated
  USING (user_has_org_access(organization_id));

CREATE POLICY "Users can delete their org's products"
  ON gym_products FOR DELETE
  TO authenticated
  USING (user_has_org_access(organization_id));

-- Client payment methods policies
CREATE POLICY "Users can view payment methods in their org"
  ON client_payment_methods FOR SELECT
  TO authenticated
  USING (user_has_org_access(organization_id));

CREATE POLICY "Users can manage payment methods in their org"
  ON client_payment_methods FOR ALL
  TO authenticated
  USING (user_has_org_access(organization_id));

-- Gym charges policies
CREATE POLICY "Users can view charges in their org"
  ON gym_charges FOR SELECT
  TO authenticated
  USING (user_has_org_access(organization_id));

CREATE POLICY "Users can insert charges for their org"
  ON gym_charges FOR INSERT
  TO authenticated
  WITH CHECK (user_has_org_access(organization_id));

CREATE POLICY "Users can update charges in their org"
  ON gym_charges FOR UPDATE
  TO authenticated
  USING (user_has_org_access(organization_id));

-- Gym subscriptions policies
CREATE POLICY "Users can view subscriptions in their org"
  ON gym_subscriptions FOR SELECT
  TO authenticated
  USING (user_has_org_access(organization_id));

CREATE POLICY "Users can manage subscriptions in their org"
  ON gym_subscriptions FOR ALL
  TO authenticated
  USING (user_has_org_access(organization_id));

-- Webhook events - only service role
CREATE POLICY "Service role can manage webhook events"
  ON webhook_events FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role can manage webhook DLQ"
  ON webhook_dlq FOR ALL
  TO service_role
  USING (true);

-- Platform revenue policies
CREATE POLICY "Users can view their org's platform revenue"
  ON platform_revenue FOR SELECT
  TO authenticated
  USING (user_has_org_access(organization_id));

-- =====================================================
-- SEED DATA FOR BILLING PLANS
-- =====================================================

INSERT INTO billing_plans (plan_key, stripe_price_id, name, description, amount_cents, interval, features, max_clients, max_staff)
VALUES 
  ('starter_monthly', 'price_starter_monthly', 'Starter Monthly', 'Perfect for small gyms', 4900, 'month', 
   '{"crm": true, "booking": true, "basic_automation": true}', 100, 3),
  
  ('starter_annual', 'price_starter_annual', 'Starter Annual', 'Save 2 months with annual billing', 49000, 'year',
   '{"crm": true, "booking": true, "basic_automation": true}', 100, 3),
  
  ('pro_monthly', 'price_pro_monthly', 'Pro Monthly', 'Full features for growing gyms', 9900, 'month',
   '{"crm": true, "booking": true, "automation": true, "ai_features": true, "white_label": false}', 500, 10),
  
  ('pro_annual', 'price_pro_annual', 'Pro Annual', 'Best value with annual billing', 99000, 'year',
   '{"crm": true, "booking": true, "automation": true, "ai_features": true, "white_label": false}', 500, 10),
  
  ('enterprise_monthly', 'price_enterprise_monthly', 'Enterprise Monthly', 'Unlimited everything', 24900, 'month',
   '{"crm": true, "booking": true, "automation": true, "ai_features": true, "white_label": true, "priority_support": true}', 999999, 999999),
  
  ('enterprise_annual', 'price_enterprise_annual', 'Enterprise Annual', 'Maximum savings for large gyms', 249000, 'year',
   '{"crm": true, "booking": true, "automation": true, "ai_features": true, "white_label": true, "priority_support": true}', 999999, 999999)
ON CONFLICT (plan_key) DO NOTHING;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to calculate platform fees
CREATE OR REPLACE FUNCTION calculate_platform_fee(
  amount_cents integer,
  fee_bps integer DEFAULT 300
) RETURNS integer AS $$
BEGIN
  RETURN ROUND(amount_cents * fee_bps / 10000.0);
END;
$$ LANGUAGE plpgsql;

-- Function to encrypt sensitive data
CREATE OR REPLACE FUNCTION encrypt_sensitive(data text)
RETURNS text AS $$
BEGIN
  -- In production, use proper encryption key management
  RETURN encode(pgp_sym_encrypt(data, current_setting('app.encryption_key', true)), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt sensitive data
CREATE OR REPLACE FUNCTION decrypt_sensitive(encrypted_data text)
RETURNS text AS $$
BEGIN
  -- In production, use proper encryption key management
  RETURN pgp_sym_decrypt(decode(encrypted_data, 'hex'), current_setting('app.encryption_key', true));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_billing_customers_updated_at
  BEFORE UPDATE ON billing_customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_billing_subscriptions_updated_at
  BEFORE UPDATE ON billing_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_connected_accounts_updated_at
  BEFORE UPDATE ON connected_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_gym_products_updated_at
  BEFORE UPDATE ON gym_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_client_payment_methods_updated_at
  BEFORE UPDATE ON client_payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_gym_charges_updated_at
  BEFORE UPDATE ON gym_charges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_gym_subscriptions_updated_at
  BEFORE UPDATE ON gym_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();