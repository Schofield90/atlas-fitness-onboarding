-- Check Supabase Auth Schema
-- Run this in Supabase SQL Editor

-- 1. Check if auth schema exists
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name = 'auth';

-- 2. Check auth.users table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'auth'
AND table_name = 'users'
ORDER BY ordinal_position;

-- 3. Check if there are any users in auth.users
SELECT COUNT(*) as user_count
FROM auth.users;

-- 4. Check for any constraints or issues with auth.users
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'auth'
AND table_name = 'users';

-- 5. Check if the specific user exists in auth.users
SELECT id, email, email_confirmed_at, created_at, last_sign_in_at
FROM auth.users
WHERE email = 'sam@gymleadhub.co.uk';

-- 6. Check auth.identities table
SELECT user_id, provider, provider_id
FROM auth.identities
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'sam@gymleadhub.co.uk'
);

-- 7. Check auth schema permissions
SELECT schemaname, tablename, tableowner
FROM pg_tables
WHERE schemaname = 'auth'
ORDER BY tablename;