import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const agentId = '00f2d394-28cd-43ee-8db4-8f841c5d4873';

// Get current model
const { data: agent } = await supabase
  .from('ai_agents')
  .select('model, name')
  .eq('id', agentId)
  .single();

console.log(`Current agent: ${agent.name}`);
console.log(`Current model: ${agent.model}\n`);

// Switch to Claude Sonnet 3.5
const { error } = await supabase
  .from('ai_agents')
  .update({ model: 'claude-3-5-sonnet-20241022' })
  .eq('id', agentId);

if (error) throw error;

console.log('✅ Switched to Claude 3.5 Sonnet (Anthropic)');
console.log('   Model: claude-3-5-sonnet-20241022');
console.log('\nThis avoids OpenAI quota limits.');
