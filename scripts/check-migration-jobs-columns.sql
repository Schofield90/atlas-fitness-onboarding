-- Check what columns exist in migration_jobs table
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'migration_jobs'
  AND table_schema = 'public'
ORDER BY ordinal_position;