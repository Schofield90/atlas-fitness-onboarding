#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const AGENT_ID = '00f2d394-28cd-43ee-8db4-8f841c5d4873';

const { data: agent } = await supabase
  .from('ai_agents')
  .select('system_prompt, updated_at')
  .eq('id', AGENT_ID)
  .single();

console.log('System Prompt (first 200 chars):');
console.log(agent.system_prompt.substring(0, 200));
console.log('\nLast updated:', agent.updated_at);

// Check if it contains our new prompt keywords
const hasNewPrompt = agent.system_prompt.includes('BE PROACTIVE') && 
                     agent.system_prompt.includes('IMMEDIATELY use your tools');

console.log('\n✅ Has new proactive prompt:', hasNewPrompt);
