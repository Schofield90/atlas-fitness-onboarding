-- =====================================================
-- QUICK FIX: Make "migrations" bucket public and accessible
-- Since all files are already in this bucket
-- =====================================================

-- 1. Make the migrations bucket public
UPDATE storage.buckets
SET public = true,
    file_size_limit = 104857600,
    allowed_mime_types = ARRAY['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain']
WHERE id = 'migrations';

-- 2. Drop old policies on migrations bucket
DROP POLICY IF EXISTS "Allow authenticated users to upload migration files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read migration files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to migration files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to migrations" ON storage.objects;
DROP POLICY IF EXISTS "Users can read from migrations" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to migrations" ON storage.objects;
DROP POLICY IF EXISTS "Service role full access to migrations" ON storage.objects;

-- 3. Create new policies for migrations bucket
CREATE POLICY "Users can upload to migrations"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'migrations');

CREATE POLICY "Users can read from migrations"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'migrations');

CREATE POLICY "Users can update migrations files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'migrations');

CREATE POLICY "Users can delete from migrations"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'migrations');

CREATE POLICY "Public read access to migrations"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'migrations');

CREATE POLICY "Service role full access to migrations"
ON storage.objects FOR ALL TO service_role
USING (bucket_id = 'migrations')
WITH CHECK (bucket_id = 'migrations');

-- 4. Verify the bucket is now public and accessible
SELECT
  id,
  name,
  public,
  file_size_limit
FROM storage.buckets
WHERE id = 'migrations';

-- 5. Check that files are accessible
SELECT
  COUNT(*) as total_files,
  MIN(created_at) as oldest_file,
  MAX(created_at) as newest_file
FROM storage.objects
WHERE bucket_id = 'migrations';