-- Test script to verify upload and parse workflow
-- Run this after attempting to upload a new CSV file

-- 1. Check recent migration jobs
SELECT 
  id,
  source_system,
  status,
  total_records,
  processed_records,
  created_at
FROM public.migration_jobs
WHERE organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
ORDER BY created_at DESC
LIMIT 5;

-- 2. Check files for most recent job
SELECT 
  mf.id,
  mf.file_name,
  mf.storage_path,
  mf.status,
  mf.row_count,
  mj.id as job_id
FROM public.migration_files mf
JOIN public.migration_jobs mj ON mf.migration_job_id = mj.id
WHERE mj.organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
ORDER BY mf.created_at DESC
LIMIT 5;

-- 3. Check if files exist in storage
SELECT 
  id,
  name,
  bucket_id,
  created_at
FROM storage.objects
WHERE bucket_id = 'migration-files'
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check migration records created
SELECT 
  COUNT(*) as record_count,
  migration_job_id,
  status
FROM public.migration_records
WHERE organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
GROUP BY migration_job_id, status
ORDER BY migration_job_id DESC
LIMIT 10;