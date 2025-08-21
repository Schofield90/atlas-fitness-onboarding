-- Check the structure of user_organizations table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_name = 'user_organizations'
ORDER BY 
    ordinal_position;