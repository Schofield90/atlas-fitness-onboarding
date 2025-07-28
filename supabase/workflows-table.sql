-- Create workflows table
CREATE TABLE IF NOT EXISTS workflows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused')),
  
  -- Workflow data
  nodes JSONB DEFAULT '[]',
  edges JSONB DEFAULT '[]',
  variables JSONB DEFAULT '{}',
  
  -- Configuration
  trigger_type TEXT,
  trigger_config JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  
  -- Stats
  total_executions INTEGER DEFAULT 0,
  successful_executions INTEGER DEFAULT 0,
  failed_executions INTEGER DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create workflow executions table
CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Execution data
  input_data JSONB DEFAULT '{}',
  output_data JSONB DEFAULT '{}',
  error_message TEXT,
  execution_steps JSONB DEFAULT '[]',
  
  -- Trigger info
  triggered_by TEXT,
  trigger_data JSONB DEFAULT '{}'
);

-- Create indexes
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_workflows_created_at ON workflows(created_at DESC);
CREATE INDEX idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_started_at ON workflow_executions(started_at DESC);

-- Enable RLS
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;

-- RLS policies for workflows
CREATE POLICY "Enable all for authenticated users" ON workflows
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable read for anon users" ON workflows
  FOR SELECT TO anon
  USING (status = 'active');

-- RLS policies for executions
CREATE POLICY "Enable all for authenticated users" ON workflow_executions
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Update trigger
CREATE TRIGGER update_workflows_updated_at
  BEFORE UPDATE ON workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();