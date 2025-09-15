-- =====================================================
-- CHECK WHERE MIGRATION FILES ARE ACTUALLY STORED
-- Run this to see if files are in the wrong bucket
-- =====================================================

-- 1. Check what's in the OLD migrations bucket (if it exists)
SELECT
  'migrations' as bucket_name,
  COUNT(*) as file_count,
  ARRAY_AGG(name ORDER BY created_at DESC LIMIT 5) as recent_files
FROM storage.objects
WHERE bucket_id = 'migrations';

-- 2. Check what's in the migration-uploads bucket
SELECT
  'migration-uploads' as bucket_name,
  COUNT(*) as file_count,
  ARRAY_AGG(name ORDER BY created_at DESC LIMIT 5) as recent_files
FROM storage.objects
WHERE bucket_id = 'migration-uploads';

-- 3. Check what's in the migration-files bucket
SELECT
  'migration-files' as bucket_name,
  COUNT(*) as file_count,
  ARRAY_AGG(name ORDER BY created_at DESC LIMIT 5) as recent_files
FROM storage.objects
WHERE bucket_id = 'migration-files';

-- 4. Show ALL buckets and their file counts
SELECT
  b.id as bucket_id,
  b.name as bucket_name,
  b.public,
  COUNT(o.id) as file_count
FROM storage.buckets b
LEFT JOIN storage.objects o ON b.id = o.bucket_id
GROUP BY b.id, b.name, b.public
ORDER BY file_count DESC;

-- 5. Find your specific file across all buckets
SELECT
  bucket_id,
  name,
  created_at,
  metadata
FROM storage.objects
WHERE name LIKE '%teamup-customer-list-atlas-fitness-2025-09-15.csv%'
   OR name LIKE '%d663c635-4378-43c7-bde9-e5587e13a816%';

-- 6. Check the migration_files table to see what storage paths are recorded
SELECT
  mf.id,
  mf.migration_job_id,
  mf.file_name,
  mf.storage_path,
  mj.status as job_status,
  mf.created_at
FROM migration_files mf
JOIN migration_jobs mj ON mf.migration_job_id = mj.id
WHERE mf.organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
ORDER BY mf.created_at DESC
LIMIT 10;

-- 7. If files are in wrong bucket, you'll need to move them
-- This shows files that need to be moved from 'migrations' to 'migration-uploads'
SELECT
  'Files in wrong bucket:' as message,
  COUNT(*) as count
FROM storage.objects
WHERE bucket_id = 'migrations'
  AND name LIKE '%/%';