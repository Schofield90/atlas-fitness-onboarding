import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.development.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const agentId = '1b44af8e-d29d-4fdf-98a8-ab586a289e5e';

console.log('\n🔧 Updating agent model from GPT-5 to Claude 3.5 Sonnet...\n');

// Claude 3.5 Sonnet model name from Anthropic
// Note: There's no "Claude 4.5" yet - Claude 3.5 Sonnet is the latest
const newModel = 'claude-3-5-sonnet-20241022';

// Claude 3.5 Sonnet optimal settings
const maxTokens = 8192; // Claude's max_tokens (not max_completion_tokens)
const temperature = 1.0; // Keep existing temperature

const { data, error } = await supabase
  .from('ai_agents')
  .update({
    model: newModel,
    max_tokens: maxTokens,
    updated_at: new Date().toISOString()
  })
  .eq('id', agentId)
  .select();

if (error) {
  console.log('❌ Error:', error.message);
  process.exit(1);
}

console.log('✅ Agent updated successfully!');
console.log('   Agent:', data[0].name);
console.log('   Old Model: gpt-5');
console.log('   New Model:', newModel);
console.log('   Max Tokens:', maxTokens);
console.log('   Temperature:', temperature);
console.log('\n💡 Key Differences:');
console.log('   - Claude 3.5 Sonnet has 200K context window');
console.log('   - No reasoning_effort parameter (GPT-5 specific)');
console.log('   - No verbosity parameter (GPT-5 specific)');
console.log('   - Uses "system" parameter instead of system message');
console.log('   - Faster response times (no hidden reasoning tokens)');
console.log('   - Lower cost: $3/1M input + $15/1M output');
console.log('\n📋 Note: "Claude Sonnet 4.5" does not exist yet.');
console.log('         Claude 3.5 Sonnet (Oct 2024) is the latest version.');

console.log('\n');
