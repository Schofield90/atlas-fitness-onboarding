-- Fix owner login database schema issues
-- This migration addresses the missing columns causing 406 errors

-- Step 1: Add missing updated_at column to user_organizations table
DO $$
BEGIN
    -- Check if updated_at column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'user_organizations' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE user_organizations 
        ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        
        -- Update existing records with current timestamp
        UPDATE user_organizations 
        SET updated_at = NOW() 
        WHERE updated_at IS NULL;
        
        RAISE NOTICE 'Added updated_at column to user_organizations table';
    ELSE
        RAISE NOTICE 'updated_at column already exists in user_organizations table';
    END IF;
END $$;

-- Step 2: Ensure user_organizations table has correct structure
-- Check current structure and fix if needed
DO $$
DECLARE
    column_count INTEGER;
BEGIN
    -- Count existing columns to understand current structure
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'user_organizations';
    
    RAISE NOTICE 'user_organizations table has % columns', column_count;
    
    -- Ensure required columns exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'user_organizations' 
        AND column_name = 'user_id'
    ) THEN
        RAISE EXCEPTION 'user_organizations table missing user_id column';
    END IF;
    
    -- Check for organization_id vs org_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'user_organizations' 
        AND column_name = 'organization_id'
    ) THEN
        -- Check if it's org_id instead
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'user_organizations' 
            AND column_name = 'org_id'
        ) THEN
            -- Rename org_id to organization_id for consistency
            ALTER TABLE user_organizations 
            RENAME COLUMN org_id TO organization_id;
            RAISE NOTICE 'Renamed org_id to organization_id';
        ELSE
            RAISE EXCEPTION 'user_organizations table missing organization_id/org_id column';
        END IF;
    END IF;
    
    -- Ensure role column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'user_organizations' 
        AND column_name = 'role'
    ) THEN
        ALTER TABLE user_organizations 
        ADD COLUMN role TEXT NOT NULL DEFAULT 'member';
        RAISE NOTICE 'Added role column to user_organizations table';
    END IF;
    
    -- Ensure created_at column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'user_organizations' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE user_organizations 
        ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        
        -- Update existing records
        UPDATE user_organizations 
        SET created_at = NOW() 
        WHERE created_at IS NULL;
        
        RAISE NOTICE 'Added created_at column to user_organizations table';
    END IF;
END $$;

-- Step 3: Ensure Sam has proper organization links
DO $$
DECLARE
    sam_user_id UUID;
    atlas_org_id UUID;
    existing_link_count INTEGER;
BEGIN
    -- Get Sam's user ID from auth.users
    SELECT id INTO sam_user_id
    FROM auth.users
    WHERE email = 'sam@atlas-gyms.co.uk'
    LIMIT 1;

    IF sam_user_id IS NULL THEN
        RAISE WARNING 'User sam@atlas-gyms.co.uk not found in auth.users table';
        RETURN;
    END IF;

    RAISE NOTICE 'Found Sam user ID: %', sam_user_id;

    -- Get Atlas organization where Sam is owner
    SELECT id INTO atlas_org_id
    FROM organizations
    WHERE owner_id = sam_user_id
    AND name ILIKE '%atlas%'
    LIMIT 1;

    IF atlas_org_id IS NULL THEN
        -- Try to find any Atlas organization and set Sam as owner
        SELECT id INTO atlas_org_id
        FROM organizations
        WHERE name ILIKE '%atlas%'
        LIMIT 1;
        
        IF atlas_org_id IS NOT NULL THEN
            -- Set Sam as owner
            UPDATE organizations 
            SET owner_id = sam_user_id, updated_at = NOW()
            WHERE id = atlas_org_id;
            
            RAISE NOTICE 'Set Sam as owner of Atlas organization: %', atlas_org_id;
        ELSE
            RAISE WARNING 'No Atlas organization found to link to Sam';
            RETURN;
        END IF;
    END IF;

    RAISE NOTICE 'Atlas organization ID: %', atlas_org_id;

    -- Check if user_organizations link already exists
    SELECT COUNT(*) INTO existing_link_count
    FROM user_organizations
    WHERE user_id = sam_user_id AND organization_id = atlas_org_id;

    IF existing_link_count = 0 THEN
        -- Create the user_organizations link
        INSERT INTO user_organizations (user_id, organization_id, role, created_at, updated_at)
        VALUES (sam_user_id, atlas_org_id, 'owner', NOW(), NOW());
        
        RAISE NOTICE 'Created user_organizations link for Sam to Atlas organization';
    ELSE
        -- Update existing link to ensure role is owner
        UPDATE user_organizations 
        SET role = 'owner', updated_at = NOW()
        WHERE user_id = sam_user_id AND organization_id = atlas_org_id;
        
        RAISE NOTICE 'Updated existing user_organizations link for Sam';
    END IF;

    -- Ensure Sam exists in users table
    INSERT INTO users (id, email, full_name, created_at, updated_at)
    VALUES (sam_user_id, 'sam@atlas-gyms.co.uk', 'Sam', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(users.full_name, EXCLUDED.full_name),
        updated_at = NOW();

    RAISE NOTICE 'Ensured Sam exists in users table';

END $$;

-- Step 4: Update RLS policies to be more permissive for debugging
-- Temporarily make policies more permissive to fix 406 errors

-- Drop and recreate organizations policies
DROP POLICY IF EXISTS "organizations_select" ON organizations;
CREATE POLICY "organizations_select" ON organizations
FOR SELECT
TO authenticated
USING (
    -- Allow if user is owner
    owner_id = auth.uid()
    OR
    -- Allow if user is in user_organizations
    id IN (
        SELECT organization_id 
        FROM user_organizations 
        WHERE user_id = auth.uid()
    )
    OR
    -- Allow if user is in organization_members (backward compatibility)
    id IN (
        SELECT org_id 
        FROM organization_members 
        WHERE user_id = auth.uid()
    )
);

-- Drop and recreate user_organizations policies  
DROP POLICY IF EXISTS "user_organizations_select" ON user_organizations;
CREATE POLICY "user_organizations_select" ON user_organizations
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_organizations_insert" ON user_organizations;
CREATE POLICY "user_organizations_insert" ON user_organizations
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_organizations_update" ON user_organizations;
CREATE POLICY "user_organizations_update" ON user_organizations
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Step 5: Grant necessary permissions
GRANT ALL ON organizations TO authenticated;
GRANT ALL ON user_organizations TO authenticated;
GRANT ALL ON users TO authenticated;

-- Step 6: Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Final verification log
DO $$
DECLARE
    sam_user_id UUID;
    org_count INTEGER;
    user_org_count INTEGER;
BEGIN
    SELECT id INTO sam_user_id
    FROM auth.users
    WHERE email = 'sam@atlas-gyms.co.uk'
    LIMIT 1;
    
    IF sam_user_id IS NOT NULL THEN
        SELECT COUNT(*) INTO org_count
        FROM organizations
        WHERE owner_id = sam_user_id;
        
        SELECT COUNT(*) INTO user_org_count
        FROM user_organizations
        WHERE user_id = sam_user_id;
        
        RAISE NOTICE 'Migration complete - Sam owns % organizations and has % user_organization links', 
                     org_count, user_org_count;
    END IF;
END $$;

COMMENT ON MIGRATION IS 'Fix owner login 406 errors by ensuring proper schema and Sam organization links';