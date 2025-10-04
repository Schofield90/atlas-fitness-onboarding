/*
 * DATABASE RESET SCRIPT - TESTING ONLY
 *
 * WARNING: This script PERMANENTLY DELETES all organization data
 *
 * Purpose: Reset database to clean state for testing full onboarding flow
 * Keeps: sam@gymleadhub.co.uk user account
 * Removes: All organizations and related data
 *
 * Date: October 4, 2025
 * Author: database-architect (Claude)
 *
 * BEFORE RUNNING: Create a backup!
 * pg_dump or use Supabase Dashboard → Database → Backups
 */

-- ============================================================================
-- STEP 1: BACKUP VERIFICATION
-- ============================================================================

-- Run this query BEFORE executing the reset to save organization IDs
SELECT
  id,
  name,
  slug,
  email,
  created_at,
  (SELECT COUNT(*) FROM clients WHERE organization_id = organizations.id) as client_count,
  (SELECT COUNT(*) FROM leads WHERE organization_id = organizations.id) as lead_count,
  (SELECT COUNT(*) FROM class_sessions WHERE organization_id = organizations.id) as session_count
FROM organizations
ORDER BY created_at;

-- Expected output (current state):
-- 83932d14-acd1-4c78-a082-ead73ff5deed | GymLeadHub Admin | gymleadhub-admin | ...
-- 5fb020fb-4744-4e99-8054-e47d0cb47e5c | Atlas Fitness Harrogate | atlas-fitness-harrogate-fr72ma | ...


-- ============================================================================
-- STEP 2: VERIFY SUPER ADMIN USER
-- ============================================================================

-- Verify sam@gymleadhub.co.uk exists and get their ID
SELECT
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users
WHERE email = 'sam@gymleadhub.co.uk';

-- Expected: One row returned
-- Note this user_id - we'll keep this user


-- ============================================================================
-- STEP 3: DELETE ORGANIZATION DATA (CASCADE)
-- ============================================================================

-- WARNING: Uncomment the following lines to execute the deletion
-- This is commented by default to prevent accidental execution

/*

-- Begin transaction for safety
BEGIN;

-- Delete organization-related data in correct order (respecting foreign keys)

-- 1. Delete Stripe Connect accounts
DELETE FROM stripe_connect_accounts;

-- 2. Delete automation workflows and related data
DELETE FROM workflow_executions;
DELETE FROM workflow_triggers;
DELETE FROM automation_workflows;

-- 3. Delete communication data
DELETE FROM sms_messages;
DELETE FROM email_campaigns;
DELETE FROM conversations;

-- 4. Delete booking and class data
DELETE FROM class_bookings;
DELETE FROM bookings;
DELETE FROM class_sessions;
DELETE FROM classes;

-- 5. Delete membership data
DELETE FROM membership_payments;
DELETE FROM memberships;
DELETE FROM membership_plans;

-- 6. Delete financial data
DELETE FROM invoices;
DELETE FROM payments;

-- 7. Delete client/lead data
DELETE FROM client_notes;
DELETE FROM lead_notes;
DELETE FROM lead_scores;
DELETE FROM clients;
DELETE FROM leads;

-- 8. Delete integration data
DELETE FROM facebook_ad_accounts;
DELETE FROM integration_connections;

-- 9. Delete staff and user associations
DELETE FROM organization_staff;
DELETE FROM user_organizations;

-- 10. Delete settings and configurations
DELETE FROM organization_settings;
DELETE FROM webhook_endpoints;

-- 11. Finally, delete organizations (this will cascade to any remaining data)
DELETE FROM organizations;

-- Verify deletion
SELECT COUNT(*) as remaining_orgs FROM organizations;
-- Expected: 0

-- Verify user still exists
SELECT id, email FROM auth.users WHERE email = 'sam@gymleadhub.co.uk';
-- Expected: 1 row (user still exists)

-- If everything looks correct, commit the transaction
COMMIT;

-- If something went wrong, you can rollback instead:
-- ROLLBACK;

*/


-- ============================================================================
-- STEP 4: RESET AUTO-INCREMENT SEQUENCES (Optional)
-- ============================================================================

-- This ensures new IDs start from 1 again
-- Uncomment if you want clean sequential IDs

/*
ALTER SEQUENCE IF EXISTS clients_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS leads_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS bookings_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS memberships_id_seq RESTART WITH 1;
*/


-- ============================================================================
-- STEP 5: VERIFICATION QUERIES
-- ============================================================================

-- Run these queries AFTER the reset to verify success

-- Should return 0 organizations
SELECT COUNT(*) as org_count FROM organizations;

-- Should return 0 clients
SELECT COUNT(*) as client_count FROM clients;

-- Should return 0 leads
SELECT COUNT(*) as lead_count FROM leads;

-- Should return 0 bookings
SELECT COUNT(*) as booking_count FROM bookings;

-- Should return 1 user (sam@gymleadhub.co.uk)
SELECT COUNT(*) as user_count,
       STRING_AGG(email, ', ') as remaining_users
FROM auth.users;

-- Verify the super admin user
SELECT
  id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users
WHERE email = 'sam@gymleadhub.co.uk';


-- ============================================================================
-- STEP 6: OPTIONAL - REMOVE ALL USERS EXCEPT SUPER ADMIN
-- ============================================================================

-- WARNING: This deletes ALL users except sam@gymleadhub.co.uk
-- Uncomment ONLY if you want to remove all other user accounts

/*

BEGIN;

-- Delete user sessions first
DELETE FROM auth.sessions
WHERE user_id NOT IN (
  SELECT id FROM auth.users WHERE email = 'sam@gymleadhub.co.uk'
);

-- Delete user identities
DELETE FROM auth.identities
WHERE user_id NOT IN (
  SELECT id FROM auth.users WHERE email = 'sam@gymleadhub.co.uk'
);

-- Delete users (keeps only super admin)
DELETE FROM auth.users
WHERE email != 'sam@gymleadhub.co.uk';

-- Verify
SELECT id, email, created_at FROM auth.users;
-- Expected: Only sam@gymleadhub.co.uk remains

COMMIT;

*/


-- ============================================================================
-- NOTES FOR TESTING FULL ONBOARDING FLOW
-- ============================================================================

/*

After running this reset, you can test the complete onboarding flow:

1. Login as sam@gymleadhub.co.uk
   - Email: sam@gymleadhub.co.uk
   - Password: [your password]

2. Should be redirected to: /onboarding/create-organization
   (Because user has no organizations)

3. Create a new organization:
   - Organization Name: "Test Gym"
   - Auto-generates slug: "test-gym-abc123"

4. Verify path-based routing works:
   - Should redirect to: /org/test-gym-abc123/dashboard
   - Super admin can access: /org/test-gym-abc123/dashboard

5. Test creating a second organization:
   - Create another org as same user
   - Should be able to switch between orgs via URL
   - /org/test-gym-abc123/dashboard
   - /org/test-gym-2-xyz456/dashboard

6. Test staff member access:
   - Create new user account
   - Add as staff to one organization
   - Login as staff user
   - Should only access: /org/test-gym-abc123/dashboard
   - Should be blocked from: /org/test-gym-2-xyz456/dashboard

7. Verify super admin bypass:
   - Login as sam@gymleadhub.co.uk
   - Can access ALL organizations regardless of membership

*/


-- ============================================================================
-- ROLLBACK PLAN
-- ============================================================================

/*

If you need to rollback after running this reset:

Option 1: Restore from Supabase Backup
- Go to: Supabase Dashboard → Database → Backups
- Select most recent backup before reset
- Click "Restore"

Option 2: Restore from pg_dump
psql "postgresql://..." < backup_before_reset.sql

Option 3: Re-create test data
- Run this script again to get clean state
- Manually create test organizations

*/


-- ============================================================================
-- EXECUTION CHECKLIST
-- ============================================================================

/*

BEFORE running this script:
□ Create database backup (Supabase Dashboard or pg_dump)
□ Note down organization IDs and names (Step 1 query)
□ Verify super admin user exists (Step 2 query)
□ Confirm this is the correct database (dev or prod)
□ Uncomment STEP 3 and STEP 6 blocks

AFTER running this script:
□ Run verification queries (Step 5)
□ Test login as sam@gymleadhub.co.uk
□ Verify redirect to /onboarding/create-organization
□ Test creating new organization
□ Test path-based URL access
□ Verify super admin can access any org

*/
