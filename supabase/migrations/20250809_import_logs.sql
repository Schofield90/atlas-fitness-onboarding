-- Import Logs Table for tracking bulk imports
CREATE TABLE IF NOT EXISTS import_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Import details
  type TEXT DEFAULT 'leads' CHECK (type IN ('leads', 'clients', 'bookings', 'products')),
  file_name TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  
  -- Counts
  total_records INTEGER DEFAULT 0,
  processed_records INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  duplicate_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  updated_count INTEGER DEFAULT 0,
  
  -- Options and progress
  options JSONB DEFAULT '{}', -- duplicate_handling, update_existing, etc
  field_mapping JSONB DEFAULT '{}', -- column mapping
  progress JSONB DEFAULT '{}', -- detailed progress info
  errors JSONB DEFAULT '[]', -- array of error objects
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Processing info
  processing_time_ms INTEGER,
  processed_by TEXT, -- worker/job ID
  
  -- Results
  results_url TEXT, -- URL to download results file
  rollback_available BOOLEAN DEFAULT false,
  rollback_data JSONB -- data for rollback if needed
);

-- Create indexes
CREATE INDEX idx_import_logs_organization ON import_logs(organization_id);
CREATE INDEX idx_import_logs_user ON import_logs(user_id);
CREATE INDEX idx_import_logs_status ON import_logs(status);
CREATE INDEX idx_import_logs_type ON import_logs(type);
CREATE INDEX idx_import_logs_created_at ON import_logs(created_at DESC);

-- Enable RLS
ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their organization's import logs" ON import_logs
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can create import logs for their organization" ON import_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can update their organization's import logs" ON import_logs
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_import_log_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  
  -- Calculate processing time if completed
  IF NEW.status = 'completed' OR NEW.status = 'failed' THEN
    NEW.completed_at = NOW();
    IF NEW.started_at IS NOT NULL THEN
      NEW.processing_time_ms = EXTRACT(MILLISECOND FROM (NOW() - NEW.started_at))::INTEGER;
    END IF;
  END IF;
  
  -- Set started_at when processing begins
  IF OLD.status = 'pending' AND NEW.status = 'processing' THEN
    NEW.started_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_import_logs_updated_at 
  BEFORE UPDATE ON import_logs
  FOR EACH ROW 
  EXECUTE FUNCTION update_import_log_updated_at();