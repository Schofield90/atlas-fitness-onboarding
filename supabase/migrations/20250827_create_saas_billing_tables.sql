-- Create SaaS plans table
CREATE TABLE IF NOT EXISTS saas_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10, 2) NOT NULL,
  price_yearly DECIMAL(10, 2) NOT NULL,
  stripe_price_id VARCHAR(255),
  stripe_price_id_yearly VARCHAR(255),
  features JSONB DEFAULT '{}',
  limits JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create SaaS subscriptions table
CREATE TABLE IF NOT EXISTS saas_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES saas_plans(id),
  status VARCHAR(50) NOT NULL DEFAULT 'trialing',
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_customer_id VARCHAR(255),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id)
);

-- Create organization usage metrics table
CREATE TABLE IF NOT EXISTS organization_usage_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  sms_sent INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  whatsapp_sent INTEGER DEFAULT 0,
  bookings_created INTEGER DEFAULT 0,
  active_customers INTEGER DEFAULT 0,
  active_staff INTEGER DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  storage_gb DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, metric_date)
);

-- Create organization payment settings table
CREATE TABLE IF NOT EXISTS organization_payment_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_account_id VARCHAR(255),
  stripe_account_status VARCHAR(50),
  payment_methods JSONB DEFAULT '[]',
  default_payment_method VARCHAR(255),
  billing_email VARCHAR(255),
  billing_address JSONB,
  tax_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id)
);

-- Insert default SaaS plans
INSERT INTO saas_plans (name, slug, description, price_monthly, price_yearly, features, limits) VALUES
('Free Trial', 'trial', 'Perfect for getting started', 0, 0, 
 '{"staff_accounts": 2, "monthly_bookings": 50, "sms_credits": 10, "email_credits": 100, "api_access": false, "white_label": false, "custom_domain": false}',
 '{"max_customers": 100, "max_automations": 5, "storage_gb": 1}'
),
('Starter', 'starter', 'For small gyms and studios', 49, 490,
 '{"staff_accounts": 5, "monthly_bookings": 500, "sms_credits": 100, "email_credits": 1000, "api_access": false, "white_label": false, "custom_domain": false}',
 '{"max_customers": 500, "max_automations": 25, "storage_gb": 5}'
),
('Professional', 'professional', 'For growing fitness businesses', 99, 990,
 '{"staff_accounts": 15, "monthly_bookings": 2000, "sms_credits": 500, "email_credits": 5000, "api_access": true, "white_label": false, "custom_domain": true}',
 '{"max_customers": 2000, "max_automations": 100, "storage_gb": 20}'
),
('Business', 'business', 'For established gyms', 199, 1990,
 '{"staff_accounts": -1, "monthly_bookings": -1, "sms_credits": 2000, "email_credits": 20000, "api_access": true, "white_label": true, "custom_domain": true}',
 '{"max_customers": -1, "max_automations": -1, "storage_gb": 100}'
)
ON CONFLICT (slug) DO UPDATE SET
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  updated_at = CURRENT_TIMESTAMP;

-- Add RLS policies
ALTER TABLE saas_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE saas_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_payment_settings ENABLE ROW LEVEL SECURITY;

-- Public can read plans
CREATE POLICY "Anyone can view plans" ON saas_plans
  FOR SELECT USING (is_active = true);

-- Organizations can view their own subscriptions
CREATE POLICY "Organizations can view own subscriptions" ON saas_subscriptions
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Organizations can view their own metrics
CREATE POLICY "Organizations can view own metrics" ON organization_usage_metrics
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Organizations can view their own payment settings
CREATE POLICY "Organizations can view own payment settings" ON organization_payment_settings
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Create indexes for performance
CREATE INDEX idx_saas_subscriptions_org ON saas_subscriptions(organization_id);
CREATE INDEX idx_saas_subscriptions_status ON saas_subscriptions(status);
CREATE INDEX idx_usage_metrics_org_date ON organization_usage_metrics(organization_id, metric_date);
CREATE INDEX idx_payment_settings_org ON organization_payment_settings(organization_id);