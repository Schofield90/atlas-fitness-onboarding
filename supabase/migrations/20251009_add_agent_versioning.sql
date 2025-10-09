-- Migration: Add Agent Versioning System
-- Date: 2025-10-09
-- Description: Enables safe agent updates and A/B testing

-- =============================================
-- 1. AI AGENT VERSIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS ai_agent_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  system_prompt TEXT NOT NULL,
  model VARCHAR(50) NOT NULL,
  temperature DECIMAL(3,2),
  max_tokens INTEGER,
  allowed_tools TEXT[],
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_agent_version UNIQUE(agent_id, version),
  CONSTRAINT valid_version CHECK (version > 0)
);

-- =============================================
-- 2. LINK TASKS TO SPECIFIC VERSIONS
-- =============================================
ALTER TABLE ai_agent_tasks
ADD COLUMN IF NOT EXISTS agent_version_id UUID REFERENCES ai_agent_versions(id) ON DELETE SET NULL;

-- =============================================
-- 3. INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_ai_agent_versions_agent
ON ai_agent_versions(agent_id);

CREATE INDEX IF NOT EXISTS idx_ai_agent_versions_active
ON ai_agent_versions(agent_id)
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_ai_agent_tasks_version
ON ai_agent_tasks(agent_version_id)
WHERE agent_version_id IS NOT NULL;

-- =============================================
-- 4. ROW LEVEL SECURITY
-- =============================================
ALTER TABLE ai_agent_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view versions in their org" ON ai_agent_versions
  FOR SELECT USING (
    agent_id IN (
      SELECT id FROM ai_agents WHERE organization_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert versions in their org" ON ai_agent_versions
  FOR INSERT WITH CHECK (
    agent_id IN (
      SELECT id FROM ai_agents WHERE organization_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update versions in their org" ON ai_agent_versions
  FOR UPDATE USING (
    agent_id IN (
      SELECT id FROM ai_agents WHERE organization_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
      )
    )
  );

-- =============================================
-- 5. TRIGGERS
-- =============================================
CREATE TRIGGER update_ai_agent_versions_updated_at BEFORE UPDATE ON ai_agent_versions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 6. HELPER FUNCTION: Create Version from Current Agent
-- =============================================
CREATE OR REPLACE FUNCTION create_agent_version_from_current(p_agent_id UUID, p_created_by UUID)
RETURNS UUID AS $$
DECLARE
  v_next_version INTEGER;
  v_new_version_id UUID;
  v_agent_record RECORD;
BEGIN
  -- Get current agent config
  SELECT * INTO v_agent_record
  FROM ai_agents
  WHERE id = p_agent_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agent not found: %', p_agent_id;
  END IF;

  -- Get next version number
  SELECT COALESCE(MAX(version), 0) + 1 INTO v_next_version
  FROM ai_agent_versions
  WHERE agent_id = p_agent_id;

  -- Create new version
  INSERT INTO ai_agent_versions (
    agent_id,
    version,
    system_prompt,
    model,
    temperature,
    max_tokens,
    allowed_tools,
    metadata,
    is_active,
    created_by
  ) VALUES (
    p_agent_id,
    v_next_version,
    v_agent_record.system_prompt,
    v_agent_record.model,
    v_agent_record.temperature,
    v_agent_record.max_tokens,
    v_agent_record.allowed_tools,
    v_agent_record.metadata,
    false, -- New versions start inactive
    p_created_by
  )
  RETURNING id INTO v_new_version_id;

  RETURN v_new_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 7. COMMENTS
-- =============================================
COMMENT ON TABLE ai_agent_versions IS 'Version history for AI agents, enables safe updates and rollbacks';
COMMENT ON COLUMN ai_agent_versions.is_active IS 'Only one version should be active per agent at a time';
COMMENT ON COLUMN ai_agent_tasks.agent_version_id IS 'Links task to specific agent version that was active when created';
COMMENT ON FUNCTION create_agent_version_from_current IS 'Helper to snapshot current agent config as new version';
