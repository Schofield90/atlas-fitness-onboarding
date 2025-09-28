-- Fix Owner Login RLS Policies
-- Migration: 20250928151818_fix_owner_login_rls_policies
-- 
-- This migration specifically addresses the 406 errors in owner login by:
-- 1. Ensuring RLS policies exist for user_organizations and organizations tables
-- 2. Making policies permissive enough to allow authenticated users to see their data
-- 3. Fixing the specific queries that are failing: user_organizations and organizations

-- =============================================
-- 1. Drop and recreate RLS policies for user_organizations table
-- =============================================

-- Enable RLS if not already enabled
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "user_organizations_select" ON user_organizations;
DROP POLICY IF EXISTS "Users can view their organization memberships" ON user_organizations;
DROP POLICY IF EXISTS "Users can see their own organizations" ON user_organizations;

-- Create a simple, permissive policy for authenticated users to see their own records
CREATE POLICY "authenticated_users_can_view_own_memberships" ON user_organizations
  FOR SELECT 
  TO authenticated
  USING (user_id = auth.uid());

-- Allow authenticated users to insert their own records
CREATE POLICY "authenticated_users_can_insert_memberships" ON user_organizations
  FOR INSERT 
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow authenticated users to update their own records
CREATE POLICY "authenticated_users_can_update_memberships" ON user_organizations
  FOR UPDATE 
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =============================================
-- 2. Drop and recreate RLS policies for organizations table
-- =============================================

-- Enable RLS if not already enabled
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "organizations_select" ON organizations;
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON organizations;
DROP POLICY IF EXISTS "Users can see their organizations" ON organizations;

-- Create a permissive policy for authenticated users to see organizations they own
CREATE POLICY "authenticated_users_can_view_owned_organizations" ON organizations
  FOR SELECT 
  TO authenticated
  USING (owner_id = auth.uid());

-- Also allow users to see organizations they are members of
CREATE POLICY "authenticated_users_can_view_member_organizations" ON organizations
  FOR SELECT 
  TO authenticated
  USING (
    id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid()
    )
  );

-- Allow authenticated users to insert organizations they own
CREATE POLICY "authenticated_users_can_create_organizations" ON organizations
  FOR INSERT 
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Allow authenticated users to update organizations they own
CREATE POLICY "authenticated_users_can_update_owned_organizations" ON organizations
  FOR UPDATE 
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- =============================================
-- 3. Grant necessary permissions to authenticated role
-- =============================================

-- Grant SELECT permissions to authenticated users
GRANT SELECT ON user_organizations TO authenticated;
GRANT SELECT ON organizations TO authenticated;

-- Grant INSERT/UPDATE permissions for user operations
GRANT INSERT, UPDATE ON user_organizations TO authenticated;
GRANT INSERT, UPDATE ON organizations TO authenticated;

-- =============================================
-- 4. Test the policies with Sam's data
-- =============================================

DO $$
DECLARE
    sam_user_id UUID;
    test_memberships INTEGER;
    test_organizations INTEGER;
BEGIN
    -- Get Sam's user ID
    SELECT id INTO sam_user_id
    FROM auth.users
    WHERE email = 'sam@atlas-gyms.co.uk'
    LIMIT 1;

    IF sam_user_id IS NOT NULL THEN
        -- Test user_organizations access
        SELECT COUNT(*) INTO test_memberships
        FROM user_organizations
        WHERE user_id = sam_user_id;

        -- Test organizations access 
        SELECT COUNT(*) INTO test_organizations
        FROM organizations
        WHERE owner_id = sam_user_id;

        RAISE NOTICE '';
        RAISE NOTICE '>ê RLS POLICY TEST RESULTS:';
        RAISE NOTICE '============================';
        RAISE NOTICE '=d Sam User ID: %', sam_user_id;
        RAISE NOTICE '=Ë User memberships accessible: %', test_memberships;
        RAISE NOTICE '<â Organizations accessible: %', test_organizations;
        
        IF test_memberships > 0 AND test_organizations > 0 THEN
            RAISE NOTICE ' SUCCESS: RLS policies should now allow owner login';
        ELSE
            RAISE WARNING '   WARNING: May still have access issues';
            RAISE NOTICE '   - Check that Sam has user_organization records';
            RAISE NOTICE '   - Check that Sam owns organizations';
        END IF;
        RAISE NOTICE '';
    ELSE
        RAISE ERROR 'Sam user not found in auth.users table';
    END IF;
END $$;

-- =============================================
-- 5. Additional debugging information
-- =============================================

-- Show current auth.users record for Sam
DO $$
DECLARE
    sam_record RECORD;
BEGIN
    SELECT id, email, created_at INTO sam_record
    FROM auth.users
    WHERE email = 'sam@atlas-gyms.co.uk'
    LIMIT 1;
    
    IF FOUND THEN
        RAISE NOTICE '';
        RAISE NOTICE '= SAM AUTH DETAILS:';
        RAISE NOTICE '===================';
        RAISE NOTICE 'ID: %', sam_record.id;
        RAISE NOTICE 'Email: %', sam_record.email;
        RAISE NOTICE 'Created: %', sam_record.created_at;
        RAISE NOTICE '';
    END IF;
END $$;

-- Show Sam's current organization memberships
DO $$
DECLARE
    membership_record RECORD;
    counter INTEGER := 0;
BEGIN
    RAISE NOTICE '=Ë SAM USER_ORGANIZATIONS:';
    RAISE NOTICE '=========================';
    
    FOR membership_record IN
        SELECT uo.id, uo.organization_id, uo.role, uo.is_active, o.name as org_name
        FROM user_organizations uo
        LEFT JOIN organizations o ON uo.organization_id = o.id
        WHERE uo.user_id = (SELECT id FROM auth.users WHERE email = 'sam@atlas-gyms.co.uk')
    LOOP
        counter := counter + 1;
        RAISE NOTICE '%: Org % (%) - Role: % - Active: %', 
            counter, membership_record.org_name, membership_record.organization_id, 
            membership_record.role, membership_record.is_active;
    END LOOP;
    
    IF counter = 0 THEN
        RAISE NOTICE 'No user_organization records found for Sam';
    END IF;
    RAISE NOTICE '';
END $$;

COMMENT ON MIGRATION IS 'Fix RLS policies for user_organizations and organizations tables to resolve 406 errors in owner login';