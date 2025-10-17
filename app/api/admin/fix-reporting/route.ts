import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();

  // First, create the function with inferential logic
  const functionSql = `
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
  v_raw_total_leads INT;
  v_raw_leads_responded INT;
  v_raw_calls_booked INT;
  v_raw_calls_answered INT;
  v_raw_calls_no_answer INT;
  v_raw_sales_made INT;
  v_raw_sales_lost INT;
BEGIN
  SELECT organization_id INTO v_organization_id FROM ai_agents WHERE id = p_agent_id;
  CASE p_period_type
    WHEN 'daily' THEN v_start_date := p_snapshot_date; v_end_date := p_snapshot_date;
    WHEN 'weekly' THEN v_start_date := p_snapshot_date - INTERVAL '6 days'; v_end_date := p_snapshot_date;
    WHEN 'monthly' THEN v_start_date := DATE_TRUNC('month', p_snapshot_date)::DATE; v_end_date := (DATE_TRUNC('month', p_snapshot_date) + INTERVAL '1 month - 1 day')::DATE;
    WHEN 'all_time' THEN v_start_date := '2020-01-01'::DATE; v_end_date := p_snapshot_date;
  END CASE;
  SELECT COALESCE(COUNT(*) FILTER (WHERE event_type = 'lead_created'), 0), COALESCE(COUNT(*) FILTER (WHERE event_type = 'lead_responded'), 0), COALESCE(COUNT(*) FILTER (WHERE event_type = 'call_booked'), 0), COALESCE(COUNT(*) FILTER (WHERE event_type = 'call_answered'), 0), COALESCE(COUNT(*) FILTER (WHERE event_type = 'call_no_answer'), 0), COALESCE(COUNT(*) FILTER (WHERE event_type = 'sale_made'), 0), COALESCE(COUNT(*) FILTER (WHERE event_type = 'sale_lost'), 0)
  INTO v_raw_total_leads, v_raw_leads_responded, v_raw_calls_booked, v_raw_calls_answered, v_raw_calls_no_answer, v_raw_sales_made, v_raw_sales_lost
  FROM agent_performance_events WHERE agent_id = p_agent_id AND event_date BETWEEN v_start_date AND v_end_date;
  v_sales_made := v_raw_sales_made; v_sales_lost := v_raw_sales_lost;
  v_calls_answered := GREATEST(v_raw_calls_answered, v_sales_made + v_sales_lost);
  v_calls_booked := GREATEST(v_raw_calls_booked, v_calls_answered + v_raw_calls_no_answer);
  v_leads_responded := GREATEST(v_raw_leads_responded, v_calls_booked);
  v_total_leads := GREATEST(v_raw_total_leads, v_leads_responded);
  v_calls_no_answer := v_raw_calls_no_answer;
  INSERT INTO agent_performance_snapshots (agent_id, organization_id, snapshot_date, period_type, total_leads, leads_responded, calls_booked, calls_answered, calls_no_answer, sales_made, sales_lost, response_rate, booking_rate, pickup_rate, close_rate, lead_to_sale_rate, updated_at)
  VALUES (p_agent_id, v_organization_id, p_snapshot_date, p_period_type, v_total_leads, v_leads_responded, v_calls_booked, v_calls_answered, v_calls_no_answer, v_sales_made, v_sales_lost, calculate_percentage(v_leads_responded, v_total_leads), calculate_percentage(v_calls_booked, v_leads_responded), calculate_percentage(v_calls_answered, v_calls_booked), calculate_percentage(v_sales_made, v_calls_answered), calculate_percentage(v_sales_made, v_total_leads), NOW())
  ON CONFLICT (agent_id, snapshot_date, period_type) DO UPDATE SET total_leads = EXCLUDED.total_leads, leads_responded = EXCLUDED.leads_responded, calls_booked = EXCLUDED.calls_booked, calls_answered = EXCLUDED.calls_answered, calls_no_answer = EXCLUDED.calls_no_answer, sales_made = EXCLUDED.sales_made, sales_lost = EXCLUDED.sales_lost, response_rate = EXCLUDED.response_rate, booking_rate = EXCLUDED.booking_rate, pickup_rate = EXCLUDED.pickup_rate, close_rate = EXCLUDED.close_rate, lead_to_sale_rate = EXCLUDED.lead_to_sale_rate, updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
  `;

  // Execute the function creation
  const { error: funcError } = await supabase.rpc("exec_sql" as any, {
    query: functionSql,
  });

  if (funcError) {
    console.error("Function creation error:", funcError);
  }

  // Now refresh the snapshot for the agent
  const { error: refreshError } = await supabase.rpc(
    "refresh_agent_performance_snapshot",
    {
      p_agent_id: "1b44af8e-d29d-4fdf-98a8-ab586a289e5e",
      p_snapshot_date: "2025-10-16",
      p_period_type: "all_time",
    }
  );

  if (refreshError) {
    return NextResponse.json(
      { error: "Failed to refresh snapshot", details: refreshError },
      { status: 500 }
    );
  }

  // Fetch updated snapshot
  const { data: snapshot } = await supabase
    .from("agent_performance_snapshots")
    .select("*")
    .eq("agent_id", "1b44af8e-d29d-4fdf-98a8-ab586a289e5e")
    .eq("snapshot_date", "2025-10-16")
    .eq("period_type", "all_time")
    .single();

  return NextResponse.json({
    success: true,
    snapshot,
    message: "Inferential reporting logic applied",
  });
}
