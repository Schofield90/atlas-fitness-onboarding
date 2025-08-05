-- Workflow executions table
CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  triggered_by TEXT,
  trigger_data JSONB,
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  execution_steps JSONB,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add stats columns to workflows table if they don't exist
ALTER TABLE workflows 
ADD COLUMN IF NOT EXISTS total_executions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS successful_executions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS failed_executions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMP WITH TIME ZONE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_organization_id ON workflow_executions(organization_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_created_at ON workflow_executions(created_at);

-- Enable RLS
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view executions in their organization" ON workflow_executions
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM auth_users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "System can create executions" ON workflow_executions
  FOR INSERT
  WITH CHECK (true); -- Allow system to create executions via admin client

CREATE POLICY "System can update executions" ON workflow_executions
  FOR UPDATE
  WITH CHECK (true); -- Allow system to update executions via admin client

-- Function to update workflows stats
CREATE OR REPLACE FUNCTION update_workflow_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update workflow stats when execution completes
  IF NEW.status IN ('completed', 'failed') AND OLD.status = 'running' THEN
    UPDATE workflows
    SET 
      total_executions = total_executions + 1,
      successful_executions = CASE WHEN NEW.status = 'completed' THEN successful_executions + 1 ELSE successful_executions END,
      failed_executions = CASE WHEN NEW.status = 'failed' THEN failed_executions + 1 ELSE failed_executions END,
      last_run_at = NEW.completed_at,
      updated_at = NOW()
    WHERE id = NEW.workflow_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for stats update
CREATE TRIGGER update_workflow_stats_trigger
AFTER UPDATE ON workflow_executions
FOR EACH ROW
EXECUTE FUNCTION update_workflow_stats();

-- Grant permissions
GRANT ALL ON workflow_executions TO authenticated;
GRANT ALL ON workflow_executions TO service_role;