-- =====================================================
-- CREATE MIGRATION-UPLOADS BUCKET WITH PROPER PERMISSIONS
-- Run this in Supabase Dashboard SQL Editor
-- =====================================================

-- 1. Check if the bucket exists
SELECT * FROM storage.buckets WHERE name = 'migration-uploads';

-- 2. Create the bucket if it doesn't exist (or update if it does)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'migration-uploads',
  'migration-uploads',
  true,  -- Make it public for easier access
  104857600,  -- 100MB limit
  ARRAY['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain']
)
ON CONFLICT (id)
DO UPDATE SET
  public = true,
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain'];

-- 3. Drop existing policies first (clean slate)
DROP POLICY IF EXISTS "Allow authenticated users to upload migration files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read migration files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to migration files" ON storage.objects;
DROP POLICY IF EXISTS "Allow service role full access" ON storage.objects;

-- 4. Create storage policies for migration-uploads bucket

-- Allow authenticated users to upload files
CREATE POLICY "Users can upload to migration-uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'migration-uploads');

-- Allow authenticated users to read files
CREATE POLICY "Users can read from migration-uploads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'migration-uploads');

-- Allow authenticated users to update their files
CREATE POLICY "Users can update migration-uploads files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'migration-uploads');

-- Allow authenticated users to delete their files
CREATE POLICY "Users can delete from migration-uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'migration-uploads');

-- Allow public read access (needed for the download methods)
CREATE POLICY "Public read access to migration-uploads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'migration-uploads');

-- Allow service role full access (for server-side operations)
CREATE POLICY "Service role full access to migration-uploads"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'migration-uploads')
WITH CHECK (bucket_id = 'migration-uploads');

-- 5. Check existing files in the OLD bucket (if any need to be migrated)
SELECT
  name,
  metadata,
  created_at,
  bucket_id
FROM storage.objects
WHERE bucket_id = 'migration-files'
ORDER BY created_at DESC
LIMIT 10;

-- 6. Verify the new bucket is properly configured
SELECT
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE name = 'migration-uploads';

-- 7. Test that policies are working
SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'objects'
  AND qual::text LIKE '%migration-uploads%'
ORDER BY policyname;

-- =====================================================
-- OPTIONAL: Migrate existing files from old bucket
-- Only run if you have files in 'migration-files' bucket
-- =====================================================

-- Check if there are files to migrate
-- SELECT COUNT(*) FROM storage.objects WHERE bucket_id = 'migration-files';

-- If you need to migrate files, you'll need to do it via the Supabase Dashboard
-- or using the Supabase JS client, as direct SQL updates won't move the actual files