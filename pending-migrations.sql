-- Pending Database Migrations for Atlas Fitness Platform
-- Run these in your Supabase SQL Editor in order

-- ================================================
-- 1. SaaS Billing System
-- ================================================

-- Create SaaS plans table
CREATE TABLE IF NOT EXISTS saas_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_pennies INTEGER NOT NULL,
  billing_period TEXT NOT NULL DEFAULT 'monthly',
  features JSONB NOT NULL DEFAULT '{}',
  limits JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create SaaS subscriptions table
CREATE TABLE IF NOT EXISTS saas_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES saas_plans(id),
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'trialing',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create organization usage metrics table
CREATE TABLE IF NOT EXISTS organization_usage_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL,
  value INTEGER NOT NULL DEFAULT 0,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_saas_subscriptions_organization_id ON saas_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_saas_subscriptions_status ON saas_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_organization_usage_metrics_organization_id ON organization_usage_metrics(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_usage_metrics_period ON organization_usage_metrics(period_start, period_end);

-- Insert default SaaS plans
INSERT INTO saas_plans (name, description, price_pennies, features, limits) VALUES
('Starter', 'Perfect for small gyms and personal trainers', 9900, 
 '{"features": ["Up to 100 active members", "Basic messaging", "Calendar integration", "Basic reporting"]}',
 '{"sms_credits": 500, "email_credits": 2000, "bookings": 500, "staff_accounts": 2}'
),
('Professional', 'For growing fitness businesses', 29900,
 '{"features": ["Up to 500 active members", "Advanced automation", "Custom branding", "API access", "Priority support"]}',
 '{"sms_credits": 2000, "email_credits": 10000, "bookings": 2000, "staff_accounts": 10}'
),
('Enterprise', 'For large gyms and chains', 99900,
 '{"features": ["Unlimited members", "White label options", "Dedicated support", "Custom integrations", "Advanced analytics"]}',
 '{"sms_credits": 10000, "email_credits": 50000, "bookings": 10000, "staff_accounts": 50}'
)
ON CONFLICT DO NOTHING;

-- ================================================
-- 2. Payment Transactions & Stripe Connect
-- ================================================

-- Create organization payment settings table
CREATE TABLE IF NOT EXISTS organization_payment_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_account_id TEXT UNIQUE,
  stripe_account_type TEXT DEFAULT 'express',
  onboarding_completed BOOLEAN DEFAULT false,
  charges_enabled BOOLEAN DEFAULT false,
  payouts_enabled BOOLEAN DEFAULT false,
  platform_fee_percentage DECIMAL(5,2) DEFAULT 3.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create payment transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES clients(id),
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_charge_id TEXT,
  amount_pennies INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'gbp',
  status TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  platform_fee_pennies INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create platform commissions table
CREATE TABLE IF NOT EXISTS platform_commissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES payment_transactions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  commission_pennies INTEGER NOT NULL,
  commission_percentage DECIMAL(5,2) NOT NULL,
  stripe_transfer_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_organization_payment_settings_organization_id ON organization_payment_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_organization_id ON payment_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_customer_id ON payment_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_platform_commissions_organization_id ON platform_commissions(organization_id);

-- ================================================
-- 3. Google Calendar Watches (Real-time sync)
-- ================================================

-- Create google calendar watches table
CREATE TABLE IF NOT EXISTS google_calendar_watches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  calendar_id TEXT NOT NULL,
  channel_id TEXT NOT NULL UNIQUE,
  resource_id TEXT NOT NULL,
  expiration TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_google_calendar_watches_user_id ON google_calendar_watches(user_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_watches_expiration ON google_calendar_watches(expiration);

-- ================================================
-- 4. LookInBody Integration Tables
-- ================================================

-- Create body composition measurements table
CREATE TABLE IF NOT EXISTS body_composition_measurements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  lookinbody_scan_id TEXT UNIQUE,
  measurement_date TIMESTAMPTZ NOT NULL,
  weight_kg DECIMAL(5,2),
  body_fat_percentage DECIMAL(5,2),
  muscle_mass_kg DECIMAL(5,2),
  visceral_fat_level INTEGER,
  metabolic_age INTEGER,
  body_water_percentage DECIMAL(5,2),
  bone_mass_kg DECIMAL(5,2),
  bmi DECIMAL(5,2),
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create health alerts table
CREATE TABLE IF NOT EXISTS health_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  measurement_id UUID REFERENCES body_composition_measurements(id),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_body_composition_client_id ON body_composition_measurements(client_id);
CREATE INDEX IF NOT EXISTS idx_body_composition_date ON body_composition_measurements(measurement_date);
CREATE INDEX IF NOT EXISTS idx_health_alerts_client_id ON health_alerts(client_id);
CREATE INDEX IF NOT EXISTS idx_health_alerts_resolved ON health_alerts(is_resolved);

-- ================================================
-- 5. Enable Row Level Security (RLS)
-- ================================================

-- Enable RLS on new tables
ALTER TABLE saas_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE saas_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_calendar_watches ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_composition_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_alerts ENABLE ROW LEVEL SECURITY;

-- ================================================
-- 6. Create RLS Policies
-- ================================================

-- SaaS plans policies (public read)
CREATE POLICY "saas_plans_public_read" ON saas_plans
  FOR SELECT USING (is_active = true);

-- SaaS subscriptions policies
CREATE POLICY "saas_subscriptions_org_access" ON saas_subscriptions
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Organization usage metrics policies
CREATE POLICY "usage_metrics_org_access" ON organization_usage_metrics
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid()
    )
  );

-- Payment settings policies
CREATE POLICY "payment_settings_org_access" ON organization_payment_settings
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Payment transactions policies
CREATE POLICY "payment_transactions_org_access" ON payment_transactions
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid()
    )
  );

-- Platform commissions policies (admin only)
CREATE POLICY "platform_commissions_org_access" ON platform_commissions
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Google calendar watches policies
CREATE POLICY "calendar_watches_user_access" ON google_calendar_watches
  FOR ALL USING (user_id = auth.uid());

-- Body composition policies
CREATE POLICY "body_composition_org_access" ON body_composition_measurements
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid()
    )
  );

-- Health alerts policies
CREATE POLICY "health_alerts_org_access" ON health_alerts
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid()
    )
  );

-- ================================================
-- 7. Create Update Triggers
-- ================================================

-- Create update timestamp function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add update triggers
CREATE TRIGGER update_saas_plans_updated_at BEFORE UPDATE ON saas_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saas_subscriptions_updated_at BEFORE UPDATE ON saas_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_payment_settings_updated_at BEFORE UPDATE ON organization_payment_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON payment_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_google_calendar_watches_updated_at BEFORE UPDATE ON google_calendar_watches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_body_composition_measurements_updated_at BEFORE UPDATE ON body_composition_measurements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- Migration Complete!
-- ================================================
-- This file contains all pending migrations for:
-- 1. SaaS billing system with plans and subscriptions
-- 2. Payment transactions and Stripe Connect
-- 3. Google Calendar real-time sync
-- 4. LookInBody body composition integration
-- 5. Complete RLS policies for security