-- Migration: Add Agent Reports System
-- Date: 2025-10-09
-- Description: Enables automated agent reporting to gym owners

-- =============================================
-- 1. AI AGENT REPORTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS ai_agent_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL CHECK (report_type IN (
    'daily_summary',
    'weekly_performance',
    'monthly_forecast',
    'custom'
  )),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Report content
  report_data JSONB NOT NULL, -- Structured data (KPIs, metrics, actions taken)
  report_html TEXT, -- Rendered HTML version for email
  summary TEXT, -- AI-generated executive summary

  -- Key metrics (for quick filtering/sorting)
  kpis JSONB DEFAULT '{}', -- { "clients_contacted": 15, "revenue_recovered": 450.00 }
  actions_taken INTEGER DEFAULT 0, -- Count of actions agent performed
  escalations INTEGER DEFAULT 0, -- Count of items requiring human attention

  -- Delivery tracking
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  sent_to TEXT[], -- Email addresses report was sent to
  viewed_at TIMESTAMP WITH TIME ZONE,

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 2. INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_ai_agent_reports_agent
ON ai_agent_reports(agent_id);

CREATE INDEX IF NOT EXISTS idx_ai_agent_reports_org
ON ai_agent_reports(organization_id);

CREATE INDEX IF NOT EXISTS idx_ai_agent_reports_period
ON ai_agent_reports(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_ai_agent_reports_type
ON ai_agent_reports(report_type);

CREATE INDEX IF NOT EXISTS idx_ai_agent_reports_sent
ON ai_agent_reports(sent_at)
WHERE sent_at IS NOT NULL;

-- Unique constraint: one report per agent per period per type
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_agent_reports_unique_period
ON ai_agent_reports(agent_id, report_type, period_start, period_end);

-- =============================================
-- 3. ROW LEVEL SECURITY
-- =============================================
ALTER TABLE ai_agent_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reports in their org" ON ai_agent_reports
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert reports" ON ai_agent_reports
  FOR INSERT WITH CHECK (true); -- Inserted by system/cron jobs

-- =============================================
-- 4. HELPER FUNCTION: Get Latest Report
-- =============================================
CREATE OR REPLACE FUNCTION get_latest_agent_report(
  p_agent_id UUID,
  p_report_type VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  report_type VARCHAR,
  period_start DATE,
  period_end DATE,
  summary TEXT,
  kpis JSONB,
  actions_taken INTEGER,
  escalations INTEGER,
  generated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.report_type::VARCHAR,
    r.period_start,
    r.period_end,
    r.summary,
    r.kpis,
    r.actions_taken,
    r.escalations,
    r.generated_at
  FROM ai_agent_reports r
  WHERE r.agent_id = p_agent_id
    AND (p_report_type IS NULL OR r.report_type = p_report_type)
  ORDER BY r.generated_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================
-- 5. REPORT TEMPLATES TABLE (Optional)
-- =============================================
CREATE TABLE IF NOT EXISTS ai_agent_report_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  report_type VARCHAR(50) NOT NULL,
  agent_role VARCHAR(100), -- NULL = applies to all roles

  -- Template configuration
  sections JSONB NOT NULL, -- Array of report sections with queries
  frequency VARCHAR(20) CHECK (frequency IN ('daily', 'weekly', 'monthly', 'on_demand')),

  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_agent_report_templates_role
ON ai_agent_report_templates(agent_role)
WHERE agent_role IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_agent_report_templates_enabled
ON ai_agent_report_templates(enabled)
WHERE enabled = true;

ALTER TABLE ai_agent_report_templates ENABLE ROW LEVEL SECURITY;

-- Public read for all authenticated users
CREATE POLICY "Authenticated users can view templates" ON ai_agent_report_templates
  FOR SELECT USING (enabled = true AND auth.role() = 'authenticated');

CREATE TRIGGER update_ai_agent_report_templates_updated_at BEFORE UPDATE ON ai_agent_report_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 6. SEED: Default Report Templates
-- =============================================
INSERT INTO ai_agent_report_templates (name, description, report_type, agent_role, frequency, sections) VALUES
(
  'Customer Care Weekly Summary',
  'Weekly summary of customer care agent activities',
  'weekly_performance',
  'customer_support',
  'weekly',
  '[
    {
      "title": "At-Risk Clients",
      "query": "clients_no_attendance_7d",
      "visualization": "table"
    },
    {
      "title": "Messages Sent",
      "query": "messages_sent_this_week",
      "visualization": "bar_chart"
    },
    {
      "title": "Response Rates",
      "query": "message_response_rates",
      "visualization": "line_chart"
    },
    {
      "title": "Re-Engagement Success",
      "query": "clients_returned_after_outreach",
      "visualization": "metric"
    }
  ]'::JSONB
),
(
  'Finance Monthly Forecast',
  'Monthly revenue forecast and financial health check',
  'monthly_forecast',
  'financial',
  'monthly',
  '[
    {
      "title": "Revenue Summary",
      "query": "revenue_breakdown",
      "visualization": "pie_chart"
    },
    {
      "title": "Failed Payments Recovered",
      "query": "failed_payments_recovered",
      "visualization": "table"
    },
    {
      "title": "Next Month Forecast",
      "query": "forecast_next_month",
      "visualization": "trend_chart"
    },
    {
      "title": "Payment Health Score",
      "query": "payment_health_metrics",
      "visualization": "gauge"
    }
  ]'::JSONB
)
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- 7. COMMENTS
-- =============================================
COMMENT ON TABLE ai_agent_reports IS 'Generated reports from AI agents summarizing their activities and insights';
COMMENT ON COLUMN ai_agent_reports.report_data IS 'Structured JSON data containing all report metrics and findings';
COMMENT ON COLUMN ai_agent_reports.kpis IS 'Key performance indicators extracted for quick access';
COMMENT ON COLUMN ai_agent_reports.escalations IS 'Number of issues requiring human attention';
COMMENT ON TABLE ai_agent_report_templates IS 'Templates defining structure and frequency of agent reports';
COMMENT ON FUNCTION get_latest_agent_report IS 'Retrieves most recent report for an agent, optionally filtered by type';
