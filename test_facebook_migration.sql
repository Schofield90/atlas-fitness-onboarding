-- Test Script for Facebook Integration Migration
-- Run this AFTER running the migration to verify everything works

-- Test 1: Check if all required columns exist
SELECT 'Testing column existence...' as test_name;

SELECT 
    CASE 
        WHEN COUNT(*) = 21 THEN 'PASS: All expected columns exist'
        ELSE 'FAIL: Missing columns. Found ' || COUNT(*) || ' out of 21 expected columns'
    END as column_test_result
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'facebook_integrations'
  AND column_name IN (
    'id', 'organization_id', 'user_id', 'facebook_user_id', 'facebook_user_name', 
    'facebook_user_email', 'access_token', 'token_expires_at', 'refresh_token', 
    'long_lived_token', 'granted_scopes', 'required_scopes', 'is_active', 
    'connection_status', 'last_sync_at', 'sync_frequency_hours', 'settings', 
    'webhook_config', 'error_details', 'created_at', 'updated_at'
  );

-- Test 2: List all actual columns for verification
SELECT 'Current table structure:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'facebook_integrations'
ORDER BY ordinal_position;

-- Test 3: Check constraints
SELECT 'Checking constraints...' as test_name;
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_schema = 'public' 
  AND table_name = 'facebook_integrations'
ORDER BY constraint_name;

-- Test 4: Check indexes
SELECT 'Checking indexes...' as test_name;
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'facebook_integrations'
ORDER BY indexname;

-- Test 5: Check RLS is enabled
SELECT 'Checking Row Level Security...' as test_name;
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    CASE 
        WHEN rowsecurity THEN 'PASS: RLS is enabled'
        ELSE 'FAIL: RLS is not enabled'
    END as rls_status
FROM pg_tables 
WHERE tablename = 'facebook_integrations';

-- Test 6: Check RLS policies
SELECT 'Checking RLS policies...' as test_name;
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'facebook_integrations';

-- Test 7: Test insert (this will fail if user is not authenticated, which is expected)
SELECT 'Testing basic functionality...' as test_name;

-- This should fail with RLS error if not authenticated (expected behavior)
-- INSERT INTO facebook_integrations (organization_id, user_id, facebook_user_id, facebook_user_name, access_token)
-- VALUES ('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'test_fb_user', 'Test User', 'test_token');

SELECT 'Migration verification complete!' as result;
SELECT 'Copy and paste the facebook_integrations_complete_migration.sql into Supabase SQL Editor and run it.' as instructions;