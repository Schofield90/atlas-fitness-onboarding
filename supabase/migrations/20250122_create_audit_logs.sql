-- Create security audit logs table
CREATE TABLE IF NOT EXISTS security_audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id uuid,
  details jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at 
  ON security_audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id 
  ON security_audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id 
  ON security_audit_logs(organization_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type 
  ON security_audit_logs(event_type);

-- Enable RLS
ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for security_audit_logs
DROP POLICY IF EXISTS "Audit logs viewable by super admins only" ON security_audit_logs;
CREATE POLICY "Audit logs viewable by super admins only" ON security_audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM super_admin_users 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Audit logs insertable by system" ON security_audit_logs;
CREATE POLICY "Audit logs insertable by system" ON security_audit_logs
  FOR INSERT WITH CHECK (true);

-- Fix organizations table owner_id issue
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id);

-- Update owner_id from organization_staff if not set
UPDATE organizations o
SET owner_id = (
  SELECT user_id 
  FROM organization_staff os
  WHERE os.organization_id = o.id
  AND os.role = 'owner'
  LIMIT 1
)
WHERE owner_id IS NULL;

-- Create policy for organizations with owner check
DROP POLICY IF EXISTS "Organizations editable by owners" ON organizations;
CREATE POLICY "Organizations editable by owners" ON organizations
  FOR UPDATE USING (
    COALESCE(owner_id, '00000000-0000-0000-0000-000000000000'::uuid) = auth.uid()
    OR EXISTS (
      SELECT 1 FROM organization_staff
      WHERE organization_id = organizations.id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM super_admin_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

-- Grant necessary permissions
GRANT ALL ON security_audit_logs TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Log the migration
INSERT INTO security_audit_logs (
  event_type,
  details,
  ip_address,
  created_at
) VALUES (
  'SECURITY_MIGRATION_COMPLETED',
  jsonb_build_object(
    'migration', '20250122_create_audit_logs',
    'timestamp', now(),
    'description', 'Created audit logs table and fixed remaining RLS policies'
  ),
  'migration',
  now()
);