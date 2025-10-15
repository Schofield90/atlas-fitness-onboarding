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
  console.log('\n📱 SMS Configuration Check:');
  console.log('  Agent Name:', agent.name);
  console.log('  GHL API Key:', agent.ghl_api_key ? '✅ Configured' : '❌ NOT configured');
  console.log('  GHL Webhook Secret:', agent.ghl_webhook_secret ? '✅ Set' : '❌ Not set');
  
  if (!agent.ghl_api_key) {
    console.log('\n⚠️  SMS will NOT send - ghl_api_key is missing!');
    console.log('\n💡 To enable SMS sending:');
    console.log('   1. Get your GHL API key from GoHighLevel settings');
    console.log('   2. Update the agent with the API key');
    console.log('   3. Webhook will then send AI responses via SMS automatically');
  } else {
    console.log('\n✅ SMS sending is enabled!');
    console.log('   API Key:', agent.ghl_api_key.substring(0, 20) + '...');
  }
}

console.log('\n');
