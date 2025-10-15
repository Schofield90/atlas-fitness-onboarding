import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.development.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const agentId = '1b44af8e-d29d-4fdf-98a8-ab586a289e5e';
const apiKey = 'pit-9088050f-8ee2-444a-9f81-e4bd8f749dfa';

console.log('\n🔧 Updating agent with GHL API key...\n');

const { data, error } = await supabase
  .from('ai_agents')
  .update({
    ghl_api_key: apiKey,
    updated_at: new Date().toISOString()
  })
  .eq('id', agentId)
  .select();

if (error) {
  console.log('❌ Error:', error.message);
} else {
  console.log('✅ Agent updated successfully!');
  console.log('   Agent:', data[0].name);
  console.log('   API Key:', apiKey.substring(0, 30) + '...');
  console.log('\n📱 SMS sending is now ENABLED!');
  console.log('\n🔄 Next test will:');
  console.log('   1. Receive webhook from GHL');
  console.log('   2. Generate AI response');
  console.log('   3. Send SMS back to lead via GHL API ✅');
}

console.log('\n');
