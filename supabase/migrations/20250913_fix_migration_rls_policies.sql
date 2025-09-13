-- Fix RLS policies for migration tables
-- This migration ensures users can create and manage migration jobs for their organization

-- First, check if RLS is enabled and policies exist
DO $$ 
BEGIN
    -- Ensure RLS is enabled on all migration tables
    ALTER TABLE IF EXISTS public.migration_jobs ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.migration_files ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.migration_records ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.migration_field_mappings ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.migration_conflicts ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.migration_logs ENABLE ROW LEVEL SECURITY;
END $$;

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "migration_jobs_org_access" ON public.migration_jobs;
DROP POLICY IF EXISTS "migration_files_org_access" ON public.migration_files;
DROP POLICY IF EXISTS "migration_records_org_access" ON public.migration_records;
DROP POLICY IF EXISTS "field_mappings_org_access" ON public.migration_field_mappings;
DROP POLICY IF EXISTS "migration_conflicts_org_access" ON public.migration_conflicts;
DROP POLICY IF EXISTS "migration_logs_org_access" ON public.migration_logs;

-- Create more permissive policies for migration_jobs
-- Allow users to INSERT if they have an organization
CREATE POLICY "Users can create migration jobs" ON public.migration_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IS NOT NULL AND
    (
      -- Check if user is in users table with this organization
      organization_id IN (
        SELECT organization_id FROM public.users WHERE id = auth.uid()
      )
      OR
      -- Check if user is in user_organizations table with this organization
      organization_id IN (
        SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
      )
    )
  );

-- Allow users to view their organization's migration jobs
CREATE POLICY "Users can view migration jobs" ON public.migration_jobs
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  );

-- Allow users to update their organization's migration jobs
CREATE POLICY "Users can update migration jobs" ON public.migration_jobs
  FOR UPDATE
  TO authenticated
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

-- Allow users to delete their organization's migration jobs
CREATE POLICY "Users can delete migration jobs" ON public.migration_jobs
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  );

-- Create similar policies for migration_files
CREATE POLICY "Users can create migration files" ON public.migration_files
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IS NOT NULL AND
    (
      organization_id IN (
        SELECT organization_id FROM public.users WHERE id = auth.uid()
      )
      OR
      organization_id IN (
        SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view migration files" ON public.migration_files
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update migration files" ON public.migration_files
  FOR UPDATE
  TO authenticated
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

CREATE POLICY "Users can delete migration files" ON public.migration_files
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  );

-- Create policies for migration_records
CREATE POLICY "Users can create migration records" ON public.migration_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IS NOT NULL AND
    (
      organization_id IN (
        SELECT organization_id FROM public.users WHERE id = auth.uid()
      )
      OR
      organization_id IN (
        SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view migration records" ON public.migration_records
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update migration records" ON public.migration_records
  FOR UPDATE
  TO authenticated
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

CREATE POLICY "Users can delete migration records" ON public.migration_records
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  );

-- Create policies for migration_field_mappings
CREATE POLICY "Users can create field mappings" ON public.migration_field_mappings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IS NOT NULL AND
    (
      organization_id IN (
        SELECT organization_id FROM public.users WHERE id = auth.uid()
      )
      OR
      organization_id IN (
        SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view field mappings" ON public.migration_field_mappings
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update field mappings" ON public.migration_field_mappings
  FOR UPDATE
  TO authenticated
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

CREATE POLICY "Users can delete field mappings" ON public.migration_field_mappings
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  );

-- Create policies for migration_conflicts
CREATE POLICY "Users can create migration conflicts" ON public.migration_conflicts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IS NOT NULL AND
    (
      organization_id IN (
        SELECT organization_id FROM public.users WHERE id = auth.uid()
      )
      OR
      organization_id IN (
        SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view migration conflicts" ON public.migration_conflicts
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update migration conflicts" ON public.migration_conflicts
  FOR UPDATE
  TO authenticated
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

CREATE POLICY "Users can delete migration conflicts" ON public.migration_conflicts
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  );

-- Create policies for migration_logs
CREATE POLICY "Users can create migration logs" ON public.migration_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IS NOT NULL AND
    (
      organization_id IN (
        SELECT organization_id FROM public.users WHERE id = auth.uid()
      )
      OR
      organization_id IN (
        SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view migration logs" ON public.migration_logs
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update migration logs" ON public.migration_logs
  FOR UPDATE
  TO authenticated
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

CREATE POLICY "Users can delete migration logs" ON public.migration_logs
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  );

-- Grant necessary permissions
GRANT ALL ON public.migration_jobs TO authenticated;
GRANT ALL ON public.migration_files TO authenticated;
GRANT ALL ON public.migration_records TO authenticated;
GRANT ALL ON public.migration_field_mappings TO authenticated;
GRANT ALL ON public.migration_conflicts TO authenticated;
GRANT ALL ON public.migration_logs TO authenticated;

-- Grant USAGE on any sequences (for auto-incrementing IDs if any)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;