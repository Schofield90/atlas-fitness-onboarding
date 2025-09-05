-- SaaS Billing System Migration
-- This creates a comprehensive billing platform for GymLeadHub

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- BILLING PLANS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS billing_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Plan basics
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_popular BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  
  -- Pricing
  currency VARCHAR(3) DEFAULT 'GBP',
  monthly_price DECIMAL(10,2),
  annual_price DECIMAL(10,2),
  setup_fee DECIMAL(10,2) DEFAULT 0,
  
  -- Stripe IDs
  stripe_monthly_price_id VARCHAR(255),
  stripe_annual_price_id VARCHAR(255),
  stripe_product_id VARCHAR(255),
  
  -- Feature limits
  max_members INTEGER, -- NULL = unlimited
  max_staff INTEGER,
  max_locations INTEGER DEFAULT 1,
  max_classes_per_month INTEGER,
  max_bookings_per_month INTEGER,
  max_automations INTEGER,
  max_workflows INTEGER,
  max_email_sends_per_month INTEGER,
  max_sms_sends_per_month INTEGER,
  max_whatsapp_sends_per_month INTEGER,
  max_ai_credits_per_month INTEGER,
  max_storage_gb DECIMAL(10,2),
  
  -- Feature flags
  features JSONB DEFAULT '{}',
  /* Example features JSON:
  {
    "core": {
      "lead_management": true,
      "booking_system": true,
      "class_scheduling": true,
      "member_portal": true,
      "staff_management": true
    },
    "communication": {
      "email": true,
      "sms": true,
      "whatsapp": true,
      "voice_calls": false,
      "dedicated_email_server": false
    },
    "ai": {
      "lead_scoring": true,
      "content_generation": true,
      "chat_assistant": false,
      "workout_generation": false,
      "nutrition_planning": false
    },
    "integrations": {
      "stripe_payments": true,
      "facebook_ads": true,
      "google_calendar": true,
      "zapier": false,
      "api_access": false
    },
    "support": {
      "email_support": true,
      "priority_support": false,
      "phone_support": false,
      "dedicated_account_manager": false,
      "onboarding_assistance": false
    },
    "advanced": {
      "custom_domain": false,
      "white_label": false,
      "multi_location": false,
      "franchise_mode": false,
      "custom_integrations": false
    }
  }
  */
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BILLING SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS billing_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES billing_plans(id),
  
  -- Subscription details
  status VARCHAR(50) NOT NULL DEFAULT 'trialing',
  -- statuses: trialing, active, past_due, canceled, incomplete, incomplete_expired, unpaid, paused
  
  billing_cycle VARCHAR(20) NOT NULL, -- monthly, annual
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  
  -- Stripe
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_customer_id VARCHAR(255),
  stripe_payment_method_id VARCHAR(255),
  
  -- Pricing at time of subscription (for historical tracking)
  price_per_period DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'GBP',
  
  -- Discount/Promo
  discount_percentage DECIMAL(5,2),
  discount_amount DECIMAL(10,2),
  promo_code VARCHAR(50),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id)
);

-- ============================================
-- BILLING USAGE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS billing_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES billing_subscriptions(id) ON DELETE SET NULL,
  
  -- Period
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  
  -- Usage counts
  members_count INTEGER DEFAULT 0,
  staff_count INTEGER DEFAULT 0,
  classes_count INTEGER DEFAULT 0,
  bookings_count INTEGER DEFAULT 0,
  automations_run_count INTEGER DEFAULT 0,
  emails_sent_count INTEGER DEFAULT 0,
  sms_sent_count INTEGER DEFAULT 0,
  whatsapp_sent_count INTEGER DEFAULT 0,
  ai_credits_used INTEGER DEFAULT 0,
  storage_used_gb DECIMAL(10,2) DEFAULT 0,
  
  -- Overage charges (if applicable)
  overage_charges JSONB DEFAULT '{}',
  total_overage_amount DECIMAL(10,2) DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, period_start, period_end)
);

-- ============================================
-- BILLING INVOICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS billing_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES billing_subscriptions(id) ON DELETE SET NULL,
  
  -- Invoice details
  invoice_number VARCHAR(50) UNIQUE,
  status VARCHAR(50) NOT NULL, -- draft, open, paid, void, uncollectible
  
  -- Amounts
  subtotal DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  amount_due DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'GBP',
  
  -- Dates
  invoice_date TIMESTAMPTZ NOT NULL,
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  
  -- Stripe
  stripe_invoice_id VARCHAR(255) UNIQUE,
  stripe_payment_intent_id VARCHAR(255),
  payment_method_type VARCHAR(50),
  
  -- Line items stored as JSONB for flexibility
  line_items JSONB DEFAULT '[]',
  
  -- PDF
  invoice_pdf_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PAYMENT METHODS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS billing_payment_methods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Method details
  type VARCHAR(50) NOT NULL, -- card, bank_transfer, direct_debit
  is_default BOOLEAN DEFAULT false,
  
  -- Card details (encrypted/masked)
  card_brand VARCHAR(50),
  card_last4 VARCHAR(4),
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  
  -- Bank details (encrypted/masked)
  bank_name VARCHAR(100),
  bank_last4 VARCHAR(4),
  
  -- Stripe
  stripe_payment_method_id VARCHAR(255) UNIQUE,
  
  -- Status
  status VARCHAR(50) DEFAULT 'active', -- active, expired, failed
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PROMO CODES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS billing_promo_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  
  -- Discount
  discount_type VARCHAR(20) NOT NULL, -- percentage, fixed_amount
  discount_value DECIMAL(10,2) NOT NULL,
  
  -- Applicability
  applicable_plans UUID[] DEFAULT ARRAY[]::UUID[], -- empty = all plans
  minimum_amount DECIMAL(10,2),
  
  -- Usage limits
  max_uses INTEGER,
  uses_count INTEGER DEFAULT 0,
  max_uses_per_customer INTEGER DEFAULT 1,
  
  -- Validity
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BILLING EVENTS/AUDIT LOG
-- ============================================
CREATE TABLE IF NOT EXISTS billing_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES billing_subscriptions(id) ON DELETE CASCADE,
  
  event_type VARCHAR(50) NOT NULL,
  -- Types: subscription_created, subscription_updated, subscription_canceled, 
  -- payment_succeeded, payment_failed, plan_changed, trial_ended, etc.
  
  event_data JSONB DEFAULT '{}',
  stripe_event_id VARCHAR(255),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USAGE LIMITS TRACKING (Real-time)
-- ============================================
CREATE TABLE IF NOT EXISTS billing_usage_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  resource_type VARCHAR(50) NOT NULL,
  -- Types: members, staff, emails, sms, whatsapp, ai_credits, storage, etc.
  
  current_usage INTEGER DEFAULT 0,
  limit_amount INTEGER,
  reset_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, resource_type)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_billing_subscriptions_org ON billing_subscriptions(organization_id);
CREATE INDEX idx_billing_subscriptions_status ON billing_subscriptions(status);
CREATE INDEX idx_billing_subscriptions_stripe ON billing_subscriptions(stripe_subscription_id);
CREATE INDEX idx_billing_usage_org_period ON billing_usage(organization_id, period_start, period_end);
CREATE INDEX idx_billing_invoices_org ON billing_invoices(organization_id);
CREATE INDEX idx_billing_invoices_status ON billing_invoices(status);
CREATE INDEX idx_billing_payment_methods_org ON billing_payment_methods(organization_id);
CREATE INDEX idx_billing_events_org ON billing_events(organization_id);
CREATE INDEX idx_billing_usage_tracking_org ON billing_usage_tracking(organization_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_usage_tracking ENABLE ROW LEVEL SECURITY;

-- Public can view active plans
CREATE POLICY "Public can view active billing plans" ON billing_plans
  FOR SELECT
  USING (is_active = true);

-- Organizations can view their own subscription data
CREATE POLICY "Organizations view own subscriptions" ON billing_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid()
    )
  );

-- Organizations can view their own usage
CREATE POLICY "Organizations view own usage" ON billing_usage
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid()
    )
  );

-- Organizations can view their own invoices
CREATE POLICY "Organizations view own invoices" ON billing_invoices
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid()
    )
  );

-- Organizations can manage their payment methods
CREATE POLICY "Organizations manage own payment methods" ON billing_payment_methods
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to check if organization has feature access
CREATE OR REPLACE FUNCTION check_feature_access(
  p_organization_id UUID,
  p_feature_path TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_features JSONB;
  v_feature_parts TEXT[];
  v_current_value JSONB;
BEGIN
  -- Get the features from the organization's current plan
  SELECT p.features INTO v_features
  FROM billing_subscriptions s
  JOIN billing_plans p ON s.plan_id = p.id
  WHERE s.organization_id = p_organization_id
    AND s.status IN ('trialing', 'active');
  
  IF v_features IS NULL THEN
    RETURN false;
  END IF;
  
  -- Navigate the JSON path
  v_feature_parts := string_to_array(p_feature_path, '.');
  v_current_value := v_features;
  
  FOR i IN 1..array_length(v_feature_parts, 1) LOOP
    v_current_value := v_current_value->v_feature_parts[i];
    IF v_current_value IS NULL THEN
      RETURN false;
    END IF;
  END LOOP;
  
  RETURN v_current_value::boolean;
END;
$$ LANGUAGE plpgsql;

-- Function to check usage limits
CREATE OR REPLACE FUNCTION check_usage_limit(
  p_organization_id UUID,
  p_resource_type TEXT
) RETURNS TABLE(
  is_within_limit BOOLEAN,
  current_usage INTEGER,
  limit_amount INTEGER,
  remaining INTEGER
) AS $$
DECLARE
  v_current_usage INTEGER;
  v_limit INTEGER;
  v_column_name TEXT;
BEGIN
  -- Map resource type to plan column
  v_column_name := CASE p_resource_type
    WHEN 'members' THEN 'max_members'
    WHEN 'staff' THEN 'max_staff'
    WHEN 'emails' THEN 'max_email_sends_per_month'
    WHEN 'sms' THEN 'max_sms_sends_per_month'
    WHEN 'whatsapp' THEN 'max_whatsapp_sends_per_month'
    WHEN 'ai_credits' THEN 'max_ai_credits_per_month'
    ELSE NULL
  END;
  
  -- Get current usage
  SELECT current_usage INTO v_current_usage
  FROM billing_usage_tracking
  WHERE organization_id = p_organization_id
    AND resource_type = p_resource_type;
  
  -- Get limit from plan
  EXECUTE format('
    SELECT %I FROM billing_plans p
    JOIN billing_subscriptions s ON s.plan_id = p.id
    WHERE s.organization_id = $1
      AND s.status IN (''trialing'', ''active'')
  ', v_column_name)
  INTO v_limit
  USING p_organization_id;
  
  -- Return results
  RETURN QUERY
  SELECT 
    COALESCE(v_limit IS NULL OR v_current_usage < v_limit, true),
    COALESCE(v_current_usage, 0),
    v_limit,
    CASE 
      WHEN v_limit IS NULL THEN NULL 
      ELSE v_limit - COALESCE(v_current_usage, 0) 
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to increment usage
CREATE OR REPLACE FUNCTION increment_usage(
  p_organization_id UUID,
  p_resource_type TEXT,
  p_amount INTEGER DEFAULT 1
) RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO billing_usage_tracking (
    organization_id, 
    resource_type, 
    current_usage,
    updated_at
  )
  VALUES (
    p_organization_id, 
    p_resource_type, 
    p_amount,
    NOW()
  )
  ON CONFLICT (organization_id, resource_type)
  DO UPDATE SET
    current_usage = billing_usage_tracking.current_usage + p_amount,
    updated_at = NOW();
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- DEFAULT PLANS (Seed Data)
-- ============================================
INSERT INTO billing_plans (
  name, slug, description, is_active, is_popular, sort_order,
  monthly_price, annual_price,
  max_members, max_staff, max_locations, max_classes_per_month, max_bookings_per_month,
  max_automations, max_workflows, max_email_sends_per_month, max_sms_sends_per_month, 
  max_whatsapp_sends_per_month, max_ai_credits_per_month, max_storage_gb,
  features
) VALUES
-- Starter Plan
(
  'Starter', 'starter', 'Perfect for small gyms just getting started', true, false, 1,
  49.00, 470.00,
  100, 2, 1, 50, 500,
  5, 3, 500, 0, 0, 100, 5,
  '{
    "core": {
      "lead_management": true,
      "booking_system": true,
      "class_scheduling": true,
      "member_portal": true,
      "staff_management": false
    },
    "communication": {
      "email": true,
      "sms": false,
      "whatsapp": false,
      "voice_calls": false,
      "dedicated_email_server": false
    },
    "ai": {
      "lead_scoring": true,
      "content_generation": false,
      "chat_assistant": false,
      "workout_generation": false,
      "nutrition_planning": false
    },
    "integrations": {
      "stripe_payments": true,
      "facebook_ads": false,
      "google_calendar": true,
      "zapier": false,
      "api_access": false
    },
    "support": {
      "email_support": true,
      "priority_support": false,
      "phone_support": false,
      "dedicated_account_manager": false,
      "onboarding_assistance": false
    }
  }'::jsonb
),
-- Growth Plan
(
  'Growth', 'growth', 'For growing gyms ready to scale', true, true, 2,
  99.00, 950.00,
  500, 5, 1, 200, 2000,
  20, 10, 2000, 500, 500, 500, 25,
  '{
    "core": {
      "lead_management": true,
      "booking_system": true,
      "class_scheduling": true,
      "member_portal": true,
      "staff_management": true
    },
    "communication": {
      "email": true,
      "sms": true,
      "whatsapp": true,
      "voice_calls": false,
      "dedicated_email_server": false
    },
    "ai": {
      "lead_scoring": true,
      "content_generation": true,
      "chat_assistant": false,
      "workout_generation": true,
      "nutrition_planning": false
    },
    "integrations": {
      "stripe_payments": true,
      "facebook_ads": true,
      "google_calendar": true,
      "zapier": false,
      "api_access": false
    },
    "support": {
      "email_support": true,
      "priority_support": true,
      "phone_support": false,
      "dedicated_account_manager": false,
      "onboarding_assistance": true
    }
  }'::jsonb
),
-- Professional Plan
(
  'Professional', 'professional', 'Full-featured for established gyms', true, false, 3,
  199.00, 1910.00,
  2000, 15, 3, NULL, NULL,
  NULL, 50, 10000, 2000, 2000, 2000, 100,
  '{
    "core": {
      "lead_management": true,
      "booking_system": true,
      "class_scheduling": true,
      "member_portal": true,
      "staff_management": true
    },
    "communication": {
      "email": true,
      "sms": true,
      "whatsapp": true,
      "voice_calls": true,
      "dedicated_email_server": true
    },
    "ai": {
      "lead_scoring": true,
      "content_generation": true,
      "chat_assistant": true,
      "workout_generation": true,
      "nutrition_planning": true
    },
    "integrations": {
      "stripe_payments": true,
      "facebook_ads": true,
      "google_calendar": true,
      "zapier": true,
      "api_access": true
    },
    "support": {
      "email_support": true,
      "priority_support": true,
      "phone_support": true,
      "dedicated_account_manager": false,
      "onboarding_assistance": true
    },
    "advanced": {
      "custom_domain": true,
      "white_label": false,
      "multi_location": true,
      "franchise_mode": false,
      "custom_integrations": false
    }
  }'::jsonb
),
-- Enterprise Plan
(
  'Enterprise', 'enterprise', 'Custom solutions for gym chains', true, false, 4,
  NULL, NULL, -- Custom pricing
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  '{
    "core": {
      "lead_management": true,
      "booking_system": true,
      "class_scheduling": true,
      "member_portal": true,
      "staff_management": true
    },
    "communication": {
      "email": true,
      "sms": true,
      "whatsapp": true,
      "voice_calls": true,
      "dedicated_email_server": true
    },
    "ai": {
      "lead_scoring": true,
      "content_generation": true,
      "chat_assistant": true,
      "workout_generation": true,
      "nutrition_planning": true
    },
    "integrations": {
      "stripe_payments": true,
      "facebook_ads": true,
      "google_calendar": true,
      "zapier": true,
      "api_access": true
    },
    "support": {
      "email_support": true,
      "priority_support": true,
      "phone_support": true,
      "dedicated_account_manager": true,
      "onboarding_assistance": true
    },
    "advanced": {
      "custom_domain": true,
      "white_label": true,
      "multi_location": true,
      "franchise_mode": true,
      "custom_integrations": true
    }
  }'::jsonb
);

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_billing_plans_updated_at BEFORE UPDATE ON billing_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_billing_subscriptions_updated_at BEFORE UPDATE ON billing_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_billing_usage_updated_at BEFORE UPDATE ON billing_usage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_billing_invoices_updated_at BEFORE UPDATE ON billing_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_billing_payment_methods_updated_at BEFORE UPDATE ON billing_payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_billing_promo_codes_updated_at BEFORE UPDATE ON billing_promo_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_billing_usage_tracking_updated_at BEFORE UPDATE ON billing_usage_tracking
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();