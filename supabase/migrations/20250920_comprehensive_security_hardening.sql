-- =====================================================
-- Comprehensive Security Hardening Migration
-- Atlas Fitness CRM - Multi-tenant Data Isolation
-- =====================================================

-- Enable Row Level Security for critical tables
ALTER TABLE IF EXISTS leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS whatsapp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS class_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS google_calendar_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS calendar_sync_settings ENABLE ROW LEVEL SECURITY;

-- Add missing organization_id columns where needed
DO $$ 
BEGIN
    -- Add organization_id to tasks table if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE tasks ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        
        -- Set default organization for existing tasks
        UPDATE tasks 
        SET organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
        WHERE organization_id IS NULL;
        
        -- Make organization_id NOT NULL after setting defaults
        ALTER TABLE tasks ALTER COLUMN organization_id SET NOT NULL;
    END IF;

    -- Add organization_id to memberships table if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'memberships' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE memberships ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        
        -- Set organization_id based on client's organization
        UPDATE memberships 
        SET organization_id = (
            SELECT c.organization_id 
            FROM clients c 
            WHERE c.id = memberships.client_id
        )
        WHERE organization_id IS NULL;
        
        -- For memberships without matching clients, use default
        UPDATE memberships 
        SET organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
        WHERE organization_id IS NULL;
        
        ALTER TABLE memberships ALTER COLUMN organization_id SET NOT NULL;
    END IF;

    -- Ensure google_calendar_tokens has organization_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'google_calendar_tokens' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE google_calendar_tokens ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        
        -- Set organization_id based on user's organization
        UPDATE google_calendar_tokens 
        SET organization_id = (
            SELECT uo.organization_id 
            FROM user_organizations uo 
            WHERE uo.user_id = google_calendar_tokens.user_id
            LIMIT 1
        )
        WHERE organization_id IS NULL;
        
        -- Set default for any remaining records
        UPDATE google_calendar_tokens 
        SET organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
        WHERE organization_id IS NULL;
        
        ALTER TABLE google_calendar_tokens ALTER COLUMN organization_id SET NOT NULL;
    END IF;

    -- Ensure calendar_sync_settings has organization_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'calendar_sync_settings' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE calendar_sync_settings ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        
        -- Set organization_id based on user's organization
        UPDATE calendar_sync_settings 
        SET organization_id = (
            SELECT uo.organization_id 
            FROM user_organizations uo 
            WHERE uo.user_id = calendar_sync_settings.user_id
            LIMIT 1
        )
        WHERE organization_id IS NULL;
        
        -- Set default for any remaining records
        UPDATE calendar_sync_settings 
        SET organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
        WHERE organization_id IS NULL;
        
        ALTER TABLE calendar_sync_settings ALTER COLUMN organization_id SET NOT NULL;
    END IF;
END $$;

-- Fix NULL organization_id values in existing tables
UPDATE sms_logs 
SET organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
WHERE organization_id IS NULL;

UPDATE whatsapp_logs 
SET organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
WHERE organization_id IS NULL;

-- Create performance indexes for organization-scoped queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_organization_id ON leads(organization_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_organization_id ON clients(organization_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_class_sessions_organization_id ON class_sessions(organization_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_class_sessions_start_time ON class_sessions(start_time);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_programs_organization_id ON programs(organization_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_memberships_organization_id ON memberships(organization_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_memberships_client_id ON memberships(client_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sms_logs_organization_id ON sms_logs(organization_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sms_logs_phone_number ON sms_logs(phone_number);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_logs_organization_id ON whatsapp_logs(organization_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_logs_phone_number ON whatsapp_logs(phone_number);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_organization_id ON tasks(organization_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_organization_id ON bookings(organization_id) WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'organization_id');
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_class_bookings_organization_id ON class_bookings(organization_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_google_calendar_tokens_organization_id ON google_calendar_tokens(organization_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calendar_sync_settings_organization_id ON calendar_sync_settings(organization_id);

-- Create composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_org_created ON leads(organization_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_org_created ON clients(organization_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_class_sessions_org_start ON class_sessions(organization_id, start_time);

-- Drop existing RLS policies to recreate them with better security
DROP POLICY IF EXISTS "Users can only access their organization's leads" ON leads;
DROP POLICY IF EXISTS "Users can only access their organization's clients" ON clients;
DROP POLICY IF EXISTS "Users can only access their organization's class_sessions" ON class_sessions;
DROP POLICY IF EXISTS "Users can only access their organization's programs" ON programs;
DROP POLICY IF EXISTS "Users can only access their organization's memberships" ON memberships;
DROP POLICY IF EXISTS "Users can only access their organization's sms_logs" ON sms_logs;
DROP POLICY IF EXISTS "Users can only access their organization's whatsapp_logs" ON whatsapp_logs;
DROP POLICY IF EXISTS "Users can only access their organization's tasks" ON tasks;
DROP POLICY IF EXISTS "Users can only access their organization's bookings" ON bookings;
DROP POLICY IF EXISTS "Users can only access their organization's class_bookings" ON class_bookings;
DROP POLICY IF EXISTS "Users can only access their organization's google_calendar_tokens" ON google_calendar_tokens;
DROP POLICY IF EXISTS "Users can only access their organization's calendar_sync_settings" ON calendar_sync_settings;

-- Create comprehensive RLS policies for organization isolation
-- Helper function to get user's organization(s)
CREATE OR REPLACE FUNCTION get_user_organization_ids()
RETURNS UUID[] AS $$
BEGIN
  -- First try organization_staff table (preferred)
  RETURN ARRAY(
    SELECT DISTINCT organization_id 
    FROM organization_staff 
    WHERE user_id = auth.uid() 
    AND is_active = true
    
    UNION
    
    -- Fallback to user_organizations table
    SELECT DISTINCT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
    
    UNION
    
    -- Fallback to organization_members table
    SELECT DISTINCT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid() 
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Leads RLS policies
CREATE POLICY "leads_organization_access" ON leads
  FOR ALL USING (organization_id = ANY(get_user_organization_ids()));

-- Clients RLS policies  
CREATE POLICY "clients_organization_access" ON clients
  FOR ALL USING (organization_id = ANY(get_user_organization_ids()));

-- Class sessions RLS policies
CREATE POLICY "class_sessions_organization_access" ON class_sessions
  FOR ALL USING (organization_id = ANY(get_user_organization_ids()));

-- Programs RLS policies
CREATE POLICY "programs_organization_access" ON programs
  FOR ALL USING (organization_id = ANY(get_user_organization_ids()));

-- Memberships RLS policies
CREATE POLICY "memberships_organization_access" ON memberships
  FOR ALL USING (organization_id = ANY(get_user_organization_ids()));

-- SMS logs RLS policies
CREATE POLICY "sms_logs_organization_access" ON sms_logs
  FOR ALL USING (organization_id = ANY(get_user_organization_ids()));

-- WhatsApp logs RLS policies
CREATE POLICY "whatsapp_logs_organization_access" ON whatsapp_logs
  FOR ALL USING (organization_id = ANY(get_user_organization_ids()));

-- Tasks RLS policies
CREATE POLICY "tasks_organization_access" ON tasks
  FOR ALL USING (organization_id = ANY(get_user_organization_ids()));

-- Class bookings RLS policies
CREATE POLICY "class_bookings_organization_access" ON class_bookings
  FOR ALL USING (organization_id = ANY(get_user_organization_ids()));

-- Google Calendar tokens RLS policies
CREATE POLICY "google_calendar_tokens_organization_access" ON google_calendar_tokens
  FOR ALL USING (organization_id = ANY(get_user_organization_ids()));

-- Calendar sync settings RLS policies
CREATE POLICY "calendar_sync_settings_organization_access" ON calendar_sync_settings
  FOR ALL USING (organization_id = ANY(get_user_organization_ids()));

-- Bookings RLS policies (if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
        EXECUTE 'CREATE POLICY "bookings_organization_access" ON bookings
          FOR ALL USING (organization_id = ANY(get_user_organization_ids()))';
    END IF;
END $$;

-- Create security audit log table
CREATE TABLE IF NOT EXISTS security_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    action VARCHAR(50) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    request_path TEXT,
    request_method VARCHAR(10),
    response_status INTEGER,
    details JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for security audit log
CREATE INDEX IF NOT EXISTS idx_security_audit_log_timestamp ON security_audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_organization_id ON security_audit_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_event_type ON security_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_ip_address ON security_audit_log(ip_address);

-- RLS for security audit log (only accessible by owners and service role)
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "security_audit_log_owner_access" ON security_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_staff os
      WHERE os.user_id = auth.uid() 
      AND os.organization_id = security_audit_log.organization_id
      AND os.role IN ('owner', 'admin')
      AND os.is_active = true
    )
    OR 
    EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.user_id = auth.uid() 
      AND uo.organization_id = security_audit_log.organization_id
      AND uo.role IN ('owner', 'admin')
    )
  );

-- Function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
  p_event_type VARCHAR(100),
  p_user_id UUID DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL,
  p_resource_type VARCHAR(100) DEFAULT NULL,
  p_resource_id VARCHAR(255) DEFAULT NULL,
  p_action VARCHAR(50) DEFAULT 'unknown',
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_request_path TEXT DEFAULT NULL,
  p_request_method VARCHAR(10) DEFAULT NULL,
  p_response_status INTEGER DEFAULT NULL,
  p_details JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO security_audit_log (
    event_type,
    user_id,
    organization_id,
    resource_type,
    resource_id,
    action,
    ip_address,
    user_agent,
    request_path,
    request_method,
    response_status,
    details
  ) VALUES (
    p_event_type,
    COALESCE(p_user_id, auth.uid()),
    p_organization_id,
    p_resource_type,
    p_resource_id,
    p_action,
    p_ip_address,
    p_user_agent,
    p_request_path,
    p_request_method,
    p_response_status,
    p_details
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create organization access validation function
CREATE OR REPLACE FUNCTION validate_organization_access(
  p_organization_id UUID,
  p_user_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  user_id_to_check UUID;
  has_access BOOLEAN := FALSE;
BEGIN
  user_id_to_check := COALESCE(p_user_id, auth.uid());
  
  -- Check if user has access to the organization
  SELECT EXISTS (
    SELECT 1 FROM organization_staff 
    WHERE user_id = user_id_to_check 
    AND organization_id = p_organization_id 
    AND is_active = true
    
    UNION
    
    SELECT 1 FROM user_organizations 
    WHERE user_id = user_id_to_check 
    AND organization_id = p_organization_id
    
    UNION
    
    SELECT 1 FROM organization_members 
    WHERE user_id = user_id_to_check 
    AND organization_id = p_organization_id 
    AND is_active = true
  ) INTO has_access;
  
  -- Log access validation attempts
  PERFORM log_security_event(
    'ORGANIZATION_ACCESS_VALIDATION',
    user_id_to_check,
    p_organization_id,
    'organization',
    p_organization_id::TEXT,
    CASE WHEN has_access THEN 'granted' ELSE 'denied' END,
    NULL,
    NULL,
    NULL,
    NULL,
    CASE WHEN has_access THEN 200 ELSE 403 END,
    jsonb_build_object('validation_result', has_access)
  );
  
  RETURN has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_organization_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION log_security_event TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION validate_organization_access TO authenticated, service_role;
GRANT INSERT ON security_audit_log TO authenticated, service_role;

COMMENT ON MIGRATION IS 'Comprehensive security hardening for multi-tenant data isolation. Adds missing organization_id columns, creates performance indexes, enables RLS with organization-scoped policies, and implements security audit logging.';