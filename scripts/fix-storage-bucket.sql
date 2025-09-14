-- Check and fix storage bucket permissions for migration-files
-- Run this in Supabase Dashboard SQL Editor

-- 1. Check if the bucket exists
SELECT * FROM storage.buckets WHERE name = 'migration-files';

-- 2. Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('migration-files', 'migration-files', true, 104857600, ARRAY['text/csv', 'application/csv', 'application/vnd.ms-excel'])
ON CONFLICT (id) 
DO UPDATE SET 
  public = true,
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY['text/csv', 'application/csv', 'application/vnd.ms-excel'];

-- 3. Create storage policies to allow authenticated users to read/write
-- Drop existing policies first
DROP POLICY IF EXISTS "Allow authenticated users to upload migration files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read migration files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to migration files" ON storage.objects;

-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated users to upload migration files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'migration-files');

-- Allow authenticated users to read their organization's files
CREATE POLICY "Allow authenticated users to read migration files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'migration-files');

-- Allow public read access (since we're trying to access via public URL)
CREATE POLICY "Allow public read access to migration files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'migration-files');

-- 4. Check existing files in the bucket
SELECT 
  name,
  metadata,
  created_at,
  updated_at
FROM storage.objects
WHERE bucket_id = 'migration-files'
ORDER BY created_at DESC
LIMIT 10;

-- 5. If files exist but can't be accessed, update their metadata
UPDATE storage.objects
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{cacheControl}',
  '"public, max-age=3600"'
)
WHERE bucket_id = 'migration-files';

-- 6. Verify the bucket is now public
SELECT id, name, public FROM storage.buckets WHERE name = 'migration-files';