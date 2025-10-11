#!/usr/bin/env node
/**
 * Enable Analytics Tools for Financial Analyst Agent
 * Updates the agent's allowed_tools array to include all analytics tools
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const FINANCIAL_ANALYST_ID = '00f2d394-28cd-43ee-8db4-8f841c5d4873';

const ANALYTICS_TOOLS = [
  'generate_revenue_report',
  'generate_monthly_turnover_report',
  'calculate_mrr',
  'calculate_arr',
  'generate_churn_report',
  'generate_ltv_report',
  'analyze_class_attendance',
  'get_client_count'
];

async function enableTools() {
  console.log('🔧 Enabling analytics tools for Financial Analyst agent...\n');

  // Get current agent
  const { data: agent, error: fetchError } = await supabase
    .from('ai_agents')
    .select('id, name, allowed_tools')
    .eq('id', FINANCIAL_ANALYST_ID)
    .single();

  if (fetchError || !agent) {
    console.error('❌ Error fetching agent:', fetchError);
    process.exit(1);
  }

  console.log(`📋 Current agent: ${agent.name}`);
  console.log(`📦 Current tools: ${agent.allowed_tools?.length || 0} tools`);
  console.log(`   Tools: ${agent.allowed_tools || []}\n`);

  // Update agent with analytics tools
  const { data: updated, error: updateError } = await supabase
    .from('ai_agents')
    .update({ allowed_tools: ANALYTICS_TOOLS })
    .eq('id', FINANCIAL_ANALYST_ID)
    .select()
    .single();

  if (updateError) {
    console.error('❌ Error updating agent:', updateError);
    process.exit(1);
  }

  console.log(`✅ Successfully enabled ${ANALYTICS_TOOLS.length} analytics tools!\n`);
  console.log('📊 Enabled tools:');
  ANALYTICS_TOOLS.forEach(tool => console.log(`   ✓ ${tool}`));

  console.log('\n✨ Agent is now ready to run reports!');
}

enableTools().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
