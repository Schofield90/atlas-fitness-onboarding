import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.development.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const agentId = '1b44af8e-d29d-4fdf-98a8-ab586a289e5e';

console.log('\n🔧 Updating agent max_tokens from 500 to 16000...\n');

const { data, error } = await supabase
  .from('ai_agents')
  .update({
    max_tokens: 16000,
    updated_at: new Date().toISOString()
  })
  .eq('id', agentId)
  .select();

if (error) {
  console.log('❌ Error:', error.message);
} else {
  console.log('✅ Agent updated successfully!');
  console.log('   Old max_tokens: 500');
  console.log('   New max_tokens: 16000');
  console.log('\n💡 This allows GPT-5 to use:');
  console.log('   - ~500 tokens for reasoning (internal thinking)');
  console.log('   - ~15500 tokens for actual response content');
}

console.log('\n');
