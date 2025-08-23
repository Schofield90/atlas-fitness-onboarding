-- Check for tables that might contain client/lead data
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (
  table_name LIKE '%client%' OR 
  table_name LIKE '%lead%' OR 
  table_name LIKE '%member%' OR
  table_name LIKE '%customer%' OR
  table_name LIKE '%contact%'
)
ORDER BY table_name;

-- Check all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;