-- Heatmap Analytics System Schema
-- Integrates Microsoft Clarity with AI-powered insights

-- Add Clarity tracking to existing landing_pages table
ALTER TABLE landing_pages
ADD COLUMN IF NOT EXISTS clarity_project_id TEXT,
ADD COLUMN IF NOT EXISTS clarity_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS analytics_updated_at TIMESTAMPTZ;

-- Page analytics cache (from Clarity API)
CREATE TABLE IF NOT EXISTS page_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_sessions INTEGER DEFAULT 0,
  avg_session_duration INTEGER, -- seconds
  scroll_depth_avg DECIMAL(5,2), -- percentage
  conversion_rate DECIMAL(5,2), -- percentage
  bounce_rate DECIMAL(5,2), -- percentage
  top_exit_percentage DECIMAL(5,2), -- percentage of users who exit
  raw_data JSONB, -- full Clarity API response
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(page_id, date)
);

-- AI-powered insights from Claude Sonnet 4.5
CREATE TABLE IF NOT EXISTS ai_page_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
  analysis_date DATE NOT NULL,
  issues JSONB NOT NULL, -- Array of issues with severity, recommendations
  summary TEXT,
  overall_score INTEGER, -- 0-100 health score
  priority_recommendations JSONB, -- Top 3 ordered by impact
  model_used TEXT DEFAULT 'claude-sonnet-4-5',
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track improvement over time
CREATE TABLE IF NOT EXISTS analytics_improvement_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL, -- 'conversion_rate', 'scroll_depth', etc.
  date DATE NOT NULL,
  value DECIMAL(10,2),
  previous_value DECIMAL(10,2),
  change_percentage DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(page_id, metric_name, date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_page_analytics_page_date ON page_analytics(page_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_insights_page_date ON ai_page_insights(page_id, analysis_date DESC);
CREATE INDEX IF NOT EXISTS idx_improvement_tracking_page ON analytics_improvement_tracking(page_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_landing_pages_clarity ON landing_pages(organization_id) WHERE clarity_enabled = true;

-- RLS Policies
ALTER TABLE page_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_page_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_improvement_tracking ENABLE ROW LEVEL SECURITY;

-- Users can view analytics for their organization's pages
CREATE POLICY "Users can view org page analytics"
ON page_analytics FOR SELECT
USING (
  page_id IN (
    SELECT id FROM landing_pages
    WHERE organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_staff WHERE user_id = auth.uid()
      UNION
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  )
);

-- Users can insert/update analytics for their org's pages (server-side)
CREATE POLICY "Users can manage org page analytics"
ON page_analytics FOR ALL
USING (
  page_id IN (
    SELECT id FROM landing_pages
    WHERE organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_staff WHERE user_id = auth.uid()
      UNION
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  )
);

-- AI insights policies (same pattern)
CREATE POLICY "Users can view org AI insights"
ON ai_page_insights FOR SELECT
USING (
  page_id IN (
    SELECT id FROM landing_pages
    WHERE organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_staff WHERE user_id = auth.uid()
      UNION
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can manage org AI insights"
ON ai_page_insights FOR ALL
USING (
  page_id IN (
    SELECT id FROM landing_pages
    WHERE organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_staff WHERE user_id = auth.uid()
      UNION
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  )
);

-- Improvement tracking policies
CREATE POLICY "Users can view org improvement tracking"
ON analytics_improvement_tracking FOR SELECT
USING (
  page_id IN (
    SELECT id FROM landing_pages
    WHERE organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_staff WHERE user_id = auth.uid()
      UNION
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can manage org improvement tracking"
ON analytics_improvement_tracking FOR ALL
USING (
  page_id IN (
    SELECT id FROM landing_pages
    WHERE organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_staff WHERE user_id = auth.uid()
      UNION
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  )
);

-- Function to calculate improvement metrics
CREATE OR REPLACE FUNCTION calculate_metric_improvement(
  p_page_id UUID,
  p_metric_name TEXT,
  p_new_value DECIMAL
)
RETURNS void AS $$
DECLARE
  v_previous_value DECIMAL;
  v_change_percentage DECIMAL;
BEGIN
  -- Get most recent previous value
  SELECT value INTO v_previous_value
  FROM analytics_improvement_tracking
  WHERE page_id = p_page_id
    AND metric_name = p_metric_name
  ORDER BY date DESC
  LIMIT 1;

  -- Calculate change percentage
  IF v_previous_value IS NOT NULL AND v_previous_value != 0 THEN
    v_change_percentage := ((p_new_value - v_previous_value) / v_previous_value) * 100;
  ELSE
    v_change_percentage := 0;
  END IF;

  -- Insert new tracking record
  INSERT INTO analytics_improvement_tracking (
    page_id, metric_name, date, value, previous_value, change_percentage
  ) VALUES (
    p_page_id, p_metric_name, CURRENT_DATE, p_new_value, v_previous_value, v_change_percentage
  )
  ON CONFLICT (page_id, metric_name, date)
  DO UPDATE SET
    value = EXCLUDED.value,
    previous_value = EXCLUDED.previous_value,
    change_percentage = EXCLUDED.change_percentage,
    created_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION calculate_metric_improvement TO authenticated;

COMMENT ON TABLE page_analytics IS 'Cached analytics data from Microsoft Clarity';
COMMENT ON TABLE ai_page_insights IS 'AI-generated insights from Claude Sonnet 4.5 analysis';
COMMENT ON TABLE analytics_improvement_tracking IS 'Track metric improvements over time';
