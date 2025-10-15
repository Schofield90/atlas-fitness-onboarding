-- Guardrails System Migration
-- Migration: 20251015_create_guardrails_system.sql
-- Description: Creates customizable guardrails system for AI agents

-- =============================================
-- 1. GUARDRAILS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS guardrails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'tag_blocker',
    'business_hours',
    'rate_limit',
    'lead_status',
    'human_takeover',
    'conversation_status',
    'custom'
  )),
  config JSONB NOT NULL DEFAULT '{}',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_guardrail_name_per_org UNIQUE(organization_id, name)
);

-- =============================================
-- 2. AGENT_GUARDRAILS JUNCTION TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS agent_guardrails (
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  guardrail_id UUID NOT NULL REFERENCES guardrails(id) ON DELETE CASCADE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (agent_id, guardrail_id)
);

-- =============================================
-- 3. INDEXES
-- =============================================

-- guardrails indexes
CREATE INDEX IF NOT EXISTS idx_guardrails_org ON guardrails(organization_id);
CREATE INDEX IF NOT EXISTS idx_guardrails_type ON guardrails(type);
CREATE INDEX IF NOT EXISTS idx_guardrails_enabled ON guardrails(enabled) WHERE enabled = true;

-- agent_guardrails indexes
CREATE INDEX IF NOT EXISTS idx_agent_guardrails_agent ON agent_guardrails(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_guardrails_guardrail ON agent_guardrails(guardrail_id);
CREATE INDEX IF NOT EXISTS idx_agent_guardrails_sort ON agent_guardrails(agent_id, sort_order);

-- =============================================
-- 4. ROW LEVEL SECURITY POLICIES
-- =============================================

ALTER TABLE guardrails ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_guardrails ENABLE ROW LEVEL SECURITY;

-- guardrails policies
CREATE POLICY "Users can view guardrails in their org" ON guardrails
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
      UNION
      SELECT id FROM organizations WHERE owner_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_staff WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create guardrails in their org" ON guardrails
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
      UNION
      SELECT id FROM organizations WHERE owner_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_staff WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update guardrails in their org" ON guardrails
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
      UNION
      SELECT id FROM organizations WHERE owner_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_staff WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete guardrails in their org" ON guardrails
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
      UNION
      SELECT id FROM organizations WHERE owner_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_staff WHERE user_id = auth.uid()
    )
  );

-- agent_guardrails policies
CREATE POLICY "Users can view agent guardrail links" ON agent_guardrails
  FOR SELECT USING (
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

CREATE POLICY "Users can create agent guardrail links" ON agent_guardrails
  FOR INSERT WITH CHECK (
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

CREATE POLICY "Users can delete agent guardrail links" ON agent_guardrails
  FOR DELETE USING (
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

-- =============================================
-- 5. TRIGGERS
-- =============================================

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_guardrails_updated_at
  BEFORE UPDATE ON guardrails
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 6. HELPER FUNCTIONS
-- =============================================

-- Function to get all guardrails for an agent (ordered by sort_order)
CREATE OR REPLACE FUNCTION get_agent_guardrails(p_agent_id UUID)
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  description TEXT,
  type VARCHAR(50),
  config JSONB,
  enabled BOOLEAN,
  sort_order INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id,
    g.name,
    g.description,
    g.type,
    g.config,
    g.enabled,
    ag.sort_order
  FROM agent_guardrails ag
  JOIN guardrails g ON g.id = ag.guardrail_id
  WHERE ag.agent_id = p_agent_id
    AND g.enabled = true
  ORDER BY ag.sort_order ASC, g.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on function
GRANT EXECUTE ON FUNCTION get_agent_guardrails(UUID) TO authenticated;

-- =============================================
-- 7. COMMENTS
-- =============================================

COMMENT ON TABLE guardrails IS 'Reusable guardrail rules to control AI agent behavior';
COMMENT ON TABLE agent_guardrails IS 'Junction table linking AI agents to multiple guardrails';
COMMENT ON COLUMN guardrails.type IS 'Type of guardrail: tag_blocker, business_hours, rate_limit, lead_status, human_takeover, conversation_status, custom';
COMMENT ON COLUMN guardrails.config IS 'JSON configuration specific to guardrail type';
COMMENT ON COLUMN agent_guardrails.sort_order IS 'Order in which guardrails are checked (lower numbers checked first)';
COMMENT ON FUNCTION get_agent_guardrails IS 'Returns all enabled guardrails for an agent, ordered by sort_order';
