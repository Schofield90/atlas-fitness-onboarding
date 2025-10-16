-- Agent Performance Reporting System
-- Created: October 16, 2025
-- Tracks lead funnel metrics for AI agents

-- =====================================================
-- Table: agent_performance_events
-- Stores individual events for calculating metrics
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_performance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES ai_agent_conversations(id) ON DELETE SET NULL,

  -- Event type (tracks progression through funnel)
  event_type TEXT NOT NULL CHECK (event_type IN (
    'lead_created',           -- New lead entered system
    'lead_responded',         -- Lead sent a positive response (not "stop")
    'call_booked',           -- Call/appointment scheduled
    'call_answered',         -- Call was answered by lead
    'call_no_answer',        -- Call not answered
    'sale_made',             -- Sale completed
    'sale_lost'              -- No sale after call
  )),

  -- Event metadata
  event_data JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  event_date DATE DEFAULT CURRENT_DATE,

  -- Indexes for fast queries
  CONSTRAINT unique_event_per_lead_type UNIQUE (lead_id, event_type, created_at)
);

-- Indexes for performance
CREATE INDEX idx_agent_perf_events_agent_id ON agent_performance_events(agent_id);
CREATE INDEX idx_agent_perf_events_org_id ON agent_performance_events(organization_id);
CREATE INDEX idx_agent_perf_events_event_type ON agent_performance_events(event_type);
CREATE INDEX idx_agent_perf_events_event_date ON agent_performance_events(event_date);
CREATE INDEX idx_agent_perf_events_lead_id ON agent_performance_events(lead_id);
CREATE INDEX idx_agent_perf_events_created_at ON agent_performance_events(created_at DESC);

-- =====================================================
-- Table: agent_performance_snapshots
-- Pre-calculated daily snapshots for faster reporting
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_performance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Date range for this snapshot
  snapshot_date DATE NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'all_time')),

  -- Funnel metrics (raw counts)
  total_leads INT DEFAULT 0,
  leads_responded INT DEFAULT 0,
  calls_booked INT DEFAULT 0,
  calls_answered INT DEFAULT 0,
  calls_no_answer INT DEFAULT 0,
  sales_made INT DEFAULT 0,
  sales_lost INT DEFAULT 0,

  -- Calculated percentages (stored for performance)
  response_rate DECIMAL(5,2) DEFAULT 0,        -- leads_responded / total_leads * 100
  booking_rate DECIMAL(5,2) DEFAULT 0,         -- calls_booked / leads_responded * 100
  pickup_rate DECIMAL(5,2) DEFAULT 0,          -- calls_answered / calls_booked * 100
  close_rate DECIMAL(5,2) DEFAULT 0,           -- sales_made / calls_answered * 100
  lead_to_sale_rate DECIMAL(5,2) DEFAULT 0,    -- sales_made / total_leads * 100

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique snapshot per agent per date per period
  CONSTRAINT unique_snapshot UNIQUE (agent_id, snapshot_date, period_type)
);

-- Indexes
CREATE INDEX idx_agent_perf_snapshots_agent_id ON agent_performance_snapshots(agent_id);
CREATE INDEX idx_agent_perf_snapshots_org_id ON agent_performance_snapshots(organization_id);
CREATE INDEX idx_agent_perf_snapshots_date ON agent_performance_snapshots(snapshot_date DESC);
CREATE INDEX idx_agent_perf_snapshots_period ON agent_performance_snapshots(period_type);

-- =====================================================
-- Function: Calculate percentages safely
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_percentage(numerator INT, denominator INT)
RETURNS DECIMAL(5,2) AS $$
BEGIN
  IF denominator IS NULL OR denominator = 0 THEN
    RETURN 0;
  END IF;
  RETURN ROUND((numerator::DECIMAL / denominator::DECIMAL) * 100, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- Function: Refresh agent performance snapshot
-- =====================================================

CREATE OR REPLACE FUNCTION refresh_agent_performance_snapshot(
  p_agent_id UUID,
  p_snapshot_date DATE,
  p_period_type TEXT
)
RETURNS VOID AS $$
DECLARE
  v_organization_id UUID;
  v_start_date DATE;
  v_end_date DATE;
  v_total_leads INT;
  v_leads_responded INT;
  v_calls_booked INT;
  v_calls_answered INT;
  v_calls_no_answer INT;
  v_sales_made INT;
  v_sales_lost INT;
BEGIN
  -- Get organization_id
  SELECT organization_id INTO v_organization_id
  FROM ai_agents
  WHERE id = p_agent_id;

  -- Calculate date range based on period type
  CASE p_period_type
    WHEN 'daily' THEN
      v_start_date := p_snapshot_date;
      v_end_date := p_snapshot_date;
    WHEN 'weekly' THEN
      v_start_date := p_snapshot_date - INTERVAL '6 days';
      v_end_date := p_snapshot_date;
    WHEN 'monthly' THEN
      v_start_date := DATE_TRUNC('month', p_snapshot_date)::DATE;
      v_end_date := (DATE_TRUNC('month', p_snapshot_date) + INTERVAL '1 month - 1 day')::DATE;
    WHEN 'all_time' THEN
      v_start_date := '2020-01-01'::DATE;
      v_end_date := p_snapshot_date;
  END CASE;

  -- Count events
  SELECT
    COUNT(*) FILTER (WHERE event_type = 'lead_created'),
    COUNT(*) FILTER (WHERE event_type = 'lead_responded'),
    COUNT(*) FILTER (WHERE event_type = 'call_booked'),
    COUNT(*) FILTER (WHERE event_type = 'call_answered'),
    COUNT(*) FILTER (WHERE event_type = 'call_no_answer'),
    COUNT(*) FILTER (WHERE event_type = 'sale_made'),
    COUNT(*) FILTER (WHERE event_type = 'sale_lost')
  INTO
    v_total_leads,
    v_leads_responded,
    v_calls_booked,
    v_calls_answered,
    v_calls_no_answer,
    v_sales_made,
    v_sales_lost
  FROM agent_performance_events
  WHERE agent_id = p_agent_id
    AND event_date BETWEEN v_start_date AND v_end_date;

  -- Upsert snapshot
  INSERT INTO agent_performance_snapshots (
    agent_id,
    organization_id,
    snapshot_date,
    period_type,
    total_leads,
    leads_responded,
    calls_booked,
    calls_answered,
    calls_no_answer,
    sales_made,
    sales_lost,
    response_rate,
    booking_rate,
    pickup_rate,
    close_rate,
    lead_to_sale_rate,
    updated_at
  ) VALUES (
    p_agent_id,
    v_organization_id,
    p_snapshot_date,
    p_period_type,
    v_total_leads,
    v_leads_responded,
    v_calls_booked,
    v_calls_answered,
    v_calls_no_answer,
    v_sales_made,
    v_sales_lost,
    calculate_percentage(v_leads_responded, v_total_leads),
    calculate_percentage(v_calls_booked, v_leads_responded),
    calculate_percentage(v_calls_answered, v_calls_booked),
    calculate_percentage(v_sales_made, v_calls_answered),
    calculate_percentage(v_sales_made, v_total_leads),
    NOW()
  )
  ON CONFLICT (agent_id, snapshot_date, period_type)
  DO UPDATE SET
    total_leads = EXCLUDED.total_leads,
    leads_responded = EXCLUDED.leads_responded,
    calls_booked = EXCLUDED.calls_booked,
    calls_answered = EXCLUDED.calls_answered,
    calls_no_answer = EXCLUDED.calls_no_answer,
    sales_made = EXCLUDED.sales_made,
    sales_lost = EXCLUDED.sales_lost,
    response_rate = EXCLUDED.response_rate,
    booking_rate = EXCLUDED.booking_rate,
    pickup_rate = EXCLUDED.pickup_rate,
    close_rate = EXCLUDED.close_rate,
    lead_to_sale_rate = EXCLUDED.lead_to_sale_rate,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RLS Policies
-- =====================================================

ALTER TABLE agent_performance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_performance_snapshots ENABLE ROW LEVEL SECURITY;

-- Events: Organization members can read their events
CREATE POLICY agent_perf_events_select ON agent_performance_events
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

-- Events: System can insert (via service role)
CREATE POLICY agent_perf_events_insert ON agent_performance_events
  FOR INSERT
  WITH CHECK (true);

-- Snapshots: Organization members can read their snapshots
CREATE POLICY agent_perf_snapshots_select ON agent_performance_snapshots
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

-- Snapshots: System can upsert (via service role)
CREATE POLICY agent_perf_snapshots_upsert ON agent_performance_snapshots
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- Helper function: Record lead created event
-- =====================================================

CREATE OR REPLACE FUNCTION record_lead_created(
  p_agent_id UUID,
  p_organization_id UUID,
  p_lead_id UUID,
  p_conversation_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO agent_performance_events (
    agent_id,
    organization_id,
    lead_id,
    conversation_id,
    event_type
  ) VALUES (
    p_agent_id,
    p_organization_id,
    p_lead_id,
    p_conversation_id,
    'lead_created'
  )
  ON CONFLICT (lead_id, event_type, created_at) DO NOTHING
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON TABLE agent_performance_events IS 'Individual events for tracking agent performance through the lead funnel';
COMMENT ON TABLE agent_performance_snapshots IS 'Pre-calculated daily snapshots of agent performance metrics';
COMMENT ON FUNCTION refresh_agent_performance_snapshot IS 'Recalculates and updates performance snapshot for given agent, date, and period';
