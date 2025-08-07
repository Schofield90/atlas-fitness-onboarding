-- Check existing Facebook-related tables and their columns
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name LIKE 'facebook%'
ORDER BY table_name, ordinal_position;

-- Check if facebook_integrations table exists and its structure
SELECT 
    'facebook_integrations exists' as status,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'facebook_integrations';

-- List all columns in facebook_integrations if it exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'facebook_integrations'
ORDER BY ordinal_position;