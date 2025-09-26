-- Cleanup Script for Test Users
-- Run this in Supabase SQL Editor to remove test user data

-- First, delete from dependent tables
DELETE FROM user_organizations WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%test%' OR created_at > NOW() - INTERVAL '1 day'
);

DELETE FROM organization_members WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%test%' OR created_at > NOW() - INTERVAL '1 day'
);

DELETE FROM organization_staff WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%test%' OR created_at > NOW() - INTERVAL '1 day'
);

-- Delete organizations owned by test users
DELETE FROM organizations WHERE owner_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%test%' OR created_at > NOW() - INTERVAL '1 day'
);

-- Delete from users table
DELETE FROM users WHERE id IN (
  SELECT id FROM auth.users WHERE email LIKE '%test%' OR created_at > NOW() - INTERVAL '1 day'
);

-- Finally, delete from auth.users (this will cascade to other auth tables)
DELETE FROM auth.users WHERE email LIKE '%test%' OR created_at > NOW() - INTERVAL '1 day';

-- Optional: If you want to delete ALL users and start fresh, uncomment below
-- WARNING: This will delete ALL users and organizations!
/*
TRUNCATE TABLE user_organizations CASCADE;
TRUNCATE TABLE organization_members CASCADE;
TRUNCATE TABLE organization_staff CASCADE;
TRUNCATE TABLE organizations CASCADE;
TRUNCATE TABLE users CASCADE;
DELETE FROM auth.users;
*/