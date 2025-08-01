-- Add organization_id to workflows table if it doesn't exist
ALTER TABLE workflows 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Create index for organization lookups
CREATE INDEX IF NOT EXISTS idx_workflows_organization ON workflows(organization_id);

-- Update RLS policies
DROP POLICY IF EXISTS "Users can view their organization workflows" ON workflows;
DROP POLICY IF EXISTS "Users can create workflows for their organization" ON workflows;
DROP POLICY IF EXISTS "Users can update their organization workflows" ON workflows;
DROP POLICY IF EXISTS "Users can delete their organization workflows" ON workflows;

-- Enable RLS
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

-- Create new RLS policies
CREATE POLICY "Users can view their organization workflows"
  ON workflows FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can create workflows for their organization"
  ON workflows FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can update their organization workflows"
  ON workflows FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can delete their organization workflows"
  ON workflows FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Add organization_id to workflow_executions too
ALTER TABLE workflow_executions 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Create index
CREATE INDEX IF NOT EXISTS idx_workflow_executions_organization ON workflow_executions(organization_id);

-- Enable RLS for executions
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for executions
CREATE POLICY "Users can view their organization workflow executions"
  ON workflow_executions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can create workflow executions for their organization"
  ON workflow_executions FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );