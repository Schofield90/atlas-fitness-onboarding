-- Check class_sessions table structure
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'class_sessions'
ORDER BY ordinal_position;