-- GoTeamUp Migration System Schema
-- This schema handles large-scale data imports from GoTeamUp with AI-powered field mapping

-- Migration Jobs table - tracks overall migration process
CREATE TABLE IF NOT EXISTS public.migration_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_system VARCHAR(50) NOT NULL DEFAULT 'goteamup',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  total_records INTEGER DEFAULT 0,
  processed_records INTEGER DEFAULT 0,
  successful_records INTEGER DEFAULT 0,
  failed_records INTEGER DEFAULT 0,
  ai_analysis JSONB,
  field_mappings JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT migration_status_check CHECK (status IN ('pending', 'uploading', 'analyzing', 'mapping', 'processing', 'completed', 'failed', 'cancelled'))
);

-- Migration Files table - stores uploaded file information
CREATE TABLE IF NOT EXISTS public.migration_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_job_id UUID NOT NULL REFERENCES public.migration_jobs(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  storage_path TEXT NOT NULL,
  raw_data JSONB,
  parsed_headers TEXT[],
  row_count INTEGER,
  status VARCHAR(20) DEFAULT 'uploaded',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT file_status_check CHECK (status IN ('uploaded', 'parsing', 'parsed', 'failed'))
);

-- Migration Records table - individual record processing tracking
CREATE TABLE IF NOT EXISTS public.migration_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_job_id UUID NOT NULL REFERENCES public.migration_jobs(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_record_id VARCHAR(255),
  record_type VARCHAR(50) NOT NULL,
  source_data JSONB NOT NULL,
  mapped_data JSONB,
  target_id UUID,
  target_table VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending',
  error_message TEXT,
  error_details JSONB,
  retry_count INTEGER DEFAULT 0,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT record_status_check CHECK (status IN ('pending', 'processing', 'success', 'failed', 'skipped', 'duplicate')),
  CONSTRAINT record_type_check CHECK (record_type IN ('client', 'membership', 'payment', 'attendance', 'class', 'form'))
);

-- Field Mappings table - AI-generated and user-confirmed field mappings
CREATE TABLE IF NOT EXISTS public.migration_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_job_id UUID NOT NULL REFERENCES public.migration_jobs(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_field VARCHAR(255) NOT NULL,
  target_field VARCHAR(255),
  target_table VARCHAR(50),
  data_type VARCHAR(50),
  transformation_rule JSONB,
  ai_confidence DECIMAL(3,2),
  user_confirmed BOOLEAN DEFAULT FALSE,
  sample_values JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(migration_job_id, source_field)
);

-- Migration Conflicts table - handles duplicate detection and resolution
CREATE TABLE IF NOT EXISTS public.migration_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_job_id UUID NOT NULL REFERENCES public.migration_jobs(id) ON DELETE CASCADE,
  migration_record_id UUID NOT NULL REFERENCES public.migration_records(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conflict_type VARCHAR(50) NOT NULL,
  existing_record_id UUID,
  existing_data JSONB,
  incoming_data JSONB,
  resolution_strategy VARCHAR(50),
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT conflict_type_check CHECK (conflict_type IN ('duplicate_email', 'duplicate_phone', 'data_mismatch', 'validation_error')),
  CONSTRAINT resolution_check CHECK (resolution_strategy IN ('skip', 'update', 'create_new', 'merge', 'manual'))
);

-- Migration Logs table - detailed logging for debugging and audit
CREATE TABLE IF NOT EXISTS public.migration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_job_id UUID NOT NULL REFERENCES public.migration_jobs(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  level VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT log_level_check CHECK (level IN ('debug', 'info', 'warning', 'error', 'critical'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_migration_jobs_org ON public.migration_jobs(organization_id);
CREATE INDEX IF NOT EXISTS idx_migration_jobs_status ON public.migration_jobs(status);
CREATE INDEX IF NOT EXISTS idx_migration_records_job ON public.migration_records(migration_job_id);
CREATE INDEX IF NOT EXISTS idx_migration_records_status ON public.migration_records(status);
CREATE INDEX IF NOT EXISTS idx_migration_conflicts_job ON public.migration_conflicts(migration_job_id);
CREATE INDEX IF NOT EXISTS idx_migration_logs_job ON public.migration_logs(migration_job_id);

-- RLS Policies
ALTER TABLE public.migration_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_logs ENABLE ROW LEVEL SECURITY;

-- Migration Jobs policies
CREATE POLICY "migration_jobs_org_access" ON public.migration_jobs
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Migration Files policies
CREATE POLICY "migration_files_org_access" ON public.migration_files
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Migration Records policies
CREATE POLICY "migration_records_org_access" ON public.migration_records
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Field Mappings policies
CREATE POLICY "field_mappings_org_access" ON public.migration_field_mappings
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Migration Conflicts policies
CREATE POLICY "migration_conflicts_org_access" ON public.migration_conflicts
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Migration Logs policies
CREATE POLICY "migration_logs_org_access" ON public.migration_logs
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Function to update migration job progress
CREATE OR REPLACE FUNCTION public.update_migration_progress(
  p_job_id UUID,
  p_processed INTEGER DEFAULT NULL,
  p_successful INTEGER DEFAULT NULL,
  p_failed INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.migration_jobs
  SET 
    processed_records = COALESCE(p_processed, processed_records),
    successful_records = COALESCE(p_successful, successful_records),
    failed_records = COALESCE(p_failed, failed_records),
    updated_at = NOW()
  WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log migration activity
CREATE OR REPLACE FUNCTION public.log_migration_activity(
  p_job_id UUID,
  p_level VARCHAR(20),
  p_message TEXT,
  p_details JSONB DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT organization_id INTO v_org_id
  FROM public.migration_jobs
  WHERE id = p_job_id;
  
  INSERT INTO public.migration_logs (
    migration_job_id,
    organization_id,
    level,
    message,
    details
  ) VALUES (
    p_job_id,
    v_org_id,
    p_level,
    p_message,
    p_details
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT ALL ON public.migration_jobs TO authenticated;
GRANT ALL ON public.migration_files TO authenticated;
GRANT ALL ON public.migration_records TO authenticated;
GRANT ALL ON public.migration_field_mappings TO authenticated;
GRANT ALL ON public.migration_conflicts TO authenticated;
GRANT ALL ON public.migration_logs TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_migration_progress TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_migration_activity TO authenticated;