-- Organization Onboarding System
-- Created: October 8, 2025
-- Purpose: Track new gym onboarding progress through integrations, data import, and AI setup

-- =====================================================
-- 1. CREATE organization_onboarding TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS organization_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Progress tracking
  current_step VARCHAR(100),
  completed_steps JSONB DEFAULT '[]'::jsonb,
  skipped_steps JSONB DEFAULT '[]'::jsonb,

  -- Timestamps
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,

  -- State
  is_dismissed BOOLEAN DEFAULT false,

  -- Metadata for additional tracking
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Constraints
  UNIQUE(organization_id)
);

-- =====================================================
-- 2. CREATE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_org_onboarding_org
  ON organization_onboarding(organization_id);

CREATE INDEX IF NOT EXISTS idx_org_onboarding_active
  ON organization_onboarding(organization_id)
  WHERE completed_at IS NULL AND is_dismissed = false;

CREATE INDEX IF NOT EXISTS idx_org_onboarding_current_step
  ON organization_onboarding(current_step)
  WHERE completed_at IS NULL;

-- =====================================================
-- 3. ADD COMMENTS
-- =====================================================

COMMENT ON TABLE organization_onboarding IS
  'Tracks onboarding progress for new gym organizations';

COMMENT ON COLUMN organization_onboarding.current_step IS
  'ID of the step the user is currently working on';

COMMENT ON COLUMN organization_onboarding.completed_steps IS
  'Array of step IDs that have been completed';

COMMENT ON COLUMN organization_onboarding.skipped_steps IS
  'Array of step IDs that user chose to skip';

COMMENT ON COLUMN organization_onboarding.is_dismissed IS
  'Whether user has dismissed/closed the onboarding checklist';

COMMENT ON COLUMN organization_onboarding.metadata IS
  'Additional tracking data (e.g., ai_tutorial_viewed: true)';

-- =====================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE organization_onboarding ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own organization's onboarding
CREATE POLICY "Users can view own organization onboarding"
  ON organization_onboarding
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

-- Policy: Users can update their own organization's onboarding
CREATE POLICY "Users can update own organization onboarding"
  ON organization_onboarding
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

-- Policy: Users can insert onboarding for their organization
CREATE POLICY "Users can insert own organization onboarding"
  ON organization_onboarding
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

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Function to check if a step is completed
CREATE OR REPLACE FUNCTION is_onboarding_step_completed(
  p_organization_id UUID,
  p_step_id VARCHAR
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_completed_steps JSONB;
BEGIN
  SELECT completed_steps INTO v_completed_steps
  FROM organization_onboarding
  WHERE organization_id = p_organization_id;

  IF v_completed_steps IS NULL THEN
    RETURN false;
  END IF;

  RETURN v_completed_steps ? p_step_id;
END;
$$;

-- Function to mark step as completed
CREATE OR REPLACE FUNCTION mark_onboarding_step_complete(
  p_organization_id UUID,
  p_step_id VARCHAR
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create onboarding record if it doesn't exist
  INSERT INTO organization_onboarding (organization_id, completed_steps)
  VALUES (p_organization_id, jsonb_build_array(p_step_id))
  ON CONFLICT (organization_id)
  DO UPDATE SET
    completed_steps = CASE
      WHEN organization_onboarding.completed_steps ? p_step_id
      THEN organization_onboarding.completed_steps
      ELSE organization_onboarding.completed_steps || jsonb_build_array(p_step_id)
    END,
    current_step = CASE
      WHEN organization_onboarding.current_step = p_step_id
      THEN NULL
      ELSE organization_onboarding.current_step
    END;
END;
$$;

-- Function to calculate onboarding completion percentage
CREATE OR REPLACE FUNCTION get_onboarding_progress(
  p_organization_id UUID
)
RETURNS TABLE (
  completed_count INTEGER,
  total_steps INTEGER,
  progress_percentage INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_completed_steps JSONB;
  v_completed_count INTEGER;
  v_total_steps INTEGER := 13; -- Total number of onboarding steps
BEGIN
  SELECT completed_steps INTO v_completed_steps
  FROM organization_onboarding
  WHERE organization_id = p_organization_id;

  IF v_completed_steps IS NULL THEN
    v_completed_count := 0;
  ELSE
    v_completed_count := jsonb_array_length(v_completed_steps);
  END IF;

  RETURN QUERY SELECT
    v_completed_count,
    v_total_steps,
    ROUND((v_completed_count::NUMERIC / v_total_steps::NUMERIC) * 100)::INTEGER;
END;
$$;

-- =====================================================
-- 6. GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE ON organization_onboarding TO authenticated;
GRANT EXECUTE ON FUNCTION is_onboarding_step_completed TO authenticated;
GRANT EXECUTE ON FUNCTION mark_onboarding_step_complete TO authenticated;
GRANT EXECUTE ON FUNCTION get_onboarding_progress TO authenticated;
