-- Check current structure of facebook_integrations table
-- Run this in Supabase SQL Editor to see what columns exist

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'facebook_integrations'
ORDER BY ordinal_position;

-- Also check if the table exists at all
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'facebook_integrations'
) as table_exists;

-- Check for any constraints
SELECT 
    con.conname AS constraint_name,
    con.contype AS constraint_type,
    col.attname AS column_name
FROM pg_constraint con
JOIN pg_class cls ON con.conrelid = cls.oid
JOIN pg_attribute col ON col.attrelid = cls.oid AND col.attnum = ANY(con.conkey)
WHERE cls.relname = 'facebook_integrations'
  AND cls.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY con.conname;

-- Check for indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'facebook_integrations';