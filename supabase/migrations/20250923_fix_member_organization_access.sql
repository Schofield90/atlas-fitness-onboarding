-- Fix RLS policies for members to access their organization data
-- This addresses the 406 errors when members try to fetch their organization

-- Drop existing restrictive policies on organizations table
DROP POLICY IF EXISTS "organizations_select_policy" ON organizations;
DROP POLICY IF EXISTS "organizations_insert_policy" ON organizations;
DROP POLICY IF EXISTS "organizations_update_policy" ON organizations;
DROP POLICY IF EXISTS "organizations_delete_policy" ON organizations;

-- Create new policies that allow members to view their organization
CREATE POLICY "organizations_select_policy" ON organizations
FOR SELECT USING (
    -- Allow if user is owner
    auth.uid() = owner_id 
    OR 
    -- Allow if user is a member of this organization
    auth.uid() IN (
        SELECT user_id FROM clients 
        WHERE organization_id = organizations.id 
        AND user_id IS NOT NULL
    )
    OR
    -- Allow if user is staff in this organization  
    auth.uid() IN (
        SELECT user_id FROM organization_staff 
        WHERE organization_id = organizations.id 
        AND user_id IS NOT NULL
    )
);

-- Only owners can insert organizations
CREATE POLICY "organizations_insert_policy" ON organizations
FOR INSERT WITH CHECK (
    auth.uid() = owner_id
);

-- Only owners can update organizations
CREATE POLICY "organizations_update_policy" ON organizations
FOR UPDATE USING (
    auth.uid() = owner_id
);

-- Only owners can delete organizations
CREATE POLICY "organizations_delete_policy" ON organizations
FOR DELETE USING (
    auth.uid() = owner_id
);

-- Also fix the clients table RLS to ensure members can see their own record
DROP POLICY IF EXISTS "clients_select_policy" ON clients;

CREATE POLICY "clients_select_policy" ON clients
FOR SELECT USING (
    -- User can see their own client record
    user_id = auth.uid()
    OR
    -- Organization owner can see all clients
    organization_id IN (
        SELECT id FROM organizations 
        WHERE owner_id = auth.uid()
    )
    OR
    -- Staff can see clients in their organization
    organization_id IN (
        SELECT organization_id FROM organization_staff 
        WHERE user_id = auth.uid()
    )
);

-- Ensure member_profiles can be accessed by the member
DROP POLICY IF EXISTS "member_profiles_select_policy" ON member_profiles;

CREATE POLICY "member_profiles_select_policy" ON member_profiles
FOR SELECT USING (
    -- User can see their own profile (via client_id)
    client_id IN (
        SELECT id FROM clients 
        WHERE user_id = auth.uid()
    )
    OR
    -- Organization owner can see all profiles
    organization_id IN (
        SELECT id FROM organizations 
        WHERE owner_id = auth.uid()
    )
    OR
    -- Staff can see profiles in their organization
    organization_id IN (
        SELECT organization_id FROM organization_staff 
        WHERE user_id = auth.uid()
    )
);

-- Fix class_sessions access for members
DROP POLICY IF EXISTS "class_sessions_select_policy" ON class_sessions;

CREATE POLICY "class_sessions_select_policy" ON class_sessions
FOR SELECT USING (
    -- Anyone can view classes (needed for booking)
    true
);

-- Fix class_bookings access for members
DROP POLICY IF EXISTS "class_bookings_select_policy" ON class_bookings;

CREATE POLICY "class_bookings_select_policy" ON class_bookings
FOR SELECT USING (
    -- User can see their own bookings
    client_id IN (
        SELECT id FROM clients 
        WHERE user_id = auth.uid()
    )
    OR
    -- Organization owner can see all bookings
    organization_id IN (
        SELECT id FROM organizations 
        WHERE owner_id = auth.uid()
    )
    OR
    -- Staff can see bookings in their organization
    organization_id IN (
        SELECT organization_id FROM organization_staff 
        WHERE user_id = auth.uid()
    )
);

-- Allow members to create bookings
DROP POLICY IF EXISTS "class_bookings_insert_policy" ON class_bookings;

CREATE POLICY "class_bookings_insert_policy" ON class_bookings
FOR INSERT WITH CHECK (
    -- User can create bookings for themselves
    client_id IN (
        SELECT id FROM clients 
        WHERE user_id = auth.uid()
    )
);

-- Allow members to update their own bookings
DROP POLICY IF EXISTS "class_bookings_update_policy" ON class_bookings;

CREATE POLICY "class_bookings_update_policy" ON class_bookings
FOR UPDATE USING (
    -- User can update their own bookings
    client_id IN (
        SELECT id FROM clients 
        WHERE user_id = auth.uid()
    )
    OR
    -- Organization owner/staff can update any booking in their org
    organization_id IN (
        SELECT id FROM organizations 
        WHERE owner_id = auth.uid()
    )
    OR
    organization_id IN (
        SELECT organization_id FROM organization_staff 
        WHERE user_id = auth.uid()
    )
);