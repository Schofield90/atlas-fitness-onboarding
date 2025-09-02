-- =============================================
-- TENANT MANAGEMENT SYSTEM MIGRATION
-- Enhances organizations for GHL-style admin console
-- =============================================

-- =============================================
-- 1. ENHANCE ORGANIZATIONS TABLE
-- =============================================

-- Add tenant management columns to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'suspended', 'churned', 'cancelled'));
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 50 CHECK (risk_score >= 0 AND risk_score <= 100);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS health_score INTEGER DEFAULT 75 CHECK (health_score >= 0 AND health_score <= 100);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS mrr_cents INTEGER DEFAULT 0;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS churn_risk_level TEXT DEFAULT 'low' CHECK (churn_risk_level IN ('low', 'medium', 'high', 'critical'));
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS owner_csm_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS first_payment_at TIMESTAMPTZ;

-- Add tenant metadata fields
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_email TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS company_size TEXT CHECK (company_size IN ('1-10', '11-50', '51-200', '201-500', '500+'));
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS industry TEXT DEFAULT 'fitness';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS country_code TEXT;

-- =============================================
-- 2. ENHANCED PLANS TABLE
-- =============================================

-- Create enhanced plans table that complements saas_plans
CREATE TABLE IF NOT EXISTS tenant_plan_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_slug TEXT NOT NULL REFERENCES saas_plans(slug) ON DELETE CASCADE,
  feature_category TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  feature_value JSONB NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plan_slug, feature_category, feature_key)
);

-- Insert enhanced plan features
INSERT INTO tenant_plan_features (plan_slug, feature_category, feature_key, feature_value) VALUES
-- Trial plan features
('trial', 'limits', 'max_staff', '2'),
('trial', 'limits', 'max_clients', '100'),
('trial', 'limits', 'max_monthly_bookings', '50'),
('trial', 'limits', 'max_automations', '5'),
('trial', 'limits', 'storage_gb', '1'),
('trial', 'communications', 'sms_credits_monthly', '10'),
('trial', 'communications', 'email_credits_monthly', '100'),
('trial', 'features', 'api_access', 'false'),
('trial', 'features', 'white_label', 'false'),
('trial', 'features', 'custom_domain', 'false'),
('trial', 'features', 'priority_support', 'false'),
('trial', 'features', 'advanced_analytics', 'false'),

-- Starter plan features
('starter', 'limits', 'max_staff', '5'),
('starter', 'limits', 'max_clients', '500'),
('starter', 'limits', 'max_monthly_bookings', '500'),
('starter', 'limits', 'max_automations', '25'),
('starter', 'limits', 'storage_gb', '5'),
('starter', 'communications', 'sms_credits_monthly', '100'),
('starter', 'communications', 'email_credits_monthly', '1000'),
('starter', 'features', 'api_access', 'false'),
('starter', 'features', 'white_label', 'false'),
('starter', 'features', 'custom_domain', 'false'),
('starter', 'features', 'priority_support', 'false'),
('starter', 'features', 'advanced_analytics', 'false'),

-- Professional plan features
('professional', 'limits', 'max_staff', '15'),
('professional', 'limits', 'max_clients', '2000'),
('professional', 'limits', 'max_monthly_bookings', '2000'),
('professional', 'limits', 'max_automations', '100'),
('professional', 'limits', 'storage_gb', '20'),
('professional', 'communications', 'sms_credits_monthly', '500'),
('professional', 'communications', 'email_credits_monthly', '5000'),
('professional', 'features', 'api_access', 'true'),
('professional', 'features', 'white_label', 'false'),
('professional', 'features', 'custom_domain', 'true'),
('professional', 'features', 'priority_support', 'true'),
('professional', 'features', 'advanced_analytics', 'true'),

-- Business plan features
('business', 'limits', 'max_staff', '-1'),
('business', 'limits', 'max_clients', '-1'),
('business', 'limits', 'max_monthly_bookings', '-1'),
('business', 'limits', 'max_automations', '-1'),
('business', 'limits', 'storage_gb', '100'),
('business', 'communications', 'sms_credits_monthly', '2000'),
('business', 'communications', 'email_credits_monthly', '20000'),
('business', 'features', 'api_access', 'true'),
('business', 'features', 'white_label', 'true'),
('business', 'features', 'custom_domain', 'true'),
('business', 'features', 'priority_support', 'true'),
('business', 'features', 'advanced_analytics', 'true')
ON CONFLICT (plan_slug, feature_category, feature_key) DO UPDATE SET
  feature_value = EXCLUDED.feature_value,
  updated_at = NOW();

-- =============================================
-- 3. USAGE LEDGER TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS usage_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  usage_type TEXT NOT NULL CHECK (usage_type IN (
    'sms_sent', 'email_sent', 'whatsapp_sent', 'booking_created', 
    'lead_created', 'automation_triggered', 'api_call', 'storage_used',
    'staff_created', 'client_created', 'payment_processed'
  )),
  usage_category TEXT NOT NULL CHECK (usage_category IN ('communication', 'booking', 'crm', 'automation', 'api', 'storage', 'payment')),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_cost_cents INTEGER DEFAULT 0,
  total_cost_cents INTEGER GENERATED ALWAYS AS (quantity * unit_cost_cents) STORED,
  billable BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 4. TENANT RISK SCORES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS tenant_risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  score_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Engagement metrics (0-100)
  login_frequency_score INTEGER DEFAULT 50 CHECK (login_frequency_score >= 0 AND login_frequency_score <= 100),
  feature_adoption_score INTEGER DEFAULT 50 CHECK (feature_adoption_score >= 0 AND feature_adoption_score <= 100),
  booking_activity_score INTEGER DEFAULT 50 CHECK (booking_activity_score >= 0 AND booking_activity_score <= 100),
  communication_usage_score INTEGER DEFAULT 50 CHECK (communication_usage_score >= 0 AND communication_usage_score <= 100),
  
  -- Support metrics (0-100)
  support_ticket_score INTEGER DEFAULT 50 CHECK (support_ticket_score >= 0 AND support_ticket_score <= 100),
  onboarding_progress_score INTEGER DEFAULT 50 CHECK (onboarding_progress_score >= 0 AND onboarding_progress_score <= 100),
  
  -- Financial metrics (0-100)
  payment_health_score INTEGER DEFAULT 50 CHECK (payment_health_score >= 0 AND payment_health_score <= 100),
  usage_growth_score INTEGER DEFAULT 50 CHECK (usage_growth_score >= 0 AND usage_growth_score <= 100),
  
  -- Calculated scores
  overall_health_score INTEGER GENERATED ALWAYS AS (
    ROUND((login_frequency_score + feature_adoption_score + booking_activity_score + 
           communication_usage_score + support_ticket_score + onboarding_progress_score + 
           payment_health_score + usage_growth_score) / 8)
  ) STORED,
  
  churn_probability NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN ((login_frequency_score + feature_adoption_score + booking_activity_score + 
             communication_usage_score + support_ticket_score + onboarding_progress_score + 
             payment_health_score + usage_growth_score) / 8) >= 80 THEN 5.0
      WHEN ((login_frequency_score + feature_adoption_score + booking_activity_score + 
             communication_usage_score + support_ticket_score + onboarding_progress_score + 
             payment_health_score + usage_growth_score) / 8) >= 60 THEN 15.0
      WHEN ((login_frequency_score + feature_adoption_score + booking_activity_score + 
             communication_usage_score + support_ticket_score + onboarding_progress_score + 
             payment_health_score + usage_growth_score) / 8) >= 40 THEN 35.0
      ELSE 60.0
    END
  ) STORED,
  
  risk_factors JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(org_id, score_date)
);

-- =============================================
-- 5. CUSTOMER SUCCESS MANAGER TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS customer_success_managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  max_accounts INTEGER DEFAULT 50,
  timezone TEXT DEFAULT 'UTC',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- =============================================
-- 6. TENANT EVENTS LOG
-- =============================================

CREATE TABLE IF NOT EXISTS tenant_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'trial_started', 'trial_ended', 'subscription_created', 'subscription_cancelled',
    'payment_succeeded', 'payment_failed', 'plan_upgraded', 'plan_downgraded',
    'user_invited', 'feature_enabled', 'feature_disabled', 'support_ticket_created',
    'churn_risk_detected', 'health_score_changed', 'usage_limit_exceeded',
    'onboarding_completed', 'first_booking_created', 'first_payment_processed'
  )),
  event_data JSONB NOT NULL DEFAULT '{}',
  triggered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  impact_score INTEGER DEFAULT 0 CHECK (impact_score >= -100 AND impact_score <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 7. PERFORMANCE INDEXES
-- =============================================

-- Organizations table indexes for admin console
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_organizations_risk_score ON organizations(risk_score);
CREATE INDEX IF NOT EXISTS idx_organizations_health_score ON organizations(health_score);
CREATE INDEX IF NOT EXISTS idx_organizations_churn_risk ON organizations(churn_risk_level);
CREATE INDEX IF NOT EXISTS idx_organizations_csm ON organizations(owner_csm_id);
CREATE INDEX IF NOT EXISTS idx_organizations_mrr ON organizations(mrr_cents DESC);
CREATE INDEX IF NOT EXISTS idx_organizations_last_activity ON organizations(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_organizations_trial_ends ON organizations(trial_ends_at) WHERE trial_ends_at IS NOT NULL;

-- Composite indexes for admin dashboard queries
CREATE INDEX IF NOT EXISTS idx_organizations_status_risk ON organizations(status, churn_risk_level, risk_score);
CREATE INDEX IF NOT EXISTS idx_organizations_csm_status ON organizations(owner_csm_id, status) WHERE owner_csm_id IS NOT NULL;

-- Usage ledger indexes
CREATE INDEX IF NOT EXISTS idx_usage_ledger_org ON usage_ledger(org_id);
CREATE INDEX IF NOT EXISTS idx_usage_ledger_type ON usage_ledger(org_id, usage_type);
CREATE INDEX IF NOT EXISTS idx_usage_ledger_billing_period ON usage_ledger(billing_period_start, billing_period_end);
CREATE INDEX IF NOT EXISTS idx_usage_ledger_recorded ON usage_ledger(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_ledger_billable ON usage_ledger(org_id, billable, billing_period_start) WHERE billable = true;

-- Risk scores indexes
CREATE INDEX IF NOT EXISTS idx_tenant_risk_scores_org ON tenant_risk_scores(org_id);
CREATE INDEX IF NOT EXISTS idx_tenant_risk_scores_date ON tenant_risk_scores(score_date DESC);
CREATE INDEX IF NOT EXISTS idx_tenant_risk_scores_health ON tenant_risk_scores(overall_health_score);
CREATE INDEX IF NOT EXISTS idx_tenant_risk_scores_churn ON tenant_risk_scores(churn_probability DESC);

-- Tenant events indexes
CREATE INDEX IF NOT EXISTS idx_tenant_events_org ON tenant_events(org_id);
CREATE INDEX IF NOT EXISTS idx_tenant_events_type ON tenant_events(event_type);
CREATE INDEX IF NOT EXISTS idx_tenant_events_created ON tenant_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tenant_events_impact ON tenant_events(impact_score DESC);

-- Plan features indexes
CREATE INDEX IF NOT EXISTS idx_tenant_plan_features_plan ON tenant_plan_features(plan_slug);
CREATE INDEX IF NOT EXISTS idx_tenant_plan_features_category ON tenant_plan_features(feature_category);

-- CSM indexes
CREATE INDEX IF NOT EXISTS idx_csm_active ON customer_success_managers(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_csm_user ON customer_success_managers(user_id);

-- =============================================
-- 8. ADMIN VIEWS FOR TENANT MANAGEMENT
-- =============================================

-- Enhanced organization metrics view for admin console
CREATE OR REPLACE VIEW admin_tenant_dashboard AS
SELECT 
  o.id,
  o.name,
  o.slug,
  o.status,
  o.risk_score,
  o.health_score,
  o.churn_risk_level,
  o.mrr_cents,
  o.trial_ends_at,
  o.last_activity_at,
  o.onboarding_completed_at,
  o.first_payment_at,
  o.billing_email,
  o.company_size,
  o.industry,
  o.created_at,
  
  -- CSM information
  csm.name as csm_name,
  csm.email as csm_email,
  
  -- Subscription information
  ss.status as subscription_status,
  sp.name as plan_name,
  sp.price_monthly,
  ss.current_period_end,
  ss.trial_end,
  
  -- Latest risk scores
  trs.overall_health_score as latest_health_score,
  trs.churn_probability as latest_churn_probability,
  trs.calculated_at as risk_score_updated_at,
  
  -- User metrics
  (SELECT COUNT(*) FROM organization_members om WHERE om.org_id = o.id) as total_users,
  (SELECT COUNT(*) FROM organization_members om 
   JOIN users u ON u.id = om.user_id 
   WHERE om.org_id = o.id AND u.last_sign_in_at > NOW() - INTERVAL '7 days') as active_users_7d,
  
  -- Activity metrics
  (SELECT COUNT(*) FROM leads l WHERE l.org_id = o.id AND l.created_at > NOW() - INTERVAL '30 days') as leads_30d,
  (SELECT COUNT(*) FROM bookings b WHERE b.org_id = o.id AND b.created_at > NOW() - INTERVAL '30 days') as bookings_30d,
  (SELECT COUNT(*) FROM messages m WHERE m.org_id = o.id AND m.created_at > NOW() - INTERVAL '30 days') as messages_30d,
  
  -- Usage metrics
  (SELECT COALESCE(SUM(quantity), 0) FROM usage_ledger ul 
   WHERE ul.org_id = o.id AND ul.usage_type = 'sms_sent' 
   AND ul.billing_period_start >= DATE_TRUNC('month', CURRENT_DATE)) as sms_usage_mtd,
  (SELECT COALESCE(SUM(quantity), 0) FROM usage_ledger ul 
   WHERE ul.org_id = o.id AND ul.usage_type = 'email_sent' 
   AND ul.billing_period_start >= DATE_TRUNC('month', CURRENT_DATE)) as email_usage_mtd

FROM organizations o
LEFT JOIN customer_success_managers csm ON csm.user_id = o.owner_csm_id
LEFT JOIN saas_subscriptions ss ON ss.organization_id = o.id
LEFT JOIN saas_plans sp ON sp.id = ss.plan_id
LEFT JOIN tenant_risk_scores trs ON trs.org_id = o.id 
  AND trs.score_date = (SELECT MAX(score_date) FROM tenant_risk_scores WHERE org_id = o.id);

-- Grant access to admin dashboard view
GRANT SELECT ON admin_tenant_dashboard TO authenticated;

-- =============================================
-- 9. ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on new tables
ALTER TABLE tenant_plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_success_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_events ENABLE ROW LEVEL SECURITY;

-- Plan features are public (read-only)
CREATE POLICY "Plan features are publicly readable" ON tenant_plan_features
  FOR SELECT USING (true);

-- Usage ledger: organizations can view their own usage
CREATE POLICY "Organizations can view own usage" ON usage_ledger
  FOR SELECT USING (org_id IN (SELECT get_user_orgs(auth.uid())));

-- System can insert usage records
CREATE POLICY "System can insert usage records" ON usage_ledger
  FOR INSERT WITH CHECK (true);

-- Risk scores: organizations can view their own scores
CREATE POLICY "Organizations can view own risk scores" ON tenant_risk_scores
  FOR SELECT USING (org_id IN (SELECT get_user_orgs(auth.uid())));

-- System can manage risk scores
CREATE POLICY "System can manage risk scores" ON tenant_risk_scores
  FOR ALL WITH CHECK (true);

-- Tenant events: organizations can view their own events
CREATE POLICY "Organizations can view own events" ON tenant_events
  FOR SELECT USING (org_id IN (SELECT get_user_orgs(auth.uid())));

-- CSMs can view their assigned accounts
CREATE POLICY "CSMs can view assigned accounts" ON customer_success_managers
  FOR SELECT USING (user_id = auth.uid() OR is_platform_admin());

-- Super admins can see everything
CREATE POLICY "Super admins can view all usage data" ON usage_ledger
  FOR SELECT USING (is_platform_admin());

CREATE POLICY "Super admins can view all risk scores" ON tenant_risk_scores
  FOR SELECT USING (is_platform_admin());

CREATE POLICY "Super admins can view all tenant events" ON tenant_events
  FOR SELECT USING (is_platform_admin());

CREATE POLICY "Super admins can manage CSMs" ON customer_success_managers
  FOR ALL USING (is_platform_admin());

-- =============================================
-- 10. TRIGGERS AND FUNCTIONS
-- =============================================

-- Function to calculate risk score based on activity
CREATE OR REPLACE FUNCTION calculate_tenant_risk_score(target_org_id UUID)
RETURNS VOID AS $$
DECLARE
  login_score INTEGER := 50;
  feature_score INTEGER := 50;
  booking_score INTEGER := 50;
  comm_score INTEGER := 50;
  support_score INTEGER := 50;
  onboarding_score INTEGER := 50;
  payment_score INTEGER := 50;
  growth_score INTEGER := 50;
  
  days_since_login INTEGER;
  recent_bookings INTEGER;
  recent_messages INTEGER;
  org_age_days INTEGER;
BEGIN
  -- Calculate days since last login
  SELECT EXTRACT(DAY FROM NOW() - MAX(u.last_sign_in_at))::INTEGER
  INTO days_since_login
  FROM users u
  JOIN organization_members om ON om.user_id = u.id
  WHERE om.org_id = target_org_id;
  
  -- Login frequency score
  login_score := CASE
    WHEN days_since_login IS NULL THEN 10
    WHEN days_since_login <= 1 THEN 100
    WHEN days_since_login <= 3 THEN 80
    WHEN days_since_login <= 7 THEN 60
    WHEN days_since_login <= 14 THEN 40
    WHEN days_since_login <= 30 THEN 20
    ELSE 10
  END;
  
  -- Booking activity score
  SELECT COUNT(*)::INTEGER INTO recent_bookings
  FROM bookings WHERE org_id = target_org_id 
  AND created_at > NOW() - INTERVAL '30 days';
  
  booking_score := LEAST(100, GREATEST(10, recent_bookings * 10));
  
  -- Communication usage score
  SELECT COUNT(*)::INTEGER INTO recent_messages
  FROM messages WHERE org_id = target_org_id 
  AND created_at > NOW() - INTERVAL '30 days';
  
  comm_score := LEAST(100, GREATEST(10, recent_messages * 5));
  
  -- Onboarding progress score
  SELECT EXTRACT(DAY FROM NOW() - created_at)::INTEGER
  INTO org_age_days
  FROM organizations WHERE id = target_org_id;
  
  onboarding_score := CASE
    WHEN EXISTS (SELECT 1 FROM organizations WHERE id = target_org_id AND onboarding_completed_at IS NOT NULL) THEN 100
    WHEN org_age_days <= 7 THEN 70
    WHEN org_age_days <= 14 THEN 50
    WHEN org_age_days <= 30 THEN 30
    ELSE 10
  END;
  
  -- Payment health score (simplified)
  SELECT CASE
    WHEN ss.status = 'active' THEN 100
    WHEN ss.status = 'trialing' THEN 70
    WHEN ss.status = 'past_due' THEN 20
    ELSE 10
  END INTO payment_score
  FROM saas_subscriptions ss
  WHERE ss.organization_id = target_org_id;
  
  -- Insert or update risk score
  INSERT INTO tenant_risk_scores (
    org_id,
    login_frequency_score,
    feature_adoption_score,
    booking_activity_score,
    communication_usage_score,
    support_ticket_score,
    onboarding_progress_score,
    payment_health_score,
    usage_growth_score
  ) VALUES (
    target_org_id,
    login_score,
    feature_score,
    booking_score,
    comm_score,
    support_score,
    onboarding_score,
    payment_score,
    growth_score
  )
  ON CONFLICT (org_id, score_date)
  DO UPDATE SET
    login_frequency_score = EXCLUDED.login_frequency_score,
    feature_adoption_score = EXCLUDED.feature_adoption_score,
    booking_activity_score = EXCLUDED.booking_activity_score,
    communication_usage_score = EXCLUDED.communication_usage_score,
    support_ticket_score = EXCLUDED.support_ticket_score,
    onboarding_progress_score = EXCLUDED.onboarding_progress_score,
    payment_health_score = EXCLUDED.payment_health_score,
    usage_growth_score = EXCLUDED.usage_growth_score,
    calculated_at = NOW(),
    updated_at = NOW();
  
  -- Update organization health score and churn risk
  UPDATE organizations SET
    health_score = (SELECT overall_health_score FROM tenant_risk_scores 
                   WHERE org_id = target_org_id AND score_date = CURRENT_DATE),
    churn_risk_level = CASE
      WHEN (SELECT churn_probability FROM tenant_risk_scores 
            WHERE org_id = target_org_id AND score_date = CURRENT_DATE) >= 50 THEN 'critical'
      WHEN (SELECT churn_probability FROM tenant_risk_scores 
            WHERE org_id = target_org_id AND score_date = CURRENT_DATE) >= 30 THEN 'high'
      WHEN (SELECT churn_probability FROM tenant_risk_scores 
            WHERE org_id = target_org_id AND score_date = CURRENT_DATE) >= 15 THEN 'medium'
      ELSE 'low'
    END,
    updated_at = NOW()
  WHERE id = target_org_id;
  
END;
$$ LANGUAGE plpgsql;

-- Function to track usage
CREATE OR REPLACE FUNCTION track_usage(
  target_org_id UUID,
  usage_type_param TEXT,
  quantity_param INTEGER DEFAULT 1,
  metadata_param JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  usage_category_param TEXT;
  current_period_start DATE;
  current_period_end DATE;
  usage_id UUID;
BEGIN
  -- Determine usage category
  usage_category_param := CASE
    WHEN usage_type_param IN ('sms_sent', 'email_sent', 'whatsapp_sent') THEN 'communication'
    WHEN usage_type_param IN ('booking_created') THEN 'booking'
    WHEN usage_type_param IN ('lead_created', 'client_created') THEN 'crm'
    WHEN usage_type_param IN ('automation_triggered') THEN 'automation'
    WHEN usage_type_param IN ('api_call') THEN 'api'
    WHEN usage_type_param IN ('storage_used') THEN 'storage'
    WHEN usage_type_param IN ('payment_processed') THEN 'payment'
    ELSE 'other'
  END;
  
  -- Get current billing period
  current_period_start := DATE_TRUNC('month', CURRENT_DATE);
  current_period_end := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE;
  
  -- Insert usage record
  INSERT INTO usage_ledger (
    org_id,
    usage_type,
    usage_category,
    quantity,
    metadata,
    billing_period_start,
    billing_period_end
  ) VALUES (
    target_org_id,
    usage_type_param,
    usage_category_param,
    quantity_param,
    metadata_param,
    current_period_start,
    current_period_end
  ) RETURNING id INTO usage_id;
  
  RETURN usage_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last_activity_at on organization
CREATE OR REPLACE FUNCTION update_org_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE organizations 
  SET last_activity_at = NOW()
  WHERE id = NEW.org_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply activity trigger to relevant tables
CREATE TRIGGER trigger_update_org_activity_leads
  AFTER INSERT ON leads
  FOR EACH ROW EXECUTE FUNCTION update_org_activity();

CREATE TRIGGER trigger_update_org_activity_bookings
  AFTER INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_org_activity();

CREATE TRIGGER trigger_update_org_activity_messages
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_org_activity();

-- Update triggers for updated_at columns
CREATE TRIGGER update_tenant_plan_features_updated_at
  BEFORE UPDATE ON tenant_plan_features
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tenant_risk_scores_updated_at
  BEFORE UPDATE ON tenant_risk_scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_customer_success_managers_updated_at
  BEFORE UPDATE ON customer_success_managers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- 11. INITIAL DATA AND MIGRATION
-- =============================================

-- Update existing organizations with default values
UPDATE organizations 
SET 
  status = 'trial',
  risk_score = 50,
  health_score = 75,
  churn_risk_level = 'low',
  trial_ends_at = created_at + INTERVAL '14 days',
  last_activity_at = COALESCE(updated_at, created_at)
WHERE status IS NULL;

-- Create initial tenant events for existing organizations
INSERT INTO tenant_events (org_id, event_type, event_data)
SELECT 
  id,
  'trial_started',
  jsonb_build_object(
    'trial_length_days', 14,
    'plan', plan,
    'migrated', true
  )
FROM organizations
WHERE created_at IS NOT NULL
ON CONFLICT DO NOTHING;

-- =============================================
-- END MIGRATION
-- =============================================