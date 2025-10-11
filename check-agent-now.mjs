#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const AGENT_ID = '00f2d394-28cd-43ee-8db4-8f841c5d4873';

const { data: agent, error } = await supabase
  .from('ai_agents')
  .select('id, name, allowed_tools')
  .eq('id', AGENT_ID)
  .single();

if (error) {
  console.error('Error:', error);
} else {
  console.log('✅ Agent:', agent.name);
  console.log('📦 Tools enabled:', agent.allowed_tools?.length || 0);
  if (agent.allowed_tools?.length) {
    console.log('🔧 Tool list:');
    agent.allowed_tools.forEach(t => console.log(`   - ${t}`));
  }
}
