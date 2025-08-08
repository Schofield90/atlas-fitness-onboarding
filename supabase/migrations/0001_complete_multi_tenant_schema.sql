-- =============================================
-- COMPLETE MULTI-TENANT CRM + BOOKING SAAS
-- Migration: 0001_complete_multi_tenant_schema
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- 1. CORE TABLES
-- =============================================

-- Organizations (Tenants)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9-]+$'),
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'enterprise')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (Auth managed by Supabase)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
-- 2. CRM TABLES
-- =============================================

-- Leads
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  source TEXT,
  tags TEXT[] DEFAULT '{}',
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  membership_tier TEXT,
  stripe_customer_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
-- 3. BOOKING SYSTEM TABLES
-- =============================================

-- Classes/Services
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

-- Class Sessions (Scheduled instances)
CREATE TABLE IF NOT EXISTS class_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  instructor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  capacity INTEGER NOT NULL,
  waitlist_enabled BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'cancelled', 'waitlisted', 'attended', 'no_show')),
  cancelled_at TIMESTAMPTZ,
  attended_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 4. STAFF & PAYROLL TABLES
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
-- 5. COMMUNICATION TABLES
-- =============================================

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  recipient TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp')),
  template_id UUID,
  subject TEXT,
  body TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  sent_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
-- 6. WORKFLOW AUTOMATION TABLES
-- =============================================

-- Workflows
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB NOT NULL,
  actions JSONB NOT NULL,
  conditions JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow Executions
CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  trigger_data JSONB,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- =============================================
-- 7. INTEGRATION TABLES
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
-- 8. ANALYTICS & REPORTING TABLES
-- =============================================

-- Analytics Events
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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
-- 9. AUDIT & COMPLIANCE TABLES
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
-- 10. INDEXES
-- =============================================

-- Organization indexes
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_plan ON organizations(plan);

-- Multi-tenant indexes (org_id on all tables)
CREATE INDEX idx_leads_org_id ON leads(org_id);
CREATE INDEX idx_leads_status ON leads(org_id, status);
CREATE INDEX idx_leads_assigned ON leads(org_id, assigned_to);
CREATE INDEX idx_leads_tags ON leads USING gin(tags);

CREATE INDEX idx_clients_org_id ON clients(org_id);
CREATE INDEX idx_clients_email ON clients(org_id, email);

CREATE INDEX idx_opportunities_org_id ON opportunities(org_id);
CREATE INDEX idx_opportunities_stage ON opportunities(org_id, stage);

CREATE INDEX idx_classes_org_id ON classes(org_id);
CREATE INDEX idx_class_sessions_org_id ON class_sessions(org_id);
CREATE INDEX idx_class_sessions_start ON class_sessions(org_id, start_at);
CREATE INDEX idx_class_sessions_instructor ON class_sessions(org_id, instructor_id);

CREATE INDEX idx_bookings_org_id ON bookings(org_id);
CREATE INDEX idx_bookings_session ON bookings(org_id, session_id);
CREATE INDEX idx_bookings_client ON bookings(org_id, client_id);
CREATE INDEX idx_bookings_status ON bookings(org_id, status);

CREATE INDEX idx_staff_org_id ON staff(org_id);
CREATE INDEX idx_staff_user ON staff(org_id, user_id);

CREATE INDEX idx_timesheets_org_id ON timesheets(org_id);
CREATE INDEX idx_timesheets_staff ON timesheets(org_id, staff_id);
CREATE INDEX idx_timesheets_period ON timesheets(org_id, started_at);

CREATE INDEX idx_messages_org_id ON messages(org_id);
CREATE INDEX idx_messages_status ON messages(org_id, status);
CREATE INDEX idx_messages_created ON messages(org_id, created_at);

CREATE INDEX idx_workflows_org_id ON workflows(org_id);
CREATE INDEX idx_workflows_active ON workflows(org_id, active);

CREATE INDEX idx_analytics_events_org_id ON analytics_events(org_id);
CREATE INDEX idx_analytics_events_type ON analytics_events(org_id, event_type);
CREATE INDEX idx_analytics_events_created ON analytics_events(org_id, created_at);

CREATE INDEX idx_audit_logs_org_id ON audit_logs(org_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs(org_id, actor_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(org_id, resource_type, resource_id);

-- =============================================
-- 11. ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's organizations
CREATE OR REPLACE FUNCTION get_user_orgs(user_uuid UUID)
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT org_id FROM organization_members WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Organizations policies
CREATE POLICY "Users can view their organizations" ON organizations
  FOR SELECT USING (id IN (SELECT get_user_orgs(auth.uid())));

CREATE POLICY "Owners can update organizations" ON organizations
  FOR UPDATE USING (
    id IN (
      SELECT org_id FROM organization_members 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

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

-- Generic org-scoped table policy template (apply to all org-scoped tables)
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'leads', 'clients', 'opportunities', 'classes', 'class_sessions', 
    'bookings', 'staff', 'timesheets', 'payroll_batches', 'messages',
    'email_templates', 'workflows', 'workflow_executions', 'webhooks',
    'integration_tokens', 'analytics_events', 'daily_metrics', 'audit_logs',
    'data_export_requests'
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
-- 12. TRIGGERS
-- =============================================

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables with updated_at column
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'organizations', 'users', 'leads', 'clients', 'opportunities',
    'classes', 'class_sessions', 'bookings', 'staff', 'timesheets',
    'payroll_batches', 'messages', 'email_templates', 'workflows',
    'webhooks', 'integration_tokens'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    EXECUTE format('
      CREATE TRIGGER update_%s_updated_at
      BEFORE UPDATE ON %I
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at()
    ', tbl, tbl);
  END LOOP;
END $$;

-- Audit log trigger
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (org_id, actor_id, action, resource_type, resource_id, details)
    VALUES (
      NEW.org_id,
      auth.uid(),
      'create',
      TG_TABLE_NAME,
      NEW.id,
      jsonb_build_object('new', to_jsonb(NEW))
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (org_id, actor_id, action, resource_type, resource_id, details)
    VALUES (
      NEW.org_id,
      auth.uid(),
      'update',
      TG_TABLE_NAME,
      NEW.id,
      jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (org_id, actor_id, action, resource_type, resource_id, details)
    VALUES (
      OLD.org_id,
      auth.uid(),
      'delete',
      TG_TABLE_NAME,
      OLD.id,
      jsonb_build_object('old', to_jsonb(OLD))
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to sensitive tables
CREATE TRIGGER audit_clients AFTER INSERT OR UPDATE OR DELETE ON clients
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_staff AFTER INSERT OR UPDATE OR DELETE ON staff
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_payroll AFTER INSERT OR UPDATE OR DELETE ON payroll_batches
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- =============================================
-- 13. FUNCTIONS
-- =============================================

-- Calculate booking capacity
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

-- Lead scoring function
CREATE OR REPLACE FUNCTION calculate_lead_score(lead_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
  lead_data RECORD;
BEGIN
  SELECT * INTO lead_data FROM leads WHERE id = lead_uuid;
  
  -- Base scoring rules
  IF lead_data.email IS NOT NULL THEN score := score + 10; END IF;
  IF lead_data.phone IS NOT NULL THEN score := score + 10; END IF;
  IF lead_data.status = 'contacted' THEN score := score + 20; END IF;
  IF lead_data.status = 'qualified' THEN score := score + 30; END IF;
  IF 'high-value' = ANY(lead_data.tags) THEN score := score + 20; END IF;
  
  -- Update lead score
  UPDATE leads SET score = score WHERE id = lead_uuid;
  
  RETURN score;
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
-- 14. INITIAL DATA
-- =============================================

-- Create demo organization
INSERT INTO organizations (id, slug, name, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'demo-gym', 'Demo Fitness Center', 'pro')
ON CONFLICT DO NOTHING;

-- Create system user for automation
-- NOTE: Commented out as it causes issues with auth.users foreign key
-- The system user should be created after auth is set up
-- INSERT INTO users (id, email, full_name)
-- VALUES ('00000000-0000-0000-0000-000000000000', 'system@atlas-fitness.com', 'System')
-- ON CONFLICT DO NOTHING;

-- =============================================
-- 15. PERMISSIONS
-- =============================================

-- Grant permissions to authenticated users
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant permissions to service role (for admin operations)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- =============================================
-- END OF MIGRATION
-- =============================================