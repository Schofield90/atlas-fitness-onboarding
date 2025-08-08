-- =============================================
-- PARTIAL MIGRATION: Missing Tables Only
-- This creates only the tables that don't exist yet
-- =============================================

-- Enable required extensions (safe to run multiple times)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- 1. MISSING CORE TABLES
-- =============================================

-- Organization Members (Multi-tenancy junction)
CREATE TABLE IF NOT EXISTS organization_members (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'admin', 'coach', 'staff')),
  permissions JSONB DEFAULT '{}'::jsonb,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, org_id)
);

-- =============================================
-- 2. MISSING CRM TABLES
-- =============================================

-- Opportunities
CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  stage TEXT NOT NULL DEFAULT 'discovery' CHECK (stage IN ('discovery', 'proposal', 'negotiation', 'closed_won', 'closed_lost')),
  value_cents INTEGER DEFAULT 0,
  probability INTEGER DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
  expected_close_date DATE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 3. MISSING BOOKING TABLES
-- =============================================

-- Classes/Services (renamed from programs)
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  duration_minutes INTEGER DEFAULT 60,
  capacity INTEGER DEFAULT 10,
  location TEXT,
  price_cents INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 4. MISSING STAFF & PAYROLL TABLES
-- =============================================

-- Staff
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  pay_rate_cents INTEGER DEFAULT 0,
  employment_type TEXT DEFAULT 'contractor' CHECK (employment_type IN ('employee', 'contractor')),
  commission_rate INTEGER DEFAULT 0 CHECK (commission_rate >= 0 AND commission_rate <= 100),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Timesheets
CREATE TABLE IF NOT EXISTS timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  hours NUMERIC(5,2),
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payroll Batches
CREATE TABLE IF NOT EXISTS payroll_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'completed', 'cancelled')),
  total_cents INTEGER DEFAULT 0,
  processed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 5. MISSING COMMUNICATION TABLES
-- =============================================

-- Email Templates
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 6. MISSING INTEGRATION TABLES
-- =============================================

-- Webhooks
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'meta', 'twilio', 'google', 'xero', 'custom')),
  endpoint_url TEXT,
  secret TEXT,
  events TEXT[],
  active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Integration Tokens
CREATE TABLE IF NOT EXISTS integration_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  scope TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 7. MISSING ANALYTICS & REPORTING TABLES
-- =============================================

-- Daily Metrics (Materialized)
CREATE TABLE IF NOT EXISTS daily_metrics (
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  revenue_cents INTEGER DEFAULT 0,
  new_leads INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  bookings INTEGER DEFAULT 0,
  cancellations INTEGER DEFAULT 0,
  attendance_rate NUMERIC(5,2),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (org_id, metric_date)
);

-- =============================================
-- 8. MISSING AUDIT & COMPLIANCE TABLES
-- =============================================

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data Export Requests
CREATE TABLE IF NOT EXISTS data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  export_url TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- =============================================
-- 9. INDEXES FOR NEW TABLES
-- =============================================

-- Organization members
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(org_id);

-- Opportunities
CREATE INDEX IF NOT EXISTS idx_opportunities_org_id ON opportunities(org_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(org_id, stage);

-- Classes
CREATE INDEX IF NOT EXISTS idx_classes_org_id ON classes(org_id);

-- Staff
CREATE INDEX IF NOT EXISTS idx_staff_org_id ON staff(org_id);
CREATE INDEX IF NOT EXISTS idx_staff_user ON staff(org_id, user_id);

-- Timesheets
CREATE INDEX IF NOT EXISTS idx_timesheets_org_id ON timesheets(org_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_staff ON timesheets(org_id, staff_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_period ON timesheets(org_id, started_at);

-- Email templates
CREATE INDEX IF NOT EXISTS idx_email_templates_org_id ON email_templates(org_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(org_id, category);

-- Webhooks
CREATE INDEX IF NOT EXISTS idx_webhooks_org_id ON webhooks(org_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_provider ON webhooks(org_id, provider);

-- Integration tokens
CREATE INDEX IF NOT EXISTS idx_integration_tokens_org_id ON integration_tokens(org_id);
CREATE INDEX IF NOT EXISTS idx_integration_tokens_provider ON integration_tokens(org_id, provider);

-- Daily metrics
CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON daily_metrics(metric_date);

-- Audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON audit_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(org_id, actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(org_id, resource_type, resource_id);

-- =============================================
-- 10. ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on new tables
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;

-- Helper function if it doesn't exist
CREATE OR REPLACE FUNCTION get_user_orgs(user_uuid UUID)
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT org_id FROM organization_members WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Organization members policies
CREATE POLICY "Users can view org members" ON organization_members
  FOR SELECT USING (org_id IN (SELECT get_user_orgs(auth.uid())));

CREATE POLICY "Admins can manage org members" ON organization_members
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Apply standard org-scoped policies to new tables
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'opportunities', 'classes', 'staff', 'timesheets', 'payroll_batches',
    'email_templates', 'webhooks', 'integration_tokens', 'daily_metrics',
    'audit_logs', 'data_export_requests'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    -- Select policy
    EXECUTE format('
      CREATE POLICY "%s_org_isolation_select" ON %I
      FOR SELECT USING (org_id IN (SELECT get_user_orgs(auth.uid())))
    ', tbl, tbl);
    
    -- Insert policy
    EXECUTE format('
      CREATE POLICY "%s_org_isolation_insert" ON %I
      FOR INSERT WITH CHECK (org_id IN (SELECT get_user_orgs(auth.uid())))
    ', tbl, tbl);
    
    -- Update policy
    EXECUTE format('
      CREATE POLICY "%s_org_isolation_update" ON %I
      FOR UPDATE USING (org_id IN (SELECT get_user_orgs(auth.uid())))
    ', tbl, tbl);
    
    -- Delete policy (admins only)
    EXECUTE format('
      CREATE POLICY "%s_org_isolation_delete" ON %I
      FOR DELETE USING (
        org_id IN (
          SELECT org_id FROM organization_members 
          WHERE user_id = auth.uid() AND role IN (''owner'', ''admin'')
        )
      )
    ', tbl, tbl);
  END LOOP;
END $$;

-- =============================================
-- 11. TRIGGERS FOR NEW TABLES
-- =============================================

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to new tables with updated_at
CREATE TRIGGER update_opportunities_updated_at
  BEFORE UPDATE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_classes_updated_at
  BEFORE UPDATE ON classes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_staff_updated_at
  BEFORE UPDATE ON staff
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_timesheets_updated_at
  BEFORE UPDATE ON timesheets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_payroll_batches_updated_at
  BEFORE UPDATE ON payroll_batches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_webhooks_updated_at
  BEFORE UPDATE ON webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_integration_tokens_updated_at
  BEFORE UPDATE ON integration_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================
-- 12. FUNCTIONS FROM ORIGINAL MIGRATION
-- =============================================

-- Calculate booking capacity (if not exists)
CREATE OR REPLACE FUNCTION get_session_availability(session_uuid UUID)
RETURNS TABLE (
  total_capacity INTEGER,
  booked_count INTEGER,
  waitlist_count INTEGER,
  available_spots INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cs.capacity AS total_capacity,
    COUNT(CASE WHEN b.status = 'booked' THEN 1 END)::INTEGER AS booked_count,
    COUNT(CASE WHEN b.status = 'waitlisted' THEN 1 END)::INTEGER AS waitlist_count,
    GREATEST(0, cs.capacity - COUNT(CASE WHEN b.status = 'booked' THEN 1 END))::INTEGER AS available_spots
  FROM class_sessions cs
  LEFT JOIN bookings b ON b.session_id = cs.id
  WHERE cs.id = session_uuid
  GROUP BY cs.capacity;
END;
$$ LANGUAGE plpgsql;

-- Analytics aggregation function
CREATE OR REPLACE FUNCTION refresh_daily_metrics(target_date DATE, target_org_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO daily_metrics (
    org_id, metric_date, revenue_cents, new_leads, 
    conversions, bookings, cancellations, attendance_rate
  )
  SELECT
    target_org_id,
    target_date,
    -- Revenue (would connect to Stripe in production)
    0 AS revenue_cents,
    -- New leads
    (SELECT COUNT(*) FROM leads 
     WHERE org_id = target_org_id 
     AND DATE(created_at) = target_date),
    -- Conversions
    (SELECT COUNT(*) FROM clients 
     WHERE org_id = target_org_id 
     AND DATE(created_at) = target_date),
    -- Bookings
    (SELECT COUNT(*) FROM bookings 
     WHERE org_id = target_org_id 
     AND DATE(created_at) = target_date),
    -- Cancellations
    (SELECT COUNT(*) FROM bookings 
     WHERE org_id = target_org_id 
     AND DATE(cancelled_at) = target_date),
    -- Attendance rate
    (SELECT 
      CASE 
        WHEN COUNT(*) > 0 THEN 
          (COUNT(CASE WHEN status = 'attended' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC * 100)
        ELSE 0 
      END
     FROM bookings b
     JOIN class_sessions cs ON b.session_id = cs.id
     WHERE b.org_id = target_org_id 
     AND DATE(cs.start_at) = target_date)
  ON CONFLICT (org_id, metric_date) 
  DO UPDATE SET
    revenue_cents = EXCLUDED.revenue_cents,
    new_leads = EXCLUDED.new_leads,
    conversions = EXCLUDED.conversions,
    bookings = EXCLUDED.bookings,
    cancellations = EXCLUDED.cancellations,
    attendance_rate = EXCLUDED.attendance_rate;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 13. PERMISSIONS
-- =============================================

-- Grant permissions to authenticated users
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- =============================================
-- END OF PARTIAL MIGRATION
-- =============================================