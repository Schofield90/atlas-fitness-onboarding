#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const AGENT_ID = '00f2d394-28cd-43ee-8db4-8f841c5d4873';

const { data: agent, error } = await supabase
  .from('ai_agents')
  .select('system_instructions')
  .eq('id', AGENT_ID)
  .single();

if (error) {
  console.error('Error:', error);
} else {
  console.log('System Instructions:');
  console.log('='.repeat(80));
  console.log(agent.system_instructions);
}
