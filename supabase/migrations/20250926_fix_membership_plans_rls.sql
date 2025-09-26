-- Fix RLS policies for membership_plans table

-- First, check if RLS is enabled
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view membership plans in their organization" ON membership_plans;
DROP POLICY IF EXISTS "Users can create membership plans in their organization" ON membership_plans;
DROP POLICY IF EXISTS "Users can update membership plans in their organization" ON membership_plans;
DROP POLICY IF EXISTS "Users can delete membership plans in their organization" ON membership_plans;

-- Create new comprehensive policies

-- Policy for viewing membership plans (SELECT)
CREATE POLICY "Users can view membership plans in their organization" ON membership_plans
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
    OR
    -- Allow public viewing of active plans (for member signup/booking)
    is_active = true
  );

-- Policy for creating membership plans (INSERT)
CREATE POLICY "Users can create membership plans in their organization" ON membership_plans
  FOR INSERT
  WITH CHECK (
    -- Allow if user is in the same organization with appropriate role
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      
      UNION
      
      SELECT org_id 
      FROM staff 
      WHERE user_id = auth.uid()
      
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

-- Policy for updating membership plans (UPDATE)
CREATE POLICY "Users can update membership plans in their organization" ON membership_plans
  FOR UPDATE
  USING (
    -- Same as SELECT policy for organization members
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      
      UNION
      
      SELECT org_id 
      FROM staff 
      WHERE user_id = auth.uid()
      
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
  )
  WITH CHECK (
    -- Same as INSERT policy
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      
      UNION
      
      SELECT org_id 
      FROM staff 
      WHERE user_id = auth.uid()
      
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

-- Policy for deleting membership plans (DELETE)
CREATE POLICY "Users can delete membership plans in their organization" ON membership_plans
  FOR DELETE
  USING (
    -- Only owners can delete
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND role = 'owner'
      
      UNION
      
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND is_active = true 
      AND role = 'owner'
    )
    OR
    -- Allow if user is the owner of the organization
    organization_id IN (
      SELECT id 
      FROM organizations 
      WHERE owner_id = auth.uid()
    )
  );

-- Add a simpler policy for service role
CREATE POLICY "Service role can do everything with membership plans" ON membership_plans
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');