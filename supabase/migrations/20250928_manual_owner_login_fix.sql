-- Manual RLS fix for owner login
-- Drop and recreate just the problematic policies

-- Fix user_organizations policies
DROP POLICY IF EXISTS "user_organizations_select" ON user_organizations;
CREATE POLICY "user_organizations_select" ON user_organizations
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Fix organizations policies  
DROP POLICY IF EXISTS "organizations_select" ON organizations;
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

        RAISE NOTICE 'Fixed owner access for sam@atlas-gyms.co.uk';
    ELSE
        RAISE WARNING 'User sam@atlas-gyms.co.uk not found in auth.users table';
    END IF;
END $$;