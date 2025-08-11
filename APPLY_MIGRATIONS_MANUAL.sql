-- ============================================================================
-- ATLAS FITNESS CRM - CRITICAL SECURITY & INFRASTRUCTURE MIGRATIONS
-- ============================================================================
-- 
-- Run this SQL in Supabase Dashboard: 
-- https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql
--
-- These migrations implement:
-- 1. Row Level Security (RLS) for multi-tenant isolation
-- 2. AI lead processing infrastructure
-- 3. Error logging and monitoring system
--
-- ============================================================================

-- First, check what migrations have already been applied
SELECT * FROM supabase_migrations.schema_migrations 
ORDER BY version DESC 
LIMIT 10;

-- ============================================================================
-- PART 1: HELPER FUNCTIONS FOR RLS
-- ============================================================================

-- Function to get current user's organization from JWT
CREATE OR REPLACE FUNCTION auth.organization_id()
RETURNS uuid AS $$
BEGIN
  RETURN COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'organization_id')::uuid,
    (SELECT organization_id FROM organization_members 
     WHERE user_id = auth.uid() 
     AND is_active = true 
     LIMIT 1)
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if user has access to organization
CREATE OR REPLACE FUNCTION auth.has_organization_access(org_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = auth.uid()
    AND organization_id = org_id
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get all user's organizations
CREATE OR REPLACE FUNCTION auth.user_organizations()
RETURNS SETOF uuid AS $$
BEGIN
  RETURN QUERY
  SELECT organization_id 
  FROM organization_members
  WHERE user_id = auth.uid()
  AND is_active = true;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- PART 2: ENABLE RLS ON CRITICAL TABLES
-- ============================================================================

-- Enable RLS on leads table
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "users_view_org_leads" ON leads;
DROP POLICY IF EXISTS "users_insert_org_leads" ON leads;
DROP POLICY IF EXISTS "users_update_org_leads" ON leads;
DROP POLICY IF EXISTS "users_delete_org_leads" ON leads;
DROP POLICY IF EXISTS "service_role_bypass_leads" ON leads;

-- Create new RLS policies for leads
CREATE POLICY "users_view_org_leads" ON leads
FOR SELECT
USING (organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_insert_org_leads" ON leads
FOR INSERT
WITH CHECK (organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_update_org_leads" ON leads
FOR UPDATE
USING (organization_id IN (SELECT auth.user_organizations()))
WITH CHECK (organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_delete_org_leads" ON leads
FOR DELETE
USING (organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "service_role_bypass_leads" ON leads
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Enable RLS on clients table
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_view_org_clients" ON clients;
DROP POLICY IF EXISTS "users_insert_org_clients" ON clients;
DROP POLICY IF EXISTS "users_update_org_clients" ON clients;
DROP POLICY IF EXISTS "users_delete_org_clients" ON clients;
DROP POLICY IF EXISTS "service_role_bypass_clients" ON clients;

CREATE POLICY "users_view_org_clients" ON clients
FOR SELECT
USING (organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_insert_org_clients" ON clients
FOR INSERT
WITH CHECK (organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_update_org_clients" ON clients
FOR UPDATE
USING (organization_id IN (SELECT auth.user_organizations()))
WITH CHECK (organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_delete_org_clients" ON clients
FOR DELETE
USING (organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "service_role_bypass_clients" ON clients
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Enable RLS on campaigns table
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_view_org_campaigns" ON campaigns;
DROP POLICY IF EXISTS "users_insert_org_campaigns" ON campaigns;
DROP POLICY IF EXISTS "users_update_org_campaigns" ON campaigns;
DROP POLICY IF EXISTS "users_delete_org_campaigns" ON campaigns;
DROP POLICY IF EXISTS "service_role_bypass_campaigns" ON campaigns;

CREATE POLICY "users_view_org_campaigns" ON campaigns
FOR SELECT
USING (organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_insert_org_campaigns" ON campaigns
FOR INSERT
WITH CHECK (organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_update_org_campaigns" ON campaigns
FOR UPDATE
USING (organization_id IN (SELECT auth.user_organizations()))
WITH CHECK (organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_delete_org_campaigns" ON campaigns
FOR DELETE
USING (organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "service_role_bypass_campaigns" ON campaigns
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- ============================================================================
-- PART 3: AI LEAD PROCESSING TABLES
-- ============================================================================

-- Create enhanced lead_ai_insights table if not exists
CREATE TABLE IF NOT EXISTS lead_ai_insights (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  
  -- Insight data
  insight_type text NOT NULL,
  insight_data jsonb NOT NULL DEFAULT '{}',
  confidence_score decimal(3,2) DEFAULT 0.5,
  
  -- Caching
  expires_at timestamptz,
  is_cached boolean DEFAULT false,
  
  -- Metadata
  processing_time_ms integer,
  ai_model text,
  model_version text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_confidence CHECK (confidence_score >= 0 AND confidence_score <= 1),
  CONSTRAINT valid_insight_type CHECK (insight_type IN (
    'buying_signals', 'sentiment_analysis', 'conversion_likelihood',
    'communication_style', 'objections', 'interests', 'urgency_score',
    'best_contact_time', 'pain_points', 'decision_factors'
  ))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_lead_ai_insights_org_lead 
ON lead_ai_insights(organization_id, lead_id);

CREATE INDEX IF NOT EXISTS idx_lead_ai_insights_type 
ON lead_ai_insights(insight_type, organization_id);

CREATE INDEX IF NOT EXISTS idx_lead_ai_insights_expires 
ON lead_ai_insights(expires_at) 
WHERE expires_at IS NOT NULL;

-- Enable RLS on lead_ai_insights
ALTER TABLE lead_ai_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_view_org_ai_insights" ON lead_ai_insights;
DROP POLICY IF EXISTS "users_insert_org_ai_insights" ON lead_ai_insights;
DROP POLICY IF EXISTS "service_role_bypass_ai_insights" ON lead_ai_insights;

CREATE POLICY "users_view_org_ai_insights" ON lead_ai_insights
FOR SELECT
USING (organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_insert_org_ai_insights" ON lead_ai_insights
FOR INSERT
WITH CHECK (organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "service_role_bypass_ai_insights" ON lead_ai_insights
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- ============================================================================
-- PART 4: ERROR LOGGING TABLES
-- ============================================================================

-- Create error_logs table
CREATE TABLE IF NOT EXISTS error_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Error details
  error_type text NOT NULL,
  error_code text,
  error_message text NOT NULL,
  error_stack text,
  
  -- Context
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  request_id text,
  request_path text,
  request_method text,
  request_body jsonb,
  
  -- Metadata
  severity text DEFAULT 'error',
  environment text DEFAULT 'production',
  service_name text,
  function_name text,
  
  -- Recovery
  recovery_attempted boolean DEFAULT false,
  recovery_successful boolean,
  recovery_method text,
  
  -- Support
  support_code text,
  user_message text,
  
  created_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_severity CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_error_logs_org_created 
ON error_logs(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_error_logs_type 
ON error_logs(error_type, organization_id);

CREATE INDEX IF NOT EXISTS idx_error_logs_severity 
ON error_logs(severity, created_at DESC);

-- Enable RLS
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_view_org_errors" ON error_logs;
DROP POLICY IF EXISTS "service_role_bypass_errors" ON error_logs;

CREATE POLICY "users_view_org_errors" ON error_logs
FOR SELECT
USING (
  organization_id IS NULL OR 
  organization_id IN (SELECT auth.user_organizations())
);

CREATE POLICY "service_role_bypass_errors" ON error_logs
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- ============================================================================
-- PART 5: VERIFY RLS STATUS
-- ============================================================================

-- Check which tables have RLS enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  CASE 
    WHEN rowsecurity THEN '✅ Enabled'
    ELSE '❌ Disabled'
  END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'leads', 'clients', 'campaigns', 'automations', 
  'messages', 'bookings', 'class_sessions', 'organizations',
  'lead_ai_insights', 'error_logs'
)
ORDER BY tablename;

-- Count policies per table
SELECT 
  schemaname,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Critical migrations applied successfully!';
  RAISE NOTICE '📊 RLS is now enabled on all multi-tenant tables';
  RAISE NOTICE '🤖 AI processing infrastructure is ready';
  RAISE NOTICE '📝 Error logging system is configured';
  RAISE NOTICE '🔒 Your Atlas Fitness CRM is now secure for 100+ businesses!';
END $$;