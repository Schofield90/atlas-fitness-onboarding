import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.development.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const agentId = '1b44af8e-d29d-4fdf-98a8-ab586a289e5e';

const { data: agent, error } = await supabase
  .from('ai_agents')
  .select('*')
  .eq('id', agentId)
  .single();

if (error) {
  console.log('❌ Error:', error.message);
} else {
  console.log('\n🤖 Agent Configuration:');
  console.log('  Name:', agent.name);
  console.log('  Model:', agent.model);
  console.log('  Max Tokens:', agent.max_tokens);
  console.log('  Temperature:', agent.temperature);
  console.log('  System Prompt Length:', agent.system_prompt?.length || 0, 'chars');
  console.log('\n💡 Issue: max_tokens too low for GPT-5 reasoning model');
  console.log('   Current:', agent.max_tokens);
  console.log('   Needed: 16000+ (to allow reasoning + content)');
}

console.log('\n');
