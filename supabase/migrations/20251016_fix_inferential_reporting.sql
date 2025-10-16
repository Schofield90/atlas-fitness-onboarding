-- Fix Agent Performance Reporting with Inferential Logic
-- Created: October 16, 2025
--
-- PROBLEM: If we have a "call_answered" or "sale_made" event, but no "lead_created" event,
--          the counts are wrong. Logically, if a call was answered, there MUST have been:
--          1. A lead created
--          2. A lead that responded
--          3. A call that was booked
--          4. A call that was answered
--
-- SOLUTION: Use GREATEST() to ensure earlier funnel stages always >= later stages

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
  -- Raw counts from events
  v_raw_total_leads INT;
  v_raw_leads_responded INT;
  v_raw_calls_booked INT;
  v_raw_calls_answered INT;
  v_raw_calls_no_answer INT;
  v_raw_sales_made INT;
  v_raw_sales_lost INT;
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

  -- Count events (raw counts from database)
  SELECT
    COALESCE(COUNT(*) FILTER (WHERE event_type = 'lead_created'), 0),
    COALESCE(COUNT(*) FILTER (WHERE event_type = 'lead_responded'), 0),
    COALESCE(COUNT(*) FILTER (WHERE event_type = 'call_booked'), 0),
    COALESCE(COUNT(*) FILTER (WHERE event_type = 'call_answered'), 0),
    COALESCE(COUNT(*) FILTER (WHERE event_type = 'call_no_answer'), 0),
    COALESCE(COUNT(*) FILTER (WHERE event_type = 'sale_made'), 0),
    COALESCE(COUNT(*) FILTER (WHERE event_type = 'sale_lost'), 0)
  INTO
    v_raw_total_leads,
    v_raw_leads_responded,
    v_raw_calls_booked,
    v_raw_calls_answered,
    v_raw_calls_no_answer,
    v_raw_sales_made,
    v_raw_sales_lost
  FROM agent_performance_events
  WHERE agent_id = p_agent_id
    AND event_date BETWEEN v_start_date AND v_end_date;

  -- Apply inferential logic (back-fill missing funnel stages)
  -- If we have sales, we MUST have had calls answered, calls booked, leads responded, and leads created
  -- Use GREATEST() to ensure earlier stages >= later stages

  v_sales_made := v_raw_sales_made;
  v_sales_lost := v_raw_sales_lost;

  -- If we have sales or lost sales, we MUST have had calls answered
  v_calls_answered := GREATEST(
    v_raw_calls_answered,
    v_sales_made + v_sales_lost
  );

  -- If we have answered/no-answer calls, we MUST have had calls booked
  v_calls_booked := GREATEST(
    v_raw_calls_booked,
    v_calls_answered + v_raw_calls_no_answer
  );

  -- If we have booked calls, we MUST have had leads respond
  v_leads_responded := GREATEST(
    v_raw_leads_responded,
    v_calls_booked
  );

  -- If we have responded leads, we MUST have had leads created
  v_total_leads := GREATEST(
    v_raw_total_leads,
    v_leads_responded
  );

  -- Keep no_answer as-is (doesn't imply earlier stages)
  v_calls_no_answer := v_raw_calls_no_answer;

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

-- Add comment explaining the logic
COMMENT ON FUNCTION refresh_agent_performance_snapshot IS
'Recalculates agent performance snapshot with inferential logic.
If later funnel stages have events (e.g., sale_made), earlier stages are back-filled:
- sale_made implies call_answered, call_booked, lead_responded, lead_created
- call_answered implies call_booked, lead_responded, lead_created
- call_booked implies lead_responded, lead_created
- lead_responded implies lead_created
Uses GREATEST() to ensure funnel integrity.';
