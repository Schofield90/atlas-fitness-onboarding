-- SaaS Billing & Organization Management System
-- Complete multi-tenant architecture with billing, features, and usage tracking

-- SaaS Plans (Platform Level)
CREATE TABLE IF NOT EXISTS saas_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  price_monthly INTEGER NOT NULL, -- in pence
  price_yearly INTEGER NOT NULL, -- in pence
  stripe_price_id TEXT,
  features JSONB DEFAULT '{}',
  limits JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default SaaS plans
INSERT INTO saas_plans (name, slug, price_monthly, price_yearly, features, limits) VALUES
('Starter', 'starter', 9900, 99000, 
  '{"staff_accounts": 5, "monthly_bookings": 500, "sms_credits": 100, "email_credits": 1000, "custom_forms": 5, "automation_workflows": 3, "api_access": false, "white_label": false, "custom_domain": false}',
  '{"max_customers": 500, "max_classes_per_month": 100, "storage_gb": 5}'
),
('Professional', 'professional', 29900, 299000,
  '{"staff_accounts": 20, "monthly_bookings": 5000, "sms_credits": 500, "email_credits": 10000, "custom_forms": 20, "automation_workflows": 20, "api_access": true, "white_label": true, "custom_domain": false}',
  '{"max_customers": 5000, "max_classes_per_month": 500, "storage_gb": 50}'
),
('Enterprise', 'enterprise', 99900, 999000,
  '{"staff_accounts": -1, "monthly_bookings": -1, "sms_credits": 2000, "email_credits": 50000, "custom_forms": -1, "automation_workflows": -1, "api_access": true, "white_label": true, "custom_domain": true}',
  '{"max_customers": -1, "max_classes_per_month": -1, "storage_gb": 500}'
);

-- Organization Settings (Enhanced)
CREATE TABLE IF NOT EXISTS organization_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Branding
  logo_url TEXT,
  primary_color TEXT DEFAULT '#FF6B00',
  secondary_color TEXT DEFAULT '#1F2937',
  font_family TEXT DEFAULT 'Inter',
  -- Contact Info
  support_email TEXT,
  support_phone TEXT,
  website_url TEXT,
  -- Timezone & Locale
  timezone TEXT DEFAULT 'Europe/London',
  locale TEXT DEFAULT 'en-GB',
  currency TEXT DEFAULT 'GBP',
  -- Features & Integrations
  features JSONB DEFAULT '{}',
  integrations JSONB DEFAULT '{}',
  -- White Label
  custom_domain TEXT,
  custom_email_domain TEXT,
  -- Preferences
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id)
);

-- SaaS Subscriptions
CREATE TABLE IF NOT EXISTS saas_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES saas_plans(id),
  status TEXT NOT NULL CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid')),
  -- Stripe subscription data
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  -- Billing details
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  -- Usage tracking
  usage_updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id)
);

-- Organization Usage Metrics
CREATE TABLE IF NOT EXISTS organization_usage_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  -- Core metrics
  active_customers INTEGER DEFAULT 0,
  active_staff INTEGER DEFAULT 0,
  bookings_created INTEGER DEFAULT 0,
  classes_scheduled INTEGER DEFAULT 0,
  -- Communication metrics
  sms_sent INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  whatsapp_sent INTEGER DEFAULT 0,
  -- Feature usage
  forms_submitted INTEGER DEFAULT 0,
  workflows_executed INTEGER DEFAULT 0,
  reports_generated INTEGER DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  -- Storage
  storage_used_mb INTEGER DEFAULT 0,
  -- Billing metrics
  revenue_processed INTEGER DEFAULT 0, -- in pence
  transactions_processed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, metric_date)
);

-- Organization Payment Settings
CREATE TABLE IF NOT EXISTS organization_payment_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Stripe Connect
  stripe_account_id TEXT UNIQUE,
  stripe_onboarding_completed BOOLEAN DEFAULT false,
  stripe_charges_enabled BOOLEAN DEFAULT false,
  stripe_payouts_enabled BOOLEAN DEFAULT false,
  -- GoCardless
  gocardless_merchant_id TEXT,
  gocardless_access_token TEXT,
  gocardless_webhook_secret TEXT,
  -- Platform commission
  platform_commission_rate DECIMAL(3,2) DEFAULT 0.03, -- 3% default
  -- Settings
  payment_methods_enabled JSONB DEFAULT '{"card": true, "direct_debit": false}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id)
);

-- Organization Features (Feature Flags)
CREATE TABLE IF NOT EXISTS organization_features (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, feature_key)
);

-- SaaS Billing Events (Audit Trail)
CREATE TABLE IF NOT EXISTS saas_billing_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  stripe_event_id TEXT UNIQUE,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization Invoices
CREATE TABLE IF NOT EXISTS organization_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT UNIQUE,
  invoice_number TEXT NOT NULL,
  status TEXT NOT NULL,
  amount_due INTEGER NOT NULL, -- in pence
  amount_paid INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'GBP',
  due_date DATE,
  paid_at TIMESTAMPTZ,
  invoice_pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform Commission Tracking
CREATE TABLE IF NOT EXISTS platform_commissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  transaction_id TEXT NOT NULL,
  transaction_amount INTEGER NOT NULL, -- in pence
  commission_rate DECIMAL(3,2) NOT NULL,
  commission_amount INTEGER NOT NULL, -- in pence
  status TEXT NOT NULL DEFAULT 'pending',
  stripe_transfer_id TEXT,
  transferred_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_saas_subscriptions_org ON saas_subscriptions(organization_id);
CREATE INDEX idx_saas_subscriptions_status ON saas_subscriptions(status);
CREATE INDEX idx_organization_usage_metrics_date ON organization_usage_metrics(organization_id, metric_date);
CREATE INDEX idx_organization_features_lookup ON organization_features(organization_id, feature_key);
CREATE INDEX idx_saas_billing_events_org ON saas_billing_events(organization_id, created_at);

-- Create update triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_saas_plans_updated_at BEFORE UPDATE ON saas_plans
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_settings_updated_at BEFORE UPDATE ON organization_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saas_subscriptions_updated_at BEFORE UPDATE ON saas_subscriptions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_payment_settings_updated_at BEFORE UPDATE ON organization_payment_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_features_updated_at BEFORE UPDATE ON organization_features
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_invoices_updated_at BEFORE UPDATE ON organization_invoices
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE saas_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE saas_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE saas_billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_commissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- SaaS Plans (public read)
CREATE POLICY "Anyone can view active SaaS plans"
  ON saas_plans FOR SELECT
  USING (is_active = true);

-- Organization Settings (org members only)
CREATE POLICY "Organization members can view their settings"
  ON organization_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_organizations.user_id = auth.uid()
      AND user_organizations.organization_id = organization_settings.organization_id
      AND user_organizations.is_active = true
    )
  );

CREATE POLICY "Organization admins can update their settings"
  ON organization_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_organizations.user_id = auth.uid()
      AND user_organizations.organization_id = organization_settings.organization_id
      AND user_organizations.role IN ('owner', 'admin')
      AND user_organizations.is_active = true
    )
  );

-- Similar RLS policies for other tables...

-- Helper Functions

-- Get organization's current plan
CREATE OR REPLACE FUNCTION get_organization_plan(p_organization_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_plan JSONB;
BEGIN
  SELECT jsonb_build_object(
    'plan_name', sp.name,
    'plan_slug', sp.slug,
    'features', sp.features,
    'limits', sp.limits,
    'status', ss.status,
    'current_period_end', ss.current_period_end,
    'cancel_at_period_end', ss.cancel_at_period_end
  ) INTO v_plan
  FROM saas_subscriptions ss
  JOIN saas_plans sp ON sp.id = ss.plan_id
  WHERE ss.organization_id = p_organization_id;
  
  RETURN COALESCE(v_plan, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check feature availability
CREATE OR REPLACE FUNCTION check_organization_feature(
  p_organization_id UUID,
  p_feature_key TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_enabled BOOLEAN;
  v_plan_features JSONB;
BEGIN
  -- Check explicit feature flag first
  SELECT enabled INTO v_enabled
  FROM organization_features
  WHERE organization_id = p_organization_id
  AND feature_key = p_feature_key
  AND (expires_at IS NULL OR expires_at > NOW());
  
  IF v_enabled IS NOT NULL THEN
    RETURN v_enabled;
  END IF;
  
  -- Check plan features
  SELECT sp.features INTO v_plan_features
  FROM saas_subscriptions ss
  JOIN saas_plans sp ON sp.id = ss.plan_id
  WHERE ss.organization_id = p_organization_id
  AND ss.status IN ('active', 'trialing');
  
  IF v_plan_features IS NOT NULL AND v_plan_features ? p_feature_key THEN
    RETURN (v_plan_features->p_feature_key)::boolean;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Track organization usage
CREATE OR REPLACE FUNCTION track_organization_usage(
  p_organization_id UUID,
  p_metric_type TEXT,
  p_increment INTEGER DEFAULT 1
) RETURNS VOID AS $$
BEGIN
  INSERT INTO organization_usage_metrics (
    organization_id,
    metric_date,
    active_customers,
    active_staff,
    bookings_created,
    classes_scheduled,
    sms_sent,
    emails_sent,
    whatsapp_sent,
    forms_submitted,
    workflows_executed,
    reports_generated,
    api_calls
  ) VALUES (
    p_organization_id,
    CURRENT_DATE,
    CASE WHEN p_metric_type = 'active_customers' THEN p_increment ELSE 0 END,
    CASE WHEN p_metric_type = 'active_staff' THEN p_increment ELSE 0 END,
    CASE WHEN p_metric_type = 'bookings_created' THEN p_increment ELSE 0 END,
    CASE WHEN p_metric_type = 'classes_scheduled' THEN p_increment ELSE 0 END,
    CASE WHEN p_metric_type = 'sms_sent' THEN p_increment ELSE 0 END,
    CASE WHEN p_metric_type = 'emails_sent' THEN p_increment ELSE 0 END,
    CASE WHEN p_metric_type = 'whatsapp_sent' THEN p_increment ELSE 0 END,
    CASE WHEN p_metric_type = 'forms_submitted' THEN p_increment ELSE 0 END,
    CASE WHEN p_metric_type = 'workflows_executed' THEN p_increment ELSE 0 END,
    CASE WHEN p_metric_type = 'reports_generated' THEN p_increment ELSE 0 END,
    CASE WHEN p_metric_type = 'api_calls' THEN p_increment ELSE 0 END
  )
  ON CONFLICT (organization_id, metric_date)
  DO UPDATE SET
    active_customers = organization_usage_metrics.active_customers + 
      CASE WHEN p_metric_type = 'active_customers' THEN p_increment ELSE 0 END,
    active_staff = organization_usage_metrics.active_staff + 
      CASE WHEN p_metric_type = 'active_staff' THEN p_increment ELSE 0 END,
    bookings_created = organization_usage_metrics.bookings_created + 
      CASE WHEN p_metric_type = 'bookings_created' THEN p_increment ELSE 0 END,
    classes_scheduled = organization_usage_metrics.classes_scheduled + 
      CASE WHEN p_metric_type = 'classes_scheduled' THEN p_increment ELSE 0 END,
    sms_sent = organization_usage_metrics.sms_sent + 
      CASE WHEN p_metric_type = 'sms_sent' THEN p_increment ELSE 0 END,
    emails_sent = organization_usage_metrics.emails_sent + 
      CASE WHEN p_metric_type = 'emails_sent' THEN p_increment ELSE 0 END,
    whatsapp_sent = organization_usage_metrics.whatsapp_sent + 
      CASE WHEN p_metric_type = 'whatsapp_sent' THEN p_increment ELSE 0 END,
    forms_submitted = organization_usage_metrics.forms_submitted + 
      CASE WHEN p_metric_type = 'forms_submitted' THEN p_increment ELSE 0 END,
    workflows_executed = organization_usage_metrics.workflows_executed + 
      CASE WHEN p_metric_type = 'workflows_executed' THEN p_increment ELSE 0 END,
    reports_generated = organization_usage_metrics.reports_generated + 
      CASE WHEN p_metric_type = 'reports_generated' THEN p_increment ELSE 0 END,
    api_calls = organization_usage_metrics.api_calls + 
      CASE WHEN p_metric_type = 'api_calls' THEN p_increment ELSE 0 END;
  
  -- Update subscription usage timestamp
  UPDATE saas_subscriptions
  SET usage_updated_at = NOW()
  WHERE organization_id = p_organization_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_organization_plan TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION check_organization_feature TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION track_organization_usage TO authenticated, service_role;