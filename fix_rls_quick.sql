-- Quick RLS fix for owner login 406 errors
-- This script applies just the essential RLS policy fixes needed

-- Enable RLS if not already enabled
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "user_organizations_select" ON user_organizations;
DROP POLICY IF EXISTS "Users can view their organization memberships" ON user_organizations;
DROP POLICY IF EXISTS "organizations_select" ON organizations;
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON organizations;

-- Create simple, working policies for user_organizations
CREATE POLICY "allow_users_own_memberships" ON user_organizations
  FOR ALL 
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create simple, working policies for organizations
CREATE POLICY "allow_users_owned_orgs" ON organizations
  FOR ALL 
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Also allow users to see organizations they are members of
CREATE POLICY "allow_users_member_orgs" ON organizations
  FOR SELECT 
  TO authenticated
  USING (
    id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid()
    )
  );

-- Grant necessary permissions
GRANT ALL ON user_organizations TO authenticated;
GRANT ALL ON organizations TO authenticated;