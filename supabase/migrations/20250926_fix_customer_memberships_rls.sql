-- Fix RLS policies for customer_memberships table

-- First, check if RLS is enabled
ALTER TABLE customer_memberships ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view memberships in their organization" ON customer_memberships;
DROP POLICY IF EXISTS "Users can create memberships in their organization" ON customer_memberships;
DROP POLICY IF EXISTS "Users can update memberships in their organization" ON customer_memberships;
DROP POLICY IF EXISTS "Users can delete memberships in their organization" ON customer_memberships;
DROP POLICY IF EXISTS "Service role can do everything with customer memberships" ON customer_memberships;

-- Create comprehensive policies

-- Policy for viewing customer memberships (SELECT)
CREATE POLICY "Users can view memberships in their organization" ON customer_memberships
  FOR SELECT
  USING (
    -- Allow if user is in the same organization
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid()
      
      UNION
      
      SELECT org_id 
      FROM staff 
      WHERE user_id = auth.uid()
      
      UNION
      
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR
    -- Allow if user is the owner of the organization
    organization_id IN (
      SELECT id 
      FROM organizations 
      WHERE owner_id = auth.uid()
    )
  );

-- Policy for creating customer memberships (INSERT)
CREATE POLICY "Users can create memberships in their organization" ON customer_memberships
  FOR INSERT
  WITH CHECK (
    -- Allow if user is in the same organization with appropriate role
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid()
      
      UNION
      
      SELECT org_id 
      FROM staff 
      WHERE user_id = auth.uid()
      
      UNION
      
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
    OR
    -- Allow if user is the owner of the organization
    organization_id IN (
      SELECT id 
      FROM organizations 
      WHERE owner_id = auth.uid()
    )
  );

-- Policy for updating customer memberships (UPDATE)
CREATE POLICY "Users can update memberships in their organization" ON customer_memberships
  FOR UPDATE
  USING (
    -- Same as SELECT policy
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid()
      
      UNION
      
      SELECT org_id 
      FROM staff 
      WHERE user_id = auth.uid()
      
      UNION
      
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
    OR
    -- Allow if user is the owner of the organization
    organization_id IN (
      SELECT id 
      FROM organizations 
      WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Same as INSERT policy
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid()
      
      UNION
      
      SELECT org_id 
      FROM staff 
      WHERE user_id = auth.uid()
      
      UNION
      
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
    OR
    -- Allow if user is the owner of the organization
    organization_id IN (
      SELECT id 
      FROM organizations 
      WHERE owner_id = auth.uid()
    )
  );

-- Policy for deleting customer memberships (DELETE)
CREATE POLICY "Users can delete memberships in their organization" ON customer_memberships
  FOR DELETE
  USING (
    -- Allow if user is in the same organization
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid()
      
      UNION
      
      SELECT org_id 
      FROM staff 
      WHERE user_id = auth.uid()
      
      UNION
      
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
    OR
    -- Allow if user is the owner of the organization
    organization_id IN (
      SELECT id 
      FROM organizations 
      WHERE owner_id = auth.uid()
    )
  );

-- Add a simpler policy for service role to bypass all restrictions
CREATE POLICY "Service role can do everything with customer memberships" ON customer_memberships
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');