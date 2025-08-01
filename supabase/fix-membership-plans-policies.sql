-- Fix membership_plans RLS policies to use user_organizations table instead of organization_staff

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view membership plans from their organization" ON membership_plans;
DROP POLICY IF EXISTS "Users can insert membership plans for their organization" ON membership_plans;
DROP POLICY IF EXISTS "Users can update membership plans from their organization" ON membership_plans;
DROP POLICY IF EXISTS "Users can delete membership plans from their organization" ON membership_plans;

-- Create new policies using user_organizations table
CREATE POLICY "Users can view membership plans from their organization" ON membership_plans
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "Users can insert membership plans for their organization" ON membership_plans
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND is_active = true
    )
  );

CREATE POLICY "Users can update membership plans from their organization" ON membership_plans
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND is_active = true
    )
  );

CREATE POLICY "Users can delete membership plans from their organization" ON membership_plans
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND is_active = true
    )
  );

-- Test the policies by selecting membership plans
SELECT * FROM membership_plans 
WHERE organization_id = '63589490-8f55-4157-bd3a-e141594b748e';