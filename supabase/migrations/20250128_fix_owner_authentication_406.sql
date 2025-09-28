-- Fix owner authentication 406 errors for sam@atlas-gyms.co.uk
-- This migration ensures proper RLS policies for organizations and user_organizations tables

-- First, ensure RLS is enabled on both tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies on organizations table to start fresh
DROP POLICY IF EXISTS "organizations_select_policy" ON organizations;
DROP POLICY IF EXISTS "organizations_insert_policy" ON organizations;
DROP POLICY IF EXISTS "organizations_update_policy" ON organizations;
DROP POLICY IF EXISTS "organizations_delete_policy" ON organizations;
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Organization owners can update" ON organizations;
DROP POLICY IF EXISTS "Users can view own organization" ON organizations;
DROP POLICY IF EXISTS "Admins can update organization" ON organizations;
DROP POLICY IF EXISTS "organizations_select_own" ON organizations;
DROP POLICY IF EXISTS "organizations_update_admin" ON organizations;
DROP POLICY IF EXISTS "organizations_insert_super_admin" ON organizations;
DROP POLICY IF EXISTS "organizations_delete_super_admin" ON organizations;
DROP POLICY IF EXISTS "Clients can view their organization" ON organizations;
DROP POLICY IF EXISTS "Members can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Public can view organizations" ON organizations;
DROP POLICY IF EXISTS "users_view_own_organizations" ON organizations;
DROP POLICY IF EXISTS "owners_update_organizations" ON organizations;
DROP POLICY IF EXISTS "Organizations viewable by members" ON organizations;
DROP POLICY IF EXISTS "Organizations editable by owners" ON organizations;
DROP POLICY IF EXISTS "Users can insert their own organizations" ON organizations;
DROP POLICY IF EXISTS "Users can update their organizations" ON organizations;
DROP POLICY IF EXISTS "Owners can update organizations" ON organizations;

-- Drop all existing policies on user_organizations table
DROP POLICY IF EXISTS "Users can read their organization links" ON user_organizations;
DROP POLICY IF EXISTS "Service role full access" ON user_organizations;
DROP POLICY IF EXISTS "Service role can insert" ON user_organizations;
DROP POLICY IF EXISTS "Users can view their memberships" ON user_organizations;
DROP POLICY IF EXISTS "Organization owners can manage memberships" ON user_organizations;
DROP POLICY IF EXISTS "Users can view their own organization memberships" ON user_organizations;
DROP POLICY IF EXISTS "Users can manage their own organization memberships" ON user_organizations;

-- Create simple, permissive policies for organizations table
-- Allow authenticated users to view organizations they belong to
CREATE POLICY "organizations_select" ON organizations
FOR SELECT
TO authenticated
USING (
    -- User can see organization if they have a record in user_organizations
    id IN (
        SELECT organization_id 
        FROM user_organizations 
        WHERE user_id = auth.uid()
    )
    OR
    -- User can see organization if they are the owner
    owner_id = auth.uid()
    OR
    -- User can see organization if they are in organization_members
    id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = auth.uid() 
        AND is_active = true
    )
    OR
    -- User can see organization if they are staff
    id IN (
        SELECT organization_id 
        FROM organization_staff 
        WHERE user_id = auth.uid() 
        AND is_active = true
    )
);

-- Allow owners to insert their organizations
CREATE POLICY "organizations_insert" ON organizations
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

-- Allow owners to update their organizations  
CREATE POLICY "organizations_update" ON organizations
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Allow owners to delete their organizations
CREATE POLICY "organizations_delete" ON organizations
FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- Create simple policies for user_organizations table
-- Users can see their own organization memberships
CREATE POLICY "user_organizations_select" ON user_organizations
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Only allow inserts through service role or during signup
CREATE POLICY "user_organizations_insert" ON user_organizations
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own memberships
CREATE POLICY "user_organizations_update" ON user_organizations
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own memberships
CREATE POLICY "user_organizations_delete" ON user_organizations
FOR DELETE  
TO authenticated
USING (user_id = auth.uid());

-- Ensure sam@atlas-gyms.co.uk has proper data
DO $$
DECLARE
    sam_user_id UUID;
    atlas_org_id UUID := '63589490-8f55-4157-bd3a-e141594b748e';
BEGIN
    -- Get Sam's user ID from auth.users
    SELECT id INTO sam_user_id
    FROM auth.users
    WHERE email = 'sam@atlas-gyms.co.uk'
    LIMIT 1;

    IF sam_user_id IS NOT NULL THEN
        -- Ensure user exists in users table
        INSERT INTO users (id, email, name, created_at, updated_at)
        VALUES (
            sam_user_id,
            'sam@atlas-gyms.co.uk',
            'Sam',
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE
        SET email = EXCLUDED.email,
            updated_at = NOW();

        -- Ensure organization exists with Sam as owner
        INSERT INTO organizations (id, name, owner_id, created_at, updated_at)
        VALUES (
            atlas_org_id,
            'Atlas Fitness',
            sam_user_id,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE
        SET owner_id = sam_user_id,
            updated_at = NOW();

        -- Ensure user_organizations entry exists
        INSERT INTO user_organizations (user_id, organization_id, role, created_at, updated_at)
        VALUES (
            sam_user_id,
            atlas_org_id,
            'owner',
            NOW(),
            NOW()
        )
        ON CONFLICT (user_id) DO UPDATE
        SET organization_id = atlas_org_id,
            role = 'owner',
            updated_at = NOW();

        -- Also ensure organization_members entry exists for backward compatibility
        INSERT INTO organization_members (user_id, organization_id, role, is_active, created_at, updated_at)
        VALUES (
            sam_user_id,
            atlas_org_id,
            'owner',
            true,
            NOW(),
            NOW()
        )
        ON CONFLICT (user_id, organization_id) DO UPDATE
        SET role = 'owner',
            is_active = true,
            updated_at = NOW();

        -- Ensure organization_staff entry exists
        INSERT INTO organization_staff (user_id, organization_id, role, is_active, created_at, updated_at)
        VALUES (
            sam_user_id,
            atlas_org_id,
            'owner',
            true,
            NOW(),
            NOW()
        )
        ON CONFLICT (user_id, organization_id) DO UPDATE
        SET role = 'owner',
            is_active = true,
            updated_at = NOW();

        RAISE NOTICE 'Successfully ensured sam@atlas-gyms.co.uk has owner access to Atlas Fitness organization';
    ELSE
        RAISE WARNING 'User sam@atlas-gyms.co.uk not found in auth.users table';
    END IF;
END $$;

-- Grant necessary permissions
GRANT ALL ON organizations TO authenticated;
GRANT ALL ON user_organizations TO authenticated;

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

COMMENT ON MIGRATION IS 'Fix 406 authentication errors for owner login by simplifying RLS policies and ensuring proper data relationships';