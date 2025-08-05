-- Migration: Comprehensive Audit Logging System for Atlas Fitness CRM
-- Description: Creates a complete audit trail system that tracks all CRUD operations
-- on critical tables with user context, IP addresses, and data change tracking.
-- This system ensures full compliance and accountability for all data modifications.

-- =====================================================================================
-- 1. CREATE AUDIT LOGS TABLE
-- =====================================================================================

-- Main audit logs table to store all database changes
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Operation metadata
  table_name text NOT NULL,
  operation text NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  row_id uuid NOT NULL, -- The ID of the affected row
  
  -- User context
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  user_email text, -- Stored for historical purposes even if user is deleted
  user_role text, -- Role at time of action
  
  -- Session information
  session_id text, -- Application session ID
  ip_address inet, -- User's IP address
  user_agent text, -- Browser/client information
  
  -- Data changes
  old_values jsonb, -- Previous values (for UPDATE and DELETE)
  new_values jsonb, -- New values (for INSERT and UPDATE)
  changed_fields text[], -- Array of field names that changed (for UPDATE)
  
  -- Context information
  action_source text DEFAULT 'manual', -- 'manual', 'api', 'automation', 'system'
  action_reason text, -- Optional reason for the change
  related_process text, -- Related automation/workflow process
  
  -- Metadata
  additional_metadata jsonb DEFAULT '{}', -- Additional context data
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  
  -- Performance indexes
  INDEX idx_audit_logs_organization_id (organization_id),
  INDEX idx_audit_logs_table_name (table_name),
  INDEX idx_audit_logs_operation (operation),
  INDEX idx_audit_logs_row_id (row_id),
  INDEX idx_audit_logs_user_id (user_id),
  INDEX idx_audit_logs_created_at (created_at DESC),
  INDEX idx_audit_logs_table_row (table_name, row_id),
  INDEX idx_audit_logs_user_table (user_id, table_name)
);

-- Add table comment
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all CRUD operations across critical business tables';
COMMENT ON COLUMN audit_logs.old_values IS 'JSON representation of row data before the change (UPDATE/DELETE)';
COMMENT ON COLUMN audit_logs.new_values IS 'JSON representation of row data after the change (INSERT/UPDATE)';
COMMENT ON COLUMN audit_logs.changed_fields IS 'Array of field names that were modified in UPDATE operations';
COMMENT ON COLUMN audit_logs.action_source IS 'Source of the action: manual user action, API call, automation, or system process';

-- =====================================================================================
-- 2. AUDIT LOGGING FUNCTIONS
-- =====================================================================================

-- Function to extract user context from current session
CREATE OR REPLACE FUNCTION get_audit_user_context()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_context jsonb := '{}';
  user_email_val text;
  user_role_val text;
  org_id_val uuid;
BEGIN
  -- Get user email from auth.users
  SELECT email INTO user_email_val
  FROM auth.users
  WHERE id = auth.uid();
  
  -- Get user role and organization from user_organizations
  SELECT uo.role, uo.organization_id INTO user_role_val, org_id_val
  FROM user_organizations uo
  WHERE uo.user_id = auth.uid()
  LIMIT 1;
  
  -- Build context object
  user_context := jsonb_build_object(
    'user_id', auth.uid(),
    'user_email', COALESCE(user_email_val, 'unknown'),
    'user_role', COALESCE(user_role_val, 'unknown'),
    'organization_id', org_id_val
  );
  
  RETURN user_context;
END;
$$;

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_context jsonb;
  old_data jsonb := NULL;
  new_data jsonb := NULL;
  changed_fields text[] := NULL;
  row_id_val uuid;
  org_id_val uuid;
BEGIN
  -- Get user context
  user_context := get_audit_user_context();
  
  -- Determine the row ID and organization ID
  IF TG_OP = 'DELETE' THEN
    row_id_val := OLD.id;
    -- Try to get organization_id from OLD record
    IF to_jsonb(OLD) ? 'organization_id' THEN
      org_id_val := (to_jsonb(OLD)->>'organization_id')::uuid;
    ELSE
      org_id_val := (user_context->>'organization_id')::uuid;
    END IF;
    old_data := to_jsonb(OLD);
  ELSE
    row_id_val := NEW.id;
    -- Try to get organization_id from NEW record
    IF to_jsonb(NEW) ? 'organization_id' THEN
      org_id_val := (to_jsonb(NEW)->>'organization_id')::uuid;
    ELSE
      org_id_val := (user_context->>'organization_id')::uuid;
    END IF;
    new_data := to_jsonb(NEW);
  END IF;
  
  -- For UPDATE operations, also capture old data and changed fields
  IF TG_OP = 'UPDATE' THEN
    old_data := to_jsonb(OLD);
    
    -- Find changed fields
    SELECT array_agg(key) INTO changed_fields
    FROM (
      SELECT key
      FROM jsonb_each_text(to_jsonb(NEW))
      WHERE key != 'updated_at' -- Ignore updated_at changes
        AND to_jsonb(NEW)->>key IS DISTINCT FROM to_jsonb(OLD)->>key
    ) AS changes;
  END IF;
  
  -- Insert audit log entry
  INSERT INTO audit_logs (
    organization_id,
    table_name,
    operation,
    row_id,
    user_id,
    user_email,
    user_role,
    session_id,
    ip_address,
    user_agent,
    old_values,
    new_values,
    changed_fields,
    action_source,
    additional_metadata
  ) VALUES (
    COALESCE(org_id_val, (user_context->>'organization_id')::uuid),
    TG_TABLE_NAME,
    TG_OP,
    row_id_val,
    (user_context->>'user_id')::uuid,
    user_context->>'user_email',
    user_context->>'user_role',
    current_setting('app.session_id', true),
    current_setting('app.ip_address', true)::inet,
    current_setting('app.user_agent', true),
    old_data,
    new_data,
    changed_fields,
    COALESCE(current_setting('app.action_source', true), 'manual'),
    jsonb_build_object(
      'table_oid', TG_RELID,
      'trigger_name', TG_NAME,
      'when', TG_WHEN,
      'level', TG_LEVEL
    )
  );
  
  -- Return appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the original operation
    RAISE WARNING 'Audit logging failed: %', SQLERRM;
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
END;
$$;

-- =====================================================================================
-- 3. AUDIT QUERY FUNCTIONS
-- =====================================================================================

-- Function to query audit logs with filtering and pagination
CREATE OR REPLACE FUNCTION query_audit_logs(
  p_organization_id uuid,
  p_table_name text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_operation text DEFAULT NULL,
  p_row_id uuid DEFAULT NULL,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  table_name text,
  operation text,
  row_id uuid,
  user_email text,
  user_role text,
  ip_address inet,
  old_values jsonb,
  new_values jsonb,
  changed_fields text[],
  action_source text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.table_name,
    al.operation,
    al.row_id,
    al.user_email,
    al.user_role,
    al.ip_address,
    al.old_values,
    al.new_values,
    al.changed_fields,
    al.action_source,
    al.created_at
  FROM audit_logs al
  WHERE al.organization_id = p_organization_id
    AND (p_table_name IS NULL OR al.table_name = p_table_name)
    AND (p_user_id IS NULL OR al.user_id = p_user_id)
    AND (p_operation IS NULL OR al.operation = p_operation)
    AND (p_row_id IS NULL OR al.row_id = p_row_id)
    AND (p_start_date IS NULL OR al.created_at >= p_start_date)
    AND (p_end_date IS NULL OR al.created_at <= p_end_date)
  ORDER BY al.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Function to get audit history for a specific record
CREATE OR REPLACE FUNCTION get_record_audit_history(
  p_organization_id uuid,
  p_table_name text,
  p_row_id uuid
)
RETURNS TABLE (
  operation text,
  user_email text,
  changed_fields text[],
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.operation,
    al.user_email,
    al.changed_fields,
    al.old_values,
    al.new_values,
    al.created_at
  FROM audit_logs al
  WHERE al.organization_id = p_organization_id
    AND al.table_name = p_table_name
    AND al.row_id = p_row_id
  ORDER BY al.created_at DESC;
END;
$$;

-- Function to get audit summary statistics
CREATE OR REPLACE FUNCTION get_audit_summary(
  p_organization_id uuid,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS TABLE (
  table_name text,
  operation text,
  operation_count bigint,
  unique_users bigint,
  latest_activity timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.table_name,
    al.operation,
    COUNT(*) as operation_count,
    COUNT(DISTINCT al.user_id) as unique_users,
    MAX(al.created_at) as latest_activity
  FROM audit_logs al
  WHERE al.organization_id = p_organization_id
    AND (p_start_date IS NULL OR al.created_at >= p_start_date)
    AND (p_end_date IS NULL OR al.created_at <= p_end_date)
  GROUP BY al.table_name, al.operation
  ORDER BY al.table_name, al.operation;
END;
$$;

-- =====================================================================================
-- 4. CREATE AUDIT TRIGGERS FOR KEY TABLES
-- =====================================================================================

-- Macro function to create audit triggers for any table
CREATE OR REPLACE FUNCTION create_audit_trigger(table_name text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format('
    CREATE TRIGGER audit_%I_trigger
      AFTER INSERT OR UPDATE OR DELETE ON %I
      FOR EACH ROW
      EXECUTE FUNCTION audit_trigger_function();
  ', table_name, table_name);
END;
$$;

-- Create audit triggers for all critical tables
-- Note: Only create triggers for tables that exist

-- Leads table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads') THEN
    PERFORM create_audit_trigger('leads');
  END IF;
END $$;

-- Clients table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') THEN
    PERFORM create_audit_trigger('clients');
  END IF;
END $$;

-- Workflows table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workflows') THEN
    PERFORM create_audit_trigger('workflows');
  END IF;
END $$;

-- Automations table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'automations') THEN
    PERFORM create_audit_trigger('automations');
  END IF;
END $$;

-- Campaigns table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaigns') THEN
    PERFORM create_audit_trigger('campaigns');
  END IF;
END $$;

-- Staff tasks table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_tasks') THEN
    PERFORM create_audit_trigger('staff_tasks');
  END IF;
END $$;

-- Lead activities table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lead_activities') THEN
    PERFORM create_audit_trigger('lead_activities');
  END IF;
END $$;

-- Organizations table (for critical changes)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
    PERFORM create_audit_trigger('organizations');
  END IF;
END $$;

-- User organizations table (for access control changes)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_organizations') THEN
    PERFORM create_audit_trigger('user_organizations');
  END IF;
END $$;

-- Staff table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff') THEN
    PERFORM create_audit_trigger('staff');
  END IF;
END $$;

-- Membership plans (for pricing/plan changes)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'membership_plans') THEN
    PERFORM create_audit_trigger('membership_plans');
  END IF;
END $$;

-- Customer memberships (for subscription changes)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_memberships') THEN
    PERFORM create_audit_trigger('customer_memberships');
  END IF;
END $$;

-- Forms (for form definition changes)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'forms') THEN
    PERFORM create_audit_trigger('forms');
  END IF;
END $$;

-- =====================================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================================

-- Enable RLS on audit_logs table
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view audit logs from their organization
CREATE POLICY "Users can view organization audit logs" ON audit_logs
  FOR SELECT USING (
    organization_id = get_user_organization_id()
  );

-- Policy: Only the system can insert audit logs (no direct user insertion)
CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (false); -- Prevent direct inserts

-- Policy: Prevent updates and deletes on audit logs (immutable)
CREATE POLICY "Audit logs are immutable" ON audit_logs
  FOR UPDATE USING (false);

CREATE POLICY "Audit logs cannot be deleted" ON audit_logs
  FOR DELETE USING (false);

-- =====================================================================================
-- 6. PERFORMANCE OPTIMIZATIONS
-- =====================================================================================

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_table_date ON audit_logs(organization_id, table_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_user_date ON audit_logs(organization_id, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_row ON audit_logs(organization_id, table_name, row_id);

-- Partial indexes for performance on common operations
CREATE INDEX IF NOT EXISTS idx_audit_logs_inserts ON audit_logs(organization_id, created_at DESC) WHERE operation = 'INSERT';
CREATE INDEX IF NOT EXISTS idx_audit_logs_updates ON audit_logs(organization_id, created_at DESC) WHERE operation = 'UPDATE';
CREATE INDEX IF NOT EXISTS idx_audit_logs_deletes ON audit_logs(organization_id, created_at DESC) WHERE operation = 'DELETE';

-- Index for IP address tracking (useful for security monitoring)
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON audit_logs(ip_address, created_at DESC) WHERE ip_address IS NOT NULL;

-- =====================================================================================
-- 7. HELPER FUNCTIONS FOR APPLICATION USAGE
-- =====================================================================================

-- Function to set session context (call this from application before operations)
CREATE OR REPLACE FUNCTION set_audit_context(
  p_session_id text DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_action_source text DEFAULT 'manual',
  p_action_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Set session variables that will be used by audit triggers
  IF p_session_id IS NOT NULL THEN
    PERFORM set_config('app.session_id', p_session_id, false);
  END IF;
  
  IF p_ip_address IS NOT NULL THEN
    PERFORM set_config('app.ip_address', p_ip_address, false);
  END IF;
  
  IF p_user_agent IS NOT NULL THEN
    PERFORM set_config('app.user_agent', p_user_agent, false);
  END IF;
  
  IF p_action_source IS NOT NULL THEN
    PERFORM set_config('app.action_source', p_action_source, false);
  END IF;
  
  IF p_action_reason IS NOT NULL THEN
    PERFORM set_config('app.action_reason', p_action_reason, false);
  END IF;
END;
$$;

-- Function to clear audit context
CREATE OR REPLACE FUNCTION clear_audit_context()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.session_id', '', false);
  PERFORM set_config('app.ip_address', '', false);
  PERFORM set_config('app.user_agent', '', false);
  PERFORM set_config('app.action_source', 'manual', false);
  PERFORM set_config('app.action_reason', '', false);
END;
$$;

-- =====================================================================================
-- 8. DATA RETENTION AND ARCHIVAL
-- =====================================================================================

-- Function to archive old audit logs (recommended to run monthly)
CREATE OR REPLACE FUNCTION archive_old_audit_logs(p_retention_months integer DEFAULT 12)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  archived_count integer;
  cutoff_date timestamptz;
BEGIN
  cutoff_date := now() - (p_retention_months || ' months')::interval;
  
  -- Create archive table if it doesn't exist
  CREATE TABLE IF NOT EXISTS audit_logs_archive (LIKE audit_logs INCLUDING ALL);
  
  -- Move old records to archive
  WITH moved_records AS (
    DELETE FROM audit_logs
    WHERE created_at < cutoff_date
    RETURNING *
  )
  INSERT INTO audit_logs_archive
  SELECT * FROM moved_records;
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  
  RETURN archived_count;
END;
$$;

-- =====================================================================================
-- 9. MONITORING AND ALERTING VIEWS
-- =====================================================================================

-- View for suspicious activity monitoring
CREATE OR REPLACE VIEW suspicious_audit_activity AS
SELECT 
  al.organization_id,
  al.user_email,
  al.ip_address,
  al.table_name,
  al.operation,
  COUNT(*) as operation_count,
  MIN(al.created_at) as first_occurrence,
  MAX(al.created_at) as last_occurrence
FROM audit_logs al
WHERE al.created_at >= now() - interval '1 hour'
GROUP BY al.organization_id, al.user_email, al.ip_address, al.table_name, al.operation
HAVING COUNT(*) > 50 -- Configurable threshold
ORDER BY operation_count DESC;

-- View for recent high-impact changes
CREATE OR REPLACE VIEW recent_high_impact_changes AS
SELECT 
  al.organization_id,
  al.table_name,
  al.operation,
  al.user_email,
  al.ip_address,
  al.row_id,
  al.changed_fields,
  al.created_at
FROM audit_logs al
WHERE al.created_at >= now() - interval '24 hours'
  AND (
    al.table_name IN ('organizations', 'user_organizations', 'membership_plans')
    OR al.operation = 'DELETE'
    OR array_length(al.changed_fields, 1) > 5
  )
ORDER BY al.created_at DESC;

-- =====================================================================================
-- 10. GRANTS AND PERMISSIONS
-- =====================================================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT ON audit_logs TO authenticated;
GRANT EXECUTE ON FUNCTION query_audit_logs TO authenticated;
GRANT EXECUTE ON FUNCTION get_record_audit_history TO authenticated;
GRANT EXECUTE ON FUNCTION get_audit_summary TO authenticated;
GRANT EXECUTE ON FUNCTION set_audit_context TO authenticated;
GRANT EXECUTE ON FUNCTION clear_audit_context TO authenticated;

-- Grant permissions for service roles (for system operations)
GRANT SELECT ON suspicious_audit_activity TO service_role;
GRANT SELECT ON recent_high_impact_changes TO service_role;
GRANT EXECUTE ON FUNCTION archive_old_audit_logs TO service_role;

-- =====================================================================================
-- MIGRATION COMPLETE
-- =====================================================================================

-- Add helpful comments about usage
COMMENT ON FUNCTION set_audit_context IS 'Call this function at the start of requests to set user context for audit logging';
COMMENT ON FUNCTION query_audit_logs IS 'Main function to query audit logs with filtering and pagination';
COMMENT ON FUNCTION get_record_audit_history IS 'Get complete audit history for a specific record';
COMMENT ON VIEW suspicious_audit_activity IS 'Monitoring view to detect unusual activity patterns';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Audit logging system migration completed successfully';
  RAISE NOTICE 'Remember to call set_audit_context() in your application to capture session information';
  RAISE NOTICE 'Use query_audit_logs() to retrieve audit data with proper organization isolation';
END $$;