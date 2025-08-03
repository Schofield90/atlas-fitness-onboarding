-- Fix RLS policies for class_sessions table

-- First, drop existing policies
DROP POLICY IF EXISTS "Users can view classes from their organization" ON class_sessions;
DROP POLICY IF EXISTS "Organization admins can insert classes" ON class_sessions;
DROP POLICY IF EXISTS "Organization admins can update classes" ON class_sessions;
DROP POLICY IF EXISTS "Organization admins can delete classes" ON class_sessions;

-- Create new policies
-- Policy for viewing classes (anyone authenticated can view)
CREATE POLICY "Users can view classes from their organization" ON class_sessions
FOR SELECT USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

-- Policy for inserting classes (admin and staff only)
CREATE POLICY "Organization admins can insert classes" ON class_sessions
FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin', 'staff')
  )
);

-- Policy for updating classes (admin and staff only)
CREATE POLICY "Organization admins can update classes" ON class_sessions
FOR UPDATE USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin', 'staff')
  )
);

-- Policy for deleting classes (admin only)
CREATE POLICY "Organization admins can delete classes" ON class_sessions
FOR DELETE USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
);

-- Also ensure the programs table has proper RLS
DROP POLICY IF EXISTS "Users can view programs from their organization" ON programs;
DROP POLICY IF EXISTS "Organization admins can manage programs" ON programs;

CREATE POLICY "Users can view programs from their organization" ON programs
FOR SELECT USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Organization admins can manage programs" ON programs
FOR ALL USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin', 'staff')
  )
);