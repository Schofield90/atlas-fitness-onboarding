#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const FINANCE_AGENT_ID = '00f2d394-28cd-43ee-8db4-8f841c5d4873';

const { data: agent, error } = await supabase
  .from('ai_agents')
  .select('*')
  .eq('id', FINANCE_AGENT_ID)
  .single();

if (error) {
  console.error('Error:', error);
} else {
  console.log('Finance Agent Details:');
  console.log(`  ID: ${agent.id}`);
  console.log(`  Name: ${agent.name}`);
  console.log(`  Org ID: ${agent.organization_id}`);
  console.log(`  Enabled: ${agent.enabled}`);
  console.log(`  Tools: ${agent.allowed_tools?.length || 0}`);
  
  // Get organization name
  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', agent.organization_id)
    .single();
  
  if (org) {
    console.log(`  Organization: ${org.name}`);
  }
  
  // Check for conversations
  const { count } = await supabase
    .from('ai_agent_conversations')
    .select('id', { count: 'exact', head: true })
    .eq('agent_id', FINANCE_AGENT_ID);
  
  console.log(`  Conversations: ${count || 0}`);
}
