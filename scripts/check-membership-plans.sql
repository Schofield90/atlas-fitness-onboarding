-- Check membership_plans structure
SELECT 
  column_name, 
  data_type
FROM information_schema.columns
WHERE table_name = 'membership_plans'
ORDER BY ordinal_position;