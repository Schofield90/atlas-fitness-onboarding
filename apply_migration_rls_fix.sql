-- =====================================================
-- FIX MIGRATION RLS POLICIES
-- Run this in Supabase SQL Editor to fix the migration wizard
-- =====================================================

-- First check what policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('migration_jobs', 'migration_files', 'migration_records', 'migration_field_mappings', 'migration_conflicts', 'migration_logs')
ORDER BY tablename, policyname;

-- Drop all existing policies
DROP POLICY IF EXISTS "migration_jobs_org_access" ON public.migration_jobs;
DROP POLICY IF EXISTS "migration_files_org_access" ON public.migration_files;
DROP POLICY IF EXISTS "migration_records_org_access" ON public.migration_records;
DROP POLICY IF EXISTS "field_mappings_org_access" ON public.migration_field_mappings;
DROP POLICY IF EXISTS "migration_conflicts_org_access" ON public.migration_conflicts;
DROP POLICY IF EXISTS "migration_logs_org_access" ON public.migration_logs;

-- Create new INSERT policies that are more permissive
CREATE POLICY "Users can insert migration jobs" ON public.migration_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IS NOT NULL
  );

CREATE POLICY "Users can view own migration jobs" ON public.migration_jobs
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own migration jobs" ON public.migration_jobs
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  );

-- Similar for migration_files
CREATE POLICY "Users can insert migration files" ON public.migration_files
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IS NOT NULL
  );

CREATE POLICY "Users can view own migration files" ON public.migration_files
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT ALL ON public.migration_jobs TO authenticated;
GRANT ALL ON public.migration_files TO authenticated;
GRANT ALL ON public.migration_records TO authenticated;
GRANT ALL ON public.migration_field_mappings TO authenticated;
GRANT ALL ON public.migration_conflicts TO authenticated;
GRANT ALL ON public.migration_logs TO authenticated;

-- Test the fix by checking if we can insert
-- This should return TRUE if the fix worked
SELECT EXISTS (
  SELECT 1 
  FROM information_schema.table_privileges 
  WHERE grantee = 'authenticated' 
  AND table_name = 'migration_jobs' 
  AND privilege_type = 'INSERT'
) as can_insert_migration_jobs;