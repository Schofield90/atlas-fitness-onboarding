-- Fix RLS policies for Atlas Fitness tables
-- This script allows authenticated organization members to see their data

-- 1. Fix programs table policies
DROP POLICY IF EXISTS "Programs visible to organization members" ON programs;
DROP POLICY IF EXISTS "Programs visible to authenticated users" ON programs;
DROP POLICY IF EXISTS "Users can view programs in their organization" ON programs;

CREATE POLICY "Programs visible to organization members" ON programs
FOR SELECT
USING (
  -- Allow if user is in organization_staff
  EXISTS (
    SELECT 1 FROM organization_staff
    WHERE organization_staff.user_id = auth.uid()
    AND organization_staff.organization_id = programs.organization_id
  )
  OR
  -- Allow if user is in organization_members
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.user_id = auth.uid()
    AND organization_members.organization_id = programs.organization_id
  )
  OR
  -- Allow if user is in user_organizations
  EXISTS (
    SELECT 1 FROM user_organizations
    WHERE user_organizations.user_id = auth.uid()
    AND user_organizations.organization_id = programs.organization_id
  )
  OR
  -- Special bypass for sam
  auth.uid() = 'ea1fc8e3-35a2-4c59-80af-5fde557391a1'
);

-- 2. Fix clients table policies
DROP POLICY IF EXISTS "Clients visible to organization members" ON clients;

CREATE POLICY "Clients visible to organization members" ON clients
FOR SELECT
USING (
  -- Allow if user is in organization_staff
  EXISTS (
    SELECT 1 FROM organization_staff
    WHERE organization_staff.user_id = auth.uid()
    AND organization_staff.organization_id = clients.organization_id
  )
  OR
  -- Allow if user is in organization_members
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.user_id = auth.uid()
    AND organization_members.organization_id = clients.organization_id
  )
  OR
  -- Allow if user is in user_organizations
  EXISTS (
    SELECT 1 FROM user_organizations
    WHERE user_organizations.user_id = auth.uid()
    AND user_organizations.organization_id = clients.organization_id
  )
  OR
  -- Special bypass for sam
  auth.uid() = 'ea1fc8e3-35a2-4c59-80af-5fde557391a1'
);

-- 3. Fix membership_plans table policies
DROP POLICY IF EXISTS "Membership plans visible to organization members" ON membership_plans;

CREATE POLICY "Membership plans visible to organization members" ON membership_plans
FOR SELECT
USING (
  -- Allow if user is in organization_staff
  EXISTS (
    SELECT 1 FROM organization_staff
    WHERE organization_staff.user_id = auth.uid()
    AND organization_staff.organization_id = membership_plans.organization_id
  )
  OR
  -- Allow if user is in organization_members
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.user_id = auth.uid()
    AND organization_members.organization_id = membership_plans.organization_id
  )
  OR
  -- Allow if user is in user_organizations
  EXISTS (
    SELECT 1 FROM user_organizations
    WHERE user_organizations.user_id = auth.uid()
    AND user_organizations.organization_id = membership_plans.organization_id
  )
  OR
  -- Special bypass for sam
  auth.uid() = 'ea1fc8e3-35a2-4c59-80af-5fde557391a1'
);

-- 4. Fix class_sessions table policies if needed
DROP POLICY IF EXISTS "Class sessions visible to organization members" ON class_sessions;

CREATE POLICY "Class sessions visible to organization members" ON class_sessions
FOR SELECT
USING (
  -- Allow if user is in organization_staff
  EXISTS (
    SELECT 1 FROM organization_staff
    WHERE organization_staff.user_id = auth.uid()
    AND organization_staff.organization_id = class_sessions.organization_id
  )
  OR
  -- Allow if user is in organization_members
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.user_id = auth.uid()
    AND organization_members.organization_id = class_sessions.organization_id
  )
  OR
  -- Allow if user is in user_organizations
  EXISTS (
    SELECT 1 FROM user_organizations
    WHERE user_organizations.user_id = auth.uid()
    AND user_organizations.organization_id = class_sessions.organization_id
  )
  OR
  -- Special bypass for sam
  auth.uid() = 'ea1fc8e3-35a2-4c59-80af-5fde557391a1'
);