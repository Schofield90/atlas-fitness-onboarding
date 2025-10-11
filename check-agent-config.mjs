#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const AGENT_ID = '00f2d394-28cd-43ee-8db4-8f841c5d4873';

const { data: agent } = await supabase
  .from('ai_agents')
  .select('*')
  .eq('id', AGENT_ID)
  .single();

console.log('Agent Configuration:');
console.log('==================');
console.log('Name:', agent.name);
console.log('Model:', agent.model);
console.log('Temperature:', agent.temperature);
console.log('Max Tokens:', agent.max_tokens);
console.log('Enabled:', agent.enabled);
console.log('Tools Count:', agent.allowed_tools?.length || 0);
console.log('Tools:', agent.allowed_tools);
console.log('\nSystem Prompt Length:', agent.system_prompt?.length || 0);
console.log('Metadata:', JSON.stringify(agent.metadata, null, 2));
