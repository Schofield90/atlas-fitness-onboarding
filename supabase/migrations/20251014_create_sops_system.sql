-- Create SOPs (Standard Operating Procedures) table
CREATE TABLE IF NOT EXISTS sops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment explaining NULL organization_id
COMMENT ON COLUMN sops.organization_id IS 'NULL for platform-wide/global SOPs, UUID for organization-specific SOPs';

-- Create agent_sops junction table (many-to-many)
CREATE TABLE IF NOT EXISTS agent_sops (
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  sop_id UUID NOT NULL REFERENCES sops(id) ON DELETE CASCADE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (agent_id, sop_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_sops_organization ON sops(organization_id);
CREATE INDEX IF NOT EXISTS idx_sops_created_at ON sops(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_sops_agent ON agent_sops(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_sops_sop ON agent_sops(sop_id);

-- Add RLS policies for sops table
ALTER TABLE sops ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view SOPs in their organization
CREATE POLICY "Users can view organization SOPs" ON sops
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
      UNION
      SELECT id FROM organizations WHERE owner_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_staff WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can create SOPs in their organization
CREATE POLICY "Users can create organization SOPs" ON sops
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
      UNION
      SELECT id FROM organizations WHERE owner_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_staff WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update SOPs in their organization
CREATE POLICY "Users can update organization SOPs" ON sops
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
      UNION
      SELECT id FROM organizations WHERE owner_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_staff WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can delete SOPs in their organization
CREATE POLICY "Users can delete organization SOPs" ON sops
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
      UNION
      SELECT id FROM organizations WHERE owner_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_staff WHERE user_id = auth.uid()
    )
  );

-- Add RLS policies for agent_sops junction table
ALTER TABLE agent_sops ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view agent-SOP links for agents in their organization
CREATE POLICY "Users can view agent SOP links" ON agent_sops
  FOR SELECT
  USING (
    agent_id IN (
      SELECT id FROM ai_agents WHERE organization_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
        UNION
        SELECT id FROM organizations WHERE owner_id = auth.uid()
        UNION
        SELECT organization_id FROM organization_staff WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Users can create agent-SOP links for their agents
CREATE POLICY "Users can create agent SOP links" ON agent_sops
  FOR INSERT
  WITH CHECK (
    agent_id IN (
      SELECT id FROM ai_agents WHERE organization_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
        UNION
        SELECT id FROM organizations WHERE owner_id = auth.uid()
        UNION
        SELECT organization_id FROM organization_staff WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Users can delete agent-SOP links for their agents
CREATE POLICY "Users can delete agent SOP links" ON agent_sops
  FOR DELETE
  USING (
    agent_id IN (
      SELECT id FROM ai_agents WHERE organization_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
        UNION
        SELECT id FROM organizations WHERE owner_id = auth.uid()
        UNION
        SELECT organization_id FROM organization_staff WHERE user_id = auth.uid()
      )
    )
  );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sops_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sops_updated_at_trigger
  BEFORE UPDATE ON sops
  FOR EACH ROW
  EXECUTE FUNCTION update_sops_updated_at();

-- Create helper function to get concatenated SOPs for an agent
CREATE OR REPLACE FUNCTION get_agent_system_prompt(p_agent_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_combined_prompt TEXT;
BEGIN
  SELECT string_agg(s.content, E'\n\n---\n\n' ORDER BY asops.sort_order, s.name)
  INTO v_combined_prompt
  FROM agent_sops asops
  JOIN sops s ON s.id = asops.sop_id
  WHERE asops.agent_id = p_agent_id;

  RETURN COALESCE(v_combined_prompt, '');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on function
GRANT EXECUTE ON FUNCTION get_agent_system_prompt(UUID) TO authenticated;

-- Comment on tables
COMMENT ON TABLE sops IS 'Standard Operating Procedures that define AI agent behavior';
COMMENT ON TABLE agent_sops IS 'Junction table linking AI agents to multiple SOPs';
COMMENT ON COLUMN agent_sops.sort_order IS 'Order in which SOPs are concatenated for agent prompt';
COMMENT ON FUNCTION get_agent_system_prompt IS 'Returns concatenated system prompt from all linked SOPs';
