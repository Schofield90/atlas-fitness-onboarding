-- Fix RLS policies for membership_plans table (simplified version)

-- First, check if RLS is enabled
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DO $$ 
BEGIN
    -- Drop all policies on membership_plans
    DROP POLICY IF EXISTS "Users can view membership plans in their organization" ON membership_plans;
    DROP POLICY IF EXISTS "Users can create membership plans in their organization" ON membership_plans;
    DROP POLICY IF EXISTS "Users can update membership plans in their organization" ON membership_plans;
    DROP POLICY IF EXISTS "Users can delete membership plans in their organization" ON membership_plans;
    DROP POLICY IF EXISTS "Service role can do everything with membership plans" ON membership_plans;
    DROP POLICY IF EXISTS "Enable read access for all users" ON membership_plans;
    DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON membership_plans;
    DROP POLICY IF EXISTS "Enable update for users based on organization_id" ON membership_plans;
    DROP POLICY IF EXISTS "Enable delete for users based on organization_id" ON membership_plans;
END $$;

-- Create simplified policies that should work

-- 1. Everyone can view membership plans (needed for public booking pages)
CREATE POLICY "Anyone can view membership plans" ON membership_plans
  FOR SELECT
  USING (true);

-- 2. Authenticated users can create membership plans if they own the organization
CREATE POLICY "Org owners can create membership plans" ON membership_plans
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      -- Check if user owns the organization directly
      organization_id IN (
        SELECT id FROM organizations WHERE owner_id = auth.uid()
      )
      OR
      -- Check via user_organizations table
      organization_id IN (
        SELECT organization_id 
        FROM user_organizations 
        WHERE user_id = auth.uid() 
        AND role = 'owner'
      )
      OR
      -- Check via organization_members table
      organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = auth.uid() 
        AND role = 'owner'
        AND is_active = true
      )
    )
  );

-- 3. Org owners can update their membership plans
CREATE POLICY "Org owners can update membership plans" ON membership_plans
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND (
      organization_id IN (
        SELECT id FROM organizations WHERE owner_id = auth.uid()
      )
      OR
      organization_id IN (
        SELECT organization_id 
        FROM user_organizations 
        WHERE user_id = auth.uid() 
        AND role = 'owner'
      )
      OR
      organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = auth.uid() 
        AND role = 'owner'
        AND is_active = true
      )
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      organization_id IN (
        SELECT id FROM organizations WHERE owner_id = auth.uid()
      )
      OR
      organization_id IN (
        SELECT organization_id 
        FROM user_organizations 
        WHERE user_id = auth.uid() 
        AND role = 'owner'
      )
      OR
      organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = auth.uid() 
        AND role = 'owner'
        AND is_active = true
      )
    )
  );

-- 4. Org owners can delete their membership plans  
CREATE POLICY "Org owners can delete membership plans" ON membership_plans
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL AND (
      organization_id IN (
        SELECT id FROM organizations WHERE owner_id = auth.uid()
      )
      OR
      organization_id IN (
        SELECT organization_id 
        FROM user_organizations 
        WHERE user_id = auth.uid() 
        AND role = 'owner'
      )
      OR
      organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = auth.uid() 
        AND role = 'owner'
        AND is_active = true
      )
    )
  );

-- 5. Service role bypass (for API operations)
CREATE POLICY "Service role bypass for membership plans" ON membership_plans
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');