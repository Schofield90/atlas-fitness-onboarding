-- Custom Analytics System Migration
-- Replaces Clarity with our own tracking infrastructure

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Analytics Sessions Table
CREATE TABLE IF NOT EXISTS analytics_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  visitor_id TEXT, -- Persistent visitor tracking via cookie

  -- Session metadata
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration INTEGER, -- seconds

  -- Device & Browser
  user_agent TEXT,
  browser TEXT,
  browser_version TEXT,
  os TEXT,
  device_type TEXT, -- 'desktop', 'mobile', 'tablet'
  screen_width INTEGER,
  screen_height INTEGER,

  -- Location
  ip_address TEXT,
  country TEXT,
  city TEXT,
  timezone TEXT,

  -- Referral
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,

  -- Engagement metrics
  page_views INTEGER DEFAULT 1,
  scroll_depth INTEGER DEFAULT 0, -- max percentage scrolled
  clicks INTEGER DEFAULT 0,
  rage_clicks INTEGER DEFAULT 0, -- rapid repeated clicks (frustration indicator)

  -- Conversion tracking
  converted BOOLEAN DEFAULT false,
  conversion_type TEXT, -- 'form_submit', 'button_click', 'custom'
  conversion_value DECIMAL(10,2),

  -- Technical
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(session_id)
);

-- Analytics Events Table (clickstream, scrolls, interactions)
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES analytics_sessions(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,

  -- Event details
  event_type TEXT NOT NULL, -- 'pageview', 'click', 'scroll', 'form_submit', 'form_field_change', 'error', 'rage_click'
  event_name TEXT,

  -- Target element (for clicks)
  element_selector TEXT, -- CSS selector
  element_text TEXT, -- Button/link text
  element_id TEXT,
  element_classes TEXT[],

  -- Position data
  x_position INTEGER,
  y_position INTEGER,
  scroll_position INTEGER, -- pixels from top
  scroll_percentage INTEGER, -- percentage of page height

  -- Form data (for form events)
  form_id TEXT,
  field_name TEXT,
  field_value TEXT, -- Sanitized/hashed sensitive data

  -- Timing
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_on_page INTEGER, -- seconds since page load

  -- Additional metadata
  metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Heatmap Data Table (aggregated click/scroll data)
CREATE TABLE IF NOT EXISTS analytics_heatmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,

  -- Aggregation period
  date DATE NOT NULL,

  -- Heatmap type
  heatmap_type TEXT NOT NULL, -- 'click', 'move', 'scroll', 'attention'

  -- Viewport size (for responsive heatmaps)
  viewport_width INTEGER,
  viewport_height INTEGER,
  device_type TEXT, -- 'desktop', 'mobile', 'tablet'

  -- Aggregated data points
  data_points JSONB NOT NULL, -- [{x, y, weight, count}, ...]

  -- Stats
  total_sessions INTEGER DEFAULT 0,
  total_interactions INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(page_id, date, heatmap_type, viewport_width, device_type)
);

-- Session Recordings Table (DOM snapshots + events)
CREATE TABLE IF NOT EXISTS analytics_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES analytics_sessions(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,

  -- Recording data
  initial_snapshot JSONB NOT NULL, -- Full DOM snapshot at start
  events JSONB NOT NULL, -- Array of mutation events with timestamps

  -- Metadata
  duration INTEGER, -- seconds
  console_logs JSONB, -- Captured console messages
  errors JSONB, -- JavaScript errors
  network_requests JSONB, -- XHR/Fetch requests

  -- Storage
  compressed BOOLEAN DEFAULT false,
  size_bytes INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days') -- Auto-delete old recordings
);

-- Aggregated Page Analytics (daily rollups)
CREATE TABLE IF NOT EXISTS analytics_page_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Traffic metrics
  total_sessions INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  returning_visitors INTEGER DEFAULT 0,

  -- Engagement metrics
  avg_session_duration INTEGER, -- seconds
  avg_scroll_depth INTEGER, -- percentage
  bounce_rate DECIMAL(5,2), -- percentage
  exit_rate DECIMAL(5,2), -- percentage

  -- Interaction metrics
  total_clicks INTEGER DEFAULT 0,
  total_rage_clicks INTEGER DEFAULT 0,
  avg_clicks_per_session DECIMAL(5,2),

  -- Conversion metrics
  total_conversions INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2), -- percentage
  total_conversion_value DECIMAL(10,2),

  -- Device breakdown
  desktop_sessions INTEGER DEFAULT 0,
  mobile_sessions INTEGER DEFAULT 0,
  tablet_sessions INTEGER DEFAULT 0,

  -- Top referrers (JSONB for flexibility)
  top_referrers JSONB,
  top_utm_sources JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(page_id, date)
);

-- AI Insights Table (same as before but now using our data)
CREATE TABLE IF NOT EXISTS analytics_ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
  analysis_date DATE NOT NULL,

  -- AI Analysis Results
  issues JSONB NOT NULL, -- [{type, severity, description, recommendation, expectedImpact, priority}]
  summary TEXT,
  overall_score INTEGER, -- 0-100 health score
  priority_recommendations JSONB,

  -- Behavioral insights
  user_journey_insights JSONB, -- Common paths, drop-off points
  element_performance JSONB, -- CTR for buttons, forms, links
  segment_analysis JSONB, -- Desktop vs mobile, referral source performance

  -- AI model info
  model_used TEXT DEFAULT 'claude-sonnet-4-20250514',
  tokens_used INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Funnel Analysis Table
CREATE TABLE IF NOT EXISTS analytics_funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,

  -- Funnel definition
  name TEXT NOT NULL,
  steps JSONB NOT NULL, -- [{event_type, element_selector, name}, ...]

  -- Date range
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Results
  step_conversions JSONB, -- [{step_index, sessions_entered, sessions_completed, drop_off_rate}, ...]
  overall_conversion_rate DECIMAL(5,2),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_page_id ON analytics_sessions(page_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_session_id ON analytics_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_visitor_id ON analytics_sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_started_at ON analytics_sessions(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_page_id ON analytics_events(page_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_heatmaps_page_id_date ON analytics_heatmaps(page_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_page_metrics_page_id_date ON analytics_page_metrics(page_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_recordings_session_id ON analytics_recordings(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_recordings_expires_at ON analytics_recordings(expires_at);

-- RLS Policies
ALTER TABLE analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_heatmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_page_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_funnels ENABLE ROW LEVEL SECURITY;

-- Allow users to view analytics for their organization's pages
CREATE POLICY analytics_sessions_select_policy ON analytics_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM landing_pages lp
      WHERE lp.id = analytics_sessions.page_id
      AND lp.organization_id = auth.jwt() ->> 'organization_id'
    )
  );

CREATE POLICY analytics_events_select_policy ON analytics_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM landing_pages lp
      WHERE lp.id = analytics_events.page_id
      AND lp.organization_id = auth.jwt() ->> 'organization_id'
    )
  );

CREATE POLICY analytics_heatmaps_select_policy ON analytics_heatmaps
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM landing_pages lp
      WHERE lp.id = analytics_heatmaps.page_id
      AND lp.organization_id = auth.jwt() ->> 'organization_id'
    )
  );

CREATE POLICY analytics_recordings_select_policy ON analytics_recordings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM landing_pages lp
      WHERE lp.id = analytics_recordings.page_id
      AND lp.organization_id = auth.jwt() ->> 'organization_id'
    )
  );

CREATE POLICY analytics_page_metrics_select_policy ON analytics_page_metrics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM landing_pages lp
      WHERE lp.id = analytics_page_metrics.page_id
      AND lp.organization_id = auth.jwt() ->> 'organization_id'
    )
  );

CREATE POLICY analytics_ai_insights_select_policy ON analytics_ai_insights
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM landing_pages lp
      WHERE lp.id = analytics_ai_insights.page_id
      AND lp.organization_id = auth.jwt() ->> 'organization_id'
    )
  );

CREATE POLICY analytics_funnels_select_policy ON analytics_funnels
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM landing_pages lp
      WHERE lp.id = analytics_funnels.page_id
      AND lp.organization_id = auth.jwt() ->> 'organization_id'
    )
  );

-- Function to auto-delete expired recordings
CREATE OR REPLACE FUNCTION delete_expired_recordings()
RETURNS void AS $$
BEGIN
  DELETE FROM analytics_recordings
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to aggregate session metrics (run daily via cron)
CREATE OR REPLACE FUNCTION aggregate_page_metrics(p_date DATE DEFAULT CURRENT_DATE - 1)
RETURNS void AS $$
BEGIN
  INSERT INTO analytics_page_metrics (
    page_id,
    date,
    total_sessions,
    unique_visitors,
    returning_visitors,
    avg_session_duration,
    avg_scroll_depth,
    bounce_rate,
    exit_rate,
    total_clicks,
    total_rage_clicks,
    avg_clicks_per_session,
    total_conversions,
    conversion_rate,
    total_conversion_value,
    desktop_sessions,
    mobile_sessions,
    tablet_sessions
  )
  SELECT
    page_id,
    p_date AS date,
    COUNT(*) AS total_sessions,
    COUNT(DISTINCT visitor_id) AS unique_visitors,
    COUNT(DISTINCT visitor_id) FILTER (WHERE visitor_id IN (
      SELECT visitor_id FROM analytics_sessions
      WHERE DATE(started_at) < p_date
      GROUP BY visitor_id
    )) AS returning_visitors,
    AVG(duration) AS avg_session_duration,
    AVG(scroll_depth) AS avg_scroll_depth,
    (COUNT(*) FILTER (WHERE page_views = 1)::DECIMAL / COUNT(*) * 100) AS bounce_rate,
    (COUNT(*) FILTER (WHERE ended_at IS NOT NULL)::DECIMAL / COUNT(*) * 100) AS exit_rate,
    SUM(clicks) AS total_clicks,
    SUM(rage_clicks) AS total_rage_clicks,
    AVG(clicks) AS avg_clicks_per_session,
    COUNT(*) FILTER (WHERE converted = true) AS total_conversions,
    (COUNT(*) FILTER (WHERE converted = true)::DECIMAL / COUNT(*) * 100) AS conversion_rate,
    SUM(conversion_value) AS total_conversion_value,
    COUNT(*) FILTER (WHERE device_type = 'desktop') AS desktop_sessions,
    COUNT(*) FILTER (WHERE device_type = 'mobile') AS mobile_sessions,
    COUNT(*) FILTER (WHERE device_type = 'tablet') AS tablet_sessions
  FROM analytics_sessions
  WHERE DATE(started_at) = p_date
  GROUP BY page_id
  ON CONFLICT (page_id, date)
  DO UPDATE SET
    total_sessions = EXCLUDED.total_sessions,
    unique_visitors = EXCLUDED.unique_visitors,
    returning_visitors = EXCLUDED.returning_visitors,
    avg_session_duration = EXCLUDED.avg_session_duration,
    avg_scroll_depth = EXCLUDED.avg_scroll_depth,
    bounce_rate = EXCLUDED.bounce_rate,
    exit_rate = EXCLUDED.exit_rate,
    total_clicks = EXCLUDED.total_clicks,
    total_rage_clicks = EXCLUDED.total_rage_clicks,
    avg_clicks_per_session = EXCLUDED.avg_clicks_per_session,
    total_conversions = EXCLUDED.total_conversions,
    conversion_rate = EXCLUDED.conversion_rate,
    total_conversion_value = EXCLUDED.total_conversion_value,
    desktop_sessions = EXCLUDED.desktop_sessions,
    mobile_sessions = EXCLUDED.mobile_sessions,
    tablet_sessions = EXCLUDED.tablet_sessions,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add analytics_enabled flag to landing_pages table
ALTER TABLE landing_pages
ADD COLUMN IF NOT EXISTS analytics_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS analytics_script_id TEXT,
ADD COLUMN IF NOT EXISTS analytics_updated_at TIMESTAMPTZ;

COMMENT ON TABLE analytics_sessions IS 'User session tracking data';
COMMENT ON TABLE analytics_events IS 'Granular user interaction events';
COMMENT ON TABLE analytics_heatmaps IS 'Aggregated heatmap data for visualization';
COMMENT ON TABLE analytics_recordings IS 'Session replay data (DOM snapshots + events)';
COMMENT ON TABLE analytics_page_metrics IS 'Daily aggregated page performance metrics';
COMMENT ON TABLE analytics_ai_insights IS 'AI-powered analysis and recommendations';
COMMENT ON TABLE analytics_funnels IS 'Conversion funnel analysis';
