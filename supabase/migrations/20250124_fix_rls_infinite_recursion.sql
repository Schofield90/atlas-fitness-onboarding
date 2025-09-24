-- Fix infinite recursion in organizations RLS policies
-- This happens when policies reference each other in a circular way

-- Drop existing problematic policies
DROP POLICY IF EXISTS "organizations_select_policy" ON organizations;
DROP POLICY IF EXISTS "organizations_insert_policy" ON organizations;
DROP POLICY IF EXISTS "organizations_update_policy" ON organizations;
DROP POLICY IF EXISTS "organizations_delete_policy" ON organizations;

-- Create simpler, non-recursive policies for organizations
CREATE POLICY "organizations_select_policy" ON organizations
    FOR SELECT USING (
        -- User is the owner
        auth.uid() = owner_id
        OR
        -- User is a member via organization_members
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_members.organization_id = organizations.id
            AND organization_members.user_id = auth.uid()
            AND organization_members.is_active = true
        )
        OR
        -- User is staff via organization_staff
        EXISTS (
            SELECT 1 FROM organization_staff
            WHERE organization_staff.organization_id = organizations.id
            AND organization_staff.user_id = auth.uid()
            AND organization_staff.is_active = true
        )
        OR
        -- User is a client of this organization
        EXISTS (
            SELECT 1 FROM clients
            WHERE clients.organization_id = organizations.id
            AND clients.user_id = auth.uid()
        )
    );

CREATE POLICY "organizations_insert_policy" ON organizations
    FOR INSERT WITH CHECK (
        -- Only allow insert if user will be the owner
        auth.uid() = owner_id
    );

CREATE POLICY "organizations_update_policy" ON organizations
    FOR UPDATE USING (
        -- Only owner can update
        auth.uid() = owner_id
        OR
        -- Or admin/owner role members
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_members.organization_id = organizations.id
            AND organization_members.user_id = auth.uid()
            AND organization_members.role IN ('admin', 'owner')
            AND organization_members.is_active = true
        )
        OR
        EXISTS (
            SELECT 1 FROM organization_staff
            WHERE organization_staff.organization_id = organizations.id
            AND organization_staff.user_id = auth.uid()
            AND organization_staff.role IN ('admin', 'owner')
            AND organization_staff.is_active = true
        )
    );

CREATE POLICY "organizations_delete_policy" ON organizations
    FOR DELETE USING (
        -- Only owner can delete
        auth.uid() = owner_id
    );

-- Fix user_organizations view if it exists
DROP VIEW IF EXISTS user_organizations CASCADE;

-- Create a simple view for user organizations
CREATE VIEW user_organizations AS
SELECT 
    om.user_id,
    om.organization_id,
    om.role,
    o.name as organization_name,
    o.settings,
    o.created_at
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id
WHERE om.is_active = true

UNION

SELECT 
    os.user_id,
    os.organization_id,
    os.role,
    o.name as organization_name,
    o.settings,
    o.created_at
FROM organization_staff os
JOIN organizations o ON o.id = os.organization_id
WHERE os.is_active = true;

-- Grant permissions on the view
GRANT SELECT ON user_organizations TO authenticated;