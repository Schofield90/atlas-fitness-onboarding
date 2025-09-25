-- ============================================
-- COMPLETE RESET TO CLEAN SAAS STATE
-- ============================================
-- This script will:
-- 1. Delete all business data (clients, organizations, etc.)
-- 2. Keep the schema and structure intact
-- 3. Set up admin user for platform management
-- 4. Allow fresh testing of the entire signup flow

BEGIN;

-- ============================================
-- STEP 1: DELETE ALL BUSINESS DATA
-- ============================================

-- Delete all client-related data
DELETE FROM client_invitations CASCADE;
DELETE FROM magic_links CASCADE;
DELETE FROM clients CASCADE;

-- Delete all organization-related data
DELETE FROM organization_knowledge CASCADE;
DELETE FROM organization_members CASCADE;
DELETE FROM organization_staff CASCADE;
DELETE FROM user_organizations CASCADE;
DELETE FROM organizations CASCADE;

-- Delete all leads and contacts
DELETE FROM leads CASCADE;
DELETE FROM contacts CASCADE;

-- Delete all booking-related data
DELETE FROM bookings CASCADE;
DELETE FROM class_bookings CASCADE;
DELETE FROM recurring_bookings CASCADE;
DELETE FROM class_sessions CASCADE;
DELETE FROM class_schedules CASCADE;
DELETE FROM booking_links CASCADE;

-- Delete all messaging data
DELETE FROM messages CASCADE;
DELETE FROM email_logs CASCADE;
DELETE FROM sms_logs CASCADE;
DELETE FROM whatsapp_logs CASCADE;

-- Delete all workflow and automation data
DELETE FROM workflow_runs CASCADE;
DELETE FROM workflow_logs CASCADE;
DELETE FROM workflow_definitions CASCADE;
DELETE FROM automation_rules CASCADE;
DELETE FROM automation_logs CASCADE;

-- Delete all payment-related data
DELETE FROM payments CASCADE;
DELETE FROM transactions CASCADE;
DELETE FROM membership_plans CASCADE;
DELETE FROM customer_memberships CASCADE;

-- Delete all integration data
DELETE FROM facebook_integrations CASCADE;
DELETE FROM facebook_pages CASCADE;
DELETE FROM facebook_leads CASCADE;
DELETE FROM goteamup_data CASCADE;

-- Delete all nutrition and training data
DELETE FROM nutrition_plans CASCADE;
DELETE FROM meal_plans CASCADE;
DELETE FROM workout_templates CASCADE;
DELETE FROM workout_logs CASCADE;

-- Delete all analytics data
DELETE FROM analytics_events CASCADE;
DELETE FROM lead_scores CASCADE;
DELETE FROM conversion_analytics CASCADE;

-- Delete profiles except for admin users
DELETE FROM profiles WHERE email NOT LIKE '%@gymleadhub.co.uk';

-- ============================================
-- STEP 2: RESET SEQUENCES
-- ============================================

-- Reset any sequences if needed (add as required)
-- ALTER SEQUENCE sequence_name RESTART WITH 1;

-- ============================================
-- STEP 3: SET UP ADMIN/SUPER ADMIN ACCESS
-- ============================================

-- Ensure super_admin_users table exists
CREATE TABLE IF NOT EXISTS super_admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'super_admin',
    permissions JSONB DEFAULT '["all"]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create or update admin user function
CREATE OR REPLACE FUNCTION ensure_admin_user(admin_email TEXT)
RETURNS void AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get user ID from auth.users
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = admin_email;

    IF v_user_id IS NOT NULL THEN
        -- Ensure user is in super_admin_users
        INSERT INTO super_admin_users (user_id, role, is_active, permissions)
        VALUES (v_user_id, 'super_admin', true, '["all"]'::jsonb)
        ON CONFLICT (user_id)
        DO UPDATE SET
            role = 'super_admin',
            is_active = true,
            permissions = '["all"]'::jsonb,
            updated_at = NOW();

        -- Ensure profile exists
        INSERT INTO profiles (id, email, role, created_at, updated_at)
        VALUES (v_user_id, admin_email, 'super_admin', NOW(), NOW())
        ON CONFLICT (id)
        DO UPDATE SET
            role = 'super_admin',
            updated_at = NOW();

        RAISE NOTICE 'Admin user % configured successfully', admin_email;
    ELSE
        RAISE NOTICE 'User % not found in auth.users - please create account first', admin_email;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Set up admin users (only for @gymleadhub.co.uk domain)
DO $$
DECLARE
    admin_user RECORD;
BEGIN
    FOR admin_user IN
        SELECT email, id
        FROM auth.users
        WHERE email LIKE '%@gymleadhub.co.uk'
    LOOP
        PERFORM ensure_admin_user(admin_user.email);
    END LOOP;
END $$;

-- ============================================
-- STEP 4: CREATE RLS POLICIES FOR SUPER ADMINS
-- ============================================

-- Drop and recreate RLS policy for super admins on organizations
DROP POLICY IF EXISTS "Super admins can manage all organizations" ON organizations;
CREATE POLICY "Super admins can manage all organizations" ON organizations
    FOR ALL USING (
        auth.uid() IN (
            SELECT user_id FROM super_admin_users WHERE is_active = true
        )
    );

-- Drop and recreate RLS policy for super admins on clients
DROP POLICY IF EXISTS "Super admins can manage all clients" ON clients;
CREATE POLICY "Super admins can manage all clients" ON clients
    FOR ALL USING (
        auth.uid() IN (
            SELECT user_id FROM super_admin_users WHERE is_active = true
        )
    );

-- ============================================
-- STEP 5: VERIFY CLEAN STATE
-- ============================================

DO $$
DECLARE
    org_count INT;
    client_count INT;
    admin_count INT;
BEGIN
    SELECT COUNT(*) INTO org_count FROM organizations;
    SELECT COUNT(*) INTO client_count FROM clients;
    SELECT COUNT(*) INTO admin_count FROM super_admin_users WHERE is_active = true;

    RAISE NOTICE '=== RESET COMPLETE ===';
    RAISE NOTICE 'Organizations: %', org_count;
    RAISE NOTICE 'Clients: %', client_count;
    RAISE NOTICE 'Active Admins: %', admin_count;
    RAISE NOTICE '=====================';

    IF org_count = 0 AND client_count = 0 AND admin_count > 0 THEN
        RAISE NOTICE '✅ System successfully reset to clean state';
        RAISE NOTICE '✅ Admin users configured';
        RAISE NOTICE '✅ Ready for fresh organization signup';
    ELSE
        RAISE WARNING '⚠️ Unexpected state - please review';
    END IF;
END $$;

COMMIT;

-- ============================================
-- NEXT STEPS:
-- ============================================
-- 1. Admin should log in at /admin
-- 2. Create first organization through signup flow
-- 3. Test organization owner login
-- 4. Test client/member registration
-- 5. Test all authentication flows