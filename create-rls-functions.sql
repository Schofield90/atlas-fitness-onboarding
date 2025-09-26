-- Create or replace the RLS helper functions

-- Function to get user's organization ID
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  org_id UUID;
BEGIN
  -- First check organization_staff table
  SELECT organization_id INTO org_id
  FROM organization_staff
  WHERE user_id = auth.uid()
  AND is_active = true
  LIMIT 1;

  IF org_id IS NOT NULL THEN
    RETURN org_id;
  END IF;

  -- Check user_organizations table
  SELECT organization_id INTO org_id
  FROM user_organizations
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF org_id IS NOT NULL THEN
    RETURN org_id;
  END IF;

  -- Check if user owns an organization
  SELECT id INTO org_id
  FROM organizations
  WHERE owner_id = auth.uid()
  LIMIT 1;

  RETURN org_id; -- This might be NULL, which is OK
END;
$$;

-- Function to check if user is a super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM super_admin_users
    WHERE user_id = auth.uid()
    AND is_active = true
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_organization_id() TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;

-- Now fix the clients table RLS policies to handle NULL organization IDs gracefully
DROP POLICY IF EXISTS "Clients viewable by organization" ON clients;
DROP POLICY IF EXISTS "Clients editable by organization" ON clients;
DROP POLICY IF EXISTS "clients_select_policy" ON clients;

-- Create improved policies that handle NULL organizations
CREATE POLICY "Clients viewable by organization or self"
ON clients FOR SELECT
TO authenticated
USING (
  -- User can see their own client record
  user_id = auth.uid()
  OR
  -- User can see clients in their organization (if they have one)
  (get_user_organization_id() IS NOT NULL AND organization_id = get_user_organization_id())
  OR
  -- Super admins can see all
  is_super_admin()
);

CREATE POLICY "Clients editable by organization admins"
ON clients FOR UPDATE
TO authenticated
USING (
  -- User can edit their own client record
  user_id = auth.uid()
  OR
  -- User can edit clients in their organization (if they have one and are admin/owner)
  (organization_id = get_user_organization_id() AND EXISTS (
    SELECT 1 FROM organization_staff
    WHERE user_id = auth.uid()
    AND organization_id = clients.organization_id
    AND role IN ('admin', 'owner')
    AND is_active = true
  ))
  OR
  -- Super admins can edit all
  is_super_admin()
)
WITH CHECK (
  -- Same as USING clause
  user_id = auth.uid()
  OR
  (organization_id = get_user_organization_id() AND EXISTS (
    SELECT 1 FROM organization_staff
    WHERE user_id = auth.uid()
    AND organization_id = clients.organization_id
    AND role IN ('admin', 'owner')
    AND is_active = true
  ))
  OR
  is_super_admin()
);

CREATE POLICY "Service role bypass"
ON clients FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Verify the new policies
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'clients'
ORDER BY policyname;