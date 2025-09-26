-- Fix RLS policies for clients table
-- This will allow users to check if they are a client without errors

-- First, drop any existing problematic policies
DROP POLICY IF EXISTS "Users can view own client record" ON clients;
DROP POLICY IF EXISTS "Service role has full access" ON clients;
DROP POLICY IF EXISTS "Service role bypass" ON clients;
DROP POLICY IF EXISTS "Users can read own client profile" ON clients;
DROP POLICY IF EXISTS "Admins can manage all clients" ON clients;

-- Create proper policies
-- 1. Allow users to check if they are a client (for the useOrganization hook)
CREATE POLICY "Users can check if they are a client"
ON clients FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2. Allow service role full access
CREATE POLICY "Service role full access"
ON clients FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 3. Allow organization members to view clients in their organization
CREATE POLICY "Organization members can view clients"
ON clients FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_organizations uo
    WHERE uo.user_id = auth.uid()
    AND uo.organization_id = clients.organization_id
  )
  OR
  EXISTS (
    SELECT 1 FROM organization_staff os
    WHERE os.user_id = auth.uid()
    AND os.organization_id = clients.organization_id
    AND os.is_active = true
  )
);

-- 4. Allow organization owners/admins to manage clients
CREATE POLICY "Organization admins can manage clients"
ON clients FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organizations o
    WHERE o.id = clients.organization_id
    AND o.owner_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM organization_staff os
    WHERE os.user_id = auth.uid()
    AND os.organization_id = clients.organization_id
    AND os.role IN ('admin', 'owner')
    AND os.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organizations o
    WHERE o.id = clients.organization_id
    AND o.owner_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM organization_staff os
    WHERE os.user_id = auth.uid()
    AND os.organization_id = clients.organization_id
    AND os.role IN ('admin', 'owner')
    AND os.is_active = true
  )
);

-- Verify the policies
SELECT policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'clients'
ORDER BY policyname;