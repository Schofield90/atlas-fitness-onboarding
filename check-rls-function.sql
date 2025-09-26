-- Check if the get_user_organization_id() function exists and works
SELECT proname, prorettype::regtype, prosrc
FROM pg_proc
WHERE proname = 'get_user_organization_id';

-- Test the function for the current user
SELECT get_user_organization_id();

-- Also check is_super_admin function
SELECT proname, prorettype::regtype, prosrc
FROM pg_proc
WHERE proname = 'is_super_admin';

-- Test is_super_admin
SELECT is_super_admin();