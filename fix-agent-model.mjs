#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const AGENT_ID = '00f2d394-28cd-43ee-8db4-8f841c5d4873';

console.log('Fixing agent model from gpt-5-mini to gpt-4o-mini...\n');

const { data, error } = await supabase
  .from('ai_agents')
  .update({ model: 'gpt-4o-mini' })
  .eq('id', AGENT_ID)
  .select();

if (error) {
  console.error('❌ Error:', error);
} else {
  console.log('✅ Model updated successfully!');
  console.log(`New model: ${data[0].model}`);
}
