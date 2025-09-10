-- Check which booking tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%booking%'
ORDER BY table_name;