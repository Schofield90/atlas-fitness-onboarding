-- Check the constraint on migration_jobs status
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'migration_jobs'::regclass
  AND conname LIKE '%status%';

-- Also check what statuses are actually being used
SELECT DISTINCT status, COUNT(*) as count
FROM migration_jobs
GROUP BY status
ORDER BY status;

-- Check the specific job's current data
SELECT
  id,
  status,
  total_records,
  processed_records,
  successful_records,
  failed_records
FROM migration_jobs
WHERE id = 'd663c635-4378-43c7-bde9-e5587e13a816';