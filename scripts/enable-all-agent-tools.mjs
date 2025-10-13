#!/usr/bin/env node
/**
 * Enable all 51 tools for existing AI agents
 * Run: node scripts/enable-all-agent-tools.mjs
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// All 51 available tools from the registry
const ALL_TOOLS = [
  // Data Tools (15)
  'search_clients',
  'view_client_profile',
  'view_client_bookings',
  'view_client_payments',
  'update_client_status',
  'search_leads',
  'view_lead_profile',
  'update_lead_status',
  'search_classes',
  'view_class_schedule',
  'check_class_availability',
  'view_class_bookings',
  'query_payments',
  'query_subscriptions',
  'calculate_engagement_score',

  // Analytics Tools (15)
  'generate_revenue_report',
  'generate_churn_report',
  'generate_ltv_report',
  'generate_monthly_turnover_report',
  'calculate_mrr',
  'calculate_arr',
  'analyze_payment_trends',
  'analyze_class_attendance',
  'analyze_member_engagement',
  'analyze_no_show_rates',
  'identify_at_risk_members',
  'generate_operations_report',
  'get_client_count',
  'get_client_attendance',

  // Messaging Tools (11)
  'send_email',
  'send_sms',
  'create_support_ticket',
  'notify_staff',
  'send_message_to_client',
  'send_message_to_lead',
  'send_retention_message',
  'send_report_email',
  'schedule_follow_up',
  'send_bulk_message',
  'create_retention_campaign',

  // Automation Tools (10)
  'create_lead_task',
  'schedule_social_post',
  'generate_social_content',
  'generate_hashtags',
  'view_calendar_events',
  'book_trial_class',
  'schedule_facility_tour',
  'trigger_workflow',
  'schedule_task',
  'update_client_tags',
  'export_data'
];

async function enableAllToolsForAgents() {
  console.log('🔧 Enabling all 51 tools for existing AI agents...\n');

  // Get all agents
  const { data: agents, error: fetchError } = await supabase
    .from('ai_agents')
    .select('id, name, organization_id, allowed_tools');

  if (fetchError) {
    console.error('❌ Error fetching agents:', fetchError);
    process.exit(1);
  }

  if (!agents || agents.length === 0) {
    console.log('ℹ️  No agents found');
    return;
  }

  console.log(`Found ${agents.length} agents\n`);

  for (const agent of agents) {
    const currentTools = agent.allowed_tools || [];
    const missingTools = ALL_TOOLS.filter(t => !currentTools.includes(t));

    console.log(`Agent: ${agent.name} (${agent.id})`);
    console.log(`  Current tools: ${currentTools.length}`);
    console.log(`  Missing tools: ${missingTools.length}`);

    if (missingTools.length === 0) {
      console.log('  ✅ Already has all tools\n');
      continue;
    }

    // Update agent with all tools
    const { error: updateError } = await supabase
      .from('ai_agents')
      .update({
        allowed_tools: ALL_TOOLS,
        updated_at: new Date().toISOString()
      })
      .eq('id', agent.id);

    if (updateError) {
      console.error(`  ❌ Error updating agent:`, updateError);
    } else {
      console.log(`  ✅ Updated to ${ALL_TOOLS.length} tools\n`);
    }
  }

  console.log('✅ Done!');
}

enableAllToolsForAgents().catch(console.error);
