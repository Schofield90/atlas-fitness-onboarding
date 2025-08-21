-- Fix page_id constraint in facebook_integrations table
-- Run this in Supabase SQL Editor

-- Make page_id column nullable (it should not be required)
ALTER TABLE facebook_integrations 
ALTER COLUMN page_id DROP NOT NULL;

-- Also check and fix facebook_user_name if it is required but should not be
ALTER TABLE facebook_integrations 
ALTER COLUMN facebook_user_name DROP NOT NULL;

-- View current table structure to verify
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_name = 'facebook_integrations'
ORDER BY 
    ordinal_position;