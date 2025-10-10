-- Migration: Add RLS policies to workflows and workflow_executions tables
-- Created: 2025-10-10
-- Purpose: Enable Row Level Security for multi-tenant workflow isolation

-- Enable RLS on workflows table
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view workflows from their organization
CREATE POLICY "Users can view own organization workflows"
  ON workflows FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_staff WHERE user_id = auth.uid()
      UNION
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

-- Policy: Users can create workflows for their organization
CREATE POLICY "Users can create organization workflows"
  ON workflows FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_staff WHERE user_id = auth.uid()
      UNION
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

-- Policy: Users can update workflows from their organization
CREATE POLICY "Users can update own organization workflows"
  ON workflows FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_staff WHERE user_id = auth.uid()
      UNION
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

-- Policy: Users can delete workflows from their organization
CREATE POLICY "Users can delete own organization workflows"
  ON workflows FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_staff WHERE user_id = auth.uid()
      UNION
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

-- Enable RLS on workflow_executions table
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view executions from their organization workflows
CREATE POLICY "Users can view own organization workflow executions"
  ON workflow_executions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_staff WHERE user_id = auth.uid()
      UNION
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

-- Policy: Users can create executions for their organization workflows
CREATE POLICY "Users can create organization workflow executions"
  ON workflow_executions FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_staff WHERE user_id = auth.uid()
      UNION
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

-- Policy: Users can update execution status for their organization
CREATE POLICY "Users can update own organization workflow executions"
  ON workflow_executions FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_staff WHERE user_id = auth.uid()
      UNION
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

-- Add helpful comments
COMMENT ON POLICY "Users can view own organization workflows" ON workflows IS
  'Allows users to view workflows from organizations they belong to (as staff, admin, or owner)';

COMMENT ON POLICY "Users can create organization workflows" ON workflows IS
  'Allows users to create workflows for organizations they belong to';

COMMENT ON POLICY "Users can update own organization workflows" ON workflows IS
  'Allows users to update workflows from organizations they belong to';

COMMENT ON POLICY "Users can delete own organization workflows" ON workflows IS
  'Allows users to delete workflows from organizations they belong to';

COMMENT ON POLICY "Users can view own organization workflow executions" ON workflow_executions IS
  'Allows users to view workflow execution logs from their organizations';

COMMENT ON POLICY "Users can create organization workflow executions" ON workflow_executions IS
  'Allows system to create workflow execution records for user organizations';

COMMENT ON POLICY "Users can update own organization workflow executions" ON workflow_executions IS
  'Allows system to update workflow execution status for user organizations';
