-- Check if facebook_integrations table exists and its structure
SELECT 
    'Table Exists' as check_type,
    EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'facebook_integrations'
    ) as result;

-- Check columns if table exists
SELECT 
    'Columns' as check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'facebook_integrations'
ORDER BY ordinal_position;

-- Check RLS policies
SELECT 
    'RLS Policies' as check_type,
    policyname,
    cmd,
    permissive
FROM pg_policies
WHERE tablename = 'facebook_integrations';

-- Check if RLS is enabled
SELECT 
    'RLS Enabled' as check_type,
    relname,
    relrowsecurity
FROM pg_class
WHERE relname = 'facebook_integrations';

-- Check for any data
SELECT 
    'Row Count' as check_type,
    COUNT(*) as count
FROM facebook_integrations;

-- Check recent integrations (last 24 hours)
SELECT 
    'Recent Integrations' as check_type,
    id,
    user_id,
    facebook_user_name,
    is_active,
    created_at,
    updated_at
FROM facebook_integrations
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;