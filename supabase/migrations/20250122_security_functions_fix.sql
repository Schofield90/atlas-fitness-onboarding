-- Security Functions Fix for Atlas Fitness CRM
-- Creates missing helper functions for RLS policies

-- Create helper function to get user's organization ID
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid AS $$
BEGIN
  -- Check organization_staff table first
  RETURN (
    SELECT organization_id 
    FROM organization_staff 
    WHERE user_id = auth.uid()
      AND is_active = true
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user is organization admin
CREATE OR REPLACE FUNCTION public.is_organization_admin(org_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM organization_staff
    WHERE user_id = auth.uid()
      AND organization_id = org_id
      AND role IN ('owner', 'admin')
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM super_admin_users
    WHERE user_id = auth.uid()
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RLS policies for organizations table
DROP POLICY IF EXISTS "Organizations viewable by members" ON organizations;
CREATE POLICY "Organizations viewable by members" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id 
      FROM organization_staff 
      WHERE user_id = auth.uid()
    )
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Organizations editable by owners" ON organizations;
CREATE POLICY "Organizations editable by owners" ON organizations
  FOR UPDATE USING (
    owner_id = auth.uid()
    OR public.is_organization_admin(id)
    OR public.is_super_admin()
  );

-- Create RLS policies for leads table
DROP POLICY IF EXISTS "Leads viewable by organization members" ON leads;
CREATE POLICY "Leads viewable by organization members" ON leads
  FOR SELECT USING (
    organization_id = public.get_user_organization_id()
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Leads insertable by organization members" ON leads;
CREATE POLICY "Leads insertable by organization members" ON leads
  FOR INSERT WITH CHECK (
    organization_id = public.get_user_organization_id()
  );

DROP POLICY IF EXISTS "Leads editable by organization members" ON leads;
CREATE POLICY "Leads editable by organization members" ON leads
  FOR UPDATE USING (
    organization_id = public.get_user_organization_id()
  );

-- Create RLS policies for clients table
DROP POLICY IF EXISTS "Clients viewable by organization" ON clients;
CREATE POLICY "Clients viewable by organization" ON clients
  FOR SELECT USING (
    organization_id = public.get_user_organization_id()
    OR user_id = auth.uid()
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Clients editable by organization" ON clients;
CREATE POLICY "Clients editable by organization" ON clients
  FOR UPDATE USING (
    organization_id = public.get_user_organization_id()
    OR user_id = auth.uid()
    OR public.is_super_admin()
  );

-- Create RLS policies for class_sessions table
DROP POLICY IF EXISTS "Class sessions viewable by organization" ON class_sessions;
CREATE POLICY "Class sessions viewable by organization" ON class_sessions
  FOR SELECT USING (
    organization_id = public.get_user_organization_id()
    OR public.is_super_admin()
    -- Also allow public viewing for booking widgets
    OR EXISTS (
      SELECT 1 FROM organizations 
      WHERE id = class_sessions.organization_id 
      AND settings->>'public_booking' = 'true'
    )
  );

DROP POLICY IF EXISTS "Class sessions editable by organization admins" ON class_sessions;
CREATE POLICY "Class sessions editable by organization admins" ON class_sessions
  FOR ALL USING (
    public.is_organization_admin(organization_id)
    OR public.is_super_admin()
  );

-- Create RLS policies for class_bookings table  
DROP POLICY IF EXISTS "Bookings viewable by organization and clients" ON class_bookings;
CREATE POLICY "Bookings viewable by organization and clients" ON class_bookings
  FOR SELECT USING (
    organization_id = public.get_user_organization_id()
    OR client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Bookings insertable by organization" ON class_bookings;
CREATE POLICY "Bookings insertable by organization" ON class_bookings
  FOR INSERT WITH CHECK (
    organization_id = public.get_user_organization_id()
    OR client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

-- Fix security_audit_logs table structure if needed
ALTER TABLE security_audit_logs ADD COLUMN IF NOT EXISTS event_type text;
ALTER TABLE security_audit_logs ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE security_audit_logs ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE security_audit_logs ADD COLUMN IF NOT EXISTS details jsonb;
ALTER TABLE security_audit_logs ADD COLUMN IF NOT EXISTS ip_address text;
ALTER TABLE security_audit_logs ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Create RLS policy for security_audit_logs
ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Audit logs viewable by super admins only" ON security_audit_logs;
CREATE POLICY "Audit logs viewable by super admins only" ON security_audit_logs
  FOR SELECT USING (public.is_super_admin());

DROP POLICY IF EXISTS "Audit logs insertable by system" ON security_audit_logs;
CREATE POLICY "Audit logs insertable by system" ON security_audit_logs
  FOR INSERT WITH CHECK (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_organization_staff_user_org 
  ON organization_staff(user_id, organization_id);

CREATE INDEX IF NOT EXISTS idx_super_admin_users_user_id 
  ON super_admin_users(user_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user_created
  ON security_audit_logs(user_id, created_at DESC);

-- Insert initial security audit log entry
INSERT INTO security_audit_logs (
  event_type,
  user_id,
  details,
  ip_address,
  created_at
) VALUES (
  'SECURITY_MIGRATION_APPLIED',
  auth.uid(),
  jsonb_build_object(
    'migration', '20250122_security_functions_fix',
    'timestamp', now(),
    'description', 'Applied comprehensive security fixes and RLS policies'
  ),
  'migration',
  now()
) ON CONFLICT DO NOTHING;