import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const agentId = '00f2d394-28cd-43ee-8db4-8f841c5d4873';

const { data: agent, error: fetchError } = await supabase
  .from('ai_agents')
  .select('allowed_tools')
  .eq('id', agentId)
  .single();

if (fetchError) throw fetchError;

console.log('Current allowed_tools:', agent.allowed_tools);

const updatedTools = [
  ...agent.allowed_tools,
  'search_clients',
  'view_client_profile'
];

console.log('\nUpdating to:', updatedTools);

const { error: updateError } = await supabase
  .from('ai_agents')
  .update({ allowed_tools: updatedTools })
  .eq('id', agentId);

if (updateError) throw updateError;

console.log('\n✅ Successfully added search_clients and view_client_profile tools');
