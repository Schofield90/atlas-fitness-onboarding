-- Fix RLS policies for programs table

-- First, check if RLS is enabled
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view programs in their organization" ON programs;
DROP POLICY IF EXISTS "Users can create programs in their organization" ON programs;
DROP POLICY IF EXISTS "Users can update programs in their organization" ON programs;
DROP POLICY IF EXISTS "Users can delete programs in their organization" ON programs;

-- Create new comprehensive policies

-- Policy for viewing programs (SELECT)
CREATE POLICY "Users can view programs in their organization" ON programs
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

-- Policy for creating programs (INSERT)
CREATE POLICY "Users can create programs in their organization" ON programs
  FOR INSERT
  WITH CHECK (
    -- Allow if user is in the same organization with appropriate role
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'staff')
      
      UNION
      
      SELECT org_id 
      FROM staff 
      WHERE user_id = auth.uid()
      
      UNION
      
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND is_active = true 
      AND role IN ('owner', 'admin', 'staff')
    )
    OR
    -- Allow if user is the owner of the organization
    organization_id IN (
      SELECT id 
      FROM organizations 
      WHERE owner_id = auth.uid()
    )
  );

-- Policy for updating programs (UPDATE)
CREATE POLICY "Users can update programs in their organization" ON programs
  FOR UPDATE
  USING (
    -- Same as SELECT policy
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'staff')
      
      UNION
      
      SELECT org_id 
      FROM staff 
      WHERE user_id = auth.uid()
      
      UNION
      
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND is_active = true 
      AND role IN ('owner', 'admin', 'staff')
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
      AND role IN ('owner', 'admin', 'staff')
      
      UNION
      
      SELECT org_id 
      FROM staff 
      WHERE user_id = auth.uid()
      
      UNION
      
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND is_active = true 
      AND role IN ('owner', 'admin', 'staff')
    )
    OR
    -- Allow if user is the owner of the organization
    organization_id IN (
      SELECT id 
      FROM organizations 
      WHERE owner_id = auth.uid()
    )
  );

-- Policy for deleting programs (DELETE)
CREATE POLICY "Users can delete programs in their organization" ON programs
  FOR DELETE
  USING (
    -- Only owners and admins can delete
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      
      UNION
      
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND is_active = true 
      AND role IN ('owner', 'admin')
    )
    OR
    -- Allow if user is the owner of the organization
    organization_id IN (
      SELECT id 
      FROM organizations 
      WHERE owner_id = auth.uid()
    )
  );

-- Add a simpler policy for service role and authenticated users to bypass if needed
-- This helps during development but should be reviewed for production
CREATE POLICY "Service role can do everything" ON programs
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');