-- Check for triggers on auth.users table that might be failing
SELECT 
    tgname as trigger_name,
    tgtype,
    proname as function_name
FROM pg_trigger 
JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
WHERE tgrelid = 'auth.users'::regclass
ORDER BY tgname;

-- Check if there's a public.users table with constraints
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY ordinal_position;

-- Check for any functions that handle new user creation
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname LIKE '%user%' 
AND n.nspname IN ('public', 'auth')
AND p.proname LIKE '%new%' OR p.proname LIKE '%create%' OR p.proname LIKE '%handle%'
ORDER BY n.nspname, p.proname;

-- Check for RLS policies on auth.users
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'auth' 
AND tablename = 'users';

-- Check if auth.users table has any check constraints
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'auth.users'::regclass
AND contype = 'c';