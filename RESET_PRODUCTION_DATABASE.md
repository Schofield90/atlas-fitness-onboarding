# Reset Production Database - Quick Guide

**⚠️ WARNING**: This will delete ALL organizations and data from production!

## Step 1: Open Supabase SQL Editor

1. Go to: https://app.supabase.com/project/yafbzdjwhlbeafamznhw/sql/new
2. This opens the SQL Editor for your production database

## Step 2: Copy and Paste This SQL

```sql
-- ============================================
-- PRODUCTION DATABASE RESET
-- ============================================

BEGIN;

-- 1. Check current state BEFORE deletion
SELECT
  (SELECT COUNT(*) FROM organizations) as orgs_before,
  (SELECT COUNT(*) FROM clients) as clients_before,
  (SELECT COUNT(*) FROM leads) as leads_before,
  (SELECT COUNT(*) FROM auth.users) as total_users,
  (SELECT email FROM auth.users WHERE email = 'sam@gymleadhub.co.uk' LIMIT 1) as super_admin;

-- 2. Remove organization references from users table
UPDATE users SET organization_id = NULL WHERE organization_id IS NOT NULL;

-- 3. Delete all organization data
DELETE FROM stripe_connect_accounts;
DELETE FROM class_bookings;
DELETE FROM bookings;
DELETE FROM class_sessions;
DELETE FROM classes;
DELETE FROM memberships;
DELETE FROM membership_plans;
DELETE FROM clients;
DELETE FROM leads;
DELETE FROM organization_staff;
DELETE FROM user_organizations;
DELETE FROM organizations;

-- 4. Verify deletion
SELECT
  (SELECT COUNT(*) FROM organizations) as orgs_after,
  (SELECT COUNT(*) FROM clients) as clients_after,
  (SELECT COUNT(*) FROM leads) as leads_after,
  (SELECT COUNT(*) FROM auth.users) as total_users,
  (SELECT email FROM auth.users WHERE email = 'sam@gymleadhub.co.uk' LIMIT 1) as super_admin;

-- If everything looks good, COMMIT:
COMMIT;

-- If something went wrong, ROLLBACK instead:
-- ROLLBACK;
```

## Step 3: Click "Run"

- The query will show you the BEFORE and AFTER counts
- Verify that `super_admin` still shows `sam@gymleadhub.co.uk`
- Verify `orgs_after` shows `0`

## Step 4: Expected Result

```
 orgs_before | clients_before | leads_before | total_users | super_admin
-------------+----------------+--------------+-------------+----------------------
           2 |             X  |          X   |      X      | sam@gymleadhub.co.uk

 orgs_after | clients_after | leads_after | total_users | super_admin
------------+---------------+-------------+-------------+----------------------
          0 |            0  |          0  |      X      | sam@gymleadhub.co.uk
```

## Step 5: Test Login

1. Go to: https://login.gymleadhub.co.uk
2. Login with: `sam@gymleadhub.co.uk` / `@Aa80236661`
3. Should redirect to: `/onboarding/create-organization`
4. ✅ Ready for fresh signup flow!

---

## ⚠️ Important Notes

- **Preserves**: All auth.users (including sam@gymleadhub.co.uk)
- **Deletes**: All organizations, clients, leads, bookings, etc.
- **Safe**: Transaction wrapped - can ROLLBACK if needed
- **Backup**: Supabase automatically backs up daily

---

## Alternative: Delete Specific User Accounts

If you also want to remove other user accounts (keeping only super admin):

```sql
BEGIN;

-- Delete all users EXCEPT super admin
DELETE FROM auth.sessions
WHERE user_id NOT IN (
  SELECT id FROM auth.users WHERE email = 'sam@gymleadhub.co.uk'
);

DELETE FROM auth.identities
WHERE user_id NOT IN (
  SELECT id FROM auth.users WHERE email = 'sam@gymleadhub.co.uk'
);

DELETE FROM auth.users
WHERE email != 'sam@gymleadhub.co.uk';

-- Verify only super admin remains
SELECT id, email, created_at FROM auth.users;

COMMIT;
```

This will allow completely fresh user signups.
