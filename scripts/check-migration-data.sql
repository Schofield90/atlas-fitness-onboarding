-- Check the latest migration job details
SELECT 
  id,
  status,
  total_records,
  processed_records,
  successful_records,
  failed_records,
  field_mappings,
  created_at,
  completed_at
FROM migration_jobs 
WHERE organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
ORDER BY created_at DESC
LIMIT 5;

-- Check migration logs for the latest job
SELECT 
  level,
  message,
  details,
  created_at
FROM migration_logs
WHERE migration_job_id IN (
  SELECT id FROM migration_jobs 
  WHERE organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
  ORDER BY created_at DESC
  LIMIT 1
)
ORDER BY created_at DESC;

-- Check migration records for the latest job
SELECT 
  COUNT(*) as total_records,
  COUNT(CASE WHEN status = 'success' THEN 1 END) as successful,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
  COUNT(CASE WHEN status = 'duplicate' THEN 1 END) as duplicates
FROM migration_records
WHERE migration_job_id IN (
  SELECT id FROM migration_jobs 
  WHERE organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
  ORDER BY created_at DESC
  LIMIT 1
);

-- Check if any clients were actually created
SELECT COUNT(*) as client_count
FROM clients
WHERE organization_id = '63589490-8f55-4157-bd3a-e141594b748e';

-- Show first 5 clients to verify data
SELECT 
  id,
  first_name,
  last_name,
  email,
  created_at
FROM clients
WHERE organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
ORDER BY created_at DESC
LIMIT 5;