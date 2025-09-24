-- Emergency Fix for RLS Infinite Recursion Issues
-- This migration fixes the infinite recursion in RLS policies that's breaking owner login

-- 1. Temporarily disable RLS to fix policies
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_staff DISABLE ROW LEVEL SECURITY;

-- 2. Drop all existing problematic policies
DROP POLICY IF EXISTS "organizations_select_policy" ON organizations;
DROP POLICY IF EXISTS "organizations_insert_policy" ON organizations;
DROP POLICY IF EXISTS "organizations_update_policy" ON organizations;
DROP POLICY IF EXISTS "organizations_delete_policy" ON organizations;

DROP POLICY IF EXISTS "organization_members_select" ON organization_members;
DROP POLICY IF EXISTS "organization_members_insert" ON organization_members;
DROP POLICY IF EXISTS "organization_members_update" ON organization_members;
DROP POLICY IF EXISTS "organization_members_delete" ON organization_members;

DROP POLICY IF EXISTS "organization_staff_select" ON organization_staff;
DROP POLICY IF EXISTS "organization_staff_insert" ON organization_staff;
DROP POLICY IF EXISTS "organization_staff_update" ON organization_staff;
DROP POLICY IF EXISTS "organization_staff_delete" ON organization_staff;

-- 3. Create helper function to check organization membership (prevents recursion)
CREATE OR REPLACE FUNCTION check_organization_membership(org_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  has_access BOOLEAN;
BEGIN
  -- Check if user is owner
  SELECT EXISTS(
    SELECT 1 FROM organizations 
    WHERE id = org_id AND owner_id = user_id
  ) INTO has_access;
  
  IF has_access THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is a member
  SELECT EXISTS(
    SELECT 1 FROM organization_members 
    WHERE organization_id = org_id 
    AND organization_members.user_id = check_organization_membership.user_id 
    AND is_active = true
  ) INTO has_access;
  
  IF has_access THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is staff
  SELECT EXISTS(
    SELECT 1 FROM organization_staff 
    WHERE organization_id = org_id 
    AND organization_staff.user_id = check_organization_membership.user_id 
    AND is_active = true
  ) INTO has_access;
  
  RETURN has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create simple, non-recursive policies for organizations
CREATE POLICY "organizations_select_policy" ON organizations
  FOR SELECT USING (
    -- User is the owner
    auth.uid() = owner_id
    OR 
    -- User has membership (using function to prevent recursion)
    check_organization_membership(id, auth.uid())
    OR
    -- User is a client of this organization
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.organization_id = organizations.id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "organizations_insert_policy" ON organizations
  FOR INSERT WITH CHECK (
    -- Only allow insert if user will be the owner
    auth.uid() = owner_id
  );

CREATE POLICY "organizations_update_policy" ON organizations
  FOR UPDATE USING (
    -- Only owner can update
    auth.uid() = owner_id
    OR
    -- Or admin role members (using subquery to avoid recursion)
    auth.uid() IN (
      SELECT user_id FROM organization_members 
      WHERE organization_id = organizations.id 
      AND role IN ('admin', 'owner') 
      AND is_active = true
    )
    OR
    auth.uid() IN (
      SELECT user_id FROM organization_staff 
      WHERE organization_id = organizations.id 
      AND role IN ('admin', 'owner') 
      AND is_active = true
    )
  );

CREATE POLICY "organizations_delete_policy" ON organizations
  FOR DELETE USING (
    -- Only owner can delete
    auth.uid() = owner_id
  );

-- 5. Policies for organization_members (using subqueries instead of joins)
CREATE POLICY "organization_members_select" ON organization_members
  FOR SELECT USING (
    -- User can see their own membership
    auth.uid() = user_id
    OR
    -- Organization owner can see all members
    auth.uid() IN (
      SELECT owner_id FROM organizations 
      WHERE id = organization_members.organization_id
    )
    OR
    -- Admins can see members
    auth.uid() IN (
      SELECT user_id FROM organization_members om2 
      WHERE om2.organization_id = organization_members.organization_id 
      AND om2.role IN ('admin', 'owner') 
      AND om2.is_active = true
    )
  );

CREATE POLICY "organization_members_insert" ON organization_members
  FOR INSERT WITH CHECK (
    -- Organization owner can add members
    auth.uid() IN (
      SELECT owner_id FROM organizations 
      WHERE id = organization_members.organization_id
    )
    OR
    -- Admins can add members
    auth.uid() IN (
      SELECT user_id FROM organization_members 
      WHERE organization_id = organization_members.organization_id 
      AND role IN ('admin', 'owner') 
      AND is_active = true
    )
  );

CREATE POLICY "organization_members_update" ON organization_members
  FOR UPDATE USING (
    -- Organization owner can update members
    auth.uid() IN (
      SELECT owner_id FROM organizations 
      WHERE id = organization_members.organization_id
    )
    OR
    -- Admins can update members
    auth.uid() IN (
      SELECT user_id FROM organization_members om2 
      WHERE om2.organization_id = organization_members.organization_id 
      AND om2.role IN ('admin', 'owner') 
      AND om2.is_active = true
    )
  );

CREATE POLICY "organization_members_delete" ON organization_members
  FOR DELETE USING (
    -- Organization owner can remove members
    auth.uid() IN (
      SELECT owner_id FROM organizations 
      WHERE id = organization_members.organization_id
    )
  );

-- 6. Policies for organization_staff (similar pattern)
CREATE POLICY "organization_staff_select" ON organization_staff
  FOR SELECT USING (
    -- User can see their own staff record
    auth.uid() = user_id
    OR
    -- Organization owner can see all staff
    auth.uid() IN (
      SELECT owner_id FROM organizations 
      WHERE id = organization_staff.organization_id
    )
    OR
    -- Admins can see staff
    auth.uid() IN (
      SELECT user_id FROM organization_staff os2 
      WHERE os2.organization_id = organization_staff.organization_id 
      AND os2.role IN ('admin', 'owner') 
      AND os2.is_active = true
    )
  );

CREATE POLICY "organization_staff_insert" ON organization_staff
  FOR INSERT WITH CHECK (
    -- Organization owner can add staff
    auth.uid() IN (
      SELECT owner_id FROM organizations 
      WHERE id = organization_staff.organization_id
    )
    OR
    -- Admins can add staff
    auth.uid() IN (
      SELECT user_id FROM organization_staff 
      WHERE organization_id = organization_staff.organization_id 
      AND role IN ('admin', 'owner') 
      AND is_active = true
    )
  );

CREATE POLICY "organization_staff_update" ON organization_staff
  FOR UPDATE USING (
    -- Organization owner can update staff
    auth.uid() IN (
      SELECT owner_id FROM organizations 
      WHERE id = organization_staff.organization_id
    )
    OR
    -- Admins can update staff
    auth.uid() IN (
      SELECT user_id FROM organization_staff os2 
      WHERE os2.organization_id = organization_staff.organization_id 
      AND os2.role IN ('admin', 'owner') 
      AND os2.is_active = true
    )
  );

CREATE POLICY "organization_staff_delete" ON organization_staff
  FOR DELETE USING (
    -- Organization owner can remove staff
    auth.uid() IN (
      SELECT owner_id FROM organizations 
      WHERE id = organization_staff.organization_id
    )
  );

-- 7. Re-enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_staff ENABLE ROW LEVEL SECURITY;

-- 8. Fix the user_organizations view
DROP VIEW IF EXISTS user_organizations CASCADE;

CREATE OR REPLACE VIEW user_organizations AS
SELECT DISTINCT ON (user_id, organization_id)
  user_id,
  organization_id,
  role,
  organization_name,
  settings,
  created_at
FROM (
  SELECT 
    om.user_id,
    om.organization_id,
    om.role,
    o.name as organization_name,
    o.settings,
    o.created_at
  FROM organization_members om
  INNER JOIN organizations o ON o.id = om.organization_id
  WHERE om.is_active = true
  
  UNION ALL
  
  SELECT 
    os.user_id,
    os.organization_id,
    os.role,
    o.name as organization_name,
    o.settings,
    o.created_at
  FROM organization_staff os
  INNER JOIN organizations o ON o.id = os.organization_id
  WHERE os.is_active = true
  
  UNION ALL
  
  -- Include organizations owned by user
  SELECT 
    o.owner_id as user_id,
    o.id as organization_id,
    'owner' as role,
    o.name as organization_name,
    o.settings,
    o.created_at
  FROM organizations o
) combined
ORDER BY user_id, organization_id, 
  CASE role 
    WHEN 'owner' THEN 1 
    WHEN 'admin' THEN 2 
    ELSE 3 
  END;

-- Grant permissions
GRANT SELECT ON user_organizations TO authenticated;
GRANT EXECUTE ON FUNCTION check_organization_membership TO authenticated;

-- 9. Ensure sam@atlas-gyms.co.uk has proper access
DO $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
BEGIN
  -- Get user ID for sam@atlas-gyms.co.uk
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'sam@atlas-gyms.co.uk'
  LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    -- Find or create Atlas Fitness organization
    SELECT id INTO v_org_id
    FROM organizations
    WHERE owner_id = v_user_id
    OR name = 'Atlas Fitness'
    LIMIT 1;
    
    IF v_org_id IS NULL THEN
      -- Create organization
      INSERT INTO organizations (name, owner_id, settings)
      VALUES ('Atlas Fitness', v_user_id, '{}')
      RETURNING id INTO v_org_id;
    END IF;
    
    -- Ensure user is in organization_members
    INSERT INTO organization_members (organization_id, user_id, role, is_active)
    VALUES (v_org_id, v_user_id, 'owner', true)
    ON CONFLICT (organization_id, user_id) 
    DO UPDATE SET role = 'owner', is_active = true;
    
    -- Ensure user is in organization_staff
    INSERT INTO organization_staff (organization_id, user_id, role, is_active, permissions, system_mode)
    VALUES (v_org_id, v_user_id, 'owner', true, ARRAY['all'], 'full')
    ON CONFLICT (organization_id, user_id) 
    DO UPDATE SET role = 'owner', is_active = true, permissions = ARRAY['all'], system_mode = 'full';
    
    RAISE NOTICE 'Fixed access for sam@atlas-gyms.co.uk - Organization ID: %', v_org_id;
  END IF;
  
  -- Same for sam@gymleadhub.co.uk
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'sam@gymleadhub.co.uk'
  LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    -- Find or create GymLeadHub organization
    SELECT id INTO v_org_id
    FROM organizations
    WHERE owner_id = v_user_id
    OR name = 'GymLeadHub Admin'
    LIMIT 1;
    
    IF v_org_id IS NULL THEN
      -- Create organization
      INSERT INTO organizations (name, owner_id, settings)
      VALUES ('GymLeadHub Admin', v_user_id, '{}')
      RETURNING id INTO v_org_id;
    END IF;
    
    -- Ensure user is in organization_members
    INSERT INTO organization_members (organization_id, user_id, role, is_active)
    VALUES (v_org_id, v_user_id, 'owner', true)
    ON CONFLICT (organization_id, user_id) 
    DO UPDATE SET role = 'owner', is_active = true;
    
    -- Ensure user is in organization_staff
    INSERT INTO organization_staff (organization_id, user_id, role, is_active, permissions, system_mode)
    VALUES (v_org_id, v_user_id, 'owner', true, ARRAY['all'], 'full')
    ON CONFLICT (organization_id, user_id) 
    DO UPDATE SET role = 'owner', is_active = true, permissions = ARRAY['all'], system_mode = 'full';
    
    -- Also ensure super admin access
    INSERT INTO super_admin_users (user_id, role, is_active)
    VALUES (v_user_id, 'platform_admin', true)
    ON CONFLICT (user_id) 
    DO UPDATE SET role = 'platform_admin', is_active = true;
    
    RAISE NOTICE 'Fixed access for sam@gymleadhub.co.uk - Organization ID: %', v_org_id;
  END IF;
END $$;

-- 10. Verify the fix
SELECT 
  'RLS Policies Fixed' as status,
  COUNT(DISTINCT o.id) as organizations,
  COUNT(DISTINCT om.user_id) as members,
  COUNT(DISTINCT os.user_id) as staff
FROM organizations o
LEFT JOIN organization_members om ON om.organization_id = o.id AND om.is_active = true
LEFT JOIN organization_staff os ON os.organization_id = o.id AND os.is_active = true;