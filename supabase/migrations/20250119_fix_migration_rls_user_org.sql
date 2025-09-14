-- Fix RLS policies for migration tables to use user_organizations table only
-- Since users table doesn't exist, we need to update all policies

-- Drop existing incorrect policies
DROP POLICY IF EXISTS "Users can create migration jobs" ON public.migration_jobs;
DROP POLICY IF EXISTS "Users can view migration jobs" ON public.migration_jobs;
DROP POLICY IF EXISTS "Users can update migration jobs" ON public.migration_jobs;
DROP POLICY IF EXISTS "Users can delete migration jobs" ON public.migration_jobs;

DROP POLICY IF EXISTS "Users can manage migration files" ON public.migration_files;
DROP POLICY IF EXISTS "Users can manage migration records" ON public.migration_records;
DROP POLICY IF EXISTS "Users can manage field mappings" ON public.migration_field_mappings;
DROP POLICY IF EXISTS "Users can manage migration conflicts" ON public.migration_conflicts;
DROP POLICY IF EXISTS "Users can view migration logs" ON public.migration_logs;

-- Create correct policies using user_organizations table

-- MIGRATION JOBS POLICIES
CREATE POLICY "Users can create migration jobs" ON public.migration_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view migration jobs" ON public.migration_jobs
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update migration jobs" ON public.migration_jobs
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete migration jobs" ON public.migration_jobs
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  );

-- MIGRATION FILES POLICIES
CREATE POLICY "Users can manage migration files" ON public.migration_files
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  );

-- MIGRATION RECORDS POLICIES
CREATE POLICY "Users can manage migration records" ON public.migration_records
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  );

-- FIELD MAPPINGS POLICIES
CREATE POLICY "Users can manage field mappings" ON public.migration_field_mappings
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  );

-- MIGRATION CONFLICTS POLICIES
CREATE POLICY "Users can manage migration conflicts" ON public.migration_conflicts
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  );

-- MIGRATION LOGS POLICIES (read-only for users)
CREATE POLICY "Users can view migration logs" ON public.migration_logs
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  );

-- Grant necessary permissions
GRANT ALL ON public.migration_jobs TO authenticated;
GRANT ALL ON public.migration_files TO authenticated;
GRANT ALL ON public.migration_records TO authenticated;
GRANT ALL ON public.migration_field_mappings TO authenticated;
GRANT ALL ON public.migration_conflicts TO authenticated;
GRANT SELECT ON public.migration_logs TO authenticated;

-- Ensure the migration_dashboard view exists
CREATE OR REPLACE VIEW public.migration_dashboard AS
SELECT 
  mj.id,
  mj.organization_id,
  mj.source_system,
  mj.status,
  mj.total_records,
  mj.processed_records,
  mj.successful_records,
  mj.failed_records,
  mj.started_at,
  mj.completed_at,
  mj.created_at,
  mj.created_by,
  COUNT(DISTINCT mf.id) as file_count,
  COUNT(DISTINCT mc.id) as conflict_count,
  CASE 
    WHEN mj.total_records > 0 
    THEN ROUND((mj.processed_records::numeric / mj.total_records::numeric) * 100, 2)
    ELSE 0
  END as progress_percentage
FROM public.migration_jobs mj
LEFT JOIN public.migration_files mf ON mf.migration_job_id = mj.id
LEFT JOIN public.migration_conflicts mc ON mc.migration_job_id = mj.id AND mc.resolved_at IS NULL
GROUP BY mj.id;

-- Grant permissions on the view
GRANT SELECT ON public.migration_dashboard TO authenticated;