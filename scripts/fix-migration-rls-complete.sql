-- =====================================================
-- COMPLETE MIGRATION RLS FIX
-- Run this AFTER creating the migration-uploads bucket
-- =====================================================

-- 1. First, ensure RLS is enabled on all migration tables
ALTER TABLE public.migration_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_logs ENABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies (clean slate)
DROP POLICY IF EXISTS "migration_jobs_org_access" ON public.migration_jobs;
DROP POLICY IF EXISTS "migration_files_org_access" ON public.migration_files;
DROP POLICY IF EXISTS "migration_records_org_access" ON public.migration_records;
DROP POLICY IF EXISTS "field_mappings_org_access" ON public.migration_field_mappings;
DROP POLICY IF EXISTS "migration_conflicts_org_access" ON public.migration_conflicts;
DROP POLICY IF EXISTS "migration_logs_org_access" ON public.migration_logs;
DROP POLICY IF EXISTS "Users can insert migration jobs" ON public.migration_jobs;
DROP POLICY IF EXISTS "Users can view own migration jobs" ON public.migration_jobs;
DROP POLICY IF EXISTS "Users can update own migration jobs" ON public.migration_jobs;
DROP POLICY IF EXISTS "Users can insert migration files" ON public.migration_files;
DROP POLICY IF EXISTS "Users can view own migration files" ON public.migration_files;

-- 3. Create comprehensive policies for migration_jobs
CREATE POLICY "migration_jobs_insert" ON public.migration_jobs
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "migration_jobs_select" ON public.migration_jobs
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "migration_jobs_update" ON public.migration_jobs
  FOR UPDATE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "migration_jobs_delete" ON public.migration_jobs
  FOR DELETE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  );

-- 4. Create policies for migration_files
CREATE POLICY "migration_files_insert" ON public.migration_files
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "migration_files_select" ON public.migration_files
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "migration_files_update" ON public.migration_files
  FOR UPDATE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  );

-- 5. Create policies for migration_records
CREATE POLICY "migration_records_insert" ON public.migration_records
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.migration_jobs mj
      WHERE mj.id = migration_records.job_id
      AND mj.organization_id IN (
        SELECT organization_id FROM public.users WHERE id = auth.uid()
        UNION
        SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "migration_records_select" ON public.migration_records
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.migration_jobs mj
      WHERE mj.id = migration_records.job_id
      AND mj.organization_id IN (
        SELECT organization_id FROM public.users WHERE id = auth.uid()
        UNION
        SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "migration_records_update" ON public.migration_records
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.migration_jobs mj
      WHERE mj.id = migration_records.job_id
      AND mj.organization_id IN (
        SELECT organization_id FROM public.users WHERE id = auth.uid()
        UNION
        SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
      )
    )
  );

-- 6. Create policies for migration_field_mappings
CREATE POLICY "field_mappings_all" ON public.migration_field_mappings
  FOR ALL TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  );

-- 7. Create policies for migration_conflicts
CREATE POLICY "migration_conflicts_all" ON public.migration_conflicts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.migration_jobs mj
      WHERE mj.id = migration_conflicts.job_id
      AND mj.organization_id IN (
        SELECT organization_id FROM public.users WHERE id = auth.uid()
        UNION
        SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.migration_jobs mj
      WHERE mj.id = migration_conflicts.job_id
      AND mj.organization_id IN (
        SELECT organization_id FROM public.users WHERE id = auth.uid()
        UNION
        SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
      )
    )
  );

-- 8. Create policies for migration_logs
CREATE POLICY "migration_logs_all" ON public.migration_logs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.migration_jobs mj
      WHERE mj.id = migration_logs.job_id
      AND mj.organization_id IN (
        SELECT organization_id FROM public.users WHERE id = auth.uid()
        UNION
        SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.migration_jobs mj
      WHERE mj.id = migration_logs.job_id
      AND mj.organization_id IN (
        SELECT organization_id FROM public.users WHERE id = auth.uid()
        UNION
        SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
      )
    )
  );

-- 9. Grant necessary permissions
GRANT ALL ON public.migration_jobs TO authenticated;
GRANT ALL ON public.migration_files TO authenticated;
GRANT ALL ON public.migration_records TO authenticated;
GRANT ALL ON public.migration_field_mappings TO authenticated;
GRANT ALL ON public.migration_conflicts TO authenticated;
GRANT ALL ON public.migration_logs TO authenticated;

-- 10. Verify policies are created
SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('migration_jobs', 'migration_files', 'migration_records', 'migration_field_mappings', 'migration_conflicts', 'migration_logs')
ORDER BY tablename, policyname;

-- 11. Test that authenticated users can access migration tables
SELECT
  t.table_name,
  p.privilege_type,
  p.grantee
FROM information_schema.table_privileges p
JOIN information_schema.tables t ON p.table_name = t.table_name
WHERE p.grantee = 'authenticated'
  AND t.table_name LIKE 'migration%'
  AND t.table_schema = 'public'
ORDER BY t.table_name, p.privilege_type;