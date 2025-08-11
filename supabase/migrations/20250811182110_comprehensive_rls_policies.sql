-- =============================================
-- COMPREHENSIVE ROW LEVEL SECURITY (RLS) POLICIES
-- Migration: 20250811182110_comprehensive_rls_policies
-- Description: Implements complete multi-tenant data isolation at database level
-- =============================================

-- =============================================
-- 1. HELPER FUNCTIONS FOR RLS
-- =============================================

-- Function to get current user's organization ID from JWT claims
CREATE OR REPLACE FUNCTION auth.organization_id()
RETURNS uuid AS $$
  SELECT (current_setting('auth.jwt.claims', true)::json->>'organization_id')::uuid;
$$ LANGUAGE sql STABLE;

-- Function to check if user has access to organization via organization_members
CREATE OR REPLACE FUNCTION auth.has_organization_access(org_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = auth.uid()
    AND org_id = org_id
    AND role IN ('owner', 'admin', 'coach', 'staff')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Function to get all organizations a user has access to
CREATE OR REPLACE FUNCTION auth.user_organizations()
RETURNS SETOF uuid AS $$
  SELECT org_id 
  FROM organization_members 
  WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Function to check if current user is admin/owner of organization
CREATE OR REPLACE FUNCTION auth.is_organization_admin(org_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = auth.uid()
    AND org_id = org_id
    AND role IN ('owner', 'admin')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- =============================================
-- 2. ENABLE RLS ON ALL TABLES
-- =============================================

-- Core tenant tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_staff ENABLE ROW LEVEL SECURITY;

-- CRM and lead management
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_scoring_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_score_history ENABLE ROW LEVEL SECURITY;

-- Automation and workflows
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_analytics ENABLE ROW LEVEL SECURITY;

-- Communication and messaging
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

-- Staff and task management
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_time_off_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_timesheet_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_payroll_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_notifications ENABLE ROW LEVEL SECURITY;

-- Booking system
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_types ENABLE ROW LEVEL SECURITY;

-- Calendar system
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_rules ENABLE ROW LEVEL SECURITY;

-- Forms and submissions
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Contacts and tags
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_tag_assignments ENABLE ROW LEVEL SECURITY;

-- Analytics and reporting
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- AI and knowledge management
ALTER TABLE organization_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_training_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_processing_logs ENABLE ROW LEVEL SECURITY;

-- Integrations
ALTER TABLE facebook_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

-- Mobile app tables
ALTER TABLE member_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_tokens ENABLE ROW LEVEL SECURITY;

-- Nutrition system (if exists)
-- These may not exist in all deployments
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'nutrition_profiles') THEN
    ALTER TABLE nutrition_profiles ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'meal_plans') THEN
    ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'body_metrics') THEN
    ALTER TABLE body_metrics ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- =============================================
-- 3. CORE ORGANIZATION POLICIES
-- =============================================

-- Organizations: Users can only see organizations they belong to
CREATE POLICY "users_view_own_organizations" ON organizations
FOR SELECT
USING (id IN (SELECT auth.user_organizations()));

-- Organizations: Only owners can update organization settings
CREATE POLICY "owners_update_organizations" ON organizations
FOR UPDATE
USING (auth.is_organization_admin(id))
WITH CHECK (auth.is_organization_admin(id));

-- Organization Members: Users can view members of their organizations
CREATE POLICY "users_view_org_members" ON organization_members
FOR SELECT
USING (org_id IN (SELECT auth.user_organizations()));

-- Organization Members: Admins can manage members
CREATE POLICY "admins_manage_org_members" ON organization_members
FOR ALL
USING (auth.is_organization_admin(org_id))
WITH CHECK (auth.is_organization_admin(org_id));

-- =============================================
-- 4. CRM AND LEAD MANAGEMENT POLICIES
-- =============================================

-- LEADS table policies
CREATE POLICY "users_view_org_leads" ON leads
FOR SELECT
USING (org_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_create_org_leads" ON leads
FOR INSERT
WITH CHECK (org_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_update_org_leads" ON leads
FOR UPDATE
USING (org_id IN (SELECT auth.user_organizations()))
WITH CHECK (org_id IN (SELECT auth.user_organizations()));

CREATE POLICY "admins_delete_org_leads" ON leads
FOR DELETE
USING (auth.is_organization_admin(org_id));

-- CLIENTS table policies
CREATE POLICY "users_view_org_clients" ON clients
FOR SELECT
USING (org_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_create_org_clients" ON clients
FOR INSERT
WITH CHECK (org_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_update_org_clients" ON clients
FOR UPDATE
USING (org_id IN (SELECT auth.user_organizations()))
WITH CHECK (org_id IN (SELECT auth.user_organizations()));

CREATE POLICY "admins_delete_org_clients" ON clients
FOR DELETE
USING (auth.is_organization_admin(org_id));

-- OPPORTUNITIES table policies
CREATE POLICY "users_view_org_opportunities" ON opportunities
FOR SELECT
USING (org_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_create_org_opportunities" ON opportunities
FOR INSERT
WITH CHECK (org_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_update_org_opportunities" ON opportunities
FOR UPDATE
USING (org_id IN (SELECT auth.user_organizations()))
WITH CHECK (org_id IN (SELECT auth.user_organizations()));

CREATE POLICY "admins_delete_org_opportunities" ON opportunities
FOR DELETE
USING (auth.is_organization_admin(org_id));

-- CAMPAIGNS table policies
CREATE POLICY "users_view_org_campaigns" ON campaigns
FOR SELECT
USING (organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_create_org_campaigns" ON campaigns
FOR INSERT
WITH CHECK (organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_update_org_campaigns" ON campaigns
FOR UPDATE
USING (organization_id IN (SELECT auth.user_organizations()))
WITH CHECK (organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "admins_delete_org_campaigns" ON campaigns
FOR DELETE
USING (auth.is_organization_admin(organization_id));

-- LEAD_ACTIVITIES table policies
CREATE POLICY "users_view_org_lead_activities" ON lead_activities
FOR SELECT
USING (organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_create_org_lead_activities" ON lead_activities
FOR INSERT
WITH CHECK (organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_update_org_lead_activities" ON lead_activities
FOR UPDATE
USING (organization_id IN (SELECT auth.user_organizations()))
WITH CHECK (organization_id IN (SELECT auth.user_organizations()));

-- LEAD_AI_INSIGHTS table policies
CREATE POLICY "users_view_org_lead_insights" ON lead_ai_insights
FOR SELECT
USING (organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "system_create_org_lead_insights" ON lead_ai_insights
FOR INSERT
WITH CHECK (organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "system_update_org_lead_insights" ON lead_ai_insights
FOR UPDATE
USING (organization_id IN (SELECT auth.user_organizations()))
WITH CHECK (organization_id IN (SELECT auth.user_organizations()));

-- =============================================
-- 5. AUTOMATION AND WORKFLOW POLICIES
-- =============================================

-- AUTOMATIONS table policies
CREATE POLICY "users_view_org_automations" ON automations
FOR SELECT
USING (organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_create_org_automations" ON automations
FOR INSERT
WITH CHECK (organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_update_org_automations" ON automations
FOR UPDATE
USING (organization_id IN (SELECT auth.user_organizations()))
WITH CHECK (organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "admins_delete_org_automations" ON automations
FOR DELETE
USING (auth.is_organization_admin(organization_id));

-- WORKFLOWS table policies
CREATE POLICY "users_view_org_workflows" ON workflows
FOR SELECT
USING (org_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_create_org_workflows" ON workflows
FOR INSERT
WITH CHECK (org_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_update_org_workflows" ON workflows
FOR UPDATE
USING (org_id IN (SELECT auth.user_organizations()))
WITH CHECK (org_id IN (SELECT auth.user_organizations()));

CREATE POLICY "admins_delete_org_workflows" ON workflows
FOR DELETE
USING (auth.is_organization_admin(org_id));

-- WORKFLOW_EXECUTIONS table policies
CREATE POLICY "users_view_org_workflow_executions" ON workflow_executions
FOR SELECT
USING (org_id IN (SELECT auth.user_organizations()));

CREATE POLICY "system_create_workflow_executions" ON workflow_executions
FOR INSERT
WITH CHECK (org_id IN (SELECT auth.user_organizations()));

-- =============================================
-- 6. COMMUNICATION AND MESSAGING POLICIES
-- =============================================

-- MESSAGES table policies
CREATE POLICY "users_view_org_messages" ON messages
FOR SELECT
USING (org_id IN (SELECT auth.user_organizations()) OR organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_create_org_messages" ON messages
FOR INSERT
WITH CHECK (org_id IN (SELECT auth.user_organizations()) OR organization_id IN (SELECT auth.user_organizations()));

-- EMAIL_LOGS table policies
CREATE POLICY "users_view_org_email_logs" ON email_logs
FOR SELECT
USING (organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "system_create_email_logs" ON email_logs
FOR INSERT
WITH CHECK (organization_id IN (SELECT auth.user_organizations()));

-- SMS_LOGS table policies
CREATE POLICY "users_view_org_sms_logs" ON sms_logs
FOR SELECT
USING (organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "system_create_sms_logs" ON sms_logs
FOR INSERT
WITH CHECK (organization_id IN (SELECT auth.user_organizations()));

-- WHATSAPP_LOGS table policies
CREATE POLICY "users_view_org_whatsapp_logs" ON whatsapp_logs
FOR SELECT
USING (organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "system_create_whatsapp_logs" ON whatsapp_logs
FOR INSERT
WITH CHECK (organization_id IN (SELECT auth.user_organizations()));

-- EMAIL_TEMPLATES table policies
CREATE POLICY "users_view_org_email_templates" ON email_templates
FOR SELECT
USING (org_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_create_org_email_templates" ON email_templates
FOR INSERT
WITH CHECK (org_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_update_org_email_templates" ON email_templates
FOR UPDATE
USING (org_id IN (SELECT auth.user_organizations()))
WITH CHECK (org_id IN (SELECT auth.user_organizations()));

CREATE POLICY "admins_delete_org_email_templates" ON email_templates
FOR DELETE
USING (auth.is_organization_admin(org_id));

-- MESSAGE_TEMPLATES table policies
CREATE POLICY "users_view_org_message_templates" ON message_templates
FOR SELECT
USING (organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_create_org_message_templates" ON message_templates
FOR INSERT
WITH CHECK (organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_update_org_message_templates" ON message_templates
FOR UPDATE
USING (organization_id IN (SELECT auth.user_organizations()))
WITH CHECK (organization_id IN (SELECT auth.user_organizations()));

-- =============================================
-- 7. STAFF AND TASK MANAGEMENT POLICIES
-- =============================================

-- STAFF table policies
CREATE POLICY "users_view_org_staff" ON staff
FOR SELECT
USING (org_id IN (SELECT auth.user_organizations()));

CREATE POLICY "admins_manage_org_staff" ON staff
FOR ALL
USING (auth.is_organization_admin(org_id))
WITH CHECK (auth.is_organization_admin(org_id));

-- STAFF_TASKS table policies
CREATE POLICY "users_view_org_staff_tasks" ON staff_tasks
FOR SELECT
USING (organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_create_org_staff_tasks" ON staff_tasks
FOR INSERT
WITH CHECK (organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_update_org_staff_tasks" ON staff_tasks
FOR UPDATE
USING (organization_id IN (SELECT auth.user_organizations()))
WITH CHECK (organization_id IN (SELECT auth.user_organizations()));

-- ORGANIZATION_STAFF table policies
CREATE POLICY "users_view_org_organization_staff" ON organization_staff
FOR SELECT
USING (organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "admins_manage_organization_staff" ON organization_staff
FOR ALL
USING (auth.is_organization_admin(organization_id))
WITH CHECK (auth.is_organization_admin(organization_id));

-- =============================================
-- 8. BOOKING SYSTEM POLICIES
-- =============================================

-- BOOKINGS table policies
CREATE POLICY "users_view_org_bookings" ON bookings
FOR SELECT
USING (org_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_create_org_bookings" ON bookings
FOR INSERT
WITH CHECK (org_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_update_org_bookings" ON bookings
FOR UPDATE
USING (org_id IN (SELECT auth.user_organizations()))
WITH CHECK (org_id IN (SELECT auth.user_organizations()));

CREATE POLICY "admins_delete_org_bookings" ON bookings
FOR DELETE
USING (auth.is_organization_admin(org_id));

-- CLASS_SESSIONS table policies
CREATE POLICY "users_view_org_class_sessions" ON class_sessions
FOR SELECT
USING (org_id IN (SELECT auth.user_organizations()) OR organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_create_org_class_sessions" ON class_sessions
FOR INSERT
WITH CHECK (org_id IN (SELECT auth.user_organizations()) OR organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_update_org_class_sessions" ON class_sessions
FOR UPDATE
USING (org_id IN (SELECT auth.user_organizations()) OR organization_id IN (SELECT auth.user_organizations()))
WITH CHECK (org_id IN (SELECT auth.user_organizations()) OR organization_id IN (SELECT auth.user_organizations()));

-- CLASSES table policies
CREATE POLICY "users_view_org_classes" ON classes
FOR SELECT
USING (org_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_create_org_classes" ON classes
FOR INSERT
WITH CHECK (org_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_update_org_classes" ON classes
FOR UPDATE
USING (org_id IN (SELECT auth.user_organizations()))
WITH CHECK (org_id IN (SELECT auth.user_organizations()));

CREATE POLICY "admins_delete_org_classes" ON classes
FOR DELETE
USING (auth.is_organization_admin(org_id));

-- =============================================
-- 9. CALENDAR SYSTEM POLICIES
-- =============================================

-- CALENDAR_EVENTS table policies
CREATE POLICY "users_view_org_calendar_events" ON calendar_events
FOR SELECT
USING (organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_create_org_calendar_events" ON calendar_events
FOR INSERT
WITH CHECK (organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_update_org_calendar_events" ON calendar_events
FOR UPDATE
USING (organization_id IN (SELECT auth.user_organizations()))
WITH CHECK (organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_delete_org_calendar_events" ON calendar_events
FOR DELETE
USING (organization_id IN (SELECT auth.user_organizations()));

-- =============================================
-- 10. FORMS AND DOCUMENTS POLICIES
-- =============================================

-- FORMS table policies
CREATE POLICY "users_view_org_forms" ON forms
FOR SELECT
USING (organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_create_org_forms" ON forms
FOR INSERT
WITH CHECK (organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_update_org_forms" ON forms
FOR UPDATE
USING (organization_id IN (SELECT auth.user_organizations()))
WITH CHECK (organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "admins_delete_org_forms" ON forms
FOR DELETE
USING (auth.is_organization_admin(organization_id));

-- FORM_SUBMISSIONS table policies
CREATE POLICY "users_view_org_form_submissions" ON form_submissions
FOR SELECT
USING (organization_id IN (SELECT auth.user_organizations()));

-- =============================================
-- 11. CONTACTS POLICIES
-- =============================================

-- CONTACTS table policies
CREATE POLICY "users_view_org_contacts" ON contacts
FOR SELECT
USING (organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_create_org_contacts" ON contacts
FOR INSERT
WITH CHECK (organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_update_org_contacts" ON contacts
FOR UPDATE
USING (organization_id IN (SELECT auth.user_organizations()))
WITH CHECK (organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "admins_delete_org_contacts" ON contacts
FOR DELETE
USING (auth.is_organization_admin(organization_id));

-- =============================================
-- 12. ANALYTICS AND AUDIT POLICIES
-- =============================================

-- ANALYTICS_EVENTS table policies
CREATE POLICY "users_view_org_analytics_events" ON analytics_events
FOR SELECT
USING (org_id IN (SELECT auth.user_organizations()));

CREATE POLICY "system_create_analytics_events" ON analytics_events
FOR INSERT
WITH CHECK (org_id IN (SELECT auth.user_organizations()));

-- DAILY_METRICS table policies
CREATE POLICY "users_view_org_daily_metrics" ON daily_metrics
FOR SELECT
USING (org_id IN (SELECT auth.user_organizations()));

-- AUDIT_LOGS table policies
CREATE POLICY "users_view_org_audit_logs" ON audit_logs
FOR SELECT
USING (org_id IN (SELECT auth.user_organizations()));

-- =============================================
-- 13. AI AND KNOWLEDGE POLICIES
-- =============================================

-- ORGANIZATION_KNOWLEDGE table policies
CREATE POLICY "users_view_org_knowledge" ON organization_knowledge
FOR SELECT
USING (organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_create_org_knowledge" ON organization_knowledge
FOR INSERT
WITH CHECK (organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_update_org_knowledge" ON organization_knowledge
FOR UPDATE
USING (organization_id IN (SELECT auth.user_organizations()))
WITH CHECK (organization_id IN (SELECT auth.user_organizations()));

-- =============================================
-- 14. INTEGRATION POLICIES
-- =============================================

-- INTEGRATION_TOKENS table policies
CREATE POLICY "users_view_org_integration_tokens" ON integration_tokens
FOR SELECT
USING (org_id IN (SELECT auth.user_organizations()));

CREATE POLICY "admins_manage_integration_tokens" ON integration_tokens
FOR ALL
USING (auth.is_organization_admin(org_id))
WITH CHECK (auth.is_organization_admin(org_id));

-- FACEBOOK_INTEGRATIONS table policies
CREATE POLICY "users_view_org_facebook_integrations" ON facebook_integrations
FOR SELECT
USING (organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "users_create_facebook_integrations" ON facebook_integrations
FOR INSERT
WITH CHECK (organization_id IN (SELECT auth.user_organizations()));

-- FACEBOOK_PAGES table policies
CREATE POLICY "users_view_org_facebook_pages" ON facebook_pages
FOR SELECT
USING (organization_id IN (SELECT auth.user_organizations()));

-- WEBHOOKS table policies
CREATE POLICY "users_view_org_webhooks" ON webhooks
FOR SELECT
USING (org_id IN (SELECT auth.user_organizations()));

CREATE POLICY "admins_manage_webhooks" ON webhooks
FOR ALL
USING (auth.is_organization_admin(org_id))
WITH CHECK (auth.is_organization_admin(org_id));

-- =============================================
-- 15. MOBILE APP POLICIES
-- =============================================

-- MEMBER_NOTIFICATIONS table policies
CREATE POLICY "users_view_org_member_notifications" ON member_notifications
FOR SELECT
USING (organization_id IN (SELECT auth.user_organizations()));

CREATE POLICY "system_create_member_notifications" ON member_notifications
FOR INSERT
WITH CHECK (organization_id IN (SELECT auth.user_organizations()));

-- QR_TOKENS table policies
CREATE POLICY "users_view_org_qr_tokens" ON qr_tokens
FOR SELECT
USING (organization_id IN (SELECT auth.user_organizations()));

-- =============================================
-- 16. CONDITIONAL NUTRITION POLICIES
-- =============================================

-- Only create policies for nutrition tables if they exist
DO $$
BEGIN
  -- NUTRITION_PROFILES policies
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'nutrition_profiles') THEN
    EXECUTE 'CREATE POLICY "users_view_org_nutrition_profiles" ON nutrition_profiles
      FOR SELECT USING (organization_id IN (SELECT auth.user_organizations()))';
    
    EXECUTE 'CREATE POLICY "users_create_org_nutrition_profiles" ON nutrition_profiles
      FOR INSERT WITH CHECK (organization_id IN (SELECT auth.user_organizations()))';
    
    EXECUTE 'CREATE POLICY "users_update_org_nutrition_profiles" ON nutrition_profiles
      FOR UPDATE USING (organization_id IN (SELECT auth.user_organizations()))
      WITH CHECK (organization_id IN (SELECT auth.user_organizations()))';
  END IF;

  -- MEAL_PLANS policies  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'meal_plans') THEN
    EXECUTE 'CREATE POLICY "users_view_org_meal_plans" ON meal_plans
      FOR SELECT USING (organization_id IN (SELECT auth.user_organizations()))';
      
    EXECUTE 'CREATE POLICY "users_create_org_meal_plans" ON meal_plans
      FOR INSERT WITH CHECK (organization_id IN (SELECT auth.user_organizations()))';
  END IF;

  -- BODY_METRICS policies
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'body_metrics') THEN
    EXECUTE 'CREATE POLICY "users_view_org_body_metrics" ON body_metrics
      FOR SELECT USING (organization_id IN (SELECT auth.user_organizations()))';
      
    EXECUTE 'CREATE POLICY "users_create_org_body_metrics" ON body_metrics
      FOR INSERT WITH CHECK (organization_id IN (SELECT auth.user_organizations()))';
  END IF;
END $$;

-- =============================================
-- 17. SERVICE ROLE BYPASS POLICIES
-- =============================================

-- Allow service role to bypass RLS for admin operations
-- This is critical for system operations, migrations, and administrative tasks

-- Create service role bypass policies for key tables
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'organizations', 'organization_members', 'leads', 'clients', 'opportunities',
    'campaigns', 'automations', 'workflows', 'messages', 'staff_tasks',
    'bookings', 'class_sessions', 'classes', 'calendar_events', 'forms',
    'contacts', 'analytics_events', 'audit_logs', 'organization_knowledge'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    -- Service role can do everything
    BEGIN
      EXECUTE format('
        CREATE POLICY "service_role_bypass_%s" ON %I
        FOR ALL TO service_role
        USING (true)
        WITH CHECK (true)
      ', tbl, tbl);
    EXCEPTION 
      WHEN undefined_table THEN
        RAISE NOTICE 'Table % does not exist, skipping service role policy', tbl;
    END;
  END LOOP;
END $$;

-- =============================================
-- 18. USERS TABLE SPECIAL POLICIES
-- =============================================

-- Users can view their own profile
CREATE POLICY "users_view_own_profile" ON users
FOR SELECT
USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "users_update_own_profile" ON users
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Service role can manage all users
CREATE POLICY "service_role_manage_users" ON users
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- =============================================
-- 19. COMPREHENSIVE TABLE COVERAGE CHECK
-- =============================================

-- Dynamic policy creation for any remaining org-scoped tables
-- This ensures we don't miss any tables that have org_id or organization_id

DO $$
DECLARE
  tbl RECORD;
  org_column TEXT;
BEGIN
  -- Find all tables with org_id or organization_id columns that don't have RLS policies yet
  FOR tbl IN 
    SELECT 
      t.table_name,
      CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t.table_name AND column_name = 'org_id') 
        THEN 'org_id'
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t.table_name AND column_name = 'organization_id')
        THEN 'organization_id'
        ELSE NULL
      END as org_column
    FROM information_schema.tables t
    WHERE t.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE'
    AND (
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t.table_name AND column_name = 'org_id')
      OR EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t.table_name AND column_name = 'organization_id')
    )
    -- Exclude tables we've already handled explicitly
    AND t.table_name NOT IN (
      'organizations', 'organization_members', 'leads', 'clients', 'opportunities',
      'campaigns', 'automations', 'workflows', 'messages', 'staff_tasks',
      'bookings', 'class_sessions', 'classes', 'calendar_events', 'forms',
      'contacts', 'analytics_events', 'audit_logs', 'organization_knowledge',
      'email_logs', 'sms_logs', 'whatsapp_logs', 'email_templates', 'staff',
      'organization_staff', 'member_notifications', 'qr_tokens', 'webhooks',
      'integration_tokens', 'facebook_integrations', 'facebook_pages'
    )
  LOOP
    IF tbl.org_column IS NOT NULL THEN
      BEGIN
        -- Check if RLS is already enabled
        IF NOT EXISTS (
          SELECT 1 FROM pg_class c 
          JOIN pg_namespace n ON c.relnamespace = n.oid 
          WHERE n.nspname = 'public' 
          AND c.relname = tbl.table_name 
          AND c.relrowsecurity = true
        ) THEN
          EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl.table_name);
        END IF;

        -- Create comprehensive policies for the table
        EXECUTE format('
          CREATE POLICY "%s_org_select" ON %I
          FOR SELECT USING (%I IN (SELECT auth.user_organizations()))
        ', tbl.table_name, tbl.table_name, tbl.org_column);
        
        EXECUTE format('
          CREATE POLICY "%s_org_insert" ON %I
          FOR INSERT WITH CHECK (%I IN (SELECT auth.user_organizations()))
        ', tbl.table_name, tbl.table_name, tbl.org_column);
        
        EXECUTE format('
          CREATE POLICY "%s_org_update" ON %I
          FOR UPDATE USING (%I IN (SELECT auth.user_organizations()))
          WITH CHECK (%I IN (SELECT auth.user_organizations()))
        ', tbl.table_name, tbl.table_name, tbl.org_column, tbl.org_column);
        
        EXECUTE format('
          CREATE POLICY "%s_org_delete" ON %I
          FOR DELETE USING (auth.is_organization_admin(%I))
        ', tbl.table_name, tbl.table_name, tbl.org_column);

        -- Service role bypass
        EXECUTE format('
          CREATE POLICY "%s_service_role_bypass" ON %I
          FOR ALL TO service_role USING (true) WITH CHECK (true)
        ', tbl.table_name, tbl.table_name);
        
        RAISE NOTICE 'Created RLS policies for table: %', tbl.table_name;
        
      EXCEPTION 
        WHEN duplicate_object THEN
          RAISE NOTICE 'Policies already exist for table: %', tbl.table_name;
        WHEN OTHERS THEN
          RAISE NOTICE 'Error creating policies for table %: %', tbl.table_name, SQLERRM;
      END;
    END IF;
  END LOOP;
END $$;

-- =============================================
-- 20. VALIDATION AND TESTING
-- =============================================

-- Function to test RLS policies work correctly
CREATE OR REPLACE FUNCTION test_rls_isolation()
RETURNS TABLE (
  table_name TEXT,
  rls_enabled BOOLEAN,
  policies_count INTEGER,
  test_result TEXT
) AS $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN 
    SELECT 
      c.relname as table_name,
      c.relrowsecurity as rls_enabled,
      (SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid) as policies_count
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' 
    AND c.relkind = 'r'
    AND (
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = c.relname AND column_name = 'org_id')
      OR EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = c.relname AND column_name = 'organization_id')
    )
  LOOP
    RETURN QUERY SELECT 
      tbl.table_name,
      tbl.rls_enabled,
      tbl.policies_count,
      CASE 
        WHEN NOT tbl.rls_enabled THEN 'FAIL: RLS not enabled'
        WHEN tbl.policies_count = 0 THEN 'FAIL: No RLS policies'
        WHEN tbl.policies_count < 3 THEN 'WARNING: Limited policies'
        ELSE 'PASS: RLS configured'
      END as test_result;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the validation
SELECT * FROM test_rls_isolation() ORDER BY test_result, table_name;

-- =============================================
-- ROLLBACK COMMANDS (COMMENTED OUT)
-- =============================================

/*
-- To rollback this migration, run the following commands:

-- 1. Disable RLS on all tables
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN 
    SELECT c.relname 
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' 
    AND c.relkind = 'r'
    AND c.relrowsecurity = true
  LOOP
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', tbl.relname);
  END LOOP;
END $$;

-- 2. Drop all RLS policies
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- 3. Drop helper functions
DROP FUNCTION IF EXISTS auth.organization_id();
DROP FUNCTION IF EXISTS auth.has_organization_access(uuid);
DROP FUNCTION IF EXISTS auth.user_organizations();
DROP FUNCTION IF EXISTS auth.is_organization_admin(uuid);
DROP FUNCTION IF EXISTS test_rls_isolation();

-- WARNING: Only run rollback commands if you need to completely remove RLS
-- This will disable all multi-tenant security at the database level
*/

-- =============================================
-- END OF MIGRATION
-- =============================================