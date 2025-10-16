import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lzlrojoaxrqvmhempnkn.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const AGENT_ID = '1b44af8e-d29d-4fdf-98a8-ab586a289e5e';

// YOU NEED TO PASTE YOUR NEW API KEY HERE
const NEW_API_KEY = 'PASTE_YOUR_NEW_GHL_API_KEY_HERE';

if (NEW_API_KEY === 'PASTE_YOUR_NEW_GHL_API_KEY_HERE') {
  console.error('❌ Please edit this file and paste your new GHL API key');
  process.exit(1);
}

(async () => {
  console.log('Updating GHL API key for agent:', AGENT_ID);

  // Get current agent data
  const { data: agent } = await supabase
    .from('ai_agents')
    .select('metadata')
    .eq('id', AGENT_ID)
    .single();

  // Update both fields
  const { error } = await supabase
    .from('ai_agents')
    .update({
      ghl_api_key: NEW_API_KEY,
      metadata: {
        ...agent.metadata,
        gohighlevel_api_key: NEW_API_KEY, // Update this too for consistency
      }
    })
    .eq('id', AGENT_ID);

  if (error) {
    console.error('❌ Error updating API key:', error);
    process.exit(1);
  }

  console.log('✅ Successfully updated both API key fields:');
  console.log('   - ghl_api_key');
  console.log('   - metadata.gohighlevel_api_key');
  console.log('\nAPI key prefix:', NEW_API_KEY.substring(0, 20) + '...');
  console.log('\n✅ Agent is now ready to send messages and book calendar appointments!');
})();
