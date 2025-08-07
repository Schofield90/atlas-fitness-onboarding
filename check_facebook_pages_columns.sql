-- Check exact structure of facebook_pages table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'facebook_pages'
ORDER BY ordinal_position;